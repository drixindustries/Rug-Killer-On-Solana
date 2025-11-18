export type StreamEventKind = 'block' | 'tx' | 'log' | 'account';

export interface StreamEvent {
  kind: StreamEventKind;
  slot?: number;
  signature?: string;
  timestamp?: number;
  accounts?: string[];
  programIds?: string[];
  mints?: string[];
  wallets?: string[];
  raw?: any;
}

type MinuteBucket = {
  startMs: number;
  txCount: number;
  blockCount: number;
  logCount: number;
  accountUpdates: number;
};

type TokenStats = {
  mint: string;
  txCount: number;
  lastSeen: number;
  uniqueWallets: Set<string>;
};

class StreamMetrics {
  private minuteBuckets: Map<number, MinuteBucket> = new Map();
  private tokenStats: Map<string, TokenStats> = new Map();
  private retentionMinutes = 60; // keep 60 minutes of buckets

  ingest(provider: string, events: StreamEvent[]) {
    const now = Date.now();
    const minuteKey = Math.floor(now / 60000) * 60000;
    let bucket = this.minuteBuckets.get(minuteKey);
    if (!bucket) {
      bucket = { startMs: minuteKey, txCount: 0, blockCount: 0, logCount: 0, accountUpdates: 0 };
      this.minuteBuckets.set(minuteKey, bucket);
    }

    for (const ev of events) {
      if (ev.kind === 'tx') bucket.txCount++;
      if (ev.kind === 'block') bucket.blockCount++;
      if (ev.kind === 'log') bucket.logCount++;
      if (ev.kind === 'account') bucket.accountUpdates++;

      const mints = ev.mints || [];
      const wallets = ev.wallets || [];
      for (const mint of mints) {
        let s = this.tokenStats.get(mint);
        if (!s) {
          s = { mint, txCount: 0, lastSeen: now, uniqueWallets: new Set() };
          this.tokenStats.set(mint, s);
        }
        s.txCount += (ev.kind === 'tx') ? 1 : 0;
        s.lastSeen = now;
        wallets.forEach(w => s!.uniqueWallets.add(w));
      }
    }

    // GC old buckets and stale token stats
    const cutoff = now - this.retentionMinutes * 60000;
    for (const [k] of this.minuteBuckets) {
      if (k < cutoff) this.minuteBuckets.delete(k);
    }
    for (const [mint, s] of this.tokenStats) {
      if (s.lastSeen < cutoff) this.tokenStats.delete(mint);
    }
  }

  getSummary() {
    const now = Date.now();
    const ranges = [1, 5, 15, 60];
    const result: any = { time: new Date(now).toISOString(), windows: {} };
    for (const minutes of ranges) {
      const cutoff = now - minutes * 60000;
      let tx = 0, blocks = 0, logs = 0, acc = 0;
      for (const b of this.minuteBuckets.values()) {
        if (b.startMs >= cutoff) {
          tx += b.txCount; blocks += b.blockCount; logs += b.logCount; acc += b.accountUpdates;
        }
      }
      result.windows[`${minutes}m`] = { tx, blocks, logs, accountUpdates: acc };
    }

    // Top tokens by txCount in last 60m
    const topTokens = Array.from(this.tokenStats.values())
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, 20)
      .map(s => ({ mint: s.mint, txCount: s.txCount, uniqueWallets: s.uniqueWallets.size, lastSeen: s.lastSeen }));
    result.topTokens = topTokens;
    return result;
  }

  getTokenSummary(mint: string) {
    const s = this.tokenStats.get(mint);
    if (!s) return { mint, txCount: 0, uniqueWallets: 0, lastSeen: null };
    return { mint: s.mint, txCount: s.txCount, uniqueWallets: s.uniqueWallets.size, lastSeen: s.lastSeen };
  }
}

export const streamMetrics = new StreamMetrics();

// Utility: normalize different provider payloads to StreamEvent[]
export function normalizeSolanaWebhook(body: any): StreamEvent[] {
  const events: StreamEvent[] = [];

  const pushTx = (o: any) => {
    const signature = o.signature || o.transaction?.signatures?.[0];
    const slot = o.slot || o.context?.slot || o.block?.slot;
    const ts = o.timestamp || o.blockTime || o.block?.blockTime;
    const accounts: string[] = o.transaction?.message?.accountKeys?.map((k: any) => (typeof k === 'string' ? k : k?.pubkey))?.filter(Boolean) || [];
    const programIds: string[] = o.transaction?.message?.instructions?.map((ix: any) => ix.programId || ix.programIdIndex)?.filter(Boolean) || [];

    // Try to extract mints and wallets from common fields
    const mints: string[] = [];
    const wallets: string[] = [];
    const tokenTransfers = o.tokenTransfers || o.events?.tokenTransfers || [];
    for (const t of tokenTransfers) {
      if (t.mint) mints.push(t.mint);
      if (t.fromUserAccount) wallets.push(t.fromUserAccount);
      if (t.toUserAccount) wallets.push(t.toUserAccount);
    }
    const postTokenBalances = o.meta?.postTokenBalances || [];
    for (const b of postTokenBalances) {
      if (b.mint && !mints.includes(b.mint)) mints.push(b.mint);
      if (b.owner) wallets.push(b.owner);
    }

    events.push({ kind: 'tx', signature, slot, timestamp: ts, accounts, programIds, mints: dedupe(mints), wallets: dedupe(wallets), raw: o });
  };

  const dedupe = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

  // If array, assume array of items
  if (Array.isArray(body)) {
    body.forEach((item) => pushTx(item));
    return events;
  }

  // Helius enhanced webhook shape
  if (body?.type === 'enhanced' || body?.type === 'ENHANCED' || body?.type === 'ENHANCED_TRANSACTION') {
    const arr = body?.data || body?.transactions || body?.enhancedTransactions || [];
    arr.forEach((item: any) => pushTx(item));
    return events;
  }

  // QuickNode Streams common shapes
  if (body?.transactions) {
    body.transactions.forEach((t: any) => pushTx(t));
    return events;
  }
  if (body?.data && Array.isArray(body.data)) {
    body.data.forEach((t: any) => pushTx(t));
    return events;
  }

  // Single transaction fallback
  if (body?.transaction || body?.signature) {
    pushTx(body);
    return events;
  }

  // Unknown shape: wrap raw as a log event
  events.push({ kind: 'log', raw: body });
  return events;
}

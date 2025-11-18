import { redisCache } from './redis-cache';

export interface NansenSmartMoneyTrade {
  txHash: string;
  walletAddress: string;
  walletLabel?: string;
  tokenAddress: string;
  tokenSymbol?: string;
  tokenName?: string;
  side: 'buy' | 'sell';
  amountUsd?: number;
  amountToken?: number;
  timestamp: number;
  confidence?: number;
  sourceUrl?: string;
  raw?: any;
}

export interface NansenSmartMoneyResult {
  trades: NansenSmartMoneyTrade[];
  nextCursor?: string | null;
}

export class NansenService {
  private readonly apiKey = process.env.NANSEN_API_KEY?.trim() || null;
  private readonly chain = (process.env.NANSEN_CHAIN || 'solana').toLowerCase();
  private readonly baseUrl = process.env.NANSEN_API_BASE_URL?.trim() || 'https://api.nansen.ai/alpha';
  private readonly smartMoneyEndpoint = process.env.NANSEN_SMARTMONEY_ENDPOINT?.trim() || `${this.baseUrl}/api/v1/smart-money/${this.chain}/trades`;
  private readonly timeoutMs = Number(process.env.NANSEN_TIMEOUT_MS || 10000);
  private readonly pollMs = Number(process.env.NANSEN_POLL_INTERVAL_MS || 45000);
  private readonly defaultLimit = Number(process.env.NANSEN_POLL_LIMIT || 50);
  private readonly cacheKey = 'nansen:last-cursor';
  private lastCursor: string | null = null;

  isEnabled(): boolean {
    return !!this.apiKey;
  }

  getPollingInterval(): number {
    return this.pollMs;
  }

  getCursor(): string | null {
    return this.lastCursor;
  }

  setCursor(cursor: string | null): void {
    this.lastCursor = cursor;
    if (!cursor) {
      void redisCache.delete(this.cacheKey);
    } else {
      void redisCache.set(this.cacheKey, cursor, 3600);
    }
  }

  async restoreCursor(): Promise<string | null> {
    if (this.lastCursor) {
      return this.lastCursor;
    }
    const cached = await redisCache.get<string>(this.cacheKey);
    if (cached) {
      this.lastCursor = cached;
    }
    return this.lastCursor;
  }

  async fetchSmartMoneyBuys(options?: {
    since?: number;
    cursor?: string | null;
    limit?: number;
  }): Promise<NansenSmartMoneyResult> {
    if (!this.apiKey) {
      return { trades: [] };
    }

    const limit = Math.min(options?.limit || this.defaultLimit, 200);
    const url = new URL(this.smartMoneyEndpoint);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('side', 'buy');
    url.searchParams.set('direction', 'buy');

    const since = options?.since;
    if (since) {
      const seconds = Math.floor(since / 1000);
      url.searchParams.set('since', String(seconds));
      url.searchParams.set('from_timestamp', String(seconds));
      url.searchParams.set('start_time', String(seconds));
    }

    const cursor = options?.cursor || (await this.restoreCursor());
    if (cursor) {
      url.searchParams.set('cursor', cursor);
      url.searchParams.set('page', cursor);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response | null = null;

    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-API-KEY': this.apiKey,
        },
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      console.error('[Nansen] Request failed:', error);
      return { trades: [] };
    }

    clearTimeout(timer);

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[Nansen] Rate limited while fetching smart money buys');
      } else {
        console.error(`[Nansen] API error ${response.status}: ${response.statusText}`);
      }
      return { trades: [] };
    }

    let payload: any;
    try {
      payload = await response.json();
    } catch (error) {
      console.error('[Nansen] Failed to parse response JSON:', error);
      return { trades: [] };
    }

    const items = this.extractTradeArray(payload);
    const trades = items
      .map((item) => this.mapTrade(item))
      .filter((t): t is NansenSmartMoneyTrade => Boolean(t) && t.side === 'buy');

    const nextCursor = this.extractCursor(payload);
    if (nextCursor) {
      this.setCursor(nextCursor);
    }

    return { trades, nextCursor };
  }

  private extractTradeArray(payload: any): any[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data?.items)) return payload.data.items;
    if (Array.isArray(payload.data?.trades)) return payload.data.trades;
    if (Array.isArray(payload.trades)) return payload.trades;
    if (Array.isArray(payload.result)) return payload.result;
    return [];
  }

  private extractCursor(payload: any): string | null {
    if (!payload) return null;
    return (
      payload.next_cursor ||
      payload.cursor ||
      payload.nextToken ||
      payload.pagination?.next_cursor ||
      payload.pagination?.cursor ||
      payload.data?.next_cursor ||
      payload.data?.cursor ||
      null
    );
  }

  private mapTrade(item: any): NansenSmartMoneyTrade | null {
    if (!item) return null;

    const txHash = item.txHash || item.tx_hash || item.transactionHash || item.transaction_hash || item.signature || item.txid;
    const walletAddress = item.walletAddress || item.wallet_address || item.wallet?.address || item.owner || item.address;
    const tokenAddress = item.tokenAddress || item.token_address || item.mint || item.token?.address || item.asset?.address;

    if (!txHash || !walletAddress || !tokenAddress) {
      return null;
    }

    const sideRaw = (item.side || item.direction || 'buy').toString().toLowerCase();
    const side: 'buy' | 'sell' = sideRaw === 'sell' ? 'sell' : 'buy';

    let timestamp = Date.now();
    const tsValue = item.timestamp || item.block_time || item.blockTimestamp || item.executedAt || item.executed_at || item.time;
    if (typeof tsValue === 'number') {
      timestamp = tsValue > 1_000_000_000_000 ? tsValue : tsValue * 1000;
    } else if (typeof tsValue === 'string') {
      const parsed = Date.parse(tsValue);
      if (!Number.isNaN(parsed)) {
        timestamp = parsed;
      }
    }

    const amountUsd = this.parseNumber(item.amountUsd || item.amount_usd || item.value_usd || item.notional_usd || item.size_usd);
    const amountToken = this.parseNumber(item.amountToken || item.amount_token || item.quantity || item.size_token || item.size);
    const walletLabel = item.walletLabel || item.wallet_label || item.wallet?.label || item.label;
    const tokenSymbol = item.tokenSymbol || item.token_symbol || item.symbol || item.token?.symbol;
    const tokenName = item.tokenName || item.token_name || item.name || item.token?.name;
    const confidence = this.parseNumber(item.confidence || item.score || item.rank || item.rating);

    const sourceUrl = this.buildSourceUrl(walletAddress, tokenAddress);

    return {
      txHash,
      walletAddress,
      walletLabel,
      tokenAddress,
      tokenSymbol,
      tokenName,
      side,
      amountUsd,
      amountToken,
      timestamp,
      confidence,
      sourceUrl,
      raw: item,
    };
  }

  private parseNumber(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^0-9.+-]/g, ''));
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private buildSourceUrl(walletAddress: string, tokenAddress: string): string {
    const base = 'https://pro.nansen.ai';
    if (walletAddress) {
      return `${base}/wallet/${walletAddress}?chain=${this.chain}`;
    }
    if (tokenAddress) {
      return `${base}/token/${tokenAddress}?chain=${this.chain}`;
    }
    return base;
  }
}

// scripts/helius_scanner.ts — Helius Webhook + Full Wallet Extraction & Smart Money Enrichment (TypeScript)
// Run: npx tsx scripts/helius_scanner.ts

import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { PublicKey } from '@solana/web3.js';
// Use existing analyzer from server
// Note: tsx can run ESM/TS across workspace; path is relative to repo root
import { tokenAnalyzer } from '../server/solana-analyzer.ts';
import { smartMoneyRelay, getDirective } from '../server/services/smart-money-relay.ts';

dotenv.config();

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const DISCORD_WEBHOOK = process.env.SMART_MONEY_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const PORT = Number(process.env.PORT || 8000);

const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const RAYDIUM_PROGRAM = '4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4haw8tqK';

// Optional: Watchlist boost
const ELITE_WATCHLIST = new Set<string>((process.env.ELITE_WATCHLIST || '').split(',').map(s => s.trim()).filter(Boolean));

// Statistics tracking
let stats = {
  startTime: Date.now(),
  webhooksReceived: 0,
  tokensProcessed: 0,
  eliteDetections: 0,
  lastEventTime: 0,
  errors: 0
};

async function sendAlert(msg: string) {
  const tasks: Promise<any>[] = [];
  if (DISCORD_WEBHOOK) {
    tasks.push(fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: msg, allowed_mentions: { parse: [] } })
    }));
  }
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    tasks.push(fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, disable_web_page_preview: true })
    }));
  }
  await Promise.all(tasks);
}

async function enrichWalletPnL(wallet: string, limit = 100): Promise<{ winrate: number; realized_profit: number }> {
  try {
    const url = `https://api-mainnet.helius-rpc.com/v0/addresses/${wallet}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`;
    const resp = await fetch(url);
    if (!resp.ok) return { winrate: 0, realized_profit: 0 };
    const txs = await resp.json();

    let profitable = 0;
    let totalSwaps = 0;
    let totalPnl = 0; // Stub: approximate with SOL price
    const SOL_PRICE = Number(process.env.SOL_PRICE || 200);

    for (const tx of txs) {
      if (tx?.type === 'SWAP') {
        const transfers = tx?.tokenTransfers || [];
        const inAmt = transfers.filter((t: any) => t?.fromUserAccount === wallet).reduce((s: number, t: any) => s + (t?.tokenAmount || 0), 0);
        const outAmt = transfers.filter((t: any) => t?.toUserAccount === wallet).reduce((s: number, t: any) => s + (t?.tokenAmount || 0), 0);
        if (outAmt > inAmt * 1.01) profitable++;
        totalPnl += (outAmt - inAmt) * SOL_PRICE;
        totalSwaps++;
      }
    }

    const winrate = totalSwaps > 0 ? (profitable / totalSwaps) * 100 : 0;
    return { winrate, realized_profit: Math.abs(totalPnl) };
  } catch {
    return { winrate: 0, realized_profit: 0 };
  }
}

function isWalletLike(addr: string): boolean {
  try {
    if (!addr || addr.length !== 44) return false;
    const pk = new PublicKey(addr);
    return pk.toBase58() === addr;
  } catch {
    return false;
  }
}

async function scanToken(tokenMint: string) {
  console.log(`[Helius Scanner] Running full scan on ${tokenMint}`);
  try {
    const analysis = await tokenAnalyzer.analyzeToken(tokenMint);
    return {
      riskScore: analysis?.rugScore?.total || analysis?.riskScore || 0,
      holderCount: analysis?.holderCount || analysis?.holders?.holderCount || 0,
      topConcentration: analysis?.topHolderConcentration || analysis?.holders?.topHolderConcentration || 0,
      agedWalletRisk: analysis?.agedWalletData?.riskScore || 0,
      suspiciousFundingPct: analysis?.fundingAnalysis?.totalSuspiciousPercentage || 0,
      bundled: (analysis?.advancedBundleData?.bundleScore || 0) >= 60 || (analysis?.gmgnData?.isBundled || false)
    };
  } catch (e) {
    console.error('[Helius Scanner] Analyzer error:', e);
    return undefined;
  }
}

app.post('/helius-webhook', async (req, res) => {
  try {
    stats.webhooksReceived++;
    stats.lastEventTime = Date.now();
    console.log(`[Helius Webhook] Received event #${stats.webhooksReceived} at ${new Date().toISOString()}`);
    const payload = req.body as any[];
    let processed = 0;

    for (const tx of payload) {
      const description = tx?.description || '';
      const feePayer = tx?.feePayer || '';
      const programs = [feePayer, ...(tx?.accountKeys || [])];
      const isPumpOrRaydium = programs.includes(PUMP_FUN_PROGRAM) || programs.includes(RAYDIUM_PROGRAM);
      const isNewPoolOrMint = ['Create Pool', 'Token Mint'].includes(description);
      if (!isPumpOrRaydium || !isNewPoolOrMint) continue;

      const createdTs = tx?.timestamp ? Number(tx.timestamp) : 0;
      const ageMin = createdTs ? (Date.now() / 1000 - createdTs) / 60 : 0;
      if (ageMin > 25) continue;

      // Extract token mint
      const tokenMint = (tx?.tokenTransfers?.[0]?.mint) || tx?.accountKeys?.[1];
      if (!tokenMint) continue;

      // Collect wallets
      const allWallets = new Set<string>();
      if (isWalletLike(feePayer)) allWallets.add(feePayer);
      for (const key of tx?.accountKeys || []) {
        if (isWalletLike(key) && key !== tokenMint) allWallets.add(key);
      }
      for (const transfer of [...(tx?.nativeTransfers || []), ...(tx?.tokenTransfers || [])]) {
        if (isWalletLike(transfer?.fromUserAccount)) allWallets.add(transfer.fromUserAccount);
        if (isWalletLike(transfer?.toUserAccount)) allWallets.add(transfer.toUserAccount);
      }
      const walletsList = Array.from(allWallets).slice(0, 20);

      // Enrich wallets
      const enriched = await Promise.all(walletsList.map(async (w) => {
        if (ELITE_WATCHLIST.has(w)) return { winrate: 100, realized_profit: 1_000_000 };
        return enrichWalletPnL(w);
      }));

      const eliteWalletsRaw = walletsList.map((w, i) => ({ addr: w, winrate: enriched[i].winrate, profit: enriched[i].realized_profit }))
        .filter(w => w.winrate >= 75 && w.profit >= 500_000);

      if (eliteWalletsRaw.length > 0) {
        stats.eliteDetections++;
        stats.tokensProcessed++;
        console.log(`[Elite Detection] Token: ${tokenMint} | Elite wallets: ${eliteWalletsRaw.length}`);
        const name = tx?.tokenTransfers?.[0]?.symbol || 'UNKNOWN';
        const shortAddresses = walletsList.map(w => `${w.slice(0, 6)}…${w.slice(-4)}`);
        const analysisSummary = await scanToken(tokenMint);
        const eliteWallets = eliteWalletsRaw.map(w => ({
          address: w.addr,
          winrate: w.winrate,
            profit: w.profit,
          directive: getDirective(w.winrate, w.profit)
        }));
        smartMoneyRelay.publish({
          tokenMint,
          symbol: name,
          ageMinutes: ageMin,
          walletCount: walletsList.length,
          eliteWallets,
          allSample: shortAddresses,
          analysis: analysisSummary,
          timestamp: Date.now()
        });
      }

      processed++;
    }

    res.json({ status: 'ok', processed });
  } catch (e: any) {
    stats.errors++;
    console.error('[Helius Scanner] Error:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get('/health', (_req, res) => {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  const lastEventAgo = stats.lastEventTime ? Math.floor((Date.now() - stats.lastEventTime) / 1000) : null;
  res.json({
    status: 'healthy',
    uptime: `${uptime}s`,
    webhooksReceived: stats.webhooksReceived,
    tokensProcessed: stats.tokensProcessed,
    eliteDetections: stats.eliteDetections,
    errors: stats.errors,
    lastEventAgo: lastEventAgo ? `${lastEventAgo}s ago` : 'No events yet',
    heliusConfigured: !!HELIUS_API_KEY,
    eliteWatchlistSize: ELITE_WATCHLIST.size
  });
});

app.get('/stats', (_req, res) => {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  const lastEventAgo = stats.lastEventTime ? Math.floor((Date.now() - stats.lastEventTime) / 1000) : null;
  res.send(`
<html>
<head><title>Helius Smart Money Scanner</title></head>
<body style="font-family: monospace; padding: 20px;">
<h2>🧠 Smart Money Scanner Status</h2>
<table>
<tr><td><b>Status:</b></td><td>✅ Live</td></tr>
<tr><td><b>Uptime:</b></td><td>${uptime}s (${Math.floor(uptime/60)}m)</td></tr>
<tr><td><b>Webhooks Received:</b></td><td>${stats.webhooksReceived}</td></tr>
<tr><td><b>Tokens Processed:</b></td><td>${stats.tokensProcessed}</td></tr>
<tr><td><b>Elite Detections:</b></td><td>${stats.eliteDetections}</td></tr>
<tr><td><b>Errors:</b></td><td>${stats.errors}</td></tr>
<tr><td><b>Last Event:</b></td><td>${lastEventAgo ? lastEventAgo + 's ago' : 'No events yet'}</td></tr>
<tr><td><b>Helius API:</b></td><td>${HELIUS_API_KEY ? '✅ Configured' : '❌ Missing'}</td></tr>
<tr><td><b>Elite Watchlist:</b></td><td>${ELITE_WATCHLIST.size} wallets</td></tr>
</table>
<br>
<p><a href="/health">JSON Health Check</a></p>
</body>
</html>
  `);
});

app.get('/', (_req, res) => res.send('Helius Scanner Online'));

app.listen(PORT, () => {
  console.log(`
${'='.repeat(60)}`);
  console.log('🚀 HELIUS SMART MONEY SCANNER STARTED');
  console.log(`${'='.repeat(60)}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/helius-webhook`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Stats page: http://localhost:${PORT}/stats`);
  console.log(`⚙️  Helius API: ${HELIUS_API_KEY ? '✅ Configured' : '❌ MISSING - Set HELIUS_API_KEY'}`);
  console.log(`🎯 Elite threshold: ≥75% winrate, ≥$500K profit`);
  console.log(`📋 Watchlist: ${ELITE_WATCHLIST.size} pre-tagged wallets`);
  console.log(`${'='.repeat(60)}\n`);
  console.log('⏳ Waiting for Helius webhook events...\n');
});

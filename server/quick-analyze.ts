/**
 * Minimal standalone analyzer to validate restored DexScreener + QuillCheck.
 * Usage:
 *   npx ts-node quick-analyze.ts <TOKEN_MINT>
 * Defaults to USDC if no mint passed.
 */

const DEFAULT_TOKEN = process.argv[2] || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC

// Lightweight DexScreener fetch (mirrors service logic without shared schema dependency)
async function fetchDex(token: string) {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${token}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      console.warn(`[DexScreener] ${res.status} ${res.statusText}`);
      return null;
    }
    const raw = await res.json();
    if (!raw?.pairs) return null;
    const pairs = raw.pairs.filter((p: any) => p.chainId === 'solana');
    if (pairs.length === 0) return null;
    return {
      schemaVersion: raw.schemaVersion || '1.0.0',
      pairs: pairs.map((pair: any) => ({
        dexId: pair.dexId,
        chainId: pair.chainId,
        pairAddress: pair.pairAddress,
        baseToken: pair.baseToken,
        quoteToken: pair.quoteToken,
        priceUsd: pair.priceUsd,
        priceNative: pair.priceNative,
        liquidityUsd: pair.liquidity?.usd,
        volume: pair.volume,
        priceChange: pair.priceChange,
        txns: pair.txns,
      }))
    };
  } catch (e: any) {
    console.error('[DexScreener] Error', e.message);
    return null;
  }
}

// Lightweight QuillCheck fetch (mirrors cached service normalization)
async function fetchQuill(token: string) {
  const apiUrl = process.env.QUILLCHECK_API_URL || 'https://check.quillai.network';
  try {
    const res = await fetch(`${apiUrl}/api/scan/${token}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`[QuillCheck] ${res.status} ${res.statusText}`);
      return null;
    }
    const raw = await res.json();
    const riskScore = typeof raw.riskScore === 'number' ? raw.riskScore : (raw.score || 0);
    return {
      riskScore: Math.min(100, Math.max(0, riskScore)),
      isHoneypot: !!(raw.isHoneypot || raw.honeypot),
      buyTax: Number(raw.buyTax ?? raw.buy_tax ?? 0),
      sellTax: Number(raw.sellTax ?? raw.sell_tax ?? 0),
      canSell: raw.canSell !== undefined ? !!raw.canSell : !raw.isHoneypot,
      liquidityRisk: !!(raw.liquidityRisk || raw.canDrainLiquidity || raw.liquidity_drain),
      risks: Array.isArray(raw.risks) ? raw.risks : [],
    };
  } catch (e: any) {
    console.error('[QuillCheck] Error', e.message);
    return null;
  }
}

async function run() {
  console.log(`\n🔍 Quick Analyzer for token: ${DEFAULT_TOKEN}`);
  const [dex, quill] = await Promise.all([fetchDex(DEFAULT_TOKEN), fetchQuill(DEFAULT_TOKEN)]);
  console.log('\nDexScreener Summary:');
  if (!dex) {
    console.log('  No data');
  } else {
    const primary = dex.pairs[0];
    console.log(`  Pairs: ${dex.pairs.length}`);
    console.log(`  Price USD: ${primary.priceUsd}`);
    console.log(`  24h Vol: ${primary.volume?.h24}`);
    console.log(`  24h Price Change: ${primary.priceChange?.h24}%`);
    console.log(`  Liquidity USD: ${primary.liquidityUsd}`);
  }
  console.log('\nQuillCheck Summary:');
  if (!quill) {
    console.log('  No data');
  } else {
    console.log(`  Risk Score: ${quill.riskScore}`);
    console.log(`  Honeypot: ${quill.isHoneypot}`);
    console.log(`  Taxes: buy ${quill.buyTax}% / sell ${quill.sellTax}%`);
    console.log(`  Can Sell: ${quill.canSell}`);
    console.log(`  Liquidity Risk: ${quill.liquidityRisk}`);
    if (quill.risks.length) console.log('  Risks:', quill.risks.join(', '));
  }
  console.log('\n✅ Quick analyzer finished');
}

run();
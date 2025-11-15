/**
 * Pump.fun Token Scanner
 * Scans 100 recently launched pump.fun tokens for missing metrics and patterns
 * 
 * Run: npx tsx scripts/scan-100-pumpfun-tokens.ts
 */

import { tokenAnalyzer } from "../server/solana-analyzer";
import * as fs from 'fs';
import * as path from 'path';

interface PumpFunToken {
  address: string;
  symbol: string;
  name: string;
  createdAt: number;
}

async function getRecentPumpFunTokens(count: number): Promise<PumpFunToken[]> {
  console.log('🔍 Fetching recent pump.fun tokens...');
  const tokens: PumpFunToken[] = [];

  try {
    // Use pump.fun API (unofficial, public endpoint)
    const response = await fetch('https://api.pump.fun/api/v2/tokens/recent?limit=150', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.tokens)) {
        data.tokens.slice(0, count).forEach((t: any) => {
          tokens.push({
            address: t.address,
            symbol: t.symbol || t.address.slice(0, 6),
            name: t.name || 'Unknown',
            createdAt: t.createdAt || Date.now()
          });
        });
      }
    }
  } catch (error) {
    console.error('Failed to fetch pump.fun tokens:', error);
  }

  console.log(`✅ Found ${tokens.length} pump.fun tokens to scan\n`);
  return tokens.slice(0, count);
}

async function scanToken(token: PumpFunToken, index: number, total: number) {
  console.log(`\n[${index + 1}/${total}] Scanning: ${token.symbol} (${token.address.slice(0, 8)}...)`);
  try {
    const analysis = await tokenAnalyzer.analyzeToken(token.address);
    // ...existing code for extracting metrics, flags, and patterns...
    return {
      tokenAddress: token.address,
      symbol: token.symbol,
      name: token.name,
      createdAt: token.createdAt,
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel,
      detections: {
        honeypot: analysis.quillcheckData?.isHoneypot || false,
        bundle: (analysis.advancedBundleData?.bundleScore || 0) >= 60 || (analysis.gmgnData?.isBundled || false),
        pumpDump: analysis.pumpDumpData?.isRugPull || false,
        liquidityIssue: analysis.liquidityMonitor?.riskScore ? analysis.liquidityMonitor.riskScore >= 70 : false,
        coordinatedSelloff: analysis.holderTracking?.coordinatedSelloff?.detected || false,
        agedWallets: (analysis.agedWalletData?.riskScore || 0) >= 60,
        gmgnBundle: analysis.gmgnData?.isBundled || false,
      },
      metrics: {
        holderCount: analysis.holderCount,
        topHolderConcentration: analysis.topHolderConcentration,
        priceChange1h: analysis.dexscreenerData?.pairs?.[0]?.priceChange?.h1,
        priceChange24h: analysis.dexscreenerData?.pairs?.[0]?.priceChange?.h24,
        volume24h: analysis.dexscreenerData?.pairs?.[0]?.volume?.h24,
        liquidityUsd: analysis.dexscreenerData?.pairs?.[0]?.liquidity?.usd,
        liquidityToMcap: analysis.liquidityMonitor?.liquidityToMcapRatio?.ratio,
        marketCap: analysis.dexscreenerData?.pairs?.[0]?.marketCap,
        bundleScore: analysis.advancedBundleData?.bundleScore,
        pumpDumpConfidence: analysis.pumpDumpData?.rugConfidence,
        liquidityRiskScore: analysis.liquidityMonitor?.riskScore,
        agedWalletCount: analysis.agedWalletData?.agedWalletCount,
      },
      error: undefined,
    };
  } catch (error) {
    console.log(`  ✗ Error: ${(error as Error).message}`);
    return {
      tokenAddress: token.address,
      symbol: token.symbol,
      name: token.name,
      createdAt: token.createdAt,
      riskScore: 0,
      riskLevel: 'EXTREME',
      detections: {},
      metrics: {},
      error: (error as Error).message,
    };
  }
}

async function main() {
  const tokens = await getRecentPumpFunTokens(100);
  const results = [];
  for (let i = 0; i < tokens.length; i++) {
    const result = await scanToken(tokens[i], i, tokens.length);
    results.push(result);
    if (i < tokens.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  // Save results
  const outputDir = path.join(process.cwd(), 'scan-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outputDir, `pumpfun-scan-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Pump.fun scan results saved to: ${jsonPath}`);
}

main().catch(console.error);

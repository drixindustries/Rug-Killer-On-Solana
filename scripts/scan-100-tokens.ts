/**
 * Comprehensive Token Scanner
 * Scans 100 random tokens to identify missing metrics and patterns
 * 
 * Run: npx tsx scripts/scan-100-tokens.ts
 */

import { tokenAnalyzer } from "../server/solana-analyzer";
import { DexScreenerService } from "../server/dexscreener-service";
import * as fs from 'fs';
import * as path from 'path';

interface ScanResult {
  tokenAddress: string;
  symbol: string;
  name: string;
  timestamp: number;
  
  // Risk metrics
  riskScore: number;
  riskLevel: string;
  
  // Detection results
  detections: {
    honeypot?: boolean;
    bundle?: boolean;
    pumpDump?: boolean;
    liquidityIssue?: boolean;
    coordinatedSelloff?: boolean;
    agedWallets?: boolean;
    gmgnBundle?: boolean;
  };
  
  // Raw metrics
  metrics: {
    // Basic
    holderCount?: number;
    topHolderConcentration?: number;
    
    // Price action
    priceChange1h?: number;
    priceChange24h?: number;
    volume24h?: number;
    
    // Liquidity
    liquidityUsd?: number;
    liquidityToMcap?: number;
    marketCap?: number;
    
    // Advanced
    bundleScore?: number;
    pumpDumpConfidence?: number;
    liquidityRiskScore?: number;
    agedWalletCount?: number;
    
    // Timing
    ageMinutes?: number;
    sellPressure?: number;
  };
  
  // Flags
  criticalFlags: number;
  highFlags: number;
  mediumFlags: number;
  
  // Errors
  error?: string;
}

interface AggregateStats {
  totalScanned: number;
  successful: number;
  failed: number;
  
  // Detection counts
  honeypots: number;
  bundles: number;
  pumpDumps: number;
  liquidityIssues: number;
  coordinatedSelloffs: number;
  agedWalletScams: number;
  
  // Risk distribution
  extremeRisk: number;
  highRisk: number;
  moderateRisk: number;
  lowRisk: number;
  
  // Metric ranges
  avgRiskScore: number;
  avgHolderConcentration: number;
  avgBundleScore: number;
  
  // Patterns found
  patterns: {
    rapidPumps: number;
    instantDumps: number;
    lpDrains: number;
    massExodus: number;
  };
  
  // Missing data (helps identify gaps)
  missingMetrics: {
    noLiquidity: number;
    noHolderData: number;
    noPriceData: number;
    noVolumeData: number;
  };
}

async function getRandomTokens(count: number): Promise<string[]> {
  console.log('🔍 Fetching random tokens from DexScreener...');
  
  const dexService = new DexScreenerService();
  const tokens: string[] = [];
  
  try {
    // Get trending tokens from DexScreener
    const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/solana/trending', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.pairs) {
        const trendingTokens = data.pairs
          .map((pair: any) => pair.baseToken?.address)
          .filter((addr: string) => addr)
          .slice(0, count);
        tokens.push(...trendingTokens);
      }
    }
  } catch (error) {
    console.error('Failed to fetch trending tokens:', error);
  }
  
  // If we don't have enough, get more from search
  if (tokens.length < count) {
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=SOL', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.pairs) {
          const searchTokens = data.pairs
            .map((pair: any) => pair.baseToken?.address)
            .filter((addr: string) => addr && !tokens.includes(addr))
            .slice(0, count - tokens.length);
          tokens.push(...searchTokens);
        }
      }
    } catch (error) {
      console.error('Failed to fetch search tokens:', error);
    }
  }
  
  console.log(`✅ Found ${tokens.length} tokens to scan\n`);
  return tokens.slice(0, count);
}

async function scanToken(address: string, index: number, total: number): Promise<ScanResult> {
  console.log(`\n[${index + 1}/${total}] Scanning: ${address.slice(0, 8)}...`);
  
  try {
    const analysis = await tokenAnalyzer.analyzeToken(address);
    
    // Extract detection flags
    const detections = {
      honeypot: analysis.quillcheckData?.isHoneypot || false,
      bundle: (analysis.advancedBundleData?.bundleScore || 0) >= 60 || (analysis.gmgnData?.isBundled || false),
      pumpDump: analysis.pumpDumpData?.isRugPull || false,
      liquidityIssue: analysis.liquidityMonitor?.riskScore ? analysis.liquidityMonitor.riskScore >= 70 : false,
      coordinatedSelloff: analysis.holderTracking?.coordinatedSelloff?.detected || false,
      agedWallets: (analysis.agedWalletData?.riskScore || 0) >= 60,
      gmgnBundle: analysis.gmgnData?.isBundled || false,
    };
    
    // Count flags by severity
    const criticalFlags = analysis.redFlags.filter((f: any) => f.severity === 'critical').length;
    const highFlags = analysis.redFlags.filter((f: any) => f.severity === 'high').length;
    const mediumFlags = analysis.redFlags.filter((f: any) => f.severity === 'medium').length;
    
    // Extract metrics
    const pair = analysis.dexscreenerData?.pairs?.[0];
    const ageMinutes = pair?.pairCreatedAt 
      ? Math.floor((Date.now() - pair.pairCreatedAt) / 60000)
      : undefined;
    
    const txns = pair?.txns?.h1;
    const sellPressure = txns 
      ? (txns.sells / (txns.buys + txns.sells)) * 100
      : undefined;
    
    const result: ScanResult = {
      tokenAddress: address,
      symbol: analysis.metadata.symbol,
      name: analysis.metadata.name,
      timestamp: Date.now(),
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel,
      detections,
      metrics: {
        holderCount: analysis.holderCount,
        topHolderConcentration: analysis.topHolderConcentration,
        priceChange1h: pair?.priceChange?.h1,
        priceChange24h: pair?.priceChange?.h24,
        volume24h: pair?.volume?.h24,
        liquidityUsd: pair?.liquidity?.usd,
        liquidityToMcap: analysis.liquidityMonitor?.liquidityToMcapRatio?.ratio,
        marketCap: pair?.marketCap,
        bundleScore: analysis.advancedBundleData?.bundleScore,
        pumpDumpConfidence: analysis.pumpDumpData?.rugConfidence,
        liquidityRiskScore: analysis.liquidityMonitor?.riskScore,
        agedWalletCount: analysis.agedWalletData?.agedWalletCount,
        ageMinutes,
        sellPressure,
      },
      criticalFlags,
      highFlags,
      mediumFlags,
    };
    
    console.log(`  ✓ Risk: ${result.riskScore}/100 (${result.riskLevel})`);
    console.log(`  ✓ Flags: ${criticalFlags} critical, ${highFlags} high, ${mediumFlags} medium`);
    
    return result;
  } catch (error) {
    console.log(`  ✗ Error: ${(error as Error).message}`);
    return {
      tokenAddress: address,
      symbol: 'ERROR',
      name: 'ERROR',
      timestamp: Date.now(),
      riskScore: 0,
      riskLevel: 'EXTREME',
      detections: {},
      metrics: {},
      criticalFlags: 0,
      highFlags: 0,
      mediumFlags: 0,
      error: (error as Error).message,
    };
  }
}

function analyzeResults(results: ScanResult[]): AggregateStats {
  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);
  
  const stats: AggregateStats = {
    totalScanned: results.length,
    successful: successful.length,
    failed: failed.length,
    
    honeypots: successful.filter(r => r.detections.honeypot).length,
    bundles: successful.filter(r => r.detections.bundle).length,
    pumpDumps: successful.filter(r => r.detections.pumpDump).length,
    liquidityIssues: successful.filter(r => r.detections.liquidityIssue).length,
    coordinatedSelloffs: successful.filter(r => r.detections.coordinatedSelloff).length,
    agedWalletScams: successful.filter(r => r.detections.agedWallets).length,
    
    extremeRisk: successful.filter(r => r.riskLevel === 'EXTREME').length,
    highRisk: successful.filter(r => r.riskLevel === 'HIGH').length,
    moderateRisk: successful.filter(r => r.riskLevel === 'MODERATE').length,
    lowRisk: successful.filter(r => r.riskLevel === 'LOW').length,
    
    avgRiskScore: successful.reduce((sum, r) => sum + r.riskScore, 0) / successful.length,
    avgHolderConcentration: successful.filter(r => r.metrics.topHolderConcentration).reduce((sum, r) => sum + (r.metrics.topHolderConcentration || 0), 0) / successful.filter(r => r.metrics.topHolderConcentration).length,
    avgBundleScore: successful.filter(r => r.metrics.bundleScore).reduce((sum, r) => sum + (r.metrics.bundleScore || 0), 0) / successful.filter(r => r.metrics.bundleScore).length,
    
    patterns: {
      rapidPumps: successful.filter(r => (r.metrics.priceChange1h || 0) > 300).length,
      instantDumps: successful.filter(r => (r.metrics.priceChange1h || 0) < -60).length,
      lpDrains: successful.filter(r => r.detections.liquidityIssue).length,
      massExodus: successful.filter(r => r.detections.coordinatedSelloff).length,
    },
    
    missingMetrics: {
      noLiquidity: successful.filter(r => !r.metrics.liquidityUsd).length,
      noHolderData: successful.filter(r => !r.metrics.holderCount).length,
      noPriceData: successful.filter(r => !r.metrics.priceChange24h).length,
      noVolumeData: successful.filter(r => !r.metrics.volume24h).length,
    },
  };
  
  return stats;
}

function generateReport(results: ScanResult[], stats: AggregateStats): string {
  let report = '═══════════════════════════════════════════════════════════════\n';
  report += '           100 TOKEN SCAN RESULTS - COMPREHENSIVE ANALYSIS\n';
  report += '═══════════════════════════════════════════════════════════════\n\n';
  
  // Overall stats
  report += '📊 SCAN OVERVIEW:\n';
  report += `  Total Scanned: ${stats.totalScanned}\n`;
  report += `  Successful: ${stats.successful} (${((stats.successful / stats.totalScanned) * 100).toFixed(1)}%)\n`;
  report += `  Failed: ${stats.failed} (${((stats.failed / stats.totalScanned) * 100).toFixed(1)}%)\n\n`;
  
  // Risk distribution
  report += '🎯 RISK DISTRIBUTION:\n';
  report += `  EXTREME Risk: ${stats.extremeRisk} (${((stats.extremeRisk / stats.successful) * 100).toFixed(1)}%)\n`;
  report += `  HIGH Risk: ${stats.highRisk} (${((stats.highRisk / stats.successful) * 100).toFixed(1)}%)\n`;
  report += `  MODERATE Risk: ${stats.moderateRisk} (${((stats.moderateRisk / stats.successful) * 100).toFixed(1)}%)\n`;
  report += `  LOW Risk: ${stats.lowRisk} (${((stats.lowRisk / stats.successful) * 100).toFixed(1)}%)\n`;
  report += `  Avg Risk Score: ${stats.avgRiskScore.toFixed(1)}/100\n\n`;
  
  // Detections
  report += '🚨 THREAT DETECTIONS:\n';
  report += `  Honeypots: ${stats.honeypots} (${((stats.honeypots / stats.successful) * 100).toFixed(1)}%)\n`;
  report += `  Bundle Manipulation: ${stats.bundles} (${((stats.bundles / stats.successful) * 100).toFixed(1)}%)\n`;
  report += `  Pump & Dumps: ${stats.pumpDumps} (${((stats.pumpDumps / stats.successful) * 100).toFixed(1)}%)\n`;
  report += `  Liquidity Issues: ${stats.liquidityIssues} (${((stats.liquidityIssues / stats.successful) * 100).toFixed(1)}%)\n`;
  report += `  Coordinated Selloffs: ${stats.coordinatedSelloffs} (${((stats.coordinatedSelloffs / stats.successful) * 100).toFixed(1)}%)\n`;
  report += `  Aged Wallet Scams: ${stats.agedWalletScams} (${((stats.agedWalletScams / stats.successful) * 100).toFixed(1)}%)\n\n`;
  
  // Patterns
  report += '📈 PRICE PATTERNS:\n';
  report += `  Rapid Pumps (>300% 1h): ${stats.patterns.rapidPumps}\n`;
  report += `  Instant Dumps (<-60% 1h): ${stats.patterns.instantDumps}\n`;
  report += `  LP Drains: ${stats.patterns.lpDrains}\n`;
  report += `  Mass Exodus Events: ${stats.patterns.massExodus}\n\n`;
  
  // Average metrics
  report += '📏 AVERAGE METRICS:\n';
  report += `  Holder Concentration: ${stats.avgHolderConcentration.toFixed(1)}%\n`;
  report += `  Bundle Score: ${stats.avgBundleScore.toFixed(1)}/100\n\n`;
  
  // Missing data
  report += '❓ DATA COMPLETENESS:\n';
  report += `  Missing Liquidity Data: ${stats.missingMetrics.noLiquidity} (${((stats.missingMetrics.noLiquidity / stats.successful) * 100).toFixed(1)}%)\n`;
  report += `  Missing Holder Data: ${stats.missingMetrics.noHolderData} (${((stats.missingMetrics.noHolderData / stats.successful) * 100).toFixed(1)}%)\n`;
  report += `  Missing Price Data: ${stats.missingMetrics.noPriceData} (${((stats.missingMetrics.noPriceData / stats.successful) * 100).toFixed(1)}%)\n`;
  report += `  Missing Volume Data: ${stats.missingMetrics.noVolumeData} (${((stats.missingMetrics.noVolumeData / stats.successful) * 100).toFixed(1)}%)\n\n`;
  
  // Top threats
  report += '⚠️  TOP 10 HIGHEST RISK TOKENS:\n';
  const topThreats = results
    .filter(r => !r.error)
    .sort((a, b) => a.riskScore - b.riskScore)
    .slice(0, 10);
  
  topThreats.forEach((token, idx) => {
    report += `  ${idx + 1}. ${token.symbol} - Score: ${token.riskScore}/100 (${token.criticalFlags} critical flags)\n`;
    report += `     Address: ${token.tokenAddress}\n`;
  });
  
  report += '\n';
  report += '═══════════════════════════════════════════════════════════════\n';
  
  return report;
}

async function main() {
  console.log('🚀 Starting 100-token comprehensive scan...\n');
  
  const tokens = await getRandomTokens(100);
  const results: ScanResult[] = [];
  
  // Scan tokens with rate limiting
  for (let i = 0; i < tokens.length; i++) {
    const result = await scanToken(tokens[i], i, tokens.length);
    results.push(result);
    
    // Rate limit: 1 second between scans
    if (i < tokens.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Analyze results
  console.log('\n\n📊 Analyzing results...\n');
  const stats = analyzeResults(results);
  const report = generateReport(results, stats);
  
  // Print report
  console.log(report);
  
  // Save detailed results
  const outputDir = path.join(process.cwd(), 'scan-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outputDir, `scan-${timestamp}.json`);
  const reportPath = path.join(outputDir, `report-${timestamp}.txt`);
  
  fs.writeFileSync(jsonPath, JSON.stringify({ results, stats }, null, 2));
  fs.writeFileSync(reportPath, report);
  
  console.log(`\n✅ Results saved to:`);
  console.log(`   ${jsonPath}`);
  console.log(`   ${reportPath}`);
}

main().catch(console.error);

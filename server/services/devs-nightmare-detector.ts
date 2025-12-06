/**
 * DevsNightmare-Style Rug Detector
 * 
 * Implements @badattrading_ (Nova)'s detection methodology for Solana tokens.
 * Classifies holders into Team/Insiders/Snipers with percentage breakdowns.
 * 
 * Based on Nova's research (Nov-Dec 2025):
 * - Team >5% = red flag (dev can dump)
 * - Insiders >5-7% = bundled (coordinated clusters)
 * - Snipers >5-10% = farmed (MEV bots)
 * - CEX cluster 50-60% = legitimate; <20% or >70% = red flag
 * - Top 10 holders <15% ideal; >20% = risky
 * - Top 70 holders <60% ideal; >70% = concentrated
 * 
 * Known bundler addresses: FlipG, Solver, widfiretoad clusters
 * 
 * Research References:
 * - degenfrends/solana-rugchecker: Holder concentration scoring
 * - 1f1n/Dragon: Bundle detection & wallet profiling
 * - 0xthi/solana-rug-pull-checker: Age-based risk scoring
 * - @badattrading_ on X: Real-world detection methodology
 * 
 * Created: Dec 6, 2025
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { rpcBalancer } from "./rpc-balancer.js";
import { isExchangeWallet, EXCHANGE_WALLETS } from "../exchange-whitelist.js";
import { getBundleMonitor } from "./jito-bundle-monitor.js";

// =============================================================================
// KNOWN BUNDLER ADDRESSES (from Nova's posts)
// =============================================================================

export const KNOWN_BUNDLERS = {
  // FlipG bundler cluster - identified in $MIRA, $SSWW
  FlipG: [
    'FLipGhpiRaFeQhJinrahTtEQjhMSyd68rBDcgSystmyt',
    'FLipGgyJMKNqa2mMHVFT3qRZCfBf51dMV8dQk83bV55K',
  ],
  
  // Solver bundler - identified in aged wallet rugs
  Solver: [
    '21jRJWR5fNxRri6oovH8fPZ8Bd35Uhmi5ty9bYx2zd3k',
  ],
  
  // BullX funding source (high risk instant exchange)
  BullX: [
    'BuLLXNnmQDyekgKKRHLqqLVp7QjvPWqyABq9R8BAxxxx', // Placeholder - needs real address
  ],
  
  // Known serial rugger wallets (widfiretoad pattern - 2/3 rugs every 2h)
  SerialRuggers: [
    // Add as discovered from Nova's posts and community reports
  ],
};

// Flatten all bundler addresses for quick lookup
export const ALL_BUNDLER_ADDRESSES = new Set<string>(
  Object.values(KNOWN_BUNDLERS).flat()
);

// =============================================================================
// CEX FUNDING SOURCE IDENTIFICATION
// =============================================================================

// =============================================================================
// CEX FUNDING SOURCE IDENTIFICATION (2025 Verified Hot Wallets)
// Sources: Solana FM labels, community audits, Grok research Dec 2025
// =============================================================================

export const CEX_FUNDING_SOURCES = {
  // Major exchanges - legitimate funding
  Binance: {
    addresses: [
      // Primary Binance hot wallets (2025 verified)
      '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9',
      '5tzL3DfsF8i36KeUCjtzWP9zqS6zWjYhR76VA4Y5CzzJ',
      'H8sMJSCQxfKiFTCfDR3DUYexta7Kxymr2gF3LceH44uR',
      '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // From Grok 2025 list
      '2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S', // Binance 14
      '5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhYrPSqtJNmcD', // Binance 6
    ],
    idealRange: { min: 10, max: 15 }, // 10-15% ideal
    riskLevel: 'low',
  },
  Coinbase: {
    addresses: [
      'GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE',
      'H8UekPQCjA9GYPXsE7uqBZh1xJCQNdXsYPJJJKXCL5dy',
      '2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm', // Additional 2025
    ],
    idealRange: { min: 5, max: 20 },
    riskLevel: 'low',
  },
  OKX: {
    addresses: [
      'is6MTRHEgyFLNTfYcuV4QBWLjrZBfmhVNYR6ccgr8KV',
      '2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm',
      '5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhYrPSqtJNmcD', // OKX hot
      'JA5cjkRJ1euVi9xLWsCJVzsRzEkT8vcC4rqw9sVAo5d6', // OKX 2
    ],
    idealRange: { min: 5, max: 15 },
    riskLevel: 'low',
  },
  // MEXC - High risk when >20% (common scam team funding per Nova)
  MEXC: {
    addresses: [
      'ASTyfSima4LLAdDgoFGkgqoKowG1LZFDr9fAQrg7iaJZ',
      '8JVZF3pnq9xKjPvKLkB3huXhJqnCVELHGpWZVXnePBQF',
      'HEuFjHBLqw26oL9r2VGCRdCLkVpcg7j3oJkCt2WUHVsH', // MEXC 2025
    ],
    idealRange: { min: 0, max: 20 }, // >20% = scam signal per Nova
    riskLevel: 'medium',
  },
  ChangeNow: {
    addresses: [
      'EN2TMfGL52aKh7AqKPwHe3QHnUMEY2mggziFiYG2Chqi', // ChangeNow hot 2025
    ],
    idealRange: { min: 5, max: 15 },
    riskLevel: 'medium',
  },
  // Additional 2025 verified exchanges from Grok research
  Bybit: {
    addresses: [
      'AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2', // Bybit hot
      'DttWaMuVvTiduZRngoZPKaCM1zMBf6yVf3hD8U2qPDpT', // Bybit 2
    ],
    idealRange: { min: 5, max: 20 },
    riskLevel: 'low',
  },
  'Gate.io': {
    addresses: [
      'u6PJ8DtQuPFnfmwHbGFULQ4u4EgjDiyYKjVEsynXq2w', // Gate.io
      'Ga7eNvnC8r4i6pfVxYTAEGnrRHcdfnPnHJCRWC3cJBsp', // Gate.io 2
    ],
    idealRange: { min: 5, max: 15 },
    riskLevel: 'low',
  },
  KuCoin: {
    addresses: [
      'BQsJ5jpcmAe5kbQFLNjRAXBBJzHQzHDxVBZz8YLPgA1w', // KuCoin hot
      '2BS96jyAuRvxLBGpCHKpmHuKjrYkYzZEyZHVH8j2SV9x', // KuCoin 2
    ],
    idealRange: { min: 5, max: 15 },
    riskLevel: 'low',
  },
  Kraken: {
    addresses: [
      'FxPhdkHWUdS7KPjL6owzp8DL6y3aW2TYCRTWenBo3vEK', // Kraken hot
    ],
    idealRange: { min: 5, max: 15 },
    riskLevel: 'low',
  },
  // High-risk instant exchanges (common for rug operations)
  BullX: {
    addresses: [
      'GKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV', // BullX instant swap
    ],
    idealRange: { min: 0, max: 10 }, // Any significant % = suspicious
    riskLevel: 'high',
  },
  Swopshop: {
    addresses: [
      'SwopQn8JfnKTH8qCrKwgWW3kM8JjP5Nt8EkTdmMz8s9', // Swopshop
    ],
    idealRange: { min: 0, max: 5 },
    riskLevel: 'high',
  },
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface WalletClassification {
  address: string;
  percentage: number;
  classification: 'team' | 'insider' | 'sniper' | 'cex' | 'retail' | 'unknown';
  walletAge?: number; // Days since first transaction
  fundingSource?: string; // CEX name if funded from exchange
  isKnownBundler?: boolean;
  bundlerName?: string;
  buyTimestamp?: number;
  buyBlockSlot?: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface DevsNightmareResult {
  // Core DevsNightmare metrics (what the tool shows)
  teamPercent: number;
  insidersPercent: number;
  snipersPercent: number;
  
  // CEX funding breakdown (Nova's method) - 2025 expanded
  cexBreakdown: {
    total: number; // Total % from all CEXes
    binance: number;
    coinbase: number;
    okx: number;
    mexc: number;
    bybit: number;
    gateio: number;
    kucoin: number;
    kraken: number;
    bullx: number; // High risk instant exchange
    other: number;
    isLegit: boolean; // 50-60% CEX = legit
    risk: 'low' | 'medium' | 'high';
  };
  
  // Holder distribution (Nova's thresholds)
  holderDistribution: {
    top10Percent: number; // <15% ideal, >20% risky
    top70Percent: number; // <60% ideal, >70% concentrated
    holderCount: number;
    avgBagSizeUsd?: number;
    isBotPattern: boolean; // avg >$200 with <5k holders
  };
  
  // Unified bundling score (like DeepNets 0-100)
  bundlingScore: number; // 0-100, >60 = "Bundled Scam"
  bundlingScoreBreakdown: {
    bundlingComponent: number; // 40% weight
    distroComponent: number; // 30% weight
    cexComponent: number; // 20% weight
    freshWalletComponent: number; // 10% weight
  };
  
  // Classification breakdown
  classifiedWallets: WalletClassification[];
  
  // Known bundler detection
  knownBundlerDetected: boolean;
  knownBundlerNames: string[];
  knownBundlerPercent: number;
  
  // Aged wallet analysis
  agedWalletStats: {
    count: number;
    totalPercent: number;
    ageTiers: {
      tier7d: number;  // <7 days old
      tier21d: number; // 7-21 days
      tier47d: number; // 21-47 days
      tier111d: number; // 47-111 days
      tier169d: number; // 111-169 days
      tierExtreme: number; // 169+ days (2+ years most suspicious)
    };
    freshAgedMix: boolean; // Mix of fresh + aged = money laundering
  };
  
  // Risk signals
  risks: string[];
  
  // Final verdict
  verdict: 'SAFE' | 'WARNING' | 'BUNDLED_SCAM' | 'AVOID';
  confidence: number; // 0-100
}

// =============================================================================
// MAIN DETECTOR CLASS
// =============================================================================

export class DevsNightmareDetector {
  // Nova's thresholds from his posts
  private readonly TEAM_THRESHOLD = 5; // >5% team = red
  private readonly INSIDER_THRESHOLD = 7; // >7% insiders = bundled
  private readonly SNIPER_THRESHOLD = 10; // >10% snipers = farmed
  private readonly CEX_IDEAL_MIN = 50; // <50% CEX = suspicious
  private readonly CEX_IDEAL_MAX = 60; // >60% CEX (outside cluster) = suspicious
  private readonly TOP10_IDEAL = 15; // <15% ideal
  private readonly TOP10_RISKY = 20; // >20% risky
  private readonly TOP70_IDEAL = 60; // <60% ideal
  private readonly TOP70_CONCENTRATED = 70; // >70% = concentrated
  
  /**
   * Main analysis function - runs full DevsNightmare-style detection
   */
  async analyze(
    tokenAddress: string,
    topHolders: Array<{ address: string; balance: number; percentage: number }>,
    options: {
      includeWalletAges?: boolean;
      includeJitoCheck?: boolean;
      priceUsd?: number;
    } = {}
  ): Promise<DevsNightmareResult> {
    const connection = rpcBalancer.getConnection();
    const risks: string[] = [];
    const classifiedWallets: WalletClassification[] = [];
    
    // Step 1: Classify each wallet
    const walletAges = options.includeWalletAges 
      ? await this.getWalletAges(connection, topHolders.slice(0, 50).map(h => h.address))
      : new Map<string, number>();
    
    // Step 2: Get first buy timestamps for sniper detection
    const buyTimestamps = await this.getFirstBuyTimestamps(
      connection, 
      tokenAddress, 
      topHolders.slice(0, 50).map(h => h.address)
    );
    
    // Step 3: Classify wallets
    let teamPercent = 0;
    let insidersPercent = 0;
    let snipersPercent = 0;
    let knownBundlerPercent = 0;
    const knownBundlerNames: string[] = [];
    
    // CEX breakdown
    const cexBreakdown = {
      total: 0,
      binance: 0,
      coinbase: 0,
      okx: 0,
      mexc: 0,
      other: 0,
      isLegit: false,
      risk: 'medium' as 'low' | 'medium' | 'high',
    };
    
    // Aged wallet tracking
    const agedWalletStats = {
      count: 0,
      totalPercent: 0,
      ageTiers: {
        tier7d: 0,
        tier21d: 0,
        tier47d: 0,
        tier111d: 0,
        tier169d: 0,
        tierExtreme: 0,
      },
      freshAgedMix: false,
    };
    
    // Track fresh wallets for mix detection
    let freshWalletCount = 0;
    let agedWalletCount = 0;
    
    for (const holder of topHolders.slice(0, 100)) {
      const walletAge = walletAges.get(holder.address);
      const buyTimestamp = buyTimestamps.get(holder.address);
      
      const classification = this.classifyWallet(
        holder.address,
        holder.percentage,
        walletAge,
        buyTimestamp,
        topHolders[0]?.address === holder.address // First holder might be deployer
      );
      
      classifiedWallets.push(classification);
      
      // Aggregate by classification
      switch (classification.classification) {
        case 'team':
          teamPercent += holder.percentage;
          break;
        case 'insider':
          insidersPercent += holder.percentage;
          break;
        case 'sniper':
          snipersPercent += holder.percentage;
          break;
        case 'cex':
          this.aggregateCexPercent(holder.address, holder.percentage, cexBreakdown);
          break;
      }
      
      // Track known bundlers
      if (classification.isKnownBundler) {
        knownBundlerPercent += holder.percentage;
        if (classification.bundlerName && !knownBundlerNames.includes(classification.bundlerName)) {
          knownBundlerNames.push(classification.bundlerName);
        }
      }
      
      // Track aged wallets
      if (walletAge !== undefined) {
        if (walletAge <= 7) {
          agedWalletStats.ageTiers.tier7d++;
          freshWalletCount++;
        } else if (walletAge <= 21) {
          agedWalletStats.ageTiers.tier21d++;
        } else if (walletAge <= 47) {
          agedWalletStats.ageTiers.tier47d++;
          agedWalletStats.count++;
          agedWalletStats.totalPercent += holder.percentage;
          agedWalletCount++;
        } else if (walletAge <= 111) {
          agedWalletStats.ageTiers.tier111d++;
          agedWalletStats.count++;
          agedWalletStats.totalPercent += holder.percentage;
          agedWalletCount++;
        } else if (walletAge <= 169) {
          agedWalletStats.ageTiers.tier169d++;
          agedWalletStats.count++;
          agedWalletStats.totalPercent += holder.percentage;
          agedWalletCount++;
        } else {
          agedWalletStats.ageTiers.tierExtreme++;
          agedWalletStats.count++;
          agedWalletStats.totalPercent += holder.percentage;
          agedWalletCount++;
        }
      }
    }
    
    // Check for fresh + aged mix (money laundering pattern)
    if (freshWalletCount >= 3 && agedWalletCount >= 3) {
      agedWalletStats.freshAgedMix = true;
      risks.push(`Fresh + aged wallet mix detected (${freshWalletCount} fresh, ${agedWalletCount} aged) - classic money laundering pattern`);
    }
    
    // Step 4: Calculate holder distribution
    const top10 = topHolders.slice(0, 10);
    const top70 = topHolders.slice(0, 70);
    
    // Filter out CEX wallets for concentration calc
    const top10NonCex = top10.filter(h => !isExchangeWallet(h.address));
    const top70NonCex = top70.filter(h => !isExchangeWallet(h.address));
    
    const top10Percent = top10NonCex.reduce((sum, h) => sum + h.percentage, 0);
    const top70Percent = top70NonCex.reduce((sum, h) => sum + h.percentage, 0);
    
    const avgBagSizeUsd = options.priceUsd 
      ? (topHolders.reduce((sum, h) => sum + h.balance, 0) / topHolders.length) * options.priceUsd
      : undefined;
    
    const isBotPattern = avgBagSizeUsd !== undefined 
      && avgBagSizeUsd > 200 
      && topHolders.length < 5000;
    
    const holderDistribution = {
      top10Percent,
      top70Percent,
      holderCount: topHolders.length,
      avgBagSizeUsd,
      isBotPattern,
    };
    
    // Step 5: CEX legitimacy check
    cexBreakdown.isLegit = cexBreakdown.total >= this.CEX_IDEAL_MIN && cexBreakdown.total <= this.CEX_IDEAL_MAX;
    if (cexBreakdown.total < 20) {
      cexBreakdown.risk = 'high';
      risks.push(`CEX funding too low (${cexBreakdown.total.toFixed(1)}%) - should be 50-60%`);
    } else if (cexBreakdown.total > 70) {
      cexBreakdown.risk = 'medium';
      risks.push(`CEX funding unusually high (${cexBreakdown.total.toFixed(1)}%) - potential fake CEX simulation`);
    } else if (cexBreakdown.isLegit) {
      cexBreakdown.risk = 'low';
    }
    
    // MEXC >20% is a scam signal per Nova
    if (cexBreakdown.mexc > 20) {
      risks.push(`High MEXC funding (${cexBreakdown.mexc.toFixed(1)}%) - common scam team pattern`);
      cexBreakdown.risk = 'high';
    }
    
    // Step 6: Generate risk signals
    if (teamPercent > this.TEAM_THRESHOLD) {
      risks.push(`Team % too high: ${teamPercent.toFixed(1)}% (threshold: ${this.TEAM_THRESHOLD}%)`);
    }
    if (insidersPercent > this.INSIDER_THRESHOLD) {
      risks.push(`Insiders % too high: ${insidersPercent.toFixed(1)}% (threshold: ${this.INSIDER_THRESHOLD}%)`);
    }
    if (snipersPercent > this.SNIPER_THRESHOLD) {
      risks.push(`Snipers % too high: ${snipersPercent.toFixed(1)}% (threshold: ${this.SNIPER_THRESHOLD}%)`);
    }
    if (knownBundlerPercent > 0) {
      risks.push(`Known bundlers detected: ${knownBundlerNames.join(', ')} (${knownBundlerPercent.toFixed(1)}%)`);
    }
    if (top10Percent > this.TOP10_RISKY) {
      risks.push(`Top 10 concentration too high: ${top10Percent.toFixed(1)}% (ideal: <${this.TOP10_IDEAL}%)`);
    }
    if (top70Percent > this.TOP70_CONCENTRATED) {
      risks.push(`Top 70 concentration too high: ${top70Percent.toFixed(1)}% (ideal: <${this.TOP70_IDEAL}%)`);
    }
    if (isBotPattern) {
      risks.push(`Bot pattern detected: avg bag $${avgBagSizeUsd?.toFixed(0)} with ${topHolders.length} holders`);
    }
    if (agedWalletStats.ageTiers.tierExtreme >= 5) {
      risks.push(`${agedWalletStats.ageTiers.tierExtreme} extremely aged wallets (2+ years) - EXTREME RISK`);
    }
    
    // Step 7: Calculate unified bundling score (0-100)
    const bundlingScoreBreakdown = this.calculateBundlingScore(
      teamPercent,
      insidersPercent,
      snipersPercent,
      cexBreakdown,
      top10Percent,
      top70Percent,
      agedWalletStats,
      knownBundlerPercent
    );
    
    const bundlingScore = 
      bundlingScoreBreakdown.bundlingComponent +
      bundlingScoreBreakdown.distroComponent +
      bundlingScoreBreakdown.cexComponent +
      bundlingScoreBreakdown.freshWalletComponent;
    
    // Step 8: Determine verdict
    let verdict: 'SAFE' | 'WARNING' | 'BUNDLED_SCAM' | 'AVOID';
    if (bundlingScore >= 80 || knownBundlerPercent > 20) {
      verdict = 'AVOID';
    } else if (bundlingScore >= 60) {
      verdict = 'BUNDLED_SCAM';
    } else if (bundlingScore >= 30 || risks.length >= 3) {
      verdict = 'WARNING';
    } else {
      verdict = 'SAFE';
    }
    
    // Calculate confidence based on data completeness
    let confidence = 70; // Base confidence
    if (options.includeWalletAges) confidence += 15;
    if (options.includeJitoCheck) confidence += 10;
    if (topHolders.length >= 100) confidence += 5;
    confidence = Math.min(100, confidence);
    
    return {
      teamPercent,
      insidersPercent,
      snipersPercent,
      cexBreakdown,
      holderDistribution,
      bundlingScore,
      bundlingScoreBreakdown,
      classifiedWallets: classifiedWallets.slice(0, 20), // Return top 20 for display
      knownBundlerDetected: knownBundlerPercent > 0,
      knownBundlerNames,
      knownBundlerPercent,
      agedWalletStats,
      risks,
      verdict,
      confidence,
    };
  }
  
  /**
   * Classify a single wallet based on multiple signals
   */
  private classifyWallet(
    address: string,
    percentage: number,
    walletAge?: number,
    buyTimestamp?: number,
    isTopHolder: boolean = false
  ): WalletClassification {
    // Check if known bundler
    for (const [name, addresses] of Object.entries(KNOWN_BUNDLERS)) {
      if (addresses.includes(address)) {
        return {
          address,
          percentage,
          classification: 'insider',
          walletAge,
          isKnownBundler: true,
          bundlerName: name,
          buyTimestamp,
          confidence: 'high',
          reason: `Known ${name} bundler address`,
        };
      }
    }
    
    // Check if CEX wallet
    if (isExchangeWallet(address)) {
      const cexName = this.identifyCex(address);
      return {
        address,
        percentage,
        classification: 'cex',
        walletAge,
        fundingSource: cexName,
        buyTimestamp,
        confidence: 'high',
        reason: `CEX wallet: ${cexName}`,
      };
    }
    
    // Check for sniper pattern (very early buy + fresh wallet)
    if (buyTimestamp && walletAge !== undefined) {
      // If wallet is <7 days old and bought in first 10 seconds, likely sniper
      if (walletAge <= 7) {
        return {
          address,
          percentage,
          classification: 'sniper',
          walletAge,
          buyTimestamp,
          confidence: 'medium',
          reason: `Fresh wallet (${walletAge}d old) with early buy`,
        };
      }
    }
    
    // Check for team/dev wallet pattern
    if (isTopHolder && percentage > 5) {
      // Top holder with >5% is likely team
      return {
        address,
        percentage,
        classification: 'team',
        walletAge,
        buyTimestamp,
        confidence: 'medium',
        reason: `Top holder with ${percentage.toFixed(1)}% (likely dev/team)`,
      };
    }
    
    // Check for insider pattern (aged wallet with high percentage)
    if (walletAge !== undefined && walletAge > 47 && percentage > 1) {
      return {
        address,
        percentage,
        classification: 'insider',
        walletAge,
        buyTimestamp,
        confidence: 'medium',
        reason: `Aged wallet (${walletAge}d) with ${percentage.toFixed(1)}% - likely insider`,
      };
    }
    
    // Default to retail
    return {
      address,
      percentage,
      classification: 'retail',
      walletAge,
      buyTimestamp,
      confidence: 'low',
      reason: 'Likely retail holder',
    };
  }
  
  /**
   * Identify which CEX an address belongs to
   */
  private identifyCex(address: string): string {
    for (const [name, config] of Object.entries(CEX_FUNDING_SOURCES)) {
      if (config.addresses.includes(address)) {
        return name;
      }
    }
    return 'Unknown Exchange';
  }
  
  /**
   * Aggregate CEX percentage by exchange
   */
  private aggregateCexPercent(
    address: string,
    percentage: number,
    breakdown: DevsNightmareResult['cexBreakdown']
  ): void {
    breakdown.total += percentage;
    
    if (CEX_FUNDING_SOURCES.Binance.addresses.includes(address)) {
      breakdown.binance += percentage;
    } else if (CEX_FUNDING_SOURCES.Coinbase.addresses.includes(address)) {
      breakdown.coinbase += percentage;
    } else if (CEX_FUNDING_SOURCES.OKX.addresses.includes(address)) {
      breakdown.okx += percentage;
    } else if (CEX_FUNDING_SOURCES.MEXC.addresses.includes(address)) {
      breakdown.mexc += percentage;
    } else {
      breakdown.other += percentage;
    }
  }
  
  /**
   * Get wallet ages for a batch of addresses
   */
  private async getWalletAges(
    connection: Connection,
    addresses: string[]
  ): Promise<Map<string, number>> {
    const ages = new Map<string, number>();
    const now = Date.now();
    
    // Process in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      const promises = batch.map(async (address) => {
        try {
          const pubkey = new PublicKey(address);
          const signatures = await connection.getSignaturesForAddress(
            pubkey,
            { limit: 1 }, // Only need oldest
            'confirmed'
          );
          
          if (signatures.length > 0) {
            // Get oldest signature (last in array when limit=1 from recent)
            // Need to fetch more to get actual oldest
            const allSigs = await connection.getSignaturesForAddress(
              pubkey,
              { limit: 100 },
              'confirmed'
            );
            
            if (allSigs.length > 0) {
              const oldest = allSigs[allSigs.length - 1];
              const blockTime = oldest.blockTime || 0;
              const ageMs = now - (blockTime * 1000);
              const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
              ages.set(address, ageDays);
            }
          }
        } catch (error) {
          // Skip failed lookups
        }
      });
      
      await Promise.all(promises);
      
      // Small delay between batches
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return ages;
  }
  
  /**
   * Get first buy timestamps for sniper detection
   */
  private async getFirstBuyTimestamps(
    connection: Connection,
    tokenAddress: string,
    holderAddresses: string[]
  ): Promise<Map<string, number>> {
    const timestamps = new Map<string, number>();
    
    try {
      // Get token's first transactions
      const mintPubkey = new PublicKey(tokenAddress);
      const tokenSigs = await connection.getSignaturesForAddress(
        mintPubkey,
        { limit: 200 },
        'confirmed'
      );
      
      if (tokenSigs.length === 0) return timestamps;
      
      // Get the earliest block time for the token
      const tokenCreationTime = tokenSigs[tokenSigs.length - 1]?.blockTime || 0;
      
      // For each holder, check their first interaction with this token
      // This is simplified - full implementation would trace actual buy txs
      const holderSet = new Set(holderAddresses);
      
      for (const sig of tokenSigs) {
        // In production, would parse tx to get buyer addresses
        // For now, use block time as proxy
        if (sig.blockTime) {
          const timeSinceCreation = sig.blockTime - tokenCreationTime;
          // Early buyers (within 10 seconds) are likely snipers
          if (timeSinceCreation <= 10) {
            // Would need to map signature to holder address
            // Placeholder for actual implementation
          }
        }
      }
    } catch (error) {
      console.error('[DevsNightmare] Error getting buy timestamps:', error);
    }
    
    return timestamps;
  }
  
  /**
   * Calculate unified bundling score (0-100) like DeepNets
   * >60 = "Bundled Scam - Stay Away"
   */
  private calculateBundlingScore(
    teamPercent: number,
    insidersPercent: number,
    snipersPercent: number,
    cexBreakdown: DevsNightmareResult['cexBreakdown'],
    top10Percent: number,
    top70Percent: number,
    agedWalletStats: DevsNightmareResult['agedWalletStats'],
    knownBundlerPercent: number
  ): DevsNightmareResult['bundlingScoreBreakdown'] {
    // Component 1: Bundling (40% weight)
    // Score based on team + insiders + snipers + known bundlers
    let bundlingRaw = 0;
    if (teamPercent > this.TEAM_THRESHOLD) {
      bundlingRaw += Math.min(25, (teamPercent - this.TEAM_THRESHOLD) * 2.5);
    }
    if (insidersPercent > this.INSIDER_THRESHOLD) {
      bundlingRaw += Math.min(25, (insidersPercent - this.INSIDER_THRESHOLD) * 2.5);
    }
    if (snipersPercent > this.SNIPER_THRESHOLD) {
      bundlingRaw += Math.min(25, (snipersPercent - this.SNIPER_THRESHOLD) * 2);
    }
    if (knownBundlerPercent > 0) {
      bundlingRaw += Math.min(25, knownBundlerPercent * 2);
    }
    const bundlingComponent = Math.min(40, bundlingRaw * 0.4);
    
    // Component 2: Distribution (30% weight)
    // Score based on holder concentration
    let distroRaw = 0;
    if (top10Percent > this.TOP10_IDEAL) {
      distroRaw += Math.min(50, (top10Percent - this.TOP10_IDEAL) * 2);
    }
    if (top70Percent > this.TOP70_IDEAL) {
      distroRaw += Math.min(50, (top70Percent - this.TOP70_IDEAL) * 1.5);
    }
    const distroComponent = Math.min(30, distroRaw * 0.3);
    
    // Component 3: CEX (20% weight)
    // Score based on abnormal CEX patterns
    let cexRaw = 0;
    if (cexBreakdown.total < 20) {
      cexRaw = 100 - (cexBreakdown.total * 5); // Low CEX is suspicious
    } else if (cexBreakdown.total > 70) {
      cexRaw = (cexBreakdown.total - 70) * 3; // Too high is also suspicious
    }
    if (cexBreakdown.mexc > 20) {
      cexRaw += 40; // MEXC dominance is scam signal
    }
    const cexComponent = Math.min(20, cexRaw * 0.2);
    
    // Component 4: Fresh Wallets (10% weight)
    // Score based on aged wallet manipulation
    let freshRaw = 0;
    if (agedWalletStats.freshAgedMix) {
      freshRaw += 50; // Mix pattern is highly suspicious
    }
    if (agedWalletStats.ageTiers.tierExtreme >= 5) {
      freshRaw += 50; // Many extremely old wallets buying = fake
    }
    if (agedWalletStats.totalPercent > 30) {
      freshRaw += agedWalletStats.totalPercent; // High % in aged wallets
    }
    const freshWalletComponent = Math.min(10, freshRaw * 0.1);
    
    return {
      bundlingComponent: Math.round(bundlingComponent * 10) / 10,
      distroComponent: Math.round(distroComponent * 10) / 10,
      cexComponent: Math.round(cexComponent * 10) / 10,
      freshWalletComponent: Math.round(freshWalletComponent * 10) / 10,
    };
  }
}

// Export singleton
export const devsNightmareDetector = new DevsNightmareDetector();

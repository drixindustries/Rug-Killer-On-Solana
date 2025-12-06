/**
 * Time-Based Analysis Service
 * 
 * Historical analysis for detecting slow rugs:
 * - Holder snapshots over time
 * - Slow bleed detection (gradual dev sells)
 * - Distribution changes (fake CTO revivals)
 * - Velocity analysis (dump speed patterns)
 * 
 * Based on Bubblemaps Time Travel concept
 * 
 * Created: Dec 6, 2025
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { rpcBalancer } from "./rpc-balancer.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface HolderSnapshot {
  timestamp: number;
  slot: number;
  holders: Array<{
    address: string;
    balance: number;
    percentage: number;
  }>;
  totalSupply: number;
  top10Percent: number;
  giniCoefficient: number;
}

export interface SlowBleedPattern {
  detected: boolean;
  wallet: string;
  startBalance: number;
  endBalance: number;
  sellPercent: number;
  durationHours: number;
  sellCount: number;
  avgSellSize: number;
  pattern: 'gradual_dump' | 'stair_step' | 'sudden_drop' | 'none';
}

export interface DistributionChange {
  timeframe: string; // e.g., "24h", "7d"
  top10Change: number; // positive = more concentrated
  newWhales: string[]; // Wallets that became top 10
  exitedWhales: string[]; // Wallets that left top 10
  suspiciousTransfers: Array<{
    from: string;
    to: string;
    amount: number;
    timestamp: number;
  }>;
}

export interface TimeBasedResult {
  snapshots: HolderSnapshot[];
  slowBleeds: SlowBleedPattern[];
  distributionChanges: DistributionChange[];
  velocityScore: number; // 0-100, higher = faster dumps
  isSlowRug: boolean;
  isFakeCTO: boolean;
  risks: string[];
  riskScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIME-BASED ANALYZER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class TimeBasedAnalyzer {
  private connection: Connection;
  
  // Thresholds
  private readonly SLOW_BLEED_THRESHOLD = 20; // 20% sell over time = slow bleed
  private readonly GRADUAL_SELL_MIN_TXS = 5; // Minimum sells to be "gradual"
  private readonly DISTRIBUTION_CHANGE_THRESHOLD = 10; // 10% change = significant
  
  constructor() {
    const rpcUrl = rpcBalancer?.select()?.getUrl() || process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Calculate Gini coefficient from balances
   */
  private calculateGini(balances: number[]): number {
    if (balances.length === 0) return 0;
    
    const sorted = [...balances].sort((a, b) => a - b);
    const n = sorted.length;
    const total = sorted.reduce((sum, b) => sum + b, 0);
    
    if (total === 0) return 0;
    
    let sumOfDiffs = 0;
    for (let i = 0; i < n; i++) {
      sumOfDiffs += (2 * (i + 1) - n - 1) * sorted[i];
    }
    
    return Math.max(0, Math.min(1, sumOfDiffs / (n * total)));
  }

  /**
   * Get wallet's sell transactions for a token
   */
  async getWalletSells(
    wallet: string,
    tokenMint: string,
    lookbackHours: number = 168 // 7 days
  ): Promise<Array<{ timestamp: number; amount: number; signature: string }>> {
    const sells: Array<{ timestamp: number; amount: number; signature: string }> = [];
    
    try {
      const pubkey = new PublicKey(wallet);
      const cutoffTime = Date.now() - (lookbackHours * 60 * 60 * 1000);
      
      const signatures = await this.connection.getSignaturesForAddress(pubkey, { limit: 200 });
      
      for (const sig of signatures) {
        if (!sig.blockTime || sig.blockTime * 1000 < cutoffTime) continue;
        
        try {
          const tx = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });
          
          if (!tx?.meta?.postTokenBalances || !tx?.meta?.preTokenBalances) continue;
          
          // Check for token balance decrease (sell)
          const preBal = tx.meta.preTokenBalances.find(
            b => b.mint === tokenMint && b.owner === wallet
          );
          const postBal = tx.meta.postTokenBalances.find(
            b => b.mint === tokenMint && b.owner === wallet
          );
          
          if (preBal && postBal) {
            const preAmount = preBal.uiTokenAmount?.uiAmount || 0;
            const postAmount = postBal.uiTokenAmount?.uiAmount || 0;
            
            if (preAmount > postAmount) {
              sells.push({
                timestamp: sig.blockTime * 1000,
                amount: preAmount - postAmount,
                signature: sig.signature
              });
            }
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.error(`[TimeBasedAnalyzer] Error getting sells for ${wallet}:`, error);
    }
    
    return sells.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Detect slow bleed pattern for a wallet
   */
  async detectSlowBleed(
    wallet: string,
    tokenMint: string,
    initialBalance: number,
    currentBalance: number
  ): Promise<SlowBleedPattern> {
    const sells = await this.getWalletSells(wallet, tokenMint, 168); // 7 days
    
    if (sells.length === 0) {
      return {
        detected: false,
        wallet,
        startBalance: initialBalance,
        endBalance: currentBalance,
        sellPercent: 0,
        durationHours: 0,
        sellCount: 0,
        avgSellSize: 0,
        pattern: 'none'
      };
    }
    
    const totalSold = sells.reduce((sum, s) => sum + s.amount, 0);
    const sellPercent = initialBalance > 0 ? (totalSold / initialBalance) * 100 : 0;
    
    const durationMs = sells[sells.length - 1].timestamp - sells[0].timestamp;
    const durationHours = durationMs / (1000 * 60 * 60);
    
    const avgSellSize = totalSold / sells.length;
    
    // Determine pattern
    let pattern: SlowBleedPattern['pattern'] = 'none';
    
    if (sellPercent >= this.SLOW_BLEED_THRESHOLD) {
      if (sells.length >= this.GRADUAL_SELL_MIN_TXS && durationHours > 24) {
        // Multiple sells over >24h = gradual dump
        pattern = 'gradual_dump';
      } else if (sells.length >= 3 && sells.length < this.GRADUAL_SELL_MIN_TXS) {
        // Few sells in steps = stair step
        pattern = 'stair_step';
      } else if (sells.length <= 2) {
        // 1-2 big sells = sudden drop
        pattern = 'sudden_drop';
      }
    }
    
    return {
      detected: pattern !== 'none',
      wallet,
      startBalance: initialBalance,
      endBalance: currentBalance,
      sellPercent,
      durationHours,
      sellCount: sells.length,
      avgSellSize,
      pattern
    };
  }

  /**
   * Analyze distribution changes over time
   */
  async analyzeDistributionChange(
    tokenMint: string,
    currentHolders: Array<{ address: string; percentage: number }>,
    historicalHolders: Array<{ address: string; percentage: number }> | null
  ): Promise<DistributionChange> {
    const currentTop10 = currentHolders.slice(0, 10);
    const currentTop10Total = currentTop10.reduce((sum, h) => sum + h.percentage, 0);
    
    // If no historical data, return basic info
    if (!historicalHolders) {
      return {
        timeframe: 'unknown',
        top10Change: 0,
        newWhales: [],
        exitedWhales: [],
        suspiciousTransfers: []
      };
    }
    
    const historicalTop10 = historicalHolders.slice(0, 10);
    const historicalTop10Total = historicalTop10.reduce((sum, h) => sum + h.percentage, 0);
    
    // Find new and exited whales
    const currentTop10Addresses = new Set(currentTop10.map(h => h.address));
    const historicalTop10Addresses = new Set(historicalTop10.map(h => h.address));
    
    const newWhales = currentTop10
      .filter(h => !historicalTop10Addresses.has(h.address))
      .map(h => h.address);
    
    const exitedWhales = historicalTop10
      .filter(h => !currentTop10Addresses.has(h.address))
      .map(h => h.address);
    
    return {
      timeframe: '24h',
      top10Change: currentTop10Total - historicalTop10Total,
      newWhales,
      exitedWhales,
      suspiciousTransfers: [] // Would need to track transfers
    };
  }

  /**
   * Calculate velocity score (how fast are dumps happening)
   */
  calculateVelocityScore(slowBleeds: SlowBleedPattern[]): number {
    if (slowBleeds.length === 0) return 0;
    
    let score = 0;
    
    for (const bleed of slowBleeds) {
      if (bleed.pattern === 'sudden_drop') {
        score += 40; // Sudden = high velocity
      } else if (bleed.pattern === 'stair_step') {
        score += 25;
      } else if (bleed.pattern === 'gradual_dump') {
        score += 15; // Gradual = lower velocity but still bad
      }
      
      // Add based on sell percentage
      score += Math.min(20, bleed.sellPercent * 0.5);
    }
    
    return Math.min(100, score);
  }

  /**
   * Detect fake CTO pattern
   * (Token "dies", new wallets accumulate, fake "community takeover")
   */
  detectFakeCTO(
    distributionChange: DistributionChange,
    currentHolders: Array<{ address: string; percentage: number }>
  ): { isFake: boolean; confidence: number; evidence: string[] } {
    const evidence: string[] = [];
    let confidence = 0;
    
    // Check for many new whales
    if (distributionChange.newWhales.length >= 5) {
      evidence.push(`${distributionChange.newWhales.length} new whales appeared in top 10`);
      confidence += 30;
    }
    
    // Check for high concentration in new wallets
    const newWhalePercent = currentHolders
      .filter(h => distributionChange.newWhales.includes(h.address))
      .reduce((sum, h) => sum + h.percentage, 0);
    
    if (newWhalePercent > 30) {
      evidence.push(`New whales control ${newWhalePercent.toFixed(1)}% of supply`);
      confidence += 35;
    }
    
    // Check for old whales exiting
    if (distributionChange.exitedWhales.length >= 3) {
      evidence.push(`${distributionChange.exitedWhales.length} original whales exited`);
      confidence += 20;
    }
    
    // Check distribution change
    if (Math.abs(distributionChange.top10Change) > 15) {
      evidence.push(`Top 10 distribution changed by ${distributionChange.top10Change.toFixed(1)}%`);
      confidence += 15;
    }
    
    return {
      isFake: confidence >= 50,
      confidence: Math.min(100, confidence),
      evidence
    };
  }

  /**
   * Full time-based analysis
   */
  async analyze(
    tokenMint: string,
    holders: Array<{ address: string; balance: number; percentage: number }>,
    historicalHolders?: Array<{ address: string; percentage: number }>
  ): Promise<TimeBasedResult> {
    console.log(`[TimeBasedAnalyzer] Analyzing ${tokenMint.slice(0, 8)}...`);
    
    const risks: string[] = [];
    const slowBleeds: SlowBleedPattern[] = [];
    
    // Analyze top 20 holders for slow bleeds
    for (const holder of holders.slice(0, 20)) {
      if (holder.percentage < 1) continue; // Skip tiny holders
      
      const bleed = await this.detectSlowBleed(
        holder.address,
        tokenMint,
        holder.balance * (1 + holder.percentage / 100), // Estimate initial
        holder.balance
      );
      
      if (bleed.detected) {
        slowBleeds.push(bleed);
        risks.push(`⚠️ Slow bleed detected: ${holder.address.slice(0, 8)}... sold ${bleed.sellPercent.toFixed(1)}% (${bleed.pattern})`);
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 200));
    }
    
    // Analyze distribution changes
    const distChange = await this.analyzeDistributionChange(
      tokenMint,
      holders,
      historicalHolders || null
    );
    
    // Check for fake CTO
    const fakeCTO = this.detectFakeCTO(distChange, holders);
    if (fakeCTO.isFake) {
      risks.push(`🚨 FAKE CTO DETECTED (${fakeCTO.confidence}% confidence)`);
      fakeCTO.evidence.forEach(e => risks.push(`  • ${e}`));
    }
    
    // Calculate velocity
    const velocityScore = this.calculateVelocityScore(slowBleeds);
    
    // Calculate current Gini
    const currentGini = this.calculateGini(holders.map(h => h.balance));
    
    // Create snapshot
    const snapshot: HolderSnapshot = {
      timestamp: Date.now(),
      slot: 0,
      holders: holders.slice(0, 50),
      totalSupply: holders.reduce((sum, h) => sum + h.balance, 0),
      top10Percent: holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0),
      giniCoefficient: currentGini
    };
    
    // Overall risk score
    let riskScore = 0;
    riskScore += slowBleeds.length * 15;
    riskScore += velocityScore * 0.3;
    if (fakeCTO.isFake) riskScore += fakeCTO.confidence * 0.4;
    if (currentGini > 0.7) riskScore += 20;
    
    return {
      snapshots: [snapshot],
      slowBleeds,
      distributionChanges: [distChange],
      velocityScore,
      isSlowRug: slowBleeds.length >= 2 && velocityScore > 30,
      isFakeCTO: fakeCTO.isFake,
      risks,
      riskScore: Math.min(100, riskScore)
    };
  }
}

// Export singleton
export const timeBasedAnalyzer = new TimeBasedAnalyzer();

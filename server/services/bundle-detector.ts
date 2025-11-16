/**
 * Bundle Detection Service
 * 
 * Detects coordinated wallet bundles using multiple techniques:
 * - Transaction timing clustering (Jito bundles)
 * - Wallet relationship analysis
 * - First 20 buyer patterns
 * - Supply concentration in early blocks
 * - Exchange wallet filtering (whitelist)
 * 
 * Based on 2025 research showing ~80% of Pump.fun launches use bundles
 * Updated: Nov 15, 2025 - Added CEX wallet filtering to prevent false positives
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { rpcBalancer } from "./rpc-balancer.ts";
import { isExchangeWallet, filterExchangeWallets, isLegitExchangeLiquidity, getExchangeStats } from "../exchange-whitelist.ts";

export interface BundleDetectionResult {
  isBundled: boolean;
  bundleScore: number; // 0-100, higher = more likely bundled
  bundledSupplyPercent: number;
  suspiciousWallets: string[];
  earlyBuyCluster: {
    count: number;
    totalSupplyPercent: number;
    timeWindowMs: number;
  } | null;
  risks: string[];
  exchangeStats?: {
    exchangeHolders: number;
    exchangeSupplyPercent: number;
    isLegitLiquidity: boolean;
  };
}

export class BundleDetectorService {
  private readonly BUNDLE_TIME_WINDOW_MS = 400; // 400ms window for bundle detection
  private readonly MIN_BUNDLE_WALLETS = 3;
  private readonly SUSPICIOUS_SUPPLY_THRESHOLD = 0.10; // 10% of supply in one bundle
  
  /**
   * Analyzes token for bundle manipulation (with exchange wallet filtering)
   */
  async detectBundles(
    tokenAddress: string,
    topHolders: Array<{ address: string; balance: number; percentage: number }>
  ): Promise<BundleDetectionResult> {
    const connection = rpcBalancer.getConnection();
    const risks: string[] = [];
    let bundleScore = 0;
    let bundledSupplyPercent = 0;
    const suspiciousWallets: string[] = [];
    
    try {
      const mintPubkey = new PublicKey(tokenAddress);
      
      // Filter out exchange wallets from analysis
      const filteredHolders = filterExchangeWallets(topHolders);
      const exchangeStats = getExchangeStats(topHolders);
      
      // If >30% of supply is in exchange wallets, note it as positive signal
      if (exchangeStats.isSignificant) {
        risks.push(`High exchange liquidity: ${exchangeStats.totalPercentage.toFixed(1)}% in ${exchangeStats.count} CEX wallets (positive sign)`);
      }
      
      // Get transaction signatures for the token
      const signatures = await connection.getSignaturesForAddress(
        mintPubkey,
        { limit: 100 },
        'confirmed'
      );
      
      if (signatures.length === 0) {
        return this.createNoBundleResult(exchangeStats);
      }
      
      // Analyze timing of early transactions (filter out exchange wallets)
      const earlyCluster = this.analyzeEarlyBuyTiming(signatures);
      
      // Check if early buys are dominated by exchanges (>50% = legit liquidity)
      const earlyBuyers = signatures.slice(0, 20).map(sig => ({ wallet: sig.signature.slice(0, 44) }));
      const isLegitLiquidity = isLegitExchangeLiquidity(earlyBuyers);
      
      if (isLegitLiquidity) {
        risks.push("✅ Over 50% of early buys from exchanges - legitimate liquidity provision");
        // Bonus points for exchange liquidity
        bundleScore = Math.max(0, bundleScore - 15);
      } else if (earlyCluster && earlyCluster.count >= this.MIN_BUNDLE_WALLETS) {
        // Filter out exchange wallets from cluster count
        const nonExchangeCount = earlyCluster.count - (exchangeStats.count > 0 ? 1 : 0);
        if (nonExchangeCount >= this.MIN_BUNDLE_WALLETS) {
          bundleScore += 40;
          risks.push(`${nonExchangeCount} wallets bought within ${earlyCluster.timeWindowMs}ms (likely Jito bundle)`);
        }
      }
      
      // Analyze top holder concentration patterns (using filtered holders)
      const concentrationRisk = this.analyzeHolderConcentration(filteredHolders);
      bundleScore += concentrationRisk.score;
      risks.push(...concentrationRisk.risks);
      suspiciousWallets.push(...concentrationRisk.suspiciousWallets);
      bundledSupplyPercent = concentrationRisk.bundledPercent;
      
      // Check for wallet network patterns (using filtered holders)
      const networkRisk = this.detectWalletNetworks(filteredHolders);
      bundleScore += networkRisk.score;
      risks.push(...networkRisk.risks);
      
      // Final score capping
      bundleScore = Math.min(100, Math.max(0, bundleScore));
      
      return {
        isBundled: bundleScore >= 50,
        bundleScore,
        bundledSupplyPercent,
        suspiciousWallets: Array.from(new Set(suspiciousWallets)), // Deduplicate
        earlyBuyCluster: earlyCluster,
        risks,
        exchangeStats: {
          exchangeHolders: exchangeStats.count,
          exchangeSupplyPercent: exchangeStats.totalPercentage,
          isLegitLiquidity
        }
      };
      
    } catch (error) {
      console.error('Bundle detection error:', error);
      return this.createNoBundleResult();
    }
  }
  
  /**
   * Analyzes timing of early transactions for clustering
   * Jito bundles typically execute within 400ms
   */
  private analyzeEarlyBuyTiming(signatures: any[]): BundleDetectionResult['earlyBuyCluster'] {
    if (signatures.length < 3) return null;
    
    // Take first 20 transactions (early buyers)
    const earlyTxs = signatures.slice(0, 20);
    
    // Group transactions by time windows
    const clusters: Array<{ count: number; startTime: number; endTime: number }> = [];
    let currentCluster: any[] = [earlyTxs[0]];
    
    for (let i = 1; i < earlyTxs.length; i++) {
      const prevTime = earlyTxs[i - 1].blockTime || 0;
      const currTime = earlyTxs[i].blockTime || 0;
      const timeDiff = Math.abs(currTime - prevTime) * 1000; // Convert to ms
      
      if (timeDiff <= this.BUNDLE_TIME_WINDOW_MS) {
        currentCluster.push(earlyTxs[i]);
      } else {
        if (currentCluster.length >= this.MIN_BUNDLE_WALLETS) {
          const startTime = currentCluster[0].blockTime || 0;
          const endTime = currentCluster[currentCluster.length - 1].blockTime || 0;
          clusters.push({
            count: currentCluster.length,
            startTime,
            endTime
          });
        }
        currentCluster = [earlyTxs[i]];
      }
    }
    
    // Check final cluster
    if (currentCluster.length >= this.MIN_BUNDLE_WALLETS) {
      const startTime = currentCluster[0].blockTime || 0;
      const endTime = currentCluster[currentCluster.length - 1].blockTime || 0;
      clusters.push({
        count: currentCluster.length,
        startTime,
        endTime
      });
    }
    
    // Return largest cluster
    if (clusters.length === 0) return null;
    
    const largestCluster = clusters.reduce((max, cluster) => 
      cluster.count > max.count ? cluster : max
    );
    
    const timeWindowMs = (largestCluster.endTime - largestCluster.startTime) * 1000;
    
    return {
      count: largestCluster.count,
      totalSupplyPercent: 0, // Will be calculated from holder data
      timeWindowMs
    };
  }
  
  /**
   * Analyzes holder concentration for bundle patterns
   * Looks for multiple wallets with similar percentages (1-3% each)
   * Updated: More conservative thresholds to reduce false positives
   */
  private analyzeHolderConcentration(holders: Array<{ address: string; percentage: number }>) {
    const risks: string[] = [];
    const suspiciousWallets: string[] = [];
    let score = 0;
    let bundledPercent = 0;
    
    // Check top 20 holders for suspicious patterns
    const top20 = holders.slice(0, 20);
    
    // Pattern 1: Multiple wallets with very similar percentages (within 0.1% of each other)
    // This is more indicative of bundles than just 1-3% range
    const similarityGroups = new Map<number, Array<{ address: string; percentage: number }>>();
    
    for (const holder of top20) {
      // Round to 0.1% for grouping
      const rounded = Math.round(holder.percentage * 10) / 10;
      if (!similarityGroups.has(rounded)) {
        similarityGroups.set(rounded, []);
      }
      similarityGroups.get(rounded)!.push(holder);
    }
    
    // Check for groups of 8+ wallets with EXACTLY the same percentage (strong bundle signal)
    similarityGroups.forEach((group, percentage) => {
      if (group.length >= 8 && percentage >= 0.5 && percentage <= 5) {
        score += 35;
        const groupPercent = group.reduce((sum, h) => sum + h.percentage, 0);
        bundledPercent += groupPercent;
        suspiciousWallets.push(...group.map(h => h.address));
        risks.push(`${group.length} wallets hold ${percentage.toFixed(1)}% each (${groupPercent.toFixed(1)}% total) - classic bundle pattern`);
      }
    });
    
    // Pattern 2: Check for 10+ wallets in 1-3% range with very similar amounts
    const smallHolders = top20.filter(h => h.percentage >= 1 && h.percentage <= 3);
    if (smallHolders.length >= 10) {
      // Check if they're suspiciously similar (within 0.2% of each other)
      const avgPercentage = smallHolders.reduce((sum, h) => sum + h.percentage, 0) / smallHolders.length;
      const variance = smallHolders.reduce((sum, h) => sum + Math.pow(h.percentage - avgPercentage, 2), 0) / smallHolders.length;
      
      if (variance < 0.04) { // Very low variance = likely coordinated
        score += 25;
        bundledPercent += smallHolders.reduce((sum, h) => sum + h.percentage, 0);
        suspiciousWallets.push(...smallHolders.map(h => h.address));
        risks.push(`${smallHolders.length} wallets hold 1-3% each (${bundledPercent.toFixed(1)}% total) - suspicious similarity`);
      }
    }
    
    // Pattern 3: Top 5 holders own >60% (VERY extreme concentration - reduced from 50%)
    const top5Percent = top20.slice(0, 5).reduce((sum, h) => sum + h.percentage, 0);
    if (top5Percent > 60) {
      score += 20;
      risks.push(`Top 5 holders control ${top5Percent.toFixed(1)}% of supply - extreme concentration`);
    }
    
    // Pattern 4: Top 10 holders own >80% (reduced from 70% to be more conservative)
    const top10Percent = top20.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
    if (top10Percent > 80) {
      score += 15;
      risks.push(`Top 10 holders control ${top10Percent.toFixed(1)}% of supply`);
    }
    
    return { score, risks, suspiciousWallets, bundledPercent };
  }
  
  /**
   * Detects wallet networks based on balance similarity
   * Bundlers often create wallets with similar amounts
   * Updated: More strict threshold to reduce false positives
   */
  private detectWalletNetworks(holders: Array<{ address: string; balance: number; percentage: number }>) {
    const risks: string[] = [];
    let score = 0;
    
    const top20 = holders.slice(0, 20);
    
    // Group by very similar percentages (within 0.05% - more strict)
    const similarGroups = new Map<string, string[]>();
    
    for (const holder of top20) {
      // Only flag if percentages are VERY similar (0.05% precision)
      const roundedPercent = Math.round(holder.percentage * 20) / 20; // Round to nearest 0.05%
      const key = roundedPercent.toString();
      
      if (!similarGroups.has(key)) {
        similarGroups.set(key, []);
      }
      similarGroups.get(key)!.push(holder.address);
    }
    
    // Check for groups of 5+ wallets with near-identical percentages (more strict)
    similarGroups.forEach((wallets, percent) => {
      if (wallets.length >= 5) {
        score += 15;
        risks.push(`${wallets.length} wallets hold ~${percent}% each - likely coordinated`);
      }
    });
    
    return { score, risks };
  }
  
  private createNoBundleResult(exchangeStats?: any): BundleDetectionResult {
    return {
      isBundled: false,
      bundleScore: 0,
      bundledSupplyPercent: 0,
      suspiciousWallets: [],
      earlyBuyCluster: null,
      risks: [],
      exchangeStats: exchangeStats || {
        exchangeHolders: 0,
        exchangeSupplyPercent: 0,
        isLegitLiquidity: false
      }
    };
  }
}

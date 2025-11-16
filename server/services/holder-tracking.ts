/**
 * Top Holder Tracking Service
 * 
 * Monitors top holder behavior to detect:
 * - Coordinated sell-offs (multiple top holders selling simultaneously)
 * - Whale wallet movements
 * - Insider dumping patterns
 * - Developer wallet activity
 * 
 * Created: Nov 15, 2025
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { rpcBalancer } from "./rpc-balancer.ts";
import type { HolderInfo } from "../../shared/schema.ts";

export interface HolderActivity {
  wallet: string;
  rank: number;
  supplyPercent: number;
  activityType: 'selling' | 'buying' | 'holding' | 'unknown';
  recentTransactions: number; // Count of txs in last hour
  sellVolume?: number; // Estimated tokens sold
  buyVolume?: number; // Estimated tokens bought
}

export interface CoordinatedSelloff {
  detected: boolean;
  sellersCount: number;
  combinedSupplyPercent: number;
  timeWindow: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
}

export interface HolderTrackingResult {
  coordinatedSelloff: CoordinatedSelloff | null;
  suspiciousActivities: HolderActivity[];
  topHolderStability: 'stable' | 'volatile' | 'mass_exodus';
  risks: string[];
}

export class HolderTrackingService {
  private readonly SELLOFF_THRESHOLD = 3; // 3+ top holders selling = coordinated
  private readonly TIME_WINDOW_SECONDS = 3600; // 1 hour

  /**
   * Track top holder behavior for coordinated selling
   */
  async trackTopHolders(
    tokenAddress: string,
    topHolders: HolderInfo[]
  ): Promise<HolderTrackingResult> {
    const suspiciousActivities: HolderActivity[] = [];
    const risks: string[] = [];

    try {
      const connection = rpcBalancer.getConnection();
      const mintPubkey = new PublicKey(tokenAddress);

      // Get recent signatures to detect activity
      const signatures = await connection.getSignaturesForAddress(
        mintPubkey,
        { limit: 100 },
        'confirmed'
      );

      const now = Math.floor(Date.now() / 1000);
      const recentSignatures = signatures.filter(
        sig => (sig.blockTime || 0) > now - this.TIME_WINDOW_SECONDS
      );

      // Analyze each top holder's recent activity
      for (const holder of topHolders.slice(0, 10)) {
        const activity = await this.analyzeHolderActivity(
          holder,
          recentSignatures,
          connection
        );
        
        if (activity.activityType === 'selling') {
          suspiciousActivities.push(activity);
        }
      }

      // Detect coordinated sell-off
      const selloffDetection = this.detectCoordinatedSelloff(suspiciousActivities);

      // Determine overall stability
      const stability = this.calculateHolderStability(suspiciousActivities, topHolders.length);

      // Generate risk messages
      if (selloffDetection?.detected) {
        risks.push(`🚨 ${selloffDetection.description}`);
      }

      suspiciousActivities.forEach(activity => {
        if (activity.activityType === 'selling') {
          risks.push(
            `⚠️ Top ${activity.rank} holder (${activity.supplyPercent.toFixed(1)}%) actively selling`
          );
        }
      });

      return {
        coordinatedSelloff: selloffDetection,
        suspiciousActivities,
        topHolderStability: stability,
        risks
      };
    } catch (error) {
      console.error('Holder tracking error:', error);
      return this.createEmptyResult();
    }
  }

  /**
   * Analyze individual holder's recent activity
   */
  private async analyzeHolderActivity(
    holder: HolderInfo,
    recentSignatures: any[],
    connection: Connection
  ): Promise<HolderActivity> {
    let recentTransactions = 0;
    let sellVolume = 0;
    let buyVolume = 0;

    try {
      // Count transactions involving this holder
      for (const sig of recentSignatures.slice(0, 20)) {
        try {
          const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });

          if (!tx || !tx.meta) continue;

          // Check if this transaction involves the holder's wallet
          // Handle both versioned and legacy transactions
          let holderInvolved = false;
          try {
            const message = tx.transaction.message;
            if ('staticAccountKeys' in message) {
              // Versioned transaction
              holderInvolved = message.staticAccountKeys.some(
                (key: any) => key.toString() === holder.address
              );
            } else {
              // Legacy transaction - skip for now
              continue;
            }
          } catch {
            continue;
          }

          if (holderInvolved) {
            recentTransactions++;
            
            // Analyze token balance changes
            const postBalances = tx.meta.postTokenBalances || [];
            const preBalances = tx.meta.preTokenBalances || [];

            for (const postBalance of postBalances) {
              const owner = postBalance.owner;
              if (owner !== holder.address) continue;

              const preBalance = preBalances.find(
                (pre: any) => pre.accountIndex === postBalance.accountIndex
              );

              const preAmount = preBalance?.uiTokenAmount?.uiAmount || 0;
              const postAmount = postBalance?.uiTokenAmount?.uiAmount || 0;
              const diff = postAmount - preAmount;

              if (diff < 0) {
                sellVolume += Math.abs(diff);
              } else if (diff > 0) {
                buyVolume += diff;
              }
            }
          }
        } catch {
          continue; // Skip failed transaction fetches
        }
      }
    } catch (error) {
      // Return partial data if analysis fails
    }

    // Determine activity type
    let activityType: 'selling' | 'buying' | 'holding' | 'unknown' = 'unknown';
    
    if (sellVolume > buyVolume * 2) {
      activityType = 'selling';
    } else if (buyVolume > sellVolume * 2) {
      activityType = 'buying';
    } else if (recentTransactions === 0) {
      activityType = 'holding';
    }

    return {
      wallet: holder.address,
      rank: holder.rank,
      supplyPercent: holder.percentage,
      activityType,
      recentTransactions,
      sellVolume: sellVolume > 0 ? sellVolume : undefined,
      buyVolume: buyVolume > 0 ? buyVolume : undefined
    };
  }

  /**
   * Detect coordinated sell-off among top holders
   */
  private detectCoordinatedSelloff(
    activities: HolderActivity[]
  ): CoordinatedSelloff | null {
    const sellers = activities.filter(a => a.activityType === 'selling');
    
    if (sellers.length < this.SELLOFF_THRESHOLD) {
      return null;
    }

    const combinedSupply = sellers.reduce((sum, a) => sum + a.supplyPercent, 0);
    
    // CRITICAL: 5+ top holders selling with >30% combined supply
    if (sellers.length >= 5 && combinedSupply > 30) {
      return {
        detected: true,
        sellersCount: sellers.length,
        combinedSupplyPercent: combinedSupply,
        timeWindow: '1 hour',
        severity: 'critical',
        confidence: 95,
        description: `MASS EXODUS: ${sellers.length} top holders dumping ${combinedSupply.toFixed(1)}% supply`
      };
    }

    // HIGH: 3-4 top holders selling with >20% combined supply
    if (sellers.length >= 3 && combinedSupply > 20) {
      return {
        detected: true,
        sellersCount: sellers.length,
        combinedSupplyPercent: combinedSupply,
        timeWindow: '1 hour',
        severity: 'high',
        confidence: 85,
        description: `Coordinated sell-off: ${sellers.length} whales dumping ${combinedSupply.toFixed(1)}%`
      };
    }

    // MEDIUM: 3+ holders selling
    if (sellers.length >= 3) {
      return {
        detected: true,
        sellersCount: sellers.length,
        combinedSupplyPercent: combinedSupply,
        timeWindow: '1 hour',
        severity: 'medium',
        confidence: 70,
        description: `${sellers.length} top holders actively selling (${combinedSupply.toFixed(1)}% supply)`
      };
    }

    return null;
  }

  /**
   * Calculate overall top holder stability
   */
  private calculateHolderStability(
    activities: HolderActivity[],
    totalHoldersAnalyzed: number
  ): 'stable' | 'volatile' | 'mass_exodus' {
    const sellers = activities.filter(a => a.activityType === 'selling');
    const sellRatio = sellers.length / totalHoldersAnalyzed;

    if (sellRatio >= 0.5) {
      return 'mass_exodus';
    } else if (sellRatio >= 0.3) {
      return 'volatile';
    } else {
      return 'stable';
    }
  }

  /**
   * Detect developer wallet dumping
   */
  async detectDevDump(
    tokenAddress: string,
    suspectedDevWallets: string[]
  ): Promise<{
    detected: boolean;
    devsDumping: number;
    totalDevSupply: number;
    description: string;
  }> {
    // TODO: Implement dev wallet specific tracking
    // For now, return empty result
    return {
      detected: false,
      devsDumping: 0,
      totalDevSupply: 0,
      description: 'Dev wallet tracking not yet implemented'
    };
  }

  private createEmptyResult(): HolderTrackingResult {
    return {
      coordinatedSelloff: null,
      suspiciousActivities: [],
      topHolderStability: 'stable',
      risks: []
    };
  }
}

// Export singleton
export const holderTracker = new HolderTrackingService();

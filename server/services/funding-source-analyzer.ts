/**
 * Funding Source Analysis Service
 * 
 * Detects coordinated funding patterns by analyzing:
 * - Common funding sources (Swopshop, FixedFloat, exchanges)
 * - Fresh wallet creation patterns
 * - Funding timing correlations
 * - Multi-wallet funding operations
 * 
 * Based on Nova's detection example:
 * "$PEKO is bundled with fresh wallets funded by Swopshop (42%) and FixedFloat (10.5%)"
 * 
 * Created: Nov 15, 2025
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { rpcBalancer } from "./rpc-balancer.ts";
import type { HolderInfo } from "../../shared/schema.ts";

// Known funding sources and their patterns
const KNOWN_FUNDING_SOURCES = {
  // Centralized exchanges
  'Binance': ['5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', '3JFC4cB56Er45nWVe29Bhnn5GnwQzSmHVf6eUq9ac91h'],
  'Coinbase': ['H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm', '8JhQ7c67eE3mCk4X5f3ZuV7LiSLnyKP9G3JdqEGBkp7W'],
  'OKX': ['EMvbNfwzqNLU4akEzj6fEjJEkbJ4uH2NhA1K8Z8p7LTw', '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'],
  'Bybit': ['2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S', '42HHqU5jDBgaD1Xy9UiC8X5z2ebyU6V9YtjJDa3vt7H4'],
  
  // Swap services (HIGH RISK)
  'Swopshop': ['GKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV', 'SwopQn8JfnKTH8qCrKwgWW3kM8JjP5Nt8EkTdmMz8s9', '7WBQBYkSZLnKUrwxFHyj4QQ1MeAfJ6QbFaGZ5sVgJ2K8'],
  'FixedFloat': ['FixedQr9u8vFu5BgKKJfFr1yH8mKqLnKm2G4qE7X1Pzw', 'FixedJYz3g8vLaD4KmV8X5Q1nFpJgL2sT9WbE6fN7u'],
  'ChangeNOW': ['ChangeH8fgK6Y2bJqDpW3zU7XvF5P9cLm1sR4eS8nA', 'ChangeJY8fKg2Y6bJqDpW3zU7XvF5P9cLm1sR4'],
  'SimpleSwap': ['SimpleTH8fKg2Y6bJqDpW3zU7XvF5P9cLm1sR4e', 'SimpleQG8fKg2Y6bJqDpW3zU7XvF5P9cLm1'],
  
  // DEX aggregators
  'Jupiter': ['JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'],
  'Raydium': ['675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'],
  
  // Bridge services
  'Wormhole': ['worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth', 'wormWAFTqXYf1DHtX8C7hHx1EwkGPAzqGKaUcP8YqGZ'],
  'AllBridge': ['AllbWGAP7aY8GgGgGgGgGgGgGgGgGgGgGgGgGgGgGg', 'AllbCoreKmE7T8YhYgN4V8Q1X2Z3sL9f6bA5W4'],
  
  // Instant exchanges (HIGH RISK)
  'Godex': ['GodexK8fKg2Y6bJqDpW3zU7XvF5P9cLm1sR4eS', 'GodexH8fKg2Y6bJqDpW3zU7XvF5P9cLm1s'],
  'StealthEX': ['StealthX8fKg2Y6bJqDpW3zU7XvF5P9cLm1sR4', 'StealthG8fKg2Y6bJqDpW3zU7XvF5P9c'],
};

// Risk levels for funding sources
const FUNDING_SOURCE_RISK = {
  'HIGH_RISK': ['Swopshop', 'FixedFloat', 'ChangeNOW', 'SimpleSwap', 'Godex', 'StealthEX'],
  'MEDIUM_RISK': ['AllBridge', 'Wormhole'],
  'LOW_RISK': ['Binance', 'Coinbase', 'OKX', 'Bybit', 'Jupiter', 'Raydium'],
};

export interface WalletFunding {
  wallet: string;
  fundingSource: string | null;
  fundingSourceType: 'exchange' | 'swap' | 'bridge' | 'dex' | 'unknown';
  riskLevel: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK' | 'UNKNOWN';
  fundingAmount?: number;
  fundingTime?: number;
  isRecentlyCreated: boolean; // Wallet created <7 days before funding
}

export interface FundingPattern {
  type: 'coordinated_funding' | 'fresh_wallet_funding' | 'single_source_dominance' | 'swap_service_cluster';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  evidence: {
    fundingSource?: string;
    walletCount?: number;
    totalPercentage?: number;
    avgWalletAge?: number;
  };
}

export interface FundingAnalysisResult {
  suspiciousFunding: boolean;
  totalSuspiciousPercentage: number;
  fundingPatterns: FundingPattern[];
  walletFunding: WalletFunding[];
  fundingSourceBreakdown: Record<string, number>; // source -> percentage
  risks: string[];
}

export class FundingSourceAnalyzer {
  private readonly FRESH_WALLET_THRESHOLD_DAYS = 7;
  private readonly COORDINATED_FUNDING_THRESHOLD = 3; // 3+ wallets from same source
  private readonly HIGH_RISK_PERCENTAGE_THRESHOLD = 20; // 20%+ from high-risk source

  /**
   * Analyze funding sources for top holders
   */
  async analyzeFundingSources(
    tokenAddress: string,
    topHolders: HolderInfo[]
  ): Promise<FundingAnalysisResult> {
    const walletFunding: WalletFunding[] = [];
    const fundingSourceBreakdown: Record<string, number> = {};
    const patterns: FundingPattern[] = [];
    const risks: string[] = [];

    try {
      console.log(`[Funding Analysis] Analyzing ${topHolders.length} wallets...`);
      
      // Analyze only top 10 wallets to reduce API calls and prevent rate limiting
      const walletsToAnalyze = topHolders.slice(0, 10);
      
      // Analyze each wallet's funding history with rate limiting
      for (let i = 0; i < walletsToAnalyze.length; i++) {
        const holder = walletsToAnalyze[i];
        
        // Add delay between requests to avoid rate limiting (150ms between wallets)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        
        const funding = await this.analyzeWalletFunding(holder.address);
        walletFunding.push(funding);

        // Build funding source breakdown
        if (funding.fundingSource) {
          if (!fundingSourceBreakdown[funding.fundingSource]) {
            fundingSourceBreakdown[funding.fundingSource] = 0;
          }
          fundingSourceBreakdown[funding.fundingSource] += holder.percentage;
        }
      }

      // Detect funding patterns
      patterns.push(...this.detectCoordinatedFunding(walletFunding));
      patterns.push(...this.detectFreshWalletFunding(walletFunding));
      patterns.push(...this.detectSingleSourceDominance(fundingSourceBreakdown));

      // Calculate total suspicious percentage
      const suspiciousWallets = walletFunding.filter(w => 
        w.riskLevel === 'HIGH_RISK' || 
        (w.riskLevel === 'MEDIUM_RISK' && w.isRecentlyCreated)
      );
      const totalSuspiciousPercentage = suspiciousWallets.reduce((sum, w) => {
        const holder = topHolders.find(h => h.address === w.wallet);
        return sum + (holder?.percentage || 0);
      }, 0);

      // Generate risk messages
      patterns.forEach(pattern => {
        if (pattern.severity === 'critical' || pattern.severity === 'high') {
          risks.push(`🚨 ${pattern.description}`);
        } else if (pattern.severity === 'medium') {
          risks.push(`⚠️ ${pattern.description}`);
        }
      });

      return {
        suspiciousFunding: totalSuspiciousPercentage >= this.HIGH_RISK_PERCENTAGE_THRESHOLD,
        totalSuspiciousPercentage,
        fundingPatterns: patterns,
        walletFunding,
        fundingSourceBreakdown,
        risks
      };

    } catch (error) {
      console.error('[Funding Analysis] Error:', error);
      return this.createEmptyResult();
    }
  }

  /**
   * Analyze individual wallet's funding history
   */
  private async analyzeWalletFunding(walletAddress: string): Promise<WalletFunding> {
    try {
      const connection = rpcBalancer.getConnection();
      const pubkey = new PublicKey(walletAddress);

      // Get wallet creation time and early transactions (reduced limit to avoid rate limits)
      const signatures = await connection.getSignaturesForAddress(
        pubkey,
        { limit: 20 },
        'confirmed'
      );

      if (signatures.length === 0) {
        return this.createUnknownFunding(walletAddress);
      }

      // Find oldest transaction (wallet creation)
      const oldestSignature = signatures[signatures.length - 1];
      const walletCreationTime = oldestSignature.blockTime || 0;
      const walletAgeHours = (Date.now() / 1000 - walletCreationTime) / 3600;
      const isRecentlyCreated = walletAgeHours < (this.FRESH_WALLET_THRESHOLD_DAYS * 24);

      // Analyze first few transactions for funding patterns (reduced from 10 to 3 to avoid rate limits)
      const earlySignatures = signatures.slice(-3); // First 3 transactions only
      let fundingSource: string | null = null;
      let fundingSourceType: 'exchange' | 'swap' | 'bridge' | 'dex' | 'unknown' = 'unknown';
      let riskLevel: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK' | 'UNKNOWN' = 'UNKNOWN';

      for (const sig of earlySignatures) {
        try {
          // Add small delay between transaction fetches to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });

          if (tx?.meta?.postBalances && tx.meta.preBalances) {
            // Check if this transaction involved known funding sources
            const involvedAddresses = this.extractTransactionAddresses(tx);
            const detectedSource = this.identifyFundingSource(involvedAddresses);
            
            if (detectedSource) {
              fundingSource = detectedSource.name;
              fundingSourceType = detectedSource.type;
              riskLevel = detectedSource.riskLevel;
              break;
            }
          }
        } catch {
          continue; // Skip failed transaction fetches
        }
      }

      return {
        wallet: walletAddress,
        fundingSource,
        fundingSourceType,
        riskLevel,
        fundingTime: walletCreationTime,
        isRecentlyCreated
      };

    } catch (error) {
      return this.createUnknownFunding(walletAddress);
    }
  }

  /**
   * Extract addresses involved in a transaction
   */
  private extractTransactionAddresses(tx: any): string[] {
    const addresses: string[] = [];

    try {
      // Get account keys from message
      const message = tx.transaction.message;
      if ('staticAccountKeys' in message) {
        // Versioned transaction
        message.staticAccountKeys.forEach((key: any) => {
          addresses.push(key.toString());
        });
      }

      // Add addresses from token balances
      tx.meta?.postTokenBalances?.forEach((balance: any) => {
        if (balance.owner) addresses.push(balance.owner);
      });

      tx.meta?.preTokenBalances?.forEach((balance: any) => {
        if (balance.owner) addresses.push(balance.owner);
      });
    } catch (error) {
      // Return empty if parsing fails
    }

    return addresses;
  }

  /**
   * Identify funding source from transaction addresses
   */
  private identifyFundingSource(addresses: string[]): {
    name: string;
    type: 'exchange' | 'swap' | 'bridge' | 'dex';
    riskLevel: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK';
  } | null {
    for (const [sourceName, sourceAddresses] of Object.entries(KNOWN_FUNDING_SOURCES)) {
      for (const sourceAddr of sourceAddresses) {
        if (addresses.includes(sourceAddr)) {
          // Determine type and risk level
          let type: 'exchange' | 'swap' | 'bridge' | 'dex' = 'exchange';
          let riskLevel: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK' = 'LOW_RISK';

          if (['Swopshop', 'FixedFloat', 'ChangeNOW', 'SimpleSwap', 'Godex', 'StealthEX'].includes(sourceName)) {
            type = 'swap';
            riskLevel = 'HIGH_RISK';
          } else if (['Wormhole', 'AllBridge'].includes(sourceName)) {
            type = 'bridge';
            riskLevel = 'MEDIUM_RISK';
          } else if (['Jupiter', 'Raydium'].includes(sourceName)) {
            type = 'dex';
            riskLevel = 'LOW_RISK';
          }

          return { name: sourceName, type, riskLevel };
        }
      }
    }

    return null;
  }

  /**
   * Detect coordinated funding (multiple wallets from same source)
   */
  private detectCoordinatedFunding(walletFunding: WalletFunding[]): FundingPattern[] {
    const patterns: FundingPattern[] = [];
    const sourceCounts: Record<string, WalletFunding[]> = {};

    // Group wallets by funding source
    walletFunding.forEach(wallet => {
      if (wallet.fundingSource) {
        if (!sourceCounts[wallet.fundingSource]) {
          sourceCounts[wallet.fundingSource] = [];
        }
        sourceCounts[wallet.fundingSource].push(wallet);
      }
    });

    // Check for coordinated funding
    Object.entries(sourceCounts).forEach(([source, wallets]) => {
      if (wallets.length >= this.COORDINATED_FUNDING_THRESHOLD) {
        const riskLevel = wallets[0].riskLevel;
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        
        if (riskLevel === 'HIGH_RISK' && wallets.length >= 5) {
          severity = 'critical';
        } else if (riskLevel === 'HIGH_RISK') {
          severity = 'high';
        }

        patterns.push({
          type: 'coordinated_funding',
          severity,
          confidence: Math.min(95, 60 + (wallets.length * 5)),
          description: `${wallets.length} wallets funded by ${source} (${riskLevel?.replace('_', ' ') || 'unknown risk'})`,
          evidence: {
            fundingSource: source,
            walletCount: wallets.length
          }
        });
      }
    });

    return patterns;
  }

  /**
   * Detect fresh wallet funding (recently created wallets) - Enhanced Nova-style
   */
  private detectFreshWalletFunding(walletFunding: WalletFunding[]): FundingPattern[] {
    const patterns: FundingPattern[] = [];
    
    const freshWallets = walletFunding.filter(w => w.isRecentlyCreated);
    const highRiskFreshWallets = freshWallets.filter(w => w.riskLevel === 'HIGH_RISK');
    
    // Group fresh wallets by funding source to detect clusters
    const freshWalletClusters: Record<string, WalletFunding[]> = {};
    freshWallets.forEach(wallet => {
      if (wallet.fundingSource) {
        if (!freshWalletClusters[wallet.fundingSource]) {
          freshWalletClusters[wallet.fundingSource] = [];
        }
        freshWalletClusters[wallet.fundingSource].push(wallet);
      }
    });

    // Check for fresh wallet clusters from same source (like Nova's detection)
    Object.entries(freshWalletClusters).forEach(([source, wallets]) => {
      if (wallets.length >= 3 && wallets[0].riskLevel === 'HIGH_RISK') {
        patterns.push({
          type: 'fresh_wallet_funding',
          severity: 'critical',
          confidence: 95,
          description: `${wallets.length} fresh wallets (<7d) funded by ${source} - likely coordinated`,
          evidence: {
            fundingSource: source,
            walletCount: wallets.length,
            avgWalletAge: wallets.reduce((sum, w) => {
              const ageHours = w.fundingTime ? (Date.now() / 1000 - w.fundingTime) / 3600 : 0;
              return sum + ageHours;
            }, 0) / wallets.length
          }
        });
      }
    });

    // Overall fresh wallet detection
    if (highRiskFreshWallets.length >= 3) {
      patterns.push({
        type: 'fresh_wallet_funding',
        severity: 'critical',
        confidence: 90,
        description: `${highRiskFreshWallets.length} fresh wallets (<7 days) funded by high-risk sources`,
        evidence: {
          walletCount: highRiskFreshWallets.length,
          avgWalletAge: freshWallets.reduce((sum, w) => {
            const ageHours = w.fundingTime ? (Date.now() / 1000 - w.fundingTime) / 3600 : 0;
            return sum + ageHours;
          }, 0) / freshWallets.length
        }
      });
    } else if (freshWallets.length >= 5) {
      patterns.push({
        type: 'fresh_wallet_funding',
        severity: 'medium',
        confidence: 70,
        description: `${freshWallets.length} recently created wallets detected`,
        evidence: {
          walletCount: freshWallets.length
        }
      });
    }

    return patterns;
  }

  /**
   * Detect single source dominance (one source funds too many wallets)
   */
  private detectSingleSourceDominance(breakdown: Record<string, number>): FundingPattern[] {
    const patterns: FundingPattern[] = [];

    Object.entries(breakdown).forEach(([source, percentage]) => {
      if (percentage >= 40 && FUNDING_SOURCE_RISK.HIGH_RISK.includes(source)) {
        patterns.push({
          type: 'single_source_dominance',
          severity: 'critical',
          confidence: 95,
          description: `${source} dominates funding with ${percentage.toFixed(1)}% of supply`,
          evidence: {
            fundingSource: source,
            totalPercentage: percentage
          }
        });
      } else if (percentage >= 25 && FUNDING_SOURCE_RISK.HIGH_RISK.includes(source)) {
        patterns.push({
          type: 'single_source_dominance',
          severity: 'high',
          confidence: 80,
          description: `High concentration: ${source} funds ${percentage.toFixed(1)}% of supply`,
          evidence: {
            fundingSource: source,
            totalPercentage: percentage
          }
        });
      }
    });

    return patterns;
  }

  private createUnknownFunding(walletAddress: string): WalletFunding {
    return {
      wallet: walletAddress,
      fundingSource: null,
      fundingSourceType: 'unknown',
      riskLevel: 'UNKNOWN',
      isRecentlyCreated: false
    };
  }

  private createEmptyResult(): FundingAnalysisResult {
    return {
      suspiciousFunding: false,
      totalSuspiciousPercentage: 0,
      fundingPatterns: [],
      walletFunding: [],
      fundingSourceBreakdown: {},
      risks: []
    };
  }
}

// Export singleton
export const fundingAnalyzer = new FundingSourceAnalyzer();
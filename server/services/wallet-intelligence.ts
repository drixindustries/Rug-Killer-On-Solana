/**
 * Wallet Intelligence Service
 * 
 * Provides GMGN-style wallet classification and age analysis
 * Analyzes wallet behavior patterns, age, and trading history
 * 
 * Classifications:
 * - Degens: High-risk traders with frequent losses
 * - Bots: Automated trading patterns
 * - Smart Money: Successful traders and whales
 * - Snipers: MEV bots and launch snipers
 * - Aged Wallets: Established wallets (>6 months)
 * - New Wallets: Recently created wallets (<30 days)
 * 
 * Created: Nov 15, 2025
 */

import { fastRPC } from './fast-rpc';
import { redisCache } from './redis-cache';

export interface WalletIntelligence {
  address: string;
  ageInDays: number;
  classification: 'degen' | 'bot' | 'smartMoney' | 'sniper' | 'normal';
  confidence: number; // 0-100
  indicators: {
    isBot: boolean;
    isDegen: boolean;
    isSmartMoney: boolean;
    isSniper: boolean;
    isAged: boolean; // > 6 months
    isNew: boolean; // < 30 days
  };
  stats: {
    totalTransactions: number;
    firstTransactionDate?: number;
    avgTransactionValue: number;
    suspiciousPatterns: string[];
  };
}

export interface WalletIntelligenceResults {
  wallets: WalletIntelligence[];
  summary: {
    avgWalletAge: number;
    oldestWallet: number;
    newestWallet: number;
    ageDistribution: {
      veryNew: number; // < 7 days
      new: number; // 7-30 days
      recent: number; // 30-90 days
      established: number; // 90-365 days
      aged: number; // > 365 days
    };
    classifications: {
      degens: { count: number; supplyPercent: number; addresses: string[] };
      bots: { count: number; supplyPercent: number; addresses: string[] };
      smartMoney: { count: number; supplyPercent: number; addresses: string[] };
      snipers: { count: number; supplyPercent: number; addresses: string[] };
    };
    totals: {
      degens: number;
      bots: number;
      smartMoney: number;
      snipers: number;
      aged: number;
      newWallets: number;
    };
  };
}

export class WalletIntelligenceService {
  
  /**
   * Analyze wallet intelligence for a list of holders
   */
  async analyzeWallets(
    holders: Array<{ address: string; percentage: number; balance: number }>,
    totalSupply: number
  ): Promise<WalletIntelligenceResults> {
    const cacheKey = `wallet-intel:${holders.map(h => h.address).sort().join(',')}`;
    
    return await redisCache.cacheFetch(
      cacheKey,
      async () => {
        console.log(`[WalletIntel] Analyzing ${holders.length} wallets...`);
        
        // Analyze each wallet in parallel (limited to prevent rate limits)
        const batchSize = 10;
        const walletIntelResults: WalletIntelligence[] = [];
        
        for (let i = 0; i < holders.length; i += batchSize) {
          const batch = holders.slice(i, i + batchSize);
          
          const batchResults = await Promise.all(
            batch.map(holder => this.analyzeWallet(holder.address, holder.percentage, holder.balance))
          );
          
          walletIntelResults.push(...batchResults.filter(Boolean) as WalletIntelligence[]);
        }
        
        // Generate summary statistics
        const summary = this.generateSummary(walletIntelResults, holders, totalSupply);
        
        console.log(`[WalletIntel] Analysis complete: ${walletIntelResults.length} wallets classified`);
        
        return {
          wallets: walletIntelResults,
          summary
        };
      },
      300 // 5 minutes cache
    );
  }
  
  /**
   * Analyze individual wallet
   */
  private async analyzeWallet(
    address: string, 
    supplyPercentage: number, 
    balance: number
  ): Promise<WalletIntelligence | null> {
    try {
      // Get wallet creation date and transaction history
      const [accountInfo, signatures] = await Promise.all([
        fastRPC.getAccountInfo(address),
        fastRPC.getSignaturesForAddress(address, { limit: 100 })
      ]);
      
      if (!accountInfo || !signatures.length) {
        return null;
      }
      
      // Calculate wallet age
      const firstTransaction = signatures[signatures.length - 1];
      const firstTxDate = firstTransaction.blockTime ? firstTransaction.blockTime * 1000 : Date.now();
      const ageInDays = (Date.now() - firstTxDate) / (1000 * 60 * 60 * 24);
      
      // Analyze transaction patterns
      const stats = this.analyzeTransactionPatterns(signatures, balance);
      
      // Classify wallet based on patterns
      const indicators = this.generateIndicators(ageInDays, stats, supplyPercentage);
      const classification = this.classifyWallet(indicators, stats);
      const confidence = this.calculateConfidence(indicators, stats);
      
      return {
        address,
        ageInDays,
        classification,
        confidence,
        indicators,
        stats: {
          ...stats,
          firstTransactionDate: firstTxDate
        }
      };
      
    } catch (error) {
      console.error(`[WalletIntel] Error analyzing wallet ${address}:`, error);
      return null;
    }
  }
  
  /**
   * Analyze transaction patterns to identify bot behavior
   */
  private analyzeTransactionPatterns(signatures: any[], balance: number) {
    const suspiciousPatterns: string[] = [];
    
    // Pattern 1: High frequency trading (MEV bot indicator)
    if (signatures.length > 50) {
      const timeSpan = signatures.length > 1 
        ? (signatures[0].blockTime - signatures[signatures.length - 1].blockTime) / (60 * 60) // hours
        : 1;
      
      const txPerHour = signatures.length / timeSpan;
      if (txPerHour > 10) {
        suspiciousPatterns.push('High frequency trading');
      }
    }
    
    // Pattern 2: Regular intervals (bot indicator)
    if (signatures.length >= 10) {
      const intervals = [];
      for (let i = 1; i < Math.min(signatures.length, 20); i++) {
        intervals.push(signatures[i-1].blockTime - signatures[i].blockTime);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      
      if (variance < avgInterval * 0.1) { // Very regular intervals
        suspiciousPatterns.push('Regular transaction intervals');
      }
    }
    
    // Pattern 3: Same block transactions (coordination indicator)
    const blockGroups = new Map();
    signatures.forEach(sig => {
      const slot = sig.slot;
      if (!blockGroups.has(slot)) blockGroups.set(slot, 0);
      blockGroups.set(slot, blockGroups.get(slot) + 1);
    });
    
    const sameBlockTxs = Array.from(blockGroups.values()).filter(count => count > 1).length;
    if (sameBlockTxs > 3) {
      suspiciousPatterns.push('Coordinated same-block transactions');
    }
    
    return {
      totalTransactions: signatures.length,
      avgTransactionValue: balance / Math.max(signatures.length, 1),
      suspiciousPatterns
    };
  }
  
  /**
   * Generate wallet behavior indicators
   */
  private generateIndicators(ageInDays: number, stats: any, supplyPercentage: number) {
    return {
      isBot: stats.suspiciousPatterns.some((p: string) => 
        p.includes('frequency') || p.includes('intervals')
      ),
      isDegen: supplyPercentage > 5 && ageInDays < 30 && stats.totalTransactions > 20,
      isSmartMoney: supplyPercentage > 1 && ageInDays > 90 && stats.totalTransactions > 10,
      isSniper: stats.suspiciousPatterns.includes('same-block') && stats.totalTransactions < 10,
      isAged: ageInDays > 180, // 6 months
      isNew: ageInDays < 30
    };
  }
  
  /**
   * Classify wallet based on indicators
   */
  private classifyWallet(indicators: any, stats: any): WalletIntelligence['classification'] {
    if (indicators.isBot && stats.suspiciousPatterns.length > 1) return 'bot';
    if (indicators.isSniper) return 'sniper';
    if (indicators.isSmartMoney) return 'smartMoney';
    if (indicators.isDegen) return 'degen';
    return 'normal';
  }
  
  /**
   * Calculate classification confidence
   */
  private calculateConfidence(indicators: any, stats: any): number {
    let confidence = 30; // Base confidence
    
    if (stats.totalTransactions > 50) confidence += 20;
    if (stats.suspiciousPatterns.length > 0) confidence += 15 * stats.suspiciousPatterns.length;
    if (indicators.isAged) confidence += 15;
    if (indicators.isBot && stats.suspiciousPatterns.length > 1) confidence += 25;
    
    return Math.min(100, confidence);
  }
  
  /**
   * Generate summary statistics
   */
  private generateSummary(
    wallets: WalletIntelligence[], 
    holders: Array<{ address: string; percentage: number; balance: number }>,
    totalSupply: number
  ): WalletIntelligenceResults['summary'] {
    if (wallets.length === 0) {
      return {
        avgWalletAge: 0,
        oldestWallet: 0,
        newestWallet: 0,
        ageDistribution: { veryNew: 0, new: 0, recent: 0, established: 0, aged: 0 },
        classifications: {
          degens: { count: 0, supplyPercent: 0, addresses: [] },
          bots: { count: 0, supplyPercent: 0, addresses: [] },
          smartMoney: { count: 0, supplyPercent: 0, addresses: [] },
          snipers: { count: 0, supplyPercent: 0, addresses: [] }
        },
        totals: { degens: 0, bots: 0, smartMoney: 0, snipers: 0, aged: 0, newWallets: 0 }
      };
    }
    
    // Calculate age statistics
    const ages = wallets.map(w => w.ageInDays);
    const avgWalletAge = ages.reduce((a, b) => a + b, 0) / ages.length;
    const oldestWallet = Math.max(...ages);
    const newestWallet = Math.min(...ages);
    
    // Age distribution
    const ageDistribution = {
      veryNew: wallets.filter(w => w.ageInDays < 7).length,
      new: wallets.filter(w => w.ageInDays >= 7 && w.ageInDays < 30).length,
      recent: wallets.filter(w => w.ageInDays >= 30 && w.ageInDays < 90).length,
      established: wallets.filter(w => w.ageInDays >= 90 && w.ageInDays < 365).length,
      aged: wallets.filter(w => w.ageInDays >= 365).length
    };
    
    // Classification summaries
    const getClassificationData = (type: WalletIntelligence['classification']) => {
      const classified = wallets.filter(w => w.classification === type);
      const addresses = classified.map(w => w.address);
      const supplyPercent = classified.reduce((sum, w) => {
        const holder = holders.find(h => h.address === w.address);
        return sum + (holder?.percentage || 0);
      }, 0);
      
      return { count: classified.length, supplyPercent, addresses };
    };
    
    const classifications = {
      degens: getClassificationData('degen'),
      bots: getClassificationData('bot'),
      smartMoney: getClassificationData('smartMoney'),
      snipers: getClassificationData('sniper')
    };
    
    const totals = {
      degens: classifications.degens.count,
      bots: classifications.bots.count,
      smartMoney: classifications.smartMoney.count,
      snipers: classifications.snipers.count,
      aged: wallets.filter(w => w.indicators.isAged).length,
      newWallets: wallets.filter(w => w.indicators.isNew).length
    };
    
    return {
      avgWalletAge,
      oldestWallet,
      newestWallet,
      ageDistribution,
      classifications,
      totals
    };
  }
}

export const walletIntelligenceService = new WalletIntelligenceService();
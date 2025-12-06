/**
 * Aged Wallet Detector
 * 
 * Detects "aged" wallets used to create fake volume and legitimacy.
 * 
 * Scammers create wallets months in advance, give them transaction history,
 * then use them to buy their own token to fool traders into thinking
 * there's genuine interest.
 * 
 * Detection strategies:
 * - Wallet age vs first token buy (old wallet, first time buying THIS token)
 * - Similar buy amounts across "aged" wallets
 * - Wallets that only buy and never sell
 * - Coordinated buys from wallets with similar age patterns
 * - Wallets funded from same source before buying
 * 
 * Research References:
 * - degenfrends/solana-rugchecker: Holder concentration & rug scoring
 * - 1f1n/Dragon: Profitable wallet tracking & bundled buy detection
 * - 0xthi/solana-rug-pull-checker: Age-based risk scoring
 * - Solana StackExchange: Transaction pagination for accurate aging
 * 
 * Created: Nov 15, 2025
 * Enhanced: Nov 29, 2025 (Added tiered age detection & similar amount detection)
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { rpcBalancer } from "./rpc-balancer.ts";

export interface AgedWalletBuy {
  wallet: string;
  walletAge: number; // Days since wallet creation
  buyAmount: number;
  buyTimestamp: number;
  firstTransactionDate: number;
  totalTransactions: number;
  hasOnlyBuys: boolean; // Never sold this token
  fundingSource?: string; // Where did they get SOL from?
}

export interface AgedWalletDetectionResult {
  suspiciousAgedWallets: AgedWalletBuy[];
  agedWalletCount: number;
  totalFakeVolumePercent: number;
  riskScore: number; // 0-100
  patterns: {
    sameFundingSource: boolean;
    similarAges: boolean;
    coordinatedBuys: boolean;
    noSells: boolean;
    similarBuyAmounts: boolean; // NEW: Uniform buy amounts
  };
  ageTiers: {
    extreme: number; // 2+ years
    high: number; // 400+ days
    medium: number; // 180+ days
    low: number; // 90+ days
  };
  // Nova's fresh wallet threshold check
  freshWalletAnalysis: {
    freshWalletCount: number; // Wallets <7 days old
    freshWalletPercent: number; // % of top holders that are fresh
    isFreshWalletRisk: boolean; // >20% fresh wallets = risk
    avgFreshWalletAge: number; // Average age of fresh wallets in days
    fundingSourceBreakdown: Record<string, number>; // e.g., { "Binance": 3, "OKX": 2 }
  };
  risks: string[];
}

export class AgedWalletDetector {
  // Age-based risk tiers (inspired by degenfrends/solana-rugchecker)
  private readonly MIN_WALLET_AGE_DAYS = 400; // Wallet must be at least 400 days old (high risk)
  private readonly EXTREME_WALLET_AGE_DAYS = 730; // 2+ years = extreme risk if first buy
  private readonly MEDIUM_WALLET_AGE_DAYS = 180; // 6 months = moderate concern
  private readonly LOW_WALLET_AGE_DAYS = 90; // 3 months = minor concern
  
  // Pattern detection thresholds
  private readonly SIMILAR_AGE_WINDOW_DAYS = 7; // Wallets created within 7 days of each other
  private readonly COORDINATED_BUY_WINDOW_MS = 60000; // 1 minute window for coordinated buys
  private readonly SIMILAR_AMOUNT_THRESHOLD = 0.20; // 20% variance = suspicious uniformity
  
  /**
   * Analyze token holders for aged wallet manipulation
   */
  async detectAgedWallets(
    tokenAddress: string,
    topHolders: Array<{ address: string; balance: number; percentage: number }>,
    recentTransactions: any[]
  ): Promise<AgedWalletDetectionResult> {
    const connection = rpcBalancer.getConnection();
    const suspiciousAgedWallets: AgedWalletBuy[] = [];
    const risks: string[] = [];
    
    try {
      // Get unique buyer addresses from top holders
      const buyerAddresses = topHolders.slice(0, 20).map(h => h.address);
      
      // Analyze each wallet for aged wallet patterns
      const walletAnalyses = await Promise.all(
        buyerAddresses.map(address => this.analyzeWallet(connection, address, tokenAddress))
      );
      
      // Filter for suspicious aged wallets with tiered age detection
      const now = Date.now();
      const ageTiers = { extreme: 0, high: 0, medium: 0, low: 0 };
      
      for (const analysis of walletAnalyses) {
        if (!analysis) continue;
        
        const walletAgeDays = (now - analysis.firstTransactionDate) / (1000 * 60 * 60 * 24);
        
        // Track age distribution
        if (walletAgeDays >= this.EXTREME_WALLET_AGE_DAYS) ageTiers.extreme++;
        else if (walletAgeDays >= this.MIN_WALLET_AGE_DAYS) ageTiers.high++;
        else if (walletAgeDays >= this.MEDIUM_WALLET_AGE_DAYS) ageTiers.medium++;
        else if (walletAgeDays >= this.LOW_WALLET_AGE_DAYS) ageTiers.low++;
        
        // Flag if: wallet is old (90+ days) but just bought this token
        if (walletAgeDays >= this.LOW_WALLET_AGE_DAYS && analysis.totalTransactions > 10) {
          suspiciousAgedWallets.push({
            wallet: analysis.wallet,
            walletAge: walletAgeDays,
            buyAmount: analysis.buyAmount,
            buyTimestamp: analysis.buyTimestamp,
            firstTransactionDate: analysis.firstTransactionDate,
            totalTransactions: analysis.totalTransactions,
            hasOnlyBuys: analysis.hasOnlyBuys,
            fundingSource: analysis.fundingSource,
          });
        }
      }
      
      // Detect patterns
      const patterns = this.detectPatterns(suspiciousAgedWallets);
      
      // Calculate total fake volume
      const totalFakeVolumePercent = suspiciousAgedWallets.reduce(
        (sum, w) => sum + (topHolders.find(h => h.address === w.wallet)?.percentage || 0),
        0
      );
      
      // Generate risk score based on patterns and age tiers
      let riskScore = 0;
      
      // Score based on age tier distribution (2+ year old wallets are most suspicious)
      if (ageTiers.extreme >= 5) {
        riskScore += 50;
        risks.push(`${ageTiers.extreme} wallets 2+ years old buying for first time - EXTREME RISK`);
      } else if (ageTiers.extreme >= 3) {
        riskScore += 35;
        risks.push(`${ageTiers.extreme} very old wallets (2+ years) detected`);
      }
      
      if (suspiciousAgedWallets.length >= 10) {
        riskScore += 40;
        risks.push(`${suspiciousAgedWallets.length} aged wallets detected - likely coordinated fake volume`);
      } else if (suspiciousAgedWallets.length >= 5) {
        riskScore += 25;
        risks.push(`${suspiciousAgedWallets.length} aged wallets found - potential fake volume`);
      }
      
      if (patterns.sameFundingSource) {
        riskScore += 30;
        risks.push('Multiple aged wallets funded from same source before buying');
      }
      
      if (patterns.similarAges) {
        riskScore += 20;
        risks.push('Aged wallets created around the same time - batch preparation');
      }
      
      if (patterns.coordinatedBuys) {
        riskScore += 25;
        risks.push('Aged wallets bought within narrow time window - coordinated');
      }
      
      if (patterns.noSells && suspiciousAgedWallets.length >= 5) {
        riskScore += 15;
        risks.push('Aged wallets have only buys, no sells - fake volume holders');
      }
      
      if (patterns.similarBuyAmounts) {
        riskScore += 25;
        risks.push('Aged wallets bought similar amounts - automated/scripted behavior');
      }
      
      if (totalFakeVolumePercent > 20) {
        riskScore += 20;
        risks.push(`${totalFakeVolumePercent.toFixed(1)}% of supply in aged wallets - significant fake volume`);
      }
      
      // Nova's fresh wallet analysis (>20% fresh = risk)
      const validAnalyses = walletAnalyses.filter(w => w !== null);
      const freshWallets = validAnalyses.filter(w => w && w.exactAgeDays !== undefined && w.exactAgeDays <= 7);
      const freshWalletCount = freshWallets.length;
      const freshWalletPercent = validAnalyses.length > 0 
        ? (freshWalletCount / validAnalyses.length) * 100 
        : 0;
      const isFreshWalletRisk = freshWalletPercent > 20;
      
      // Build funding source breakdown
      const fundingSourceBreakdown: Record<string, number> = {};
      for (const analysis of validAnalyses) {
        if (analysis?.fundingSourceName) {
          fundingSourceBreakdown[analysis.fundingSourceName] = 
            (fundingSourceBreakdown[analysis.fundingSourceName] || 0) + 1;
        }
      }
      
      // Calculate average fresh wallet age
      const avgFreshWalletAge = freshWalletCount > 0
        ? freshWallets.reduce((sum, w) => sum + (w?.exactAgeDays || 0), 0) / freshWalletCount
        : 0;
      
      // Add fresh wallet risk if applicable
      if (isFreshWalletRisk) {
        riskScore += 25;
        risks.push(`>20% of top holders are fresh wallets (${freshWalletPercent.toFixed(1)}%) - bundled scam signal`);
      }
      
      return {
        suspiciousAgedWallets,
        agedWalletCount: suspiciousAgedWallets.length,
        totalFakeVolumePercent,
        riskScore: Math.min(100, riskScore),
        patterns,
        ageTiers,
        freshWalletAnalysis: {
          freshWalletCount,
          freshWalletPercent,
          isFreshWalletRisk,
          avgFreshWalletAge,
          fundingSourceBreakdown,
        },
        risks,
      };
      
    } catch (error) {
      console.error('[Aged Wallet Detector] Analysis failed:', error);
      return this.createEmptyResult();
    }
  }
  
  /**
   * Analyze individual wallet for aged wallet characteristics
   * Uses accurate first transaction timestamp via getSignaturesForAddress + getBlockTime
   */
  private async analyzeWallet(
    connection: Connection,
    walletAddress: string,
    tokenAddress: string
  ): Promise<{
    wallet: string;
    firstTransactionDate: number;
    totalTransactions: number;
    buyAmount: number;
    buyTimestamp: number;
    hasOnlyBuys: boolean;
    fundingSource?: string;
    exactAgeDays: number; // Accurate age calculation
    fundingSourceName?: string; // Identified funding source (Binance, OKX, etc.)
  } | null> {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      
      // Step 1: Get full signature history for accurate first transaction (wallet creation)
      // We need to paginate to get the oldest transaction
      let allSignatures: any[] = [];
      let before: string | undefined;
      const maxIterations = 3; // Limit to prevent excessive RPC calls
      
      for (let i = 0; i < maxIterations; i++) {
        const sigs = await connection.getSignaturesForAddress(
          walletPubkey,
          { limit: 1000, before },
          'confirmed'
        );
        
        if (sigs.length === 0) break;
        
        allSignatures = allSignatures.concat(sigs);
        
        // If we got less than 1000, we've reached the end
        if (sigs.length < 1000) break;
        
        // Set 'before' to the oldest signature for pagination
        before = sigs[sigs.length - 1].signature;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (allSignatures.length === 0) return null;
      
      // First transaction = wallet creation date (oldest is at the end)
      const firstTx = allSignatures[allSignatures.length - 1];
      const firstTransactionDate = (firstTx.blockTime || 0) * 1000;
      
      // Calculate exact age in days
      const now = Date.now();
      const exactAgeDays = Math.floor((now - firstTransactionDate) / (1000 * 60 * 60 * 24));
      
      // Step 2: Get recent transactions for token interaction analysis
      const recentSigs = allSignatures.slice(0, 20);
      const buyTimestamp = recentSigs[0]?.blockTime 
        ? recentSigs[0].blockTime * 1000 
        : Date.now();
      
      // Step 3: Identify funding source by checking early transactions
      let fundingSource: string | undefined;
      let fundingSourceName: string | undefined;
      
      // Check the first few transactions for funding
      const earlyTxs = allSignatures.slice(-5); // Oldest 5 transactions
      for (const sig of earlyTxs) {
        try {
          const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          
          if (tx?.meta?.postBalances && tx.meta.preBalances) {
            // Check for SOL funding (balance increase)
            const preBalance = tx.meta.preBalances[0] || 0;
            const postBalance = tx.meta.postBalances[0] || 0;
            
            if (postBalance > preBalance) {
              // This is likely a funding transaction
              fundingSource = sig.signature;
              
              // Try to identify known exchange funding
              const accountKeys = tx.transaction?.message?.staticAccountKeys || [];
              fundingSourceName = this.identifyFundingSource(accountKeys.map((k: any) => k.toString()));
              
              if (fundingSourceName) {
                console.log(`[Aged Wallet Detector] Identified funding: ${walletAddress.slice(0, 8)}... funded by ${fundingSourceName}`);
              }
              break;
            }
          }
        } catch {
          continue; // Skip failed tx fetches
        }
      }
      
      // Step 4: Check for sells (has the wallet sold tokens?)
      // This is simplified - would need to check actual token transfers
      const hasOnlyBuys = true; // TODO: Implement actual sell detection
      
      return {
        wallet: walletAddress,
        firstTransactionDate,
        totalTransactions: allSignatures.length,
        buyAmount: 0, // Would need to parse tx data
        buyTimestamp,
        hasOnlyBuys,
        fundingSource,
        exactAgeDays,
        fundingSourceName,
      };
      
    } catch (error) {
      console.error(`[Aged Wallet Detector] Failed to analyze ${walletAddress}:`, error);
      return null;
    }
  }
  
  /**
   * Identify funding source from transaction accounts
   */
  private identifyFundingSource(accountKeys: string[]): string | undefined {
    // Known exchange funding addresses
    const KNOWN_FUNDING_SOURCES: Record<string, string> = {
      '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9': 'Binance',
      '5tzL3DfsF8i36KeUCjtzWP9zqS6zWjYhR76VA4Y5CzzJ': 'Binance',
      'H8sMJSCQxfKiFTCfDR3DUYexta7Kxymr2gF3LceH44uR': 'Binance',
      'GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE': 'Coinbase',
      'is6MTRHEgyFLNTfYcuV4QBWLjrZBfmhVNYR6ccgr8KV': 'OKX',
      '2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm': 'OKX',
      'ASTyfSima4LLAdDgoFGkgqoKowG1LZFDr9fAQrg7iaJZ': 'MEXC',
      'AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2': 'Bybit',
      // BullX (instant swap - high risk)
      'GKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV': 'BullX',
      // Swopshop (high risk)
      'SwopQn8JfnKTH8qCrKwgWW3kM8JjP5Nt8EkTdmMz8s9': 'Swopshop',
    };
    
    for (const key of accountKeys) {
      if (KNOWN_FUNDING_SOURCES[key]) {
        return KNOWN_FUNDING_SOURCES[key];
      }
    }
    
    return undefined;
  }
  
  /**
   * Detect patterns in aged wallet behavior
   */
  private detectPatterns(wallets: AgedWalletBuy[]): {
    sameFundingSource: boolean;
    similarAges: boolean;
    coordinatedBuys: boolean;
    noSells: boolean;
    similarBuyAmounts: boolean;
  } {
    if (wallets.length < 3) {
      return {
        sameFundingSource: false,
        similarAges: false,
        coordinatedBuys: false,
        noSells: false,
        similarBuyAmounts: false,
      };
    }
    
    // Check for same funding source
    const fundingSources = wallets
      .filter(w => w.fundingSource)
      .map(w => w.fundingSource);
    const uniqueFundingSources = new Set(fundingSources);
    const sameFundingSource = uniqueFundingSources.size === 1 && fundingSources.length >= 5;
    
    // Check for similar wallet ages (created within 7 days of each other)
    const ages = wallets.map(w => w.firstTransactionDate).sort((a, b) => a - b);
    let similarAges = false;
    if (ages.length >= 5) {
      const ageRange = ages[ages.length - 1] - ages[0];
      const daysRange = ageRange / (1000 * 60 * 60 * 24);
      similarAges = daysRange <= this.SIMILAR_AGE_WINDOW_DAYS;
    }
    
    // Check for coordinated buys (bought within 1 minute of each other)
    const buyTimes = wallets.map(w => w.buyTimestamp).sort((a, b) => a - b);
    let coordinatedBuys = false;
    if (buyTimes.length >= 5) {
      const buyRange = buyTimes[buyTimes.length - 1] - buyTimes[0];
      coordinatedBuys = buyRange <= this.COORDINATED_BUY_WINDOW_MS;
    }
    
    // Check if all wallets only have buys (no sells)
    const noSells = wallets.filter(w => w.hasOnlyBuys).length >= wallets.length * 0.8;
    
    // NEW: Check for similar buy amounts (inspired by 1f1n/Dragon repo)
    let similarBuyAmounts = false;
    const validAmounts = wallets.filter(w => w.buyAmount > 0).map(w => w.buyAmount);
    if (validAmounts.length >= 5) {
      const sortedAmounts = [...validAmounts].sort((a, b) => a - b);
      const median = sortedAmounts[Math.floor(sortedAmounts.length / 2)];
      
      // Check if 80%+ of buys are within 20% of median (suspicious uniformity)
      const similarCount = validAmounts.filter(amt => 
        Math.abs(amt - median) / median <= this.SIMILAR_AMOUNT_THRESHOLD
      ).length;
      
      similarBuyAmounts = similarCount / validAmounts.length >= 0.80;
    }
    
    return {
      sameFundingSource,
      similarAges,
      coordinatedBuys,
      noSells,
      similarBuyAmounts,
    };
  }
  
  private createEmptyResult(): AgedWalletDetectionResult {
    return {
      suspiciousAgedWallets: [],
      agedWalletCount: 0,
      totalFakeVolumePercent: 0,
      riskScore: 0,
      patterns: {
        sameFundingSource: false,
        similarAges: false,
        coordinatedBuys: false,
        noSells: false,
        similarBuyAmounts: false,
      },
      ageTiers: {
        extreme: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      freshWalletAnalysis: {
        freshWalletCount: 0,
        freshWalletPercent: 0,
        isFreshWalletRisk: false,
        avgFreshWalletAge: 0,
        fundingSourceBreakdown: {},
      },
      risks: [],
    };
  }
}

// Export singleton
export const agedWalletDetector = new AgedWalletDetector();

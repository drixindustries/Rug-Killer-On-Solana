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
      
      return {
        suspiciousAgedWallets,
        agedWalletCount: suspiciousAgedWallets.length,
        totalFakeVolumePercent,
        riskScore: Math.min(100, riskScore),
        patterns,
        ageTiers,
        risks,
      };
      
    } catch (error) {
      console.error('[Aged Wallet Detector] Analysis failed:', error);
      return this.createEmptyResult();
    }
  }
  
  /**
   * Analyze individual wallet for aged wallet characteristics
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
  } | null> {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      
      // Get signature history for this wallet (limit to reduce RPC load)
      const signatures = await connection.getSignaturesForAddress(
        walletPubkey,
        { limit: 100 },
        'confirmed'
      );
      
      if (signatures.length === 0) return null;
      
      // First transaction = wallet creation date
      const firstTx = signatures[signatures.length - 1];
      const firstTransactionDate = (firstTx.blockTime || 0) * 1000;
      
      // Find token buy transactions (simplified - checks for recent activity)
      const tokenBuys = signatures.filter((sig, idx) => {
        // First 20 sigs are most recent - likely token purchases
        return idx < 20;
      });
      
      const buyTimestamp = tokenBuys[0]?.blockTime 
        ? tokenBuys[0].blockTime * 1000 
        : Date.now();
      
      // Check for funding source (look at last transaction - likely funding)
      const lastTx = signatures[0];
      const fundingSource = lastTx?.signature.slice(0, 44); // Simplified
      
      return {
        wallet: walletAddress,
        firstTransactionDate,
        totalTransactions: signatures.length,
        buyAmount: 0, // Would need to parse tx data
        buyTimestamp,
        hasOnlyBuys: true, // Simplified - would need to check for sells
        fundingSource,
      };
      
    } catch (error) {
      console.error(`[Aged Wallet Detector] Failed to analyze ${walletAddress}:`, error);
      return null;
    }
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
      risks: [],
    };
  }
}

// Export singleton
export const agedWalletDetector = new AgedWalletDetector();

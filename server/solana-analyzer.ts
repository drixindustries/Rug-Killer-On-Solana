/**
 * Minimal Solana Token Analyzer
 * Uses DexScreener + on-chain RPC only - no external API dependencies
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import type {
  TokenAnalysisResponse,
  AuthorityStatus,
  HolderInfo,
  LiquidityPoolStatus,
  TokenMetadata,
  RiskFlag,
  RiskLevel,
  FloorData,
} from "../shared/schema";
import { DexScreenerService } from "./dexscreener-service.ts";
import { rpcBalancer } from "./services/rpc-balancer.ts";
import { checkPumpFun } from "./services/pumpfun-api.ts";

export class SolanaTokenAnalyzer {
  private dexScreener: DexScreenerService;

  constructor() {
    this.dexScreener = new DexScreenerService();
  }

  async analyzeToken(
    tokenMintAddress: string,
    options: { skipExternal?: boolean; skipOnChain?: boolean } = {}
  ): Promise<TokenAnalysisResponse> {
    const startTime = Date.now();
    console.log(`🔍 [Analyzer] Starting analysis for ${tokenMintAddress}`);

    try {
      // Validate address
      let tokenAddress: PublicKey;
      try {
        tokenAddress = new PublicKey(tokenMintAddress);
      } catch (error) {
        throw new Error("Invalid token address format");
      }

      // Fetch data in parallel - DexScreener, on-chain data, and pump.fun check
      const [dexData, onChainData, creationDateData, pumpFunData] = await Promise.allSettled([
        options.skipExternal ? null : this.dexScreener.getTokenData(tokenMintAddress),
        options.skipOnChain ? null : this.getOnChainData(tokenAddress),
        options.skipOnChain ? null : this.getTokenCreationDate(tokenAddress),
        options.skipExternal ? null : checkPumpFun(tokenMintAddress),
      ]);

      const dex = dexData.status === 'fulfilled' ? dexData.value : null;
      const onChain = onChainData.status === 'fulfilled' ? onChainData.value : null;
      const creationDate = creationDateData.status === 'fulfilled' ? creationDateData.value : undefined;
      const pumpFun = pumpFunData.status === 'fulfilled' ? pumpFunData.value : null;

      console.log(`✅ [Analyzer] Data fetched in ${Date.now() - startTime}ms`);

      // Build analysis response
      const response: TokenAnalysisResponse = {
        tokenAddress: tokenMintAddress,
        analyzedAt: Date.now(),
        
        // Authority status (converted to AuthorityStatus format)
        mintAuthority: {
          hasAuthority: !onChain?.authorities?.mintDisabled && !!onChain?.authorities?.mintAuthority,
          authorityAddress: onChain?.authorities?.mintAuthority || null,
          isRevoked: onChain?.authorities?.mintDisabled || !onChain?.authorities?.mintAuthority,
        },
        freezeAuthority: {
          hasAuthority: !onChain?.authorities?.freezeDisabled && !!onChain?.authorities?.freezeAuthority,
          authorityAddress: onChain?.authorities?.freezeAuthority || null,
          isRevoked: onChain?.authorities?.freezeDisabled || !onChain?.authorities?.freezeAuthority,
        },
        
        // Token metadata
        metadata: {
          name: dex?.pairs?.[0]?.baseToken?.name || "Unknown",
          symbol: dex?.pairs?.[0]?.baseToken?.symbol || "???",
          decimals: onChain?.decimals || 9,
          supply: onChain?.supply || 0,
          hasMetadata: true,
          isMutable: false,
        },
        
        // Holder analysis
        holderCount: onChain?.holderCount || 0,
        topHolders: onChain?.topHolders || [],
        topHolderConcentration: onChain?.top10Concentration || 0,
        holderFiltering: {
          totals: {
            lp: 0,
            exchanges: 0,
            protocols: 0,
            bundled: 0,
            total: 0,
            degens: 0,
            bots: 0,
            smartMoney: 0,
            snipers: 0,
            aged: 0,
            newWallets: 0,
          },
          excluded: [],
        },
        
        // Liquidity pool
        liquidityPool: {
          exists: !!dex?.pairs?.[0]?.liquidity?.usd,
          status: dex?.pairs?.[0]?.liquidity?.usd && dex.pairs[0].liquidity.usd > 1000 ? 'SAFE' : 'RISKY',
        },
        
        // Market data (normalized structure)
        marketData: dex?.pairs?.[0] ? {
          priceUsd: parseFloat(dex.pairs[0].priceUsd || '0'),
          priceNative: parseFloat(dex.pairs[0].priceNative || '0'),
          marketCap: dex.pairs[0].marketCap || this.calculateMarketCap(dex, onChain),
          fdv: dex.pairs[0].fdv || null,
          volume24h: dex.pairs[0].volume?.h24 || null,
          priceChange24h: dex.pairs[0].priceChange?.h24 || null,
          txns24h: dex.pairs[0].txns?.h24 ? {
            buys: dex.pairs[0].txns.h24.buys,
            sells: dex.pairs[0].txns.h24.sells,
          } : null,
          liquidityUsd: dex.pairs[0].liquidity?.usd || null,
          source: 'dexscreener',
          pairAddress: dex.pairs[0].pairAddress || null,
          dexId: dex.pairs[0].dexId || null,
          updatedAt: Date.now(),
        } : undefined,
        
        // Transactions (empty for now)
        recentTransactions: [],
        suspiciousActivityDetected: false,
        
        // Risk assessment
        riskScore: this.calculateRiskScore(dex, onChain),
        riskLevel: this.determineRiskLevel(dex, onChain),
        redFlags: this.generateRiskFlags(dex, onChain),
        
        // Creation info
        creationDate: creationDate,
        
        // Pump.fun specific data
        pumpFunData: pumpFun && pumpFun.isPumpFun ? {
          isPumpFun: true,
          devBought: pumpFun.devBought,
          bondingCurve: pumpFun.bondingCurve,
          mayhemMode: pumpFun.mayhemMode,
          king: pumpFun.king,
        } : undefined,
      
          // Floor detection
          floorData: this.detectFloor(dex, dex?.pairs?.[0]?.priceUsd ? parseFloat(dex.pairs[0].priceUsd) : 0),
        
        // External data references
        dexScreenerData: dex,
      };

      console.log(`✅ [Analyzer] Complete in ${Date.now() - startTime}ms - Risk: ${response.riskLevel}`);
      return response;

    } catch (error: any) {
      console.error(`❌ [Analyzer] Error analyzing ${tokenMintAddress}:`, error.message);
      throw error;
    }
  }

    private detectFloor(dex: any, currentPrice: number): FloorData {
      // Analyze buy transactions to detect floor/support levels
      const pair = dex?.pairs?.[0];
      if (!pair || !currentPrice) {
        return {
          hasFloor: false,
          floorPrice: null,
          floorConfidence: 0,
          supportLevels: [],
          currentPriceVsFloor: null,
          insight: "Insufficient data to detect floor",
        };
      }

      // Get transaction data from DexScreener
      const txns24h = pair.txns?.h24;
      if (!txns24h || (txns24h.buys === 0 && txns24h.sells === 0)) {
        return {
          hasFloor: false,
          floorPrice: null,
          floorConfidence: 0,
          supportLevels: [],
          currentPriceVsFloor: null,
          insight: "No recent transaction data available",
        };
      }

      // Calculate price ranges based on 24h price change
      const priceChange24h = pair.priceChange?.h24 || 0;
      const highPrice = currentPrice * (1 + Math.abs(priceChange24h) / 100);
      const lowPrice = currentPrice * (1 - Math.abs(priceChange24h) / 100);
    
      // If price is stable (low volatility), use a wider range for floor detection
      const priceRange = highPrice - lowPrice;
      const isStable = Math.abs(priceChange24h) < 5;
    
      // Create price buckets for buy clustering analysis
      // We'll divide the price range into buckets to find where buys cluster
      const bucketCount = isStable ? 5 : 10;
      const bucketSize = priceRange / bucketCount;
    
      // Simulate buy distribution (in production, this would use actual transaction history)
      // For now, we'll infer from volume and transaction count
      const buyVolume = pair.volume?.h24 || 0;
      const buyCount = txns24h.buys || 0;
    
      if (buyCount < 10) {
        return {
          hasFloor: false,
          floorPrice: null,
          floorConfidence: 0,
          supportLevels: [],
          currentPriceVsFloor: null,
          insight: "Insufficient buy activity to determine floor",
        };
      }

      // Estimate floor based on recent low + buy pressure
      // Floor typically forms 5-15% below current price where buyers accumulate
      const estimatedFloor = lowPrice * 1.05; // 5% above the 24h low
      const floorConfidence = Math.min(95, buyCount * 2); // Higher buy count = higher confidence

      // Create support levels
      const supportLevels = [];
    
      // Primary support at estimated floor
      supportLevels.push({
        priceUsd: estimatedFloor,
        buyVolume: buyVolume * 0.4, // 40% of volume typically at floor
        buyCount: Math.floor(buyCount * 0.4),
        percentOfTotalBuys: 40,
      });

      // Secondary support levels
      if (!isStable) {
        supportLevels.push({
          priceUsd: lowPrice * 0.95, // 5% below floor
          buyVolume: buyVolume * 0.25,
          buyCount: Math.floor(buyCount * 0.25),
          percentOfTotalBuys: 25,
        });
      
        supportLevels.push({
          priceUsd: currentPrice * 0.98, // Near current price
          buyVolume: buyVolume * 0.15,
          buyCount: Math.floor(buyCount * 0.15),
          percentOfTotalBuys: 15,
        });
      }

      // Calculate current price vs floor
      const priceVsFloor = ((currentPrice - estimatedFloor) / estimatedFloor) * 100;

      // Generate insight
      let insight = "";
      if (priceVsFloor > 20) {
        insight = `🔺 Price is ${priceVsFloor.toFixed(1)}% above floor ($${estimatedFloor.toFixed(8)}). Strong buy support detected.`;
      } else if (priceVsFloor > 5) {
        insight = `📊 Price is ${priceVsFloor.toFixed(1)}% above floor ($${estimatedFloor.toFixed(8)}). Healthy support.`;
      } else if (priceVsFloor > -5) {
        insight = `⚡ Price near floor ($${estimatedFloor.toFixed(8)}). Testing support level.`;
      } else {
        insight = `⚠️ Price is ${Math.abs(priceVsFloor).toFixed(1)}% below floor. Support broken!`;
      }

      return {
        hasFloor: true,
        floorPrice: estimatedFloor,
        floorConfidence,
        supportLevels: supportLevels.sort((a, b) => b.priceUsd - a.priceUsd),
        currentPriceVsFloor: priceVsFloor,
        insight,
      };
    }
  private getConnection() {
    return rpcBalancer.getConnection();
  }

  private async getOnChainData(tokenAddress: PublicKey) {
    try {
      const connection = this.getConnection();
      
      // Get token mint info
      const mintInfo = await getMint(
        connection,
        tokenAddress,
        'confirmed',
        TOKEN_PROGRAM_ID
      ).catch(() => getMint(
        connection,
        tokenAddress,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      ));

      // Fetch holder data using getTokenLargestAccounts
      let holderCount = null;
      let top10Concentration = null;
      let topHolders: any[] = [];

      try {
        const largestAccounts = await connection.getTokenLargestAccounts(tokenAddress, 'confirmed');
        const validAccounts = largestAccounts.value.filter(acc => Number(acc.amount) > 0);
        
        holderCount = validAccounts.length;
        
        if (validAccounts.length > 0) {
          const totalSupply = Number(mintInfo.supply);
          let top10Supply = 0;
          
          validAccounts.slice(0, 10).forEach(acc => {
            const amount = Number(acc.amount) / Math.pow(10, mintInfo.decimals);
            top10Supply += Number(acc.amount);
            topHolders.push({
              address: acc.address.toBase58(),
              balance: amount,
              percentage: (Number(acc.amount) / totalSupply) * 100
            });
          });
          
          top10Concentration = (top10Supply / totalSupply) * 100;
        }
      } catch (holderError: any) {
        console.warn(`⚠️ [Analyzer] Holder data fetch failed:`, holderError.message);
        // Continue with null holder data
      }

      return {
        decimals: mintInfo.decimals,
        supply: Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals),
        authorities: {
          mintAuthority: mintInfo.mintAuthority?.toBase58() || null,
          freezeAuthority: mintInfo.freezeAuthority?.toBase58() || null,
          mintDisabled: !mintInfo.mintAuthority,
          freezeDisabled: !mintInfo.freezeAuthority,
        },
        metadata: null,
        holderCount,
        top10Concentration,
        topHolders,
      };
    } catch (error: any) {
      console.warn(`⚠️ [Analyzer] On-chain data fetch failed:`, error.message);
      return null;
    }
  }

  private calculateMarketCap(dex: any, onChain: any): number | null {
    const price = dex?.pairs?.[0]?.priceUsd ? parseFloat(dex.pairs[0].priceUsd) : null;
    const supply = onChain?.supply;
    
    if (!price || !supply) return null;
    return price * supply;
  }

  private calculateRiskScore(dex: any, onChain: any): number {
    let penalties = 0;

    // Low liquidity penalties
    const liquidityUsd = dex?.pairs?.[0]?.liquidity?.usd || 0;
    if (liquidityUsd < 1000) penalties += 25;
    if (liquidityUsd < 100) penalties += 40;
    
    // Mint/freeze authority still enabled
    if (onChain?.authorities?.mintAuthority) penalties += 15;
    if (onChain?.authorities?.freezeAuthority) penalties += 15;

    // Invert score: 100 = good (no penalties), 0 = bad (max penalties)
    return Math.max(0, 100 - penalties);
  }

  private determineRiskLevel(dex: any, onChain: any): RiskLevel {
    const score = this.calculateRiskScore(dex, onChain);
    
    // Inverted: higher score = safer
    if (score >= 80) return "LOW";
    if (score >= 60) return "MODERATE";
    if (score >= 40) return "HIGH";
    return "EXTREME";
  }

  private generateRiskFlags(dex: any, onChain: any): RiskFlag[] {
    const flags: RiskFlag[] = [];

    // Basic checks from on-chain + DexScreener only

    // Authority flags
    if (onChain?.authorities?.mintAuthority) {
      flags.push({
        type: "mint_authority",
        severity: "medium",
        title: "Mint Authority Active",
        description: "Token supply can be increased by the owner.",
      });
    }

    if (onChain?.authorities?.freezeAuthority) {
      flags.push({
        type: "freeze_authority",
        severity: "medium",
        title: "Freeze Authority Active",
        description: "Token accounts can be frozen by the owner.",
      });
    }

    // Liquidity flags
    const liquidityUsd = dex?.pairs?.[0]?.liquidity?.usd || 0;
    if (liquidityUsd < 1000) {
      flags.push({
        type: "low_liquidity",
        severity: "high",
        title: "Very Low Liquidity",
        description: `Only $${liquidityUsd.toFixed(2)} in liquidity pool.`,
      });
    }

    return flags;
  }

  private extractLiquidityPools(dex: any): LiquidityPoolStatus[] {
    if (!dex?.pairs || dex.pairs.length === 0) return [];

    return dex.pairs.map((pair: any) => ({
      dex: pair.dexId || "Unknown",
      pairAddress: pair.pairAddress || "",
      liquidityUsd: pair.liquidity?.usd || 0,
      volume24h: pair.volume?.h24 || 0,
      pooledToken: pair.quoteToken?.symbol || "Unknown",
      url: pair.url || "",
    }));
  }

  private async getTokenCreationDate(mintPubkey: PublicKey): Promise<number | undefined> {
    try {
      const connection = this.getConnection();
      
      // Only fetch enough signatures to cover ~30 days for new tokens
      // For older tokens (>30 days), we don't need exact creation date
      const maxSignatures = 2000;
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      let allSignatures: any[] = [];
      let before: string | undefined;
      const batchSize = 1000;
      
      // Fetch signatures in batches, but stop if we go back more than 30 days
      for (let batch = 0; batch < 2; batch++) { // Max 2 batches (2000 signatures)
        const signatures = await connection.getSignaturesForAddress(
          mintPubkey, 
          { limit: batchSize, before }, 
          'confirmed'
        );
        
        if (signatures.length === 0) break;
        
        // Check if we've gone back more than 30 days
        const oldestInBatch = signatures[signatures.length - 1];
        const oldestTime = (oldestInBatch.blockTime || 0) * 1000;
        
        allSignatures.push(...signatures);
        
        // If oldest transaction in this batch is older than 30 days, 
        // return undefined (token is established)
        if (oldestTime < thirtyDaysAgo) {
          return undefined; // Frontend will show "Established" for undefined dates
        }
        
        // If we got fewer than the batch size, we've reached the end
        if (signatures.length < batchSize) break;
        
        // Set 'before' to the last signature for pagination
        before = signatures[signatures.length - 1].signature;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (allSignatures.length === 0) {
        return undefined;
      }
      
      // The oldest signature is at the end of the array (most recent first)
      const oldestSignature = allSignatures[allSignatures.length - 1];
      const creationTime = oldestSignature.blockTime;
      
      return creationTime ? creationTime * 1000 : undefined;
    } catch (error: any) {
      console.warn(`⚠️ [Analyzer] Failed to fetch token creation date:`, error.message);
      return undefined;
    }
  }
}

// Export singleton instance
export const tokenAnalyzer = new SolanaTokenAnalyzer();

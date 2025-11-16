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
} from "../shared/schema";
import { DexScreenerService } from "./dexscreener-service.ts";
import { rpcBalancer } from "./services/rpc-balancer.ts";

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

      // Fetch data in parallel - only DexScreener and on-chain data
      const [dexData, onChainData, creationDateData] = await Promise.allSettled([
        options.skipExternal ? null : this.dexScreener.getTokenData(tokenMintAddress),
        options.skipOnChain ? null : this.getOnChainData(tokenAddress),
        options.skipOnChain ? null : this.getTokenCreationDate(tokenAddress),
      ]);

      const dex = dexData.status === 'fulfilled' ? dexData.value : null;
      const onChain = onChainData.status === 'fulfilled' ? onChainData.value : null;
      const creationDate = creationDateData.status === 'fulfilled' ? creationDateData.value : undefined;

      console.log(`✅ [Analyzer] Data fetched in ${Date.now() - startTime}ms`);

      // Build analysis response
      const response: TokenAnalysisResponse = {
        tokenAddress: tokenMintAddress,
        
        // Market data from DexScreener only
        price: dex?.pairs?.[0]?.priceUsd ? parseFloat(dex.pairs[0].priceUsd) : null,
        marketCap: this.calculateMarketCap(dex, onChain),
        liquidity: dex?.pairs?.[0]?.liquidity?.usd || null,
        volume24h: dex?.pairs?.[0]?.volume?.h24 || null,
        priceChange24h: dex?.pairs?.[0]?.priceChange?.h24 || null,
        
        // On-chain metadata
        metadata: onChain?.metadata || {
          name: dex?.pairs?.[0]?.baseToken?.name || "Unknown",
          symbol: dex?.pairs?.[0]?.baseToken?.symbol || "???",
          decimals: onChain?.decimals || 9,
          supply: onChain?.supply || null,
        },
        
        // Authority status
        authorities: onChain?.authorities || {
          mintAuthority: null,
          freezeAuthority: null,
          mintDisabled: false,
          freezeDisabled: false,
        },
        
        // Basic risk assessment from DexScreener data
        riskScore: this.calculateRiskScore(dex, onChain),
        riskLevel: this.determineRiskLevel(dex, onChain),
        riskFlags: this.generateRiskFlags(dex, onChain),
        
        // Token age
        creationDate: creationDate,
        
        // Holder data (basic from on-chain)
        holderCount: onChain?.holderCount || null,
        top10Concentration: onChain?.top10Concentration || null,
        holders: onChain?.topHolders || [],
        
        // Liquidity pool status
        liquidityPools: this.extractLiquidityPools(dex),
        
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
        holderCount: null,
        top10Concentration: null,
        topHolders: [],
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
    let score = 0;

    // Low liquidity penalties
    const liquidityUsd = dex?.pairs?.[0]?.liquidity?.usd || 0;
    if (liquidityUsd < 1000) score += 25;
    if (liquidityUsd < 100) score += 40;
    
    // Mint/freeze authority still enabled
    if (onChain?.authorities?.mintAuthority) score += 15;
    if (onChain?.authorities?.freezeAuthority) score += 15;

    return Math.min(100, score);
  }

  private determineRiskLevel(dex: any, onChain: any): RiskLevel {
    const score = this.calculateRiskScore(dex, onChain);
    
    if (score >= 80) return "EXTREME";
    if (score >= 60) return "HIGH";
    if (score >= 40) return "MODERATE";
    return "LOW";
  }

  private generateRiskFlags(dex: any, onChain: any): RiskFlag[] {
    const flags: RiskFlag[] = [];

    // QuillCheck flags
    if (quill?.isHoneypot) {
      flags.push({
        type: "honeypot",
        severity: "critical",
        title: "Honeypot Detected",
        description: "This token appears to be a honeypot. You may not be able to sell.",
      });
    }

    if (quill?.buyTax && quill.buyTax > 10) {
      flags.push({
        type: "tax",
        severity: "high",
        title: `High Buy Tax: ${quill.buyTax}%`,
        description: `Buying this token incurs a ${quill.buyTax}% tax.`,
      });
    }

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

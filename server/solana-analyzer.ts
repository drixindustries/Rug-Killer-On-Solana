/**
 * Simplified Solana Token Analyzer
 * Only uses DexScreener + QuillCheck for fast, reliable analysis
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
import { QuillCheckService } from "./services/quillcheck-service.ts";
import { rpcBalancer } from "./services/rpc-balancer.ts";

export class SolanaTokenAnalyzer {
  private dexScreener: DexScreenerService;
  private quillCheck: QuillCheckService;

  constructor() {
    this.dexScreener = new DexScreenerService();
    this.quillCheck = new QuillCheckService();
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

      // Fetch data in parallel - only DexScreener and QuillCheck
      const [dexData, quillData, onChainData] = await Promise.allSettled([
        options.skipExternal ? null : this.dexScreener.getTokenData(tokenMintAddress),
        options.skipExternal ? null : this.quillCheck.checkToken(tokenMintAddress),
        options.skipOnChain ? null : this.getOnChainData(tokenAddress),
      ]);

      const dex = dexData.status === 'fulfilled' ? dexData.value : null;
      const quill = quillData.status === 'fulfilled' ? quillData.value : null;
      const onChain = onChainData.status === 'fulfilled' ? onChainData.value : null;

      console.log(`✅ [Analyzer] Data fetched in ${Date.now() - startTime}ms`);

      // Build analysis response
      const response: TokenAnalysisResponse = {
        tokenAddress: tokenMintAddress,
        
        // Market data from DexScreener
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
        
        // Risk assessment from QuillCheck
        riskScore: this.calculateRiskScore(quill, dex),
        riskLevel: this.determineRiskLevel(quill, dex),
        riskFlags: this.generateRiskFlags(quill, dex, onChain),
        
        // Holder data (basic from on-chain)
        holderCount: onChain?.holderCount || null,
        top10Concentration: onChain?.top10Concentration || null,
        holders: onChain?.topHolders || [],
        
        // Liquidity pool status
        liquidityPools: this.extractLiquidityPools(dex),
        
        // External data references
        dexScreenerData: dex,
        quillCheckData: quill,
      };

      console.log(`✅ [Analyzer] Complete in ${Date.now() - startTime}ms - Risk: ${response.riskLevel}`);
      return response;

    } catch (error: any) {
      console.error(`❌ [Analyzer] Error analyzing ${tokenMintAddress}:`, error.message);
      throw error;
    }
  }

  private async getOnChainData(tokenAddress: PublicKey) {
    try {
      const connection = rpcBalancer.getConnection();
      
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

  private calculateRiskScore(quill: any, dex: any): number {
    // Start with QuillCheck score if available
    if (quill?.riskScore !== null && quill?.riskScore !== undefined) {
      return Math.min(100, Math.max(0, quill.riskScore));
    }

    // Fallback: calculate from available data
    let score = 0;

    // Honeypot detection
    if (quill?.isHoneypot) score += 50;
    
    // High tax penalties
    const buyTax = quill?.buyTax || 0;
    const sellTax = quill?.sellTax || 0;
    if (buyTax > 10) score += 20;
    if (sellTax > 10) score += 20;
    if (sellTax > 50) score += 30; // Extreme sell tax
    
    // Liquidity risk
    if (quill?.liquidityRisk) score += 25;
    if (!quill?.canSell) score += 40;
    
    // Low liquidity from DexScreener
    const liquidityUsd = dex?.pairs?.[0]?.liquidity?.usd || 0;
    if (liquidityUsd < 1000) score += 15;
    if (liquidityUsd < 100) score += 25;

    return Math.min(100, score);
  }

  private determineRiskLevel(quill: any, dex: any): RiskLevel {
    const score = this.calculateRiskScore(quill, dex);
    
    if (score >= 80) return "EXTREME";
    if (score >= 60) return "HIGH";
    if (score >= 40) return "MODERATE";
    return "LOW";
  }

  private generateRiskFlags(quill: any, dex: any, onChain: any): RiskFlag[] {
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

    if (quill?.sellTax && quill.sellTax > 10) {
      flags.push({
        type: "tax",
        severity: quill.sellTax > 50 ? "critical" : "high",
        title: `High Sell Tax: ${quill.sellTax}%`,
        description: `Selling this token incurs a ${quill.sellTax}% tax.`,
      });
    }

    if (quill?.liquidityRisk) {
      flags.push({
        type: "liquidity_drain",
        severity: "high",
        title: "Liquidity Can Be Drained",
        description: "Contract owner may be able to remove liquidity at any time.",
      });
    }

    if (!quill?.canSell) {
      flags.push({
        type: "honeypot",
        severity: "critical",
        title: "Cannot Sell",
        description: "Token contract prevents selling.",
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
}

// Export singleton instance
export const tokenAnalyzer = new SolanaTokenAnalyzer();

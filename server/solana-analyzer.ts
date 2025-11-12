import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js";
import { getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  TokenAnalysisResponse,
  AuthorityStatus,
  HolderInfo,
  LiquidityPoolStatus,
  TokenMetadata,
  RiskFlag,
  RiskLevel,
  TransactionInfo,
} from "@shared/schema";
import { RugcheckService } from "./rugcheck-service";
import { GoPlusSecurityService } from "./goplus-service";
import { DexScreenerService } from "./dexscreener-service";
import { JupiterPriceService } from "./jupiter-service";

// Use public Solana RPC endpoint (can be configured later)
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export class SolanaTokenAnalyzer {
  private connection: Connection;
  private rugcheckService: RugcheckService;
  private goplusService: GoPlusSecurityService;
  private dexscreenerService: DexScreenerService;
  private jupiterPriceService: JupiterPriceService;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, "confirmed");
    this.rugcheckService = new RugcheckService();
    this.goplusService = new GoPlusSecurityService();
    this.dexscreenerService = new DexScreenerService();
    this.jupiterPriceService = new JupiterPriceService();
  }

  async analyzeToken(tokenAddress: string): Promise<TokenAnalysisResponse> {
    try {
      const mintPubkey = new PublicKey(tokenAddress);
      
      // Fetch mint account info
      const mintInfo = await getMint(this.connection, mintPubkey);
      
      // Analyze authorities
      const mintAuthority = this.analyzeMintAuthority(mintInfo.mintAuthority);
      const freezeAuthority = this.analyzeFreezeAuthority(mintInfo.freezeAuthority);
      
      // Fetch token accounts (holders) from on-chain and external APIs in parallel
      const [onChainHolders, totalHolderCount, recentTransactions, rugcheckData, goplusData, dexscreenerData, jupiterPriceData] = await Promise.all([
        this.fetchTopHolders(mintPubkey, mintInfo.decimals, mintInfo.supply),
        this.getTotalHolderCount(mintPubkey).catch(() => null),
        this.fetchRecentTransactions(mintPubkey),
        this.rugcheckService.getTokenReport(tokenAddress).catch(() => null),
        this.goplusService.getTokenSecurity(tokenAddress).catch(() => null),
        this.dexscreenerService.getTokenData(tokenAddress).catch(() => null),
        this.jupiterPriceService.getTokenPrice(tokenAddress).catch(() => null),
      ]);
      
      // Enrich holders with Rugcheck data if on-chain fetch failed
      const holders = onChainHolders.length > 0 
        ? onChainHolders 
        : (rugcheckData?.topHolders || []).map((h: any, index: number) => ({
            rank: index + 1,
            address: h.address || '',
            balance: h.pct || 0,
            percentage: h.pct || 0,
          }));
      
      // Get actual total holder count (not just top 20)
      // Use getProgramAccounts result if available, otherwise fallback to top holders length
      const holderCount = totalHolderCount || holders.length;
      
      // Calculate holder concentration with safety check
      const topHolderConcentration = Math.min(100, Math.max(0, 
        holders.slice(0, 10).reduce((sum, h) => sum + (h.percentage || 0), 0)
      ));
      
      // Analyze liquidity (simplified for MVP)
      const liquidityPool = this.analyzeLiquidity(topHolderConcentration);

      // Enrich liquidity data with market information from Rugcheck and DexScreener
      const enrichedLiquidity = this.enrichLiquidityWithMarketData(
        liquidityPool,
        rugcheckData,
        dexscreenerData
      );
      
      // Build metadata - prioritize DexScreener data over on-chain defaults
      const supply = Number(mintInfo.supply);
      const safeSupply = isNaN(supply) || !isFinite(supply) ? 0 : supply;
      
      // Get most liquid pair from DexScreener for metadata and market data
      const dexService = new DexScreenerService();
      const primaryPair = dexscreenerData ? dexService.getMostLiquidPair(dexscreenerData) : null;
      
      const metadata: TokenMetadata = {
        name: primaryPair?.baseToken?.name || "Unknown Token",
        symbol: primaryPair?.baseToken?.symbol || tokenAddress.slice(0, 6),
        decimals: mintInfo.decimals || 0,
        supply: safeSupply,
        hasMetadata: !!(primaryPair?.baseToken?.name),
        isMutable: mintAuthority.hasAuthority,
      };
      
      // Build market data from DexScreener primary pair
      const marketData = this.buildMarketData(primaryPair, rugcheckData);
      
      // Calculate risk flags (use enriched liquidity for accurate risk assessment)
      const redFlags = this.calculateRiskFlags(
        mintAuthority,
        freezeAuthority,
        enrichedLiquidity,
        topHolderConcentration,
        holders.length
      );
      
      // Calculate overall risk score with safety check
      const riskScore = this.calculateRiskScore(redFlags);
      const safeRiskScore = isNaN(riskScore) || !isFinite(riskScore) ? 100 : Math.min(100, Math.max(0, riskScore));
      const riskLevel = this.getRiskLevel(safeRiskScore);
      
      const now = Date.now();
      const safeAnalyzedAt = isNaN(now) || !isFinite(now) ? Date.now() : now;

      return {
        tokenAddress,
        riskScore: safeRiskScore,
        riskLevel,
        analyzedAt: safeAnalyzedAt,
        mintAuthority,
        freezeAuthority,
        metadata,
        holderCount: holderCount,
        topHolders: holders,
        topHolderConcentration: isNaN(topHolderConcentration) ? 0 : topHolderConcentration,
        liquidityPool: enrichedLiquidity,
        marketData,
        recentTransactions,
        suspiciousActivityDetected: recentTransactions.some(tx => tx.suspicious),
        redFlags,
        creationDate: undefined,
        rugcheckData: rugcheckData || undefined,
        goplusData: goplusData || undefined,
        dexscreenerData: dexscreenerData || undefined,
        jupiterPriceData: jupiterPriceData || undefined,
      };
    } catch (error) {
      console.error("Token analysis error:", error);
      
      // Return a safe default response when analysis fails
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      return {
        tokenAddress,
        riskScore: 100,
        riskLevel: "EXTREME" as RiskLevel,
        analyzedAt: Date.now(),
        mintAuthority: { hasAuthority: true, authorityAddress: null, isRevoked: false },
        freezeAuthority: { hasAuthority: true, authorityAddress: null, isRevoked: false },
        metadata: {
          name: "Unknown Token",
          symbol: "???",
          decimals: 0,
          supply: 0,
          hasMetadata: false,
          isMutable: true,
        },
        holderCount: 0,
        topHolders: [],
        topHolderConcentration: 0,
        liquidityPool: {
          exists: false,
          isLocked: false,
          isBurned: false,
          status: "UNKNOWN" as const,
        },
        recentTransactions: [],
        suspiciousActivityDetected: false,
        redFlags: [{
          type: "mint_authority",
          severity: "critical",
          title: "Analysis Failed",
          description: `Unable to complete token analysis: ${errorMessage}. This may be due to RPC rate limits or an invalid token address.`,
        }],
        creationDate: undefined,
      };
    }
  }

  private analyzeMintAuthority(authority: PublicKey | null): AuthorityStatus {
    return {
      hasAuthority: authority !== null,
      authorityAddress: authority?.toBase58() || null,
      isRevoked: authority === null,
    };
  }

  private analyzeFreezeAuthority(authority: PublicKey | null): AuthorityStatus {
    return {
      hasAuthority: authority !== null,
      authorityAddress: authority?.toBase58() || null,
      isRevoked: authority === null,
    };
  }

  private async fetchTopHolders(
    mintPubkey: PublicKey,
    decimals: number,
    totalSupply: bigint
  ): Promise<HolderInfo[]> {
    try {
      // Get all token accounts for this mint
      const tokenAccounts = await this.connection.getTokenLargestAccounts(mintPubkey);
      
      const holders: HolderInfo[] = tokenAccounts.value
        .map((account, index) => {
          const balance = Number(account.amount);
          const percentage = (balance / Number(totalSupply)) * 100;
          
          return {
            rank: index + 1,
            address: account.address.toBase58(),
            balance,
            percentage,
          };
        })
        .filter(h => h.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 20); // Top 20 holders
      
      return holders;
    } catch (error) {
      console.error("Error fetching holders:", error);
      return [];
    }
  }

  private async getTotalHolderCount(mintPubkey: PublicKey): Promise<number | null> {
    try {
      // Use getProgramAccounts to count ALL token holders (expensive call)
      const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
      
      const accounts = await this.connection.getProgramAccounts(
        TOKEN_PROGRAM_ID,
        {
          filters: [
            { dataSize: 165 }, // Token account data size
            { 
              memcmp: { 
                offset: 0, 
                bytes: mintPubkey.toBase58() 
              } 
            }
          ],
        }
      );
      
      // Filter out accounts with 0 balance
      const nonZeroAccounts = accounts.filter(account => {
        const data = account.account.data;
        if (Buffer.isBuffer(data)) {
          // Read amount from token account (bytes 64-72)
          const amount = data.readBigUInt64LE(64);
          return amount > BigInt(0);
        }
        return false;
      });
      
      return nonZeroAccounts.length;
    } catch (error) {
      console.error("Error fetching total holder count:", error);
      return null;
    }
  }

  private analyzeLiquidity(topHolderConcentration: number): LiquidityPoolStatus {
    // Early on-chain analysis - status remains UNKNOWN until enriched with external data
    // Holder concentration is separate concern and handled in holder-specific flags
    return {
      exists: true,
      status: "UNKNOWN",
      // Don't set isBurned, isLocked, or burnPercentage here
      // They will be enriched with real data if available from Rugcheck/DexScreener
    };
  }

  private buildMarketData(primaryPair: any, rugcheckData: any) {
    if (!primaryPair) {
      return undefined;
    }

    // Safely parse numeric strings from DexScreener
    const parseNumeric = (value: any): number | null => {
      if (value === null || value === undefined) return null;
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(num) || !isFinite(num) ? null : num;
    };

    return {
      priceUsd: parseNumeric(primaryPair.priceUsd),
      priceNative: parseNumeric(primaryPair.priceNative),
      marketCap: parseNumeric(primaryPair.marketCap),
      fdv: parseNumeric(primaryPair.fdv),
      volume24h: parseNumeric(primaryPair.volume?.h24),
      priceChange24h: parseNumeric(primaryPair.priceChange?.h24),
      txns24h: primaryPair.txns?.h24 ? {
        buys: primaryPair.txns.h24.buys || 0,
        sells: primaryPair.txns.h24.sells || 0,
      } : null,
      liquidityUsd: parseNumeric(primaryPair.liquidity?.usd),
      source: 'dexscreener' as const,
      pairAddress: primaryPair.pairAddress || null,
      dexId: primaryPair.dexId || null,
      updatedAt: Date.now(),
    };
  }

  private enrichLiquidityWithMarketData(
    liquidityPool: LiquidityPoolStatus,
    rugcheckData: any,
    dexscreenerData: any
  ): LiquidityPoolStatus {
    // Extract LP addresses from DexScreener pairs
    const lpAddresses: string[] = [];
    if (dexscreenerData?.pairs) {
      dexscreenerData.pairs.forEach((pair: any) => {
        if (pair.pairAddress) {
          lpAddresses.push(pair.pairAddress);
        }
      });
    }

    // Get most liquid pair from DexScreener for primary liquidity data
    const dexService = new DexScreenerService();
    const primaryPair = dexscreenerData ? dexService.getMostLiquidPair(dexscreenerData) : null;
    
    // Use DexScreener liquidity as primary source, fallback to Rugcheck
    let totalLiquidity = primaryPair?.liquidity?.usd;
    
    // Extract LP burn data from Rugcheck markets
    let maxBurnPercentage = 0;
    let lpMintAddress: string | undefined;

    if (rugcheckData?.markets && rugcheckData.markets.length > 0) {
      // Find the market with highest liquidity
      const primaryMarket = rugcheckData.markets.reduce((prev: any, current: any) => {
        return (current.liquidity || 0) > (prev.liquidity || 0) ? current : prev;
      });

      maxBurnPercentage = primaryMarket.lpBurn || 0;
      
      // Use Rugcheck liquidity if DexScreener didn't have it
      if (!totalLiquidity) {
        totalLiquidity = primaryMarket.liquidity;
      }
      
      // The lpBurn field is already a percentage (0-100)
      const isBurned = maxBurnPercentage >= 99.99;
      const isLocked = maxBurnPercentage >= 90;

      // Cross-validate: if liquidity exists but burn is low, it's risky
      const hasLiquidity = (totalLiquidity && totalLiquidity > 1000) || false;

      let status: "SAFE" | "RISKY" | "UNKNOWN" = liquidityPool.status;
      if (isBurned && hasLiquidity) {
        status = "SAFE";
      } else if (hasLiquidity && maxBurnPercentage < 50) {
        status = "RISKY";
      }

      return {
        ...liquidityPool,
        isBurned,
        isLocked,
        burnPercentage: maxBurnPercentage,
        totalLiquidity,
        lpAddresses,
        status,
      };
    }

    // No Rugcheck data - use DexScreener liquidity only
    if (primaryPair?.liquidity?.usd) {
      return {
        ...liquidityPool,
        totalLiquidity: primaryPair.liquidity.usd,
        lpAddresses,
        status: totalLiquidity && totalLiquidity > 1000 ? "RISKY" : "UNKNOWN",
      };
    }

    // No liquidity data at all - add LP addresses if available
    if (lpAddresses.length > 0) {
      return {
        ...liquidityPool,
        lpAddresses,
      };
    }
    
    // No data available at all
    return liquidityPool;
  }

  private async fetchRecentTransactions(mintPubkey: PublicKey): Promise<TransactionInfo[]> {
    try {
      // Get recent signatures for the mint account
      const signatures = await this.connection.getSignaturesForAddress(mintPubkey, { limit: 10 });
      
      return signatures.slice(0, 5).map((sig, index) => ({
        signature: sig.signature,
        type: index % 3 === 0 ? "transfer" : index % 3 === 1 ? "swap" : "mint",
        timestamp: (sig.blockTime || 0) * 1000,
        suspicious: false,
      }));
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  }

  private calculateRiskFlags(
    mintAuthority: AuthorityStatus,
    freezeAuthority: AuthorityStatus,
    liquidityPool: LiquidityPoolStatus,
    topHolderConcentration: number,
    holderCount: number
  ): RiskFlag[] {
    const flags: RiskFlag[] = [];

    // Mint authority not revoked
    if (mintAuthority.hasAuthority) {
      flags.push({
        type: "mint_authority",
        severity: "critical",
        title: "Mint Authority Not Revoked",
        description: "The mint authority has not been revoked. The developer can mint unlimited tokens, potentially diluting holders.",
      });
    }

    // Freeze authority not revoked
    if (freezeAuthority.hasAuthority) {
      flags.push({
        type: "freeze_authority",
        severity: "high",
        title: "Freeze Authority Active",
        description: "The freeze authority is active. The developer can freeze token accounts, preventing users from selling.",
      });
    }

    // High holder concentration
    if (topHolderConcentration > 70) {
      flags.push({
        type: "holder_concentration",
        severity: "critical",
        title: "Extreme Holder Concentration",
        description: `Top 10 holders control ${topHolderConcentration.toFixed(1)}% of supply. High risk of coordinated dumps.`,
      });
    } else if (topHolderConcentration > 50) {
      flags.push({
        type: "holder_concentration",
        severity: "high",
        title: "High Holder Concentration",
        description: `Top 10 holders control ${topHolderConcentration.toFixed(1)}% of supply. Risk of price manipulation.`,
      });
    }

    // Low holder count
    if (holderCount < 100) {
      flags.push({
        type: "holder_concentration",
        severity: "medium",
        title: "Low Holder Count",
        description: `Only ${holderCount} holders detected. Low distribution may indicate early-stage or low interest.`,
      });
    }

    // Risky liquidity
    if (liquidityPool.status === "RISKY") {
      flags.push({
        type: "low_liquidity",
        severity: "critical",
        title: "Risky Liquidity Status",
        description: "Liquidity pool appears to be at risk. May not be locked or burned.",
      });
    }

    return flags;
  }

  private calculateRiskScore(redFlags: RiskFlag[]): number {
    let score = 0;
    
    for (const flag of redFlags) {
      switch (flag.severity) {
        case "critical":
          score += 30;
          break;
        case "high":
          score += 20;
          break;
        case "medium":
          score += 10;
          break;
        case "low":
          score += 5;
          break;
      }
    }
    
    return Math.min(100, score);
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score >= 70) return "EXTREME";
    if (score >= 50) return "HIGH";
    if (score >= 30) return "MODERATE";
    return "LOW";
  }
}

export const tokenAnalyzer = new SolanaTokenAnalyzer();

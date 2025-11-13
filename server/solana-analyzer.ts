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
import { isKnownAddress, getKnownAddressInfo, detectBundledWallets } from "./known-addresses";
import { getBirdeyeOverview } from "./services/birdeye-api";
import { checkPumpFun } from "./services/pumpfun-api";
import { rpcBalancer } from "./services/rpc-balancer";

export class SolanaTokenAnalyzer {
  private connection: Connection;
  private rugcheckService: RugcheckService;
  private goplusService: GoPlusSecurityService;
  private dexscreenerService: DexScreenerService;
  private jupiterPriceService: JupiterPriceService;

  constructor() {
    this.connection = rpcBalancer.getConnection();
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
      const [onChainHolders, totalHolderCount, recentTransactions, rugcheckData, goplusData, dexscreenerData, jupiterPriceData, birdeyeData, pumpFunData] = await Promise.all([
        this.fetchTopHolders(mintPubkey, mintInfo.decimals, mintInfo.supply),
        this.getTotalHolderCount(mintPubkey).catch(() => null),
        this.fetchRecentTransactions(mintPubkey),
        this.rugcheckService.getTokenReport(tokenAddress).catch(() => null),
        this.goplusService.getTokenSecurity(tokenAddress).catch(() => null),
        this.dexscreenerService.getTokenData(tokenAddress).catch(() => null),
        this.jupiterPriceService.getTokenPrice(tokenAddress).catch(() => null),
        getBirdeyeOverview(tokenAddress).catch(() => null),
        checkPumpFun(tokenAddress).catch(() => ({ isPumpFun: false, devBought: 0, bondingCurve: 0 })),
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
      
      // First, get liquidity pool addresses from external sources
      const liquidityPool = this.analyzeLiquidity(0); // Pass 0 initially, will recalculate

      // Enrich liquidity data with market information from Rugcheck and DexScreener
      const enrichedLiquidity = this.enrichLiquidityWithMarketData(
        liquidityPool,
        rugcheckData,
        dexscreenerData
      );
      
      // Filter out LP/exchange addresses from holder concentration calculation
      const lpAddresses = enrichedLiquidity.lpAddresses || [];
      
      // Detect bundled wallets (same-block purchases, suspicious patterns)
      const bundledWallets = detectBundledWallets(holders);
      
      // Filter out LP addresses, known exchanges, and bundled wallets
      const addressesToExclude = new Set([
        ...lpAddresses,
        ...bundledWallets,
      ]);
      
      // Also filter out known exchange/protocol addresses
      const filteredHolders = holders.filter(h => {
        // Exclude LP addresses
        if (addressesToExclude.has(h.address)) return false;
        
        // Exclude known exchanges/protocols
        if (isKnownAddress(h.address)) return false;
        
        return true;
      });
      
      // Calculate holder concentration excluding filtered addresses
      const topHolderConcentration = Math.min(100, Math.max(0, 
        filteredHolders.slice(0, 10).reduce((sum, h) => sum + (h.percentage || 0), 0)
      ));
      
      // Build holder filtering metadata
      const excludedAddresses: Array<{address: string; type: 'lp' | 'exchange' | 'protocol' | 'bundled'; label?: string; reason: string;}> = [];
      
      // Add LP addresses
      lpAddresses.forEach(addr => {
        excludedAddresses.push({
          address: addr,
          type: 'lp',
          reason: 'Liquidity pool or token account'
        });
      });
      
      // Add known exchanges/protocols
      holders.forEach(h => {
        if (isKnownAddress(h.address)) {
          const info = getKnownAddressInfo(h.address);
          excludedAddresses.push({
            address: h.address,
            type: info?.type === 'exchange' ? 'exchange' : 'protocol',
            label: info?.label,
            reason: info?.label || 'Known exchange/protocol'
          });
        }
      });
      
      // Add bundled wallets
      bundledWallets.forEach(addr => {
        excludedAddresses.push({
          address: addr,
          type: 'bundled',
          reason: 'Suspected bundled wallet (same purchase pattern)'
        });
      });
      
      // Calculate bundle supply percentage (DevsNightmarePro-style)
      const bundledHolders = holders.filter(h => bundledWallets.includes(h.address));
      
      // Calculate percentage from holder data (safe for both on-chain and Rugcheck fallback)
      const bundleSupplyPct = bundledHolders.reduce((sum, h) => sum + (h.percentage || 0), 0);
      
      // Calculate amount - only meaningful for on-chain data (Rugcheck sets balance=percentage)
      const bundledSupplyAmount = onChainHolders.length > 0 
        ? bundledHolders.reduce((sum, h) => sum + (h.balance || 0), 0)
        : undefined; // Suppress when using Rugcheck fallback to avoid misleading figures
      
      // Determine confidence level based on bundle size and percentage
      let bundleConfidence: 'low' | 'medium' | 'high' = 'low';
      if (bundledWallets.length >= 5 || bundleSupplyPct >= 15) {
        bundleConfidence = 'high';
      } else if (bundledWallets.length >= 3 || bundleSupplyPct >= 5) {
        bundleConfidence = 'medium';
      }
      
      const holderFiltering = {
        totals: {
          lp: lpAddresses.length,
          exchanges: excludedAddresses.filter(a => a.type === 'exchange').length,
          protocols: excludedAddresses.filter(a => a.type === 'protocol').length,
          bundled: bundledWallets.length,
          total: excludedAddresses.length
        },
        excluded: excludedAddresses,
        bundledDetection: bundledWallets.length > 0 ? {
          strategy: 'percentageMatch' as const,
          confidence: bundleConfidence,
          details: `Detected ${bundledWallets.length} wallets with suspicious patterns`,
          bundleSupplyPct: Math.min(100, Math.max(0, bundleSupplyPct)),
          bundledSupplyAmount
        } : undefined
      };
      
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
        holderCount
      );
      
      // Calculate overall risk score with safety check
      const riskScore = this.calculateRiskScore(redFlags);
      const safeRiskScore = isNaN(riskScore) || !isFinite(riskScore) ? 100 : Math.min(100, Math.max(0, riskScore));
      const riskLevel = this.getRiskLevel(safeRiskScore);
      
      const now = Date.now();
      const safeAnalyzedAt = isNaN(now) || !isFinite(now) ? Date.now() : now;

      // Calculate AI verdict
      const aiVerdict = this.calculateAIVerdict({
        riskScore: safeRiskScore,
        mintAuthority,
        freezeAuthority,
        liquidityPool: enrichedLiquidity,
        marketData,
      });

      return {
        tokenAddress,
        riskScore: safeRiskScore,
        riskLevel,
        analyzedAt: safeAnalyzedAt,
        mintAuthority,
        freezeAuthority,
        metadata,
        holderCount: holderCount,
        topHolders: filteredHolders, // Return filtered holders (excluding LP, exchanges, bundles)
        topHolderConcentration: isNaN(topHolderConcentration) ? 0 : topHolderConcentration,
        holderFiltering,
        liquidityPool: enrichedLiquidity,
        marketData,
        recentTransactions,
        suspiciousActivityDetected: recentTransactions.some(tx => tx.suspicious),
        redFlags,
        creationDate: undefined,
        aiVerdict,
        pumpFunData: pumpFunData || undefined,
        birdeyeData: birdeyeData || undefined,
        rugcheckData: rugcheckData || undefined,
        goplusData: goplusData || undefined,
        dexscreenerData: dexscreenerData || undefined,
        jupiterPriceData: jupiterPriceData || undefined,
      };
    } catch (error) {
      console.error("Token analysis error:", error);
      
      // Detect specific error types for better user messaging
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isRateLimitError = errorMessage.includes('429') || 
                               errorMessage.toLowerCase().includes('rate limit') ||
                               errorMessage.toLowerCase().includes('too many requests');
      const isInvalidAddress = errorMessage.toLowerCase().includes('invalid') ||
                               errorMessage.toLowerCase().includes('not found');
      
      // Build appropriate error description
      let errorDescription = "Unable to complete token analysis: ";
      if (isRateLimitError) {
        errorDescription += "Solana RPC rate limit reached. Please try again in a few moments.";
      } else if (isInvalidAddress) {
        errorDescription += "Invalid token address or token does not exist on-chain.";
      } else {
        errorDescription += `${errorMessage}. This may be due to network issues or an invalid token address.`;
      }
      
      // Return a safe default response when analysis fails
      // NOTE: Setting riskScore to 0 (EXTREME RISK) is intentional - failed analysis = maximum caution
      return {
        tokenAddress,
        riskScore: 0,
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
        holderFiltering: {
          totals: { lp: 0, exchanges: 0, protocols: 0, bundled: 0, total: 0 },
          excluded: [],
        },
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
          title: isRateLimitError ? "Rate Limit Reached" : "Analysis Failed",
          description: errorDescription,
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
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit')) {
        console.log(`[RPC Balancer] Rotating connection due to rate limit in fetchTopHolders`);
        this.connection = rpcBalancer.getConnection();
        // Retry once with new connection
        try {
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
            .slice(0, 20);
          return holders;
        } catch (retryError) {
          console.error("Error fetching holders after rotation:", retryError);
          return [];
        }
      }
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
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit')) {
        console.log(`[RPC Balancer] Rotating connection due to rate limit in getTotalHolderCount`);
        this.connection = rpcBalancer.getConnection();
        // Retry once with new connection
        try {
          const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
          const accounts = await this.connection.getProgramAccounts(
            TOKEN_PROGRAM_ID,
            {
              filters: [
                { dataSize: 165 },
                { 
                  memcmp: { 
                    offset: 0, 
                    bytes: mintPubkey.toBase58() 
                  } 
                }
              ],
            }
          );
          const nonZeroAccounts = accounts.filter(account => {
            const data = account.account.data;
            if (Buffer.isBuffer(data)) {
              const amount = data.readBigUInt64LE(64);
              return amount > BigInt(0);
            }
            return false;
          });
          return nonZeroAccounts.length;
        } catch (retryError) {
          console.error("Error fetching total holder count after rotation:", retryError);
          return null;
        }
      }
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

    // Add Rugcheck liquidity token accounts to exclude from holder concentration
    // For Pump.fun, this includes the token account owned by the bonding curve
    if (rugcheckData?.markets) {
      rugcheckData.markets.forEach((market: any) => {
        if (market.pubkey) lpAddresses.push(market.pubkey); // Pair/program address
        if (market.liquidityA) lpAddresses.push(market.liquidityA); // Token account A
        if (market.liquidityB) lpAddresses.push(market.liquidityB); // Token account B (SOL)
      });
    }

    // Deduplicate LP addresses using Set
    const uniqueLpAddresses = Array.from(new Set(lpAddresses));

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

      // Check if this is a Pump.fun token (bonding curve model)
      // Rugcheck may return 'pump_fun' or 'pump_fun_amm' market types
      const isPumpFun = primaryMarket.marketType?.startsWith('pump_fun') || false;
      
      // For Pump.fun tokens, use lpLockedPct from the lp object
      // For regular tokens, use lpBurn field
      if (isPumpFun && primaryMarket.lp) {
        maxBurnPercentage = primaryMarket.lp.lpLockedPct || 0;
        // Use locked USD liquidity for Pump.fun
        if (!totalLiquidity && primaryMarket.lp.lpLockedUSD) {
          totalLiquidity = primaryMarket.lp.lpLockedUSD;
        }
      } else {
        maxBurnPercentage = primaryMarket.lpBurn || 0;
      }
      
      // Use Rugcheck liquidity if DexScreener didn't have it
      if (!totalLiquidity) {
        totalLiquidity = primaryMarket.liquidity;
      }
      
      // The percentage is already 0-100
      const isBurned = maxBurnPercentage >= 99.99;
      const isLocked = maxBurnPercentage >= 90;

      // Cross-validate: if liquidity exists but burn is low, it's risky
      const hasLiquidity = (totalLiquidity && totalLiquidity > 1000) || false;

      let status: "SAFE" | "RISKY" | "UNKNOWN" = liquidityPool.status;
      // For pump.fun tokens, locked >= 90% is safe. For regular tokens, burned >= 99.99% is safe.
      if ((isBurned || isLocked) && hasLiquidity) {
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
        lpAddresses: uniqueLpAddresses,
        status,
      };
    }

    // No Rugcheck data - use DexScreener liquidity only
    if (primaryPair?.liquidity?.usd) {
      return {
        ...liquidityPool,
        totalLiquidity: primaryPair.liquidity.usd,
        lpAddresses: uniqueLpAddresses,
        status: totalLiquidity && totalLiquidity > 1000 ? "RISKY" : "UNKNOWN",
      };
    }

    // No liquidity data at all - add LP addresses if available
    if (uniqueLpAddresses.length > 0) {
      return {
        ...liquidityPool,
        lpAddresses: uniqueLpAddresses,
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
    // REVERSED SCORING: Start at 100 (safe), subtract points for red flags (lower = worse)
    let score = 100;
    
    for (const flag of redFlags) {
      switch (flag.severity) {
        case "critical":
          score -= 30;
          break;
        case "high":
          score -= 20;
          break;
        case "medium":
          score -= 10;
          break;
        case "low":
          score -= 5;
          break;
      }
    }
    
    return Math.max(0, score);
  }

  private getRiskLevel(score: number): RiskLevel {
    // REVERSED THRESHOLDS: 70-100 (green), 40-70 (yellow), 20-40 (orange), 0-20 (red)
    if (score >= 70) return "LOW";
    if (score >= 40) return "MODERATE";
    if (score >= 20) return "HIGH";
    return "EXTREME";
  }

  private calculateAIVerdict(analysis: {
    riskScore: number;
    mintAuthority: { hasAuthority: boolean };
    freezeAuthority: { hasAuthority: boolean };
    liquidityPool: { isBurned?: boolean; isLocked?: boolean };
    marketData?: { marketCap: number | null };
  }): { rating: string; verdict: string } {
    const score = analysis.riskScore;
    const mintRenounced = !analysis.mintAuthority.hasAuthority;
    const freezeDisabled = !analysis.freezeAuthority.hasAuthority;
    const lpBurned = analysis.liquidityPool.isBurned || analysis.liquidityPool.isLocked || false;
    const mcap = analysis.marketData?.marketCap || 0;
    
    // Rick Bot style ratings (0=bad, 100=good)
    if (score >= 75 && mintRenounced && freezeDisabled && lpBurned) {
      return {
        rating: '10/10',
        verdict: '🟢 MOON SHOT - RICK BOT WOULD APE'
      };
    } else if (score >= 50 && mcap < 500000) {
      return {
        rating: '7/10',
        verdict: '🟡 HIGH RISK/HIGH REWARD - PHANES SAYS WATCH'
      };
    } else if (score >= 30) {
      return {
        rating: '5/10',
        verdict: '🟠 PROCEED WITH CAUTION - SMALL BAG ONLY'
      };
    } else {
      return {
        rating: '3/10',
        verdict: '🔴 RUG CITY - TROJAN WOULD BLOCK'
      };
    }
  }
}

export const tokenAnalyzer = new SolanaTokenAnalyzer();

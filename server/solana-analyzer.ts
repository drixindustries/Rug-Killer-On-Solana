import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js";
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
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
import { isKnownAddress, getKnownAddressInfo, detectBundledWallets, getPumpFunBondingCurveAddress, getPumpFunAssociatedBondingCurveAddress } from "./known-addresses";
import { getBirdeyeOverview } from "./services/birdeye-api";
import { checkPumpFun } from "./services/pumpfun-api";
import { rpcBalancer } from "./services/rpc-balancer";
import { LPChecker } from "./services/lp-checker";
import { BundleDetectorService } from "./services/bundle-detector";
import { BubblemapsService } from "./services/bubblemaps-service";
import { QuillCheckService } from "./services/quillcheck-service";
import { WhaleDetectorService } from "./services/whale-detector";
import { GMGNService } from "./services/gmgn-service";
import { AgedWalletDetector } from "./services/aged-wallet-detector";
import { PumpDumpDetectorService } from "./services/pump-dump-detector";
import { LiquidityMonitorService } from "./services/liquidity-monitor";
import { HolderTrackingService } from "./services/holder-tracking";
import { FundingSourceAnalyzer } from "./services/funding-source-analyzer";

export class SolanaTokenAnalyzer {
  private rugcheckService: RugcheckService;
  private goplusService: GoPlusSecurityService;
  private dexscreenerService: DexScreenerService;
  private jupiterPriceService: JupiterPriceService;
  private bundleDetector: BundleDetectorService;
  private bubblemapsService: BubblemapsService;
  private quillcheckService: QuillCheckService;
  private whaleDetector: WhaleDetectorService;
  private gmgnService: GMGNService;
  private agedWalletDetector: AgedWalletDetector;
  private pumpDumpDetector: PumpDumpDetectorService;
  private liquidityMonitor: LiquidityMonitorService;
  private holderTracker: HolderTrackingService;
  private fundingAnalyzer: FundingSourceAnalyzer;

  constructor() {
    this.rugcheckService = new RugcheckService();
    this.goplusService = new GoPlusSecurityService();
    this.dexscreenerService = new DexScreenerService();
    this.jupiterPriceService = new JupiterPriceService();
    this.bundleDetector = new BundleDetectorService();
    this.bubblemapsService = new BubblemapsService();
    this.quillcheckService = new QuillCheckService();
    this.whaleDetector = new WhaleDetectorService();
    this.gmgnService = new GMGNService();
    this.agedWalletDetector = new AgedWalletDetector();
    this.pumpDumpDetector = new PumpDumpDetectorService();
    this.liquidityMonitor = new LiquidityMonitorService();
    this.holderTracker = new HolderTrackingService();
    this.fundingAnalyzer = new FundingSourceAnalyzer();
  }

  private getConnection(): Connection {
    return rpcBalancer.getConnection();
  }

  // Get multiple connections for concurrent operations
  private getMultipleConnections(count: number = 3): Connection[] {
    return rpcBalancer.getMultipleConnections(count);
  }

  async analyzeToken(tokenAddress: string): Promise<TokenAnalysisResponse> {
    try {
      // Validate address format before proceeding
      let mintPubkey: PublicKey;
      try {
        mintPubkey = new PublicKey(tokenAddress);
      } catch (error) {
        throw new Error(`Invalid Solana address format: ${tokenAddress}`);
      }
      
      // Fetch mint account info
      const connection = this.getConnection();
      
      // First, check if the account exists and get its owner to determine the correct program
      let mintInfo;
      let accountInfo;
      
      try {
        accountInfo = await connection.getAccountInfo(mintPubkey);
        
        if (!accountInfo) {
          throw new Error(`Token mint account not found: ${tokenAddress}`);
        }
        
        // Check which token program owns this account
        const isToken2022 = accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
        const isSPLToken = accountInfo.owner.equals(TOKEN_PROGRAM_ID);
        
        if (!isToken2022 && !isSPLToken) {
          console.error(`Account owner is not a token program: ${accountInfo.owner.toBase58()}`);
          throw new Error(`Invalid token: account is owned by ${accountInfo.owner.toBase58()}, not a token program`);
        }
        
        // Fetch mint info using the correct program ID
        if (isToken2022) {
          mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID);
          console.log(`✅ Token uses Token-2022 program: ${tokenAddress}`);
        } else {
          mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_PROGRAM_ID);
          console.log(`✅ Token uses standard SPL Token program: ${tokenAddress}`);
        }
      } catch (error) {
        console.error('Failed to fetch mint info:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch token data: ${errorMessage}`);
      }
      
      // Analyze authorities
      const mintAuthority = this.analyzeMintAuthority(mintInfo.mintAuthority);
      const freezeAuthority = this.analyzeFreezeAuthority(mintInfo.freezeAuthority);
      
      // Fetch token accounts (holders) from on-chain and external APIs in parallel
      const [onChainHolders, totalHolderCount, recentTransactions, rugcheckData, goplusData, dexscreenerData, jupiterPriceData, birdeyeData, pumpFunData, quillcheckData, gmgnRawData] = await Promise.all([
        this.fetchTopHolders(mintPubkey, mintInfo.decimals, mintInfo.supply),
        this.getTotalHolderCount(mintPubkey).catch(() => null),
        this.fetchRecentTransactions(mintPubkey),
        this.rugcheckService.getTokenReport(tokenAddress).catch(() => null),
        this.goplusService.getTokenSecurity(tokenAddress).catch(() => null),
        this.dexscreenerService.getTokenData(tokenAddress).catch(() => null),
        this.jupiterPriceService.getTokenPrice(tokenAddress).catch(() => null),
        getBirdeyeOverview(tokenAddress).catch(() => null),
        checkPumpFun(tokenAddress).catch(() => ({ isPumpFun: false, devBought: 0, bondingCurve: 0 })),
        this.quillcheckService.checkToken(tokenAddress).catch(() => null),
        this.gmgnService.getTokenAnalysis(tokenAddress).catch(() => null),
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
      const enrichedLiquidity = await this.enrichLiquidityWithMarketData(
        liquidityPool,
        rugcheckData,
        dexscreenerData,
        tokenAddress
      );
      
      // Filter out LP/exchange addresses from holder concentration calculation
      const lpAddresses = enrichedLiquidity.lpAddresses || [];
      
      // Detect bundled wallets (same-block purchases, suspicious patterns)
      const bundledWallets = detectBundledWallets(holders);
      
      // For pump.fun tokens, also exclude the bonding curve addresses
      // Detect pump.fun from multiple sources for reliability
      const isPumpFunFromAPI = pumpFunData?.isPumpFun || false;
      const isPumpFunFromRugcheck = rugcheckData?.markets?.some((m: any) => 
        m.marketType?.startsWith('pump_fun')
      ) || false;
      const isPumpFunToken = isPumpFunFromAPI || isPumpFunFromRugcheck;
      
      const pumpFunExclusions: string[] = [];
      if (isPumpFunToken) {
        try {
          const bondingCurve = getPumpFunBondingCurveAddress(tokenAddress);
          const associatedBondingCurve = getPumpFunAssociatedBondingCurveAddress(tokenAddress);
          
          if (bondingCurve) {
            pumpFunExclusions.push(bondingCurve);
            console.log(`[Pump.fun] Excluding bonding curve: ${bondingCurve}`);
          }
          if (associatedBondingCurve) {
            pumpFunExclusions.push(associatedBondingCurve);
            console.log(`[Pump.fun] Excluding associated bonding curve: ${associatedBondingCurve}`);
          }
        } catch (error) {
          console.error('[Pump.fun] Failed to calculate bonding curve addresses:', error);
          // Continue without exclusions rather than failing entirely
        }
      }
      
      // Filter out LP addresses, known exchanges, bundled wallets, and pump.fun bonding curve
      const addressesToExclude = new Set([
        ...lpAddresses,
        ...bundledWallets,
        ...pumpFunExclusions,
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
      
      // Add pump.fun bonding curve addresses
      pumpFunExclusions.forEach(addr => {
        excludedAddresses.push({
          address: addr,
          type: 'protocol',
          label: 'Pump.fun Bonding Curve',
          reason: 'Pump.fun bonding curve contract (not a real holder)'
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

      // Advanced bundle detection using Jito timing analysis
      let advancedBundleData = null;
      try {
        advancedBundleData = await this.bundleDetector.detectBundles(tokenAddress, holders);
        console.log(`[Bundle Detector] Score: ${advancedBundleData?.bundleScore || 0}, Bundled Supply: ${advancedBundleData?.bundledSupplyPercent || 0}%`);
      } catch (error) {
        console.error('[Bundle Detector] Analysis failed:', error);
      }

      // Wallet network analysis with Bubblemaps
      let networkAnalysis = null;
      try {
        networkAnalysis = await this.bubblemapsService.analyzeNetwork(tokenAddress);
        console.log(`[Bubblemaps] Network Risk: ${networkAnalysis?.networkRiskScore || 0}, Clustered Wallets: ${networkAnalysis?.clusteredWallets || 0}`);
      } catch (error) {
        console.error('[Bubblemaps] Analysis failed:', error);
      }

      // GMGN.AI bundle & insider detection
      let gmgnData = null;
      try {
        if (gmgnRawData) {
          gmgnData = this.gmgnService.extractBundleInfo(gmgnRawData);
          const smartMoneyActive = this.gmgnService.hasSmartMoneyActivity(gmgnRawData);
          if (gmgnData) {
            gmgnData.smartMoneyActive = smartMoneyActive;
          }
          console.log(`[GMGN] Bundled: ${gmgnData?.isBundled}, Insiders: ${gmgnData?.insiderCount}, Snipers: ${gmgnData?.sniperCount}, Confidence: ${gmgnData?.confidence}%`);
        }
      } catch (error) {
        console.error('[GMGN] Data processing failed:', error);
      }

      // Aged wallet detection (fake volume)
      let agedWalletData = null;
      try {
        agedWalletData = await this.agedWalletDetector.detectAgedWallets(
          tokenAddress,
          holders,
          recentTransactions
        );
        console.log(`[Aged Wallets] Count: ${agedWalletData.agedWalletCount}, Fake Volume: ${agedWalletData.totalFakeVolumePercent.toFixed(1)}%, Risk: ${agedWalletData.riskScore}`);
      } catch (error) {
        console.error('[Aged Wallets] Detection failed:', error);
      }

      // Pump & Dump pattern detection
      let pumpDumpData = null;
      try {
        const dexService = new DexScreenerService();
        const primaryPair = dexscreenerData ? dexService.getMostLiquidPair(dexscreenerData) : null;
        pumpDumpData = this.pumpDumpDetector.analyzePriceAction(primaryPair, { topHolders: holders });
        console.log(`[Pump & Dump] Rug Confidence: ${pumpDumpData.rugConfidence}%, Patterns: ${pumpDumpData.patterns.length}`);
      } catch (error) {
        console.error('[Pump & Dump] Detection failed:', error);
      }

      // Liquidity monitoring (real-time)
      let liquidityMonitorData = null;
      try {
        const dexService = new DexScreenerService();
        const primaryPair = dexscreenerData ? dexService.getMostLiquidPair(dexscreenerData) : null;
        liquidityMonitorData = this.liquidityMonitor.monitorLiquidity(primaryPair);
        
        // Calculate liquidity/mcap ratio if we have both
        if (primaryPair && marketData?.marketCap) {
          const ratio = this.liquidityMonitor.calculateLiquidityRatio(
            primaryPair.liquidity?.usd || 0,
            marketData.marketCap
          );
          liquidityMonitorData.liquidityToMcapRatio = ratio;
        }
        
        console.log(`[Liquidity Monitor] Health: ${liquidityMonitorData.isHealthy}, Trend: ${liquidityMonitorData.liquidityTrend}, Risk: ${liquidityMonitorData.riskScore}`);
      } catch (error) {
        console.error('[Liquidity Monitor] Check failed:', error);
      }

      // Top holder tracking (coordinated sell-offs)
      let holderTrackingData = null;
      try {
        holderTrackingData = await this.holderTracker.trackTopHolders(tokenAddress, holders);
        console.log(`[Holder Tracking] Stability: ${holderTrackingData.topHolderStability}, Sellers: ${holderTrackingData.suspiciousActivities.length}`);
      } catch (error) {
        console.error('[Holder Tracking] Analysis failed:', error);
      }

      // Funding source analysis (Nova-style detection)
      let fundingAnalysisData = null;
      try {
        fundingAnalysisData = await this.fundingAnalyzer.analyzeFundingSources(tokenAddress, holders);
        console.log(`[Funding Analysis] Suspicious: ${fundingAnalysisData.suspiciousFunding}, Sources: ${Object.keys(fundingAnalysisData.fundingSourceBreakdown).length}`);
      } catch (error) {
        console.error('[Funding Analysis] Failed:', error);
      }
      
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
        holderCount,
        advancedBundleData,
        networkAnalysis,
        quillcheckData,
        gmgnData,
        agedWalletData,
        pumpDumpData,
        liquidityMonitorData,
        holderTrackingData,
        fundingAnalysisData
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
        quillcheckData: quillcheckData || undefined,
        advancedBundleData: advancedBundleData as any || undefined,
        networkAnalysis: networkAnalysis || undefined,
        gmgnData: gmgnData || undefined,
        agedWalletData: agedWalletData || undefined,
        pumpDumpData: pumpDumpData || undefined,
        liquidityMonitor: liquidityMonitorData || undefined,
        holderTracking: holderTrackingData || undefined,
        fundingAnalysis: fundingAnalysisData || undefined,
      };
    } catch (error) {
      console.error("Token analysis error:", error);
      
      // Detect specific error types for better user messaging
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isRateLimitError = errorMessage.includes('429') || 
                               errorMessage.toLowerCase().includes('rate limit') ||
                               errorMessage.toLowerCase().includes('too many requests');
      const isInvalidAddress = errorMessage.toLowerCase().includes('invalid') ||
                               errorMessage.toLowerCase().includes('not found') ||
                               errorMessage.toLowerCase().includes('account not found');
      const isNetworkError = errorMessage.toLowerCase().includes('network') ||
                            errorMessage.toLowerCase().includes('timeout') ||
                            errorMessage.toLowerCase().includes('econnrefused');
      const isTokenProgramError = errorMessage.toLowerCase().includes('token program') ||
                                  errorMessage.toLowerCase().includes('owner');
      
      // Build appropriate error description
      let errorDescription = "Unable to complete token analysis: ";
      let errorTitle = "Analysis Failed";
      
      if (isRateLimitError) {
        errorTitle = "Rate Limit Reached";
        errorDescription += "Solana RPC rate limit reached. Please try again in a few moments.";
      } else if (isInvalidAddress) {
        errorTitle = "Invalid Token";
        errorDescription += "This token address does not exist on Solana or is not a valid SPL token.";
      } else if (isNetworkError) {
        errorTitle = "Network Error";
        errorDescription += "Unable to connect to Solana network. Please check your connection and try again.";
      } else if (isTokenProgramError) {
        errorTitle = "Unsupported Token";
        errorDescription += "This account is not a valid SPL token or Token-2022. It may be a different type of Solana account.";
      } else {
        errorDescription += errorMessage;
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
          title: errorTitle,
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
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const connection = this.getConnection(); // Get fresh connection each attempt
        const tokenAccounts = await connection.getTokenLargestAccounts(mintPubkey);
        
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
        attempts++;
        const isRateLimit = error.message?.includes('429') || error.message?.includes('Too Many Requests');
        const isUnsupported = error.code === -32600 || error.message?.includes('not supported') || error.message?.includes('Too many accounts');
        
        if (isRateLimit) {
          console.log(`[RPC Balancer] Rate limited on attempt ${attempts}, rotating provider...`);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
            continue;
          }
        } else if (isUnsupported && attempts < maxAttempts) {
          // Silently retry with next provider - some RPCs don't support getProgramAccounts
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        // Only log unexpected errors on final attempt
        if (attempts >= maxAttempts && !isUnsupported) {
          console.error(`Error fetching top holders after ${maxAttempts} attempts:`, error.message);
        }
        
        if (attempts >= maxAttempts) {
          return [];
        }
      }
    }
    return [];
  }

  private async getTotalHolderCount(mintPubkey: PublicKey): Promise<number | null> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const connection = this.getConnection(); // Get fresh connection each attempt
        const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
        
        const accounts = await connection.getProgramAccounts(
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
        attempts++;
        const isRateLimit = error.message?.includes('429') || error.message?.includes('Too Many Requests');
        const isUnsupported = error.code === -32600 || error.message?.includes('not supported') || error.message?.includes('Too many accounts');
        
        if (isRateLimit) {
          console.log(`[RPC Balancer] Rate limited on attempt ${attempts}, rotating provider...`);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
            continue;
          }
        } else if (isUnsupported && attempts < maxAttempts) {
          // Silently retry with next provider - some RPCs don't support getProgramAccounts
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        // Only log unexpected errors on final attempt
        if (attempts >= maxAttempts && !isUnsupported) {
          console.error(`Error fetching total holder count after ${maxAttempts} attempts:`, error.message);
        }
        
        if (attempts >= maxAttempts) {
          return null;
        }
      }
    }
    return null;
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

  private async enrichLiquidityWithMarketData(
    liquidityPool: LiquidityPoolStatus,
    rugcheckData: any,
    dexscreenerData: any,
    tokenAddress: string
  ): Promise<LiquidityPoolStatus> {
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
    
    // ON-CHAIN LP BURN CHECKING (Grok's Method)
    // Instead of relying on Rugcheck percentages, check actual on-chain state
    const connection = this.getConnection();
    const lpChecker = new LPChecker(connection);
    
    let isBurned = false;
    let isLocked = false;
    let burnPercentage = 0;

    if (rugcheckData?.markets && rugcheckData.markets.length > 0) {
      // Find the market with highest liquidity
      const primaryMarket = rugcheckData.markets.reduce((prev: any, current: any) => {
        return (current.liquidity || 0) > (prev.liquidity || 0) ? current : prev;
      });

      // Use Rugcheck liquidity if DexScreener didn't have it
      if (!totalLiquidity) {
        totalLiquidity = primaryMarket.liquidity;
      }

      // Check if this is a Pump.fun token (bonding curve model)
      const isPumpFun = primaryMarket.marketType?.startsWith('pump_fun') || false;
      
      // For Pump.fun tokens, use lpLockedPct (they're locked in bonding curve, not burned)
      // For regular tokens, check actual on-chain LP burn status
      if (isPumpFun && primaryMarket.lp) {
        burnPercentage = primaryMarket.lp.lpLockedPct || 0;
        isLocked = burnPercentage >= 90;
        isBurned = false; // Pump.fun tokens use locking, not burning
        
        console.log(`[Pump.fun] Detected bonding curve liquidity: ${burnPercentage}% locked`);
        
        // Use locked USD liquidity for Pump.fun
        if (!totalLiquidity && primaryMarket.lp.lpLockedUSD) {
          totalLiquidity = primaryMarket.lp.lpLockedUSD;
        }
        
        // Fallback: If lpLockedPct is missing but we detected pump.fun, treat as risky
        if (burnPercentage === 0 && !primaryMarket.lp.lpLockedPct) {
          console.warn(`[Pump.fun] Missing lpLockedPct data for ${tokenAddress}`);
          isLocked = false; // Unknown lock status = risky
        }
      } else if (primaryPair?.pairAddress) {
        // Regular AMM token - check on-chain if LP is actually burned
        try {
          isBurned = await lpChecker.isLPBurned(primaryPair.pairAddress);
          burnPercentage = isBurned ? 100 : 0;
          isLocked = false;
        } catch (error) {
          console.error('[LP Check] Failed to check LP burn status:', error);
          // Fallback: LP exists but we can't verify burn status = RISKY
          isBurned = false;
          isLocked = false;
          burnPercentage = 0;
        }
      }

      // Cross-validate: if liquidity exists but not burned/locked, it's risky
      const hasLiquidity = (totalLiquidity && totalLiquidity > 1000) || false;

      let status: "SAFE" | "RISKY" | "UNKNOWN" = liquidityPool.status;
      // For pump.fun tokens, locked >= 90% is safe. For regular tokens, burned is safe.
      if ((isBurned || isLocked) && hasLiquidity) {
        status = "SAFE";
      } else if (hasLiquidity && !isBurned && !isLocked) {
        status = "RISKY";
      }

      return {
        ...liquidityPool,
        isBurned,
        isLocked,
        burnPercentage,
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
      const connection = this.getConnection(); // Get fresh connection
      const signatures = await connection.getSignaturesForAddress(mintPubkey, { limit: 10 });
      
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
    holderCount: number,
    advancedBundleData?: any,
    networkAnalysis?: any,
    quillcheckData?: any,
    gmgnData?: any,
    agedWalletData?: any,
    pumpDumpData?: any,
    liquidityMonitorData?: any,
    holderTrackingData?: any,
    fundingAnalysisData?: any
  ): RiskFlag[] {
    const flags: RiskFlag[] = [];

    // QuillCheck honeypot detection (CRITICAL - highest priority)
    if (quillcheckData) {
      if (quillcheckData.isHoneypot) {
        flags.push({
          type: "honeypot",
          severity: "critical",
          title: "HONEYPOT DETECTED",
          description: "This token cannot be sold. QuillCheck AI simulation detected sell restrictions.",
        });
      }

      if (!quillcheckData.canSell && !quillcheckData.isHoneypot) {
        flags.push({
          type: "honeypot",
          severity: "critical",
          title: "Sell Function Restricted",
          description: "Selling this token may be disabled or restricted.",
        });
      }

      if (quillcheckData.sellTax > 15) {
        flags.push({
          type: "tax",
          severity: "high",
          title: `Excessive Sell Tax: ${quillcheckData.sellTax}%`,
          description: `Selling this token incurs a ${quillcheckData.sellTax}% tax, which may prevent profitable exits.`,
        });
      }

      if (quillcheckData.sellTax - quillcheckData.buyTax > 5) {
        flags.push({
          type: "tax",
          severity: "high",
          title: "Asymmetric Tax Structure",
          description: `Buy tax: ${quillcheckData.buyTax}%, Sell tax: ${quillcheckData.sellTax}% - major red flag for honeypot.`,
        });
      }

      if (quillcheckData.liquidityRisk) {
        flags.push({
          type: "liquidity_drain",
          severity: "critical",
          title: "Liquidity Can Be Drained",
          description: "Contract owner can drain liquidity, resulting in total loss for holders.",
        });
      }
    }

    // Advanced bundle detection (80% of rugs use bundles)
    if (advancedBundleData && advancedBundleData.bundleScore >= 60) {
      flags.push({
        type: "bundle_manipulation",
        severity: "critical",
        title: `Jito Bundle Detected: ${advancedBundleData.bundleScore}/100 Risk`,
        description: `${advancedBundleData.bundledSupplyPercent.toFixed(1)}% of supply held in ${advancedBundleData.suspiciousWallets.length} bundled wallets. ${advancedBundleData.risks.join(' ')}`,
      });
    } else if (advancedBundleData && advancedBundleData.bundleScore >= 35) {
      flags.push({
        type: "bundle_manipulation",
        severity: "high",
        title: `Possible Bundle Activity: ${advancedBundleData.bundleScore}/100 Risk`,
        description: `${advancedBundleData.suspiciousWallets.length} wallets detected with suspicious patterns controlling ${advancedBundleData.bundledSupplyPercent.toFixed(1)}% of supply.`,
      });
    }

    // Wallet network clustering (Bubblemaps)
    if (networkAnalysis && networkAnalysis.networkRiskScore >= 60) {
      flags.push({
        type: "wallet_network",
        severity: "critical",
        title: `Connected Wallet Network: ${networkAnalysis.networkRiskScore}/100 Risk`,
        description: `${networkAnalysis.clusteredWallets} wallets appear to be controlled by the same entity. ${networkAnalysis.risks.join(' ')}`,
      });
    } else if (networkAnalysis && networkAnalysis.networkRiskScore >= 35) {
      flags.push({
        type: "wallet_network",
        severity: "high",
        title: `Suspicious Wallet Clustering`,
        description: `${networkAnalysis.clusteredWallets} wallets show clustering patterns that may indicate coordinated control.`,
      });
    }

    // GMGN.AI bundle & insider detection
    if (gmgnData) {
      if (gmgnData.isBundled && gmgnData.confidence >= 70) {
        flags.push({
          type: "bundle_manipulation",
          severity: "critical",
          title: `GMGN: Confirmed Bundle (${gmgnData.confidence}% confidence)`,
          description: `${gmgnData.bundleWalletCount} bundled wallets control ${gmgnData.bundleSupplyPercent.toFixed(1)}% of supply. ${gmgnData.insiderCount} insiders and ${gmgnData.sniperCount} snipers detected.`,
        });
      } else if (gmgnData.isBundled && gmgnData.confidence >= 40) {
        flags.push({
          type: "bundle_manipulation",
          severity: "high",
          title: `GMGN: Likely Bundle (${gmgnData.confidence}% confidence)`,
          description: `${gmgnData.bundleWalletCount} suspected bundled wallets with ${gmgnData.insiderCount} insiders and ${gmgnData.sniperCount} snipers.`,
        });
      }

      if (gmgnData.insiderCount >= 10) {
        flags.push({
          type: "bundle_manipulation",
          severity: "high",
          title: `High Insider Activity: ${gmgnData.insiderCount} detected`,
          description: "GMGN detected significant insider trading activity among early buyers.",
        });
      }

      if (gmgnData.sniperCount >= 5) {
        flags.push({
          type: "bundle_manipulation",
          severity: "medium",
          title: `Sniper Bot Activity: ${gmgnData.sniperCount} detected`,
          description: "Multiple sniper bots detected in early transactions, indicating coordinated buying.",
        });
      }
    }

    // Aged wallet fake volume detection
    if (agedWalletData && agedWalletData.riskScore >= 70) {
      flags.push({
        type: "bundle_manipulation",
        severity: "critical",
        title: `Fake Volume: ${agedWalletData.agedWalletCount} Aged Wallets Detected`,
        description: `${agedWalletData.agedWalletCount} old wallets (30+ days) controlling ${agedWalletData.totalFakeVolumePercent.toFixed(1)}% of supply. ${agedWalletData.risks.join(' ')}`,
      });
    } else if (agedWalletData && agedWalletData.riskScore >= 40) {
      flags.push({
        type: "bundle_manipulation",
        severity: "high",
        title: `Suspected Fake Volume: ${agedWalletData.agedWalletCount} Aged Wallets`,
        description: `${agedWalletData.agedWalletCount} aged wallets detected creating potential fake volume. ${agedWalletData.risks[0] || ''}`,
      });
    }

    // Specific aged wallet patterns
    if (agedWalletData?.patterns.sameFundingSource && agedWalletData.agedWalletCount >= 5) {
      flags.push({
        type: "bundle_manipulation",
        severity: "high",
        title: "Aged Wallets Share Funding Source",
        description: "Multiple aged wallets were funded from the same source before buying - coordinated fake volume.",
      });
    }

    if (agedWalletData?.patterns.coordinatedBuys && agedWalletData.agedWalletCount >= 5) {
      flags.push({
        type: "bundle_manipulation",
        severity: "high",
        title: "Coordinated Aged Wallet Buys",
        description: "Aged wallets bought within 1 minute of each other - automated fake volume generation.",
      });
    }

    // ============================================================================
    // PUMP & DUMP DETECTION (NEW)
    // ============================================================================
    
    if (pumpDumpData?.isRugPull) {
      flags.push({
        type: "suspicious_transactions",
        severity: "critical",
        title: `RUG PULL DETECTED: ${pumpDumpData.rugConfidence}% Confidence`,
        description: `Token exhibits classic pump & dump pattern. ${pumpDumpData.risks.join(' ')}`,
      });
    }

    // Critical pump & dump patterns
    pumpDumpData?.patterns.forEach((pattern: any) => {
      if (pattern.severity === 'critical') {
        flags.push({
          type: "suspicious_transactions",
          severity: "critical",
          title: pattern.description,
          description: `${pattern.type.replace(/_/g, ' ').toUpperCase()}: Evidence shows ${JSON.stringify(pattern.evidence)}`,
        });
      }
    });

    // Instant dump detection
    if (pumpDumpData?.timeline.dumpDetected && pumpDumpData.timeline.dumpPercentage && pumpDumpData.timeline.dumpPercentage > 60) {
      flags.push({
        type: "suspicious_transactions",
        severity: "critical",
        title: `Catastrophic Dump: -${pumpDumpData.timeline.dumpPercentage.toFixed(0)}%`,
        description: "Token price has crashed. Holders are likely rugged.",
      });
    }

    // ============================================================================
    // LIQUIDITY MONITORING (NEW)
    // ============================================================================
    
    if (liquidityMonitorData?.liquidityTrend === 'critical_drop') {
      flags.push({
        type: "low_liquidity",
        severity: "critical",
        title: "LIQUIDITY BEING DRAINED",
        description: `Liquidity has dropped critically. ${liquidityMonitorData.risks.join(' ')}`,
      });
    }

    if (liquidityMonitorData && !liquidityMonitorData.isHealthy) {
      flags.push({
        type: "low_liquidity",
        severity: liquidityMonitorData.riskScore >= 70 ? "critical" : "high",
        title: `Unhealthy Liquidity: $${liquidityMonitorData.currentLiquidity.toFixed(0)}`,
        description: liquidityMonitorData.risks[0] || "Liquidity below safe thresholds",
      });
    }

    // Liquidity/Market Cap ratio warnings
    if (liquidityMonitorData?.liquidityToMcapRatio?.health === 'critical') {
      flags.push({
        type: "low_liquidity",
        severity: "high",
        title: "Critical Liquidity/MCap Ratio",
        description: liquidityMonitorData.liquidityToMcapRatio.description,
      });
    }

    // ============================================================================
    // TOP HOLDER TRACKING (NEW)
    // ============================================================================
    
    if (holderTrackingData?.coordinatedSelloff?.detected) {
      const selloff = holderTrackingData.coordinatedSelloff;
      flags.push({
        type: "suspicious_transactions",
        severity: selloff.severity as any,
        title: "COORDINATED WHALE SELL-OFF",
        description: selloff.description,
      });
    }

    if (holderTrackingData?.topHolderStability === 'mass_exodus') {
      flags.push({
        type: "suspicious_transactions",
        severity: "critical",
        title: "Mass Exodus: Top Holders Dumping",
        description: "Multiple top holders are actively selling. Price collapse imminent.",
      });
    }

    // ============================================================================
    // FUNDING SOURCE ANALYSIS (NEW - Nova-style detection)
    // ============================================================================
    
    if (fundingAnalysisData?.suspiciousFunding) {
      flags.push({
        type: "bundle_manipulation",
        severity: "critical",
        title: `Suspicious Funding: ${fundingAnalysisData.totalSuspiciousPercentage.toFixed(1)}% from High-Risk Sources`,
        description: `Token holders funded by high-risk swap services. ${fundingAnalysisData.risks.join(' ')}`,
      });
    }

    // Critical funding patterns (Nova-level detection)
    fundingAnalysisData?.fundingPatterns.forEach((pattern: any) => {
      if (pattern.severity === 'critical') {
        flags.push({
          type: "bundle_manipulation",
          severity: "critical",
          title: `FUNDING ALERT: ${pattern.description}`,
          description: `Evidence: ${JSON.stringify(pattern.evidence)}. Similar to Nova's $PEKO detection.`,
        });
      }
    });

    // High concentration from swap services (Swopshop, FixedFloat pattern)
    if (fundingAnalysisData?.fundingSourceBreakdown) {
      Object.entries(fundingAnalysisData.fundingSourceBreakdown).forEach(([source, percentage]: [string, any]) => {
        if (percentage >= 30 && ['Swopshop', 'FixedFloat', 'ChangeNOW', 'SimpleSwap'].includes(source)) {
          flags.push({
            type: "bundle_manipulation",
            severity: "critical",
            title: `${source} Dominance: ${percentage.toFixed(1)}% of supply`,
            description: `Heavy concentration from high-risk swap service. Classic bundling pattern detected.`,
          });
        }
      });
    }

    // Fresh wallet funding (recently created + high-risk funding)
    const freshHighRiskWallets = fundingAnalysisData?.walletFunding?.filter(
      (w: any) => w.isRecentlyCreated && w.riskLevel === 'HIGH_RISK'
    ) || [];
    
    if (freshHighRiskWallets.length >= 5) {
      flags.push({
        type: "bundle_manipulation",
        severity: "critical",
        title: `Fresh Wallet Cluster: ${freshHighRiskWallets.length} recently created wallets`,
        description: "Multiple fresh wallets (<7 days) funded by high-risk sources. Coordinated operation detected.",
      });
    }
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
    
    // Inverted risk scoring (0=dangerous, 100=safe)
    if (score >= 75 && mintRenounced && freezeDisabled && lpBurned) {
      return {
        rating: '10/10',
        verdict: '🟢 SAFE - Strong fundamentals, low risk'
      };
    } else if (score >= 50 && mcap < 500000) {
      return {
        rating: '7/10',
        verdict: '🟡 SPECULATIVE - High risk/reward, monitor closely'
      };
    } else if (score >= 30) {
      return {
        rating: '5/10',
        verdict: '🟠 RISKY - Proceed with extreme caution'
      };
    } else {
      return {
        rating: '3/10',
        verdict: '🔴 DANGEROUS - High probability of rug pull'
      };
    }
  }
}

export const tokenAnalyzer = new SolanaTokenAnalyzer();

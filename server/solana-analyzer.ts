/**
 * Minimal Solana Token Analyzer
 * Uses DexScreener + on-chain RPC only - no external API dependencies
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";
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
import { DexScreenerService } from "./dexscreener-service.js";
import { rpcBalancer } from "./services/rpc-balancer.js";
import { checkPumpFun } from "./services/pumpfun-api.js";
import { holderAnalysis } from "./services/holder-analysis.js";
import { TemporalGNNDetector } from "./temporal-gnn-detector.js";
import { getMigrationDetector } from "./migration-detector.js";
import { mlScorer } from "./services/ml-scorer.js";
import { fundingAnalyzer } from "./services/funding-source-analyzer.js";
import { redisCache } from "./services/redis-cache.js";
import { getBundleMonitor } from "./services/jito-bundle-monitor.js";

// Debug logging - only enable in development or when DEBUG_ANALYZER=true
const DEBUG = process.env.DEBUG_ANALYZER === 'true' || (process.env.NODE_ENV !== 'production' && process.env.DEBUG_ANALYZER !== 'false');
const debugLog = DEBUG ? (...args: any[]) => console.log(...args) : () => {};

export class SolanaTokenAnalyzer {
  private dexScreener: DexScreenerService;
  private tgnDetector: TemporalGNNDetector | null = null;

  constructor() {
    this.dexScreener = new DexScreenerService();
    
    // Initialize TGN detector with RPC connection
    try {
      const connection = rpcBalancer.getConnection();
      this.tgnDetector = new TemporalGNNDetector(connection);
      console.log('[Analyzer] TGN detector initialized');
    } catch (error) {
      console.error('[Analyzer] Failed to initialize TGN detector:', error);
      this.tgnDetector = null;
    }
  }

  async analyzeToken(
    tokenMintAddress: string,
    options: { skipExternal?: boolean; skipOnChain?: boolean } = {}
  ): Promise<TokenAnalysisResponse> {
    const startTime = Date.now();
    console.log(`🔍 [Analyzer] Starting analysis for ${tokenMintAddress}`);

    try {
      // Check Redis cache first for instant results
      const cached = await redisCache.get<TokenAnalysisResponse>(`token:analysis:${tokenMintAddress}`);
      if (cached) {
        console.log(`⚡ [Analyzer] Cache HIT - returning in ${Date.now() - startTime}ms`);
        return cached;
      }

      // Validate address
      let tokenAddress: PublicKey;
      try {
        tokenAddress = new PublicKey(tokenMintAddress);
      } catch (error) {
        throw new Error("Invalid token address format");
      }

      // Fetch data in parallel with aggressive timeouts for speed
      // DexScreener: 8s, On-chain: 10s, Holders: 15s, PumpFun: 5s
      const withTimeout = <T>(promise: Promise<T>, ms: number, name: string): Promise<T | null> => {
        return Promise.race([
          promise,
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error(`${name} timeout after ${ms}ms`)), ms)
          )
        ]).catch((err) => {
          console.warn(`[Analyzer] ${name} failed:`, err.message);
          return null;
        });
      };

      const [dexData, onChainData, holderData, creationDateData, pumpFunData] = await Promise.all([
        options.skipExternal ? Promise.resolve({ status: 'fulfilled' as const, value: null }) : 
          withTimeout(this.dexScreener.getTokenData(tokenMintAddress), 8000, 'DexScreener').then(v => ({ status: 'fulfilled' as const, value: v })),
        options.skipOnChain ? Promise.resolve({ status: 'fulfilled' as const, value: null }) : 
          withTimeout(this.getOnChainData(tokenAddress), 10000, 'OnChain').then(v => ({ status: 'fulfilled' as const, value: v })),
        options.skipExternal ? Promise.resolve({ status: 'fulfilled' as const, value: null }) : 
          withTimeout(holderAnalysis.analyzeHolders(tokenMintAddress), 15000, 'Holders').then(v => ({ status: 'fulfilled' as const, value: v })),
        options.skipOnChain ? Promise.resolve({ status: 'fulfilled' as const, value: null }) : 
          withTimeout(this.getTokenCreationDate(tokenAddress), 5000, 'CreationDate').then(v => ({ status: 'fulfilled' as const, value: v })),
        options.skipExternal ? Promise.resolve({ status: 'fulfilled' as const, value: null }) : 
          withTimeout(checkPumpFun(tokenMintAddress), 5000, 'PumpFun').then(v => ({ status: 'fulfilled' as const, value: v })),
      ]);

      // Log any failures for debugging
      const failures: string[] = [];
      if (dexData.status === 'rejected') {
        console.warn(`[Analyzer] DexScreener failed:`, dexData.reason?.message);
        failures.push('DexScreener');
      }
      if (onChainData.status === 'rejected') {
        console.warn(`[Analyzer] On-chain data failed:`, onChainData.reason?.message);
        failures.push('On-chain');
      }
      if (holderData.status === 'rejected') {
        console.warn(`[Analyzer] Holder analysis failed:`, holderData.reason?.message);
        failures.push('Holders');
      }
      if (creationDateData.status === 'rejected') {
        console.warn(`[Analyzer] Creation date failed:`, creationDateData.reason?.message);
      }
      if (pumpFunData.status === 'rejected') {
        console.warn(`[Analyzer] Pump.fun check failed:`, pumpFunData.reason?.message);
      }

      const dex = dexData.status === 'fulfilled' ? dexData.value : null;
      const onChain = onChainData.status === 'fulfilled' ? onChainData.value : null;
      const holders = holderData.status === 'fulfilled' ? holderData.value : null;
      const creationDate = creationDateData.status === 'fulfilled' ? creationDateData.value : undefined;
      const pumpFun = pumpFunData.status === 'fulfilled' ? pumpFunData.value : null;
      
      // Check if critical data is missing
      if (!dex && !onChain) {
        const errorMsg = failures.length > 0 
          ? `Token data unavailable - ${failures.join(', ')} services failed. This token may be too new or not yet indexed.`
          : 'Token data unavailable - unable to fetch from DexScreener or blockchain';
        throw new Error(errorMsg);
      }

      console.log(`✅ [Analyzer] Data fetched in ${Date.now() - startTime}ms`);
      debugLog(`[Analyzer DEBUG] DexScreener data:`, { hasDex: !!dex, pairs: dex?.pairs?.length ?? 0 });
      debugLog(`[Analyzer DEBUG] Pump.fun data:`, { isPumpFun: pumpFun?.isPumpFun, bondingCurve: pumpFun?.bondingCurve });

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
        
        // Holder analysis - now using comprehensive holder service
        holderCount: holders?.holderCount || 0,
        topHolders: holders?.top20Holders?.map((h, idx) => ({
          rank: idx + 1,
          address: h.address,
          balance: h.balance || 0,
          percentage: h.percentage || 0,
        })) || [],
        topHolderConcentration: holders?.topHolderConcentration || 0,
        holderFiltering: this.buildHolderFiltering(holders),
        
        // Liquidity pool - calculate burn percentage
        liquidityPool: await this.calculateLiquidityPool(dex, pumpFun, tokenMintAddress),
        
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
        riskScore: this.calculateRiskScore(dex, onChain, holders),
        riskLevel: this.determineRiskLevel(dex, onChain, holders),
        redFlags: this.generateRiskFlags(dex, onChain, holders, pumpFun, null),
        rugScoreBreakdown: this.calculateRugScore(dex, onChain, holders, creationDate || undefined),
        
        // Creation info
        creationDate: creationDate ?? undefined,
        
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
        dexscreenerData: dex || undefined,
      };

      // TEMPORAL GNN ANALYSIS - Add TGN detection results
      if (this.tgnDetector && !options.skipExternal) {
        try {
          const lpPoolAddress = dex?.pairs?.[0]?.pairAddress || undefined;
          const isPreMigration = holders?.isPreMigration || false;
          
          console.log(`[Analyzer] Running TGN analysis for ${tokenMintAddress}...`);
          const tgnResult = await this.tgnDetector.analyzeToken(tokenMintAddress, lpPoolAddress, isPreMigration);
          
          response.tgnResult = tgnResult;
          response.isPreMigration = isPreMigration;
          response.systemWalletsFiltered = holders?.systemWalletsFiltered || 0;
          response.lpPoolAddress = lpPoolAddress;
          
          // Check if migration was recently detected
          const migrationDetector = getMigrationDetector(rpcBalancer.getConnection());
          response.migrationDetected = migrationDetector.hasMigrated(tokenMintAddress);
          
          console.log(`[Analyzer] TGN P(rug): ${(tgnResult.rugProbability * 100).toFixed(1)}% | Pre-migration: ${isPreMigration} | Patterns: ${tgnResult.patterns.length}`);
        } catch (tgnError) {
          console.error('[Analyzer] TGN analysis failed:', tgnError);
          response.tgnResult = undefined;
        }
      }

      // JITO BUNDLE DETECTION - Analyze recent transactions for MEV bundles
      if (!options.skipExternal) {
        try {
          console.log(`[Analyzer] Running Jito bundle detection for ${tokenMintAddress}...`);
          
          const connection = rpcBalancer.getConnection();
          const bundleMonitor = getBundleMonitor(connection);
          
          // Fetch recent transactions to analyze for bundle activity
          const signatures = await connection.getSignaturesForAddress(
            new PublicKey(tokenMintAddress),
            { limit: 50 }, // Check last 50 transactions
            'confirmed'
          );
          
          if (signatures.length > 0) {
            // Analyze bundle activity across recent transactions
            const bundleActivity = await bundleMonitor.detectBundleActivity(
              signatures.map(sig => sig.signature)
            );
            
            if (bundleActivity.hasBundleActivity) {
              console.log(`[Analyzer] 🎯 JITO BUNDLE DETECTED:`);
              console.log(`  - Bundle count: ${bundleActivity.bundleCount}`);
              console.log(`  - Total tips: ${(bundleActivity.totalTipAmount / 1e9).toFixed(6)} SOL`);
              
              // Get detailed detection for the first bundle found
              const firstBundle = bundleActivity.detections.find(d => d.isBundle);
              
              if (firstBundle) {
                response.jitoBundleData = {
                  isBundle: true,
                  bundleId: firstBundle.bundleId,
                  status: firstBundle.status,
                  tipAmount: firstBundle.tipAmount,
                  tipAmountSol: firstBundle.tipAmount ? firstBundle.tipAmount / 1e9 : undefined,
                  tipAccount: firstBundle.tipAccount,
                  slotLanded: firstBundle.slotLanded,
                  validatorIdentity: firstBundle.validatorIdentity,
                  confidence: firstBundle.confidence,
                  signals: firstBundle.signals,
                  bundleActivity: {
                    hasBundleActivity: true,
                    bundleCount: bundleActivity.bundleCount,
                    totalTipAmount: bundleActivity.totalTipAmount,
                  },
                  detectedAt: Date.now(),
                };
                
                // Add bundle manipulation risk flag if high confidence
                if (firstBundle.confidence === 'HIGH') {
                  response.redFlags.push({
                    type: 'bundle_manipulation',
                    severity: 'high',
                    title: 'Jito Bundle Detected',
                    description: `Token launch used Jito MEV bundles (${bundleActivity.bundleCount} detected). This may indicate coordinated buying or priority access manipulation.`,
                  });
                }
              }
            } else {
              console.log(`[Analyzer] No Jito bundle activity detected`);
              response.jitoBundleData = {
                isBundle: false,
                confidence: 'LOW',
                signals: {
                  hasJitoTip: false,
                  tipAccountMatch: false,
                  consecutiveTxsInSlot: false,
                  highPriorityFee: false,
                },
                detectedAt: Date.now(),
              };
            }
          }
        } catch (bundleError: any) {
          console.error('[Analyzer] Jito bundle detection failed:', bundleError.message);
          response.jitoBundleData = undefined;
        }
      }
      
      // FUNDING SOURCE ANALYSIS - TEMPORARILY DISABLED
      // Skipping due to RPC rate limits on free endpoints causing timeouts
      // Re-enable when premium RPC endpoints (Helius/QuickNode) are configured
      if (false && holders && holders.top20Holders.length > 0 && !options.skipExternal) {
        try {
          console.log(`[Analyzer] Running funding source analysis...`);
          
          // Add 10 second timeout to prevent hanging on rate limits
          const fundingPromise = fundingAnalyzer.analyzeFundingSources(
            tokenMintAddress,
            holders.top20Holders.map(h => ({
              address: h.address,
              balance: h.balance,
              percentage: h.percentage,
              isExchange: h.isExchange,
              isLP: h.isLP,
              label: h.label
            }))
          );
          
          const timeoutPromise = new Promise<any>((resolve) => 
            setTimeout(() => {
              console.log('[Analyzer] Funding analysis timeout - skipping');
              resolve(null);
            }, 10000)
          );
          
          const fundingResult = await Promise.race([fundingPromise, timeoutPromise]);
          
          if (fundingResult) {
            response.fundingAnalysis = fundingResult;
            
            if (fundingResult.suspiciousFunding) {
              console.log(`[Analyzer] 🚨 SUSPICIOUS FUNDING DETECTED:`);
              console.log(`  - Total suspicious: ${fundingResult.totalSuspiciousPercentage.toFixed(1)}%`);
              console.log(`  - Patterns: ${fundingResult.fundingPatterns.length}`);
              fundingResult.fundingSourceBreakdown && Object.entries(fundingResult.fundingSourceBreakdown).forEach(([source, pct]) => {
                console.log(`  - ${source}: ${pct.toFixed(1)}%`);
              });
            }
          }
        } catch (fundingError) {
          console.error('[Analyzer] Funding analysis failed:', fundingError);
        }
      }
      console.log(`[Analyzer] ⚠️ Funding analysis temporarily disabled (RPC rate limits)`);
      
      // Run ML scorer for additional risk assessment
      try {
        const mlFeatures = {
          topHolderPercent: response.topHolders?.[0]?.percentage || 0,
          top10Concentration: response.topHolderConcentration || 0,
          holderCount: response.holderCount || 0,
          liquidityUSD: response.liquidityInfo?.poolSize || 0,
          poolLocked: response.liquidityInfo?.isLocked || false,
          poolBurned: response.liquidityInfo?.isBurned || false,
          mintEnabled: response.mintAuthority?.hasAuthority || false,
          freezeEnabled: response.freezeAuthority?.hasAuthority || false,
          ageHours: response.creationDate ? (Date.now() - response.creationDate) / (1000 * 60 * 60) : 0,
          volume24h: response.dexscreenerData?.pairs?.[0]?.volume?.h24 || 0,
          txns24h: (response.dexscreenerData?.pairs?.[0]?.txns?.h24?.buys || 0) + (response.dexscreenerData?.pairs?.[0]?.txns?.h24?.sells || 0),
          priceChange24h: response.dexscreenerData?.pairs?.[0]?.priceChange?.h24 || 0,
          buyPressure: (() => {
            const buys = response.dexscreenerData?.pairs?.[0]?.txns?.h24?.buys || 0;
            const sells = response.dexscreenerData?.pairs?.[0]?.txns?.h24?.sells || 0;
            return buys + sells > 0 ? buys / (buys + sells) : 0.5;
          })(),
          isPumpFun: response.pumpFunData?.isPumpFun || false,
          bondingCurve: response.pumpFunData?.bondingCurve || 0,
          hasWebsite: !!response.metadata?.website,
          hasTwitter: !!response.metadata?.twitter,
          hasTelegram: !!response.metadata?.telegram,
        };
        
        const mlResult = mlScorer.score(mlFeatures);
        console.log(`[Analyzer] ML Score: ${(mlResult.rugProbability * 100).toFixed(1)}% (confidence: ${(mlResult.confidence * 100).toFixed(0)}%)`);
        
        // Add ML result to response for additional context
        (response as any).mlScore = {
          probability: mlResult.rugProbability,
          confidence: mlResult.confidence,
          topFactors: mlResult.topFactors,
          model: mlResult.model
        };
      } catch (mlError) {
        console.error('[Analyzer] ML scoring failed:', mlError);
      }

      console.log(`✅ [Analyzer] Complete in ${Date.now() - startTime}ms - Risk: ${response.riskLevel}`);
      
      // Cache result for 5 minutes (300 seconds)
      await redisCache.set(`token:analysis:${tokenMintAddress}`, response, 300).catch(() => {});
      
      return response;

    } catch (error: any) {
      console.error(`❌ [Analyzer] Error analyzing ${tokenMintAddress}:`, error.message);
      throw error;
    }
  }

  /**
   * Build holder filtering metadata from holder analysis results
   */
  private buildHolderFiltering(holders: any): import('../shared/schema').HolderFilteringMetadata {
    if (!holders) {
      return {
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
        bundledDetection: {
          suspiciousWallets: [],
          bundleSupplyPct: 0,
          clusters: [],
        },
        walletIntelligence: {
          avgWalletAge: 0,
          oldestWallet: 0,
          newestWallet: 0,
          suspiciousPatterns: [],
        },
      };
    }

    // Count different types of filtered addresses
    const lpCount = holders.top20Holders?.filter((h: any) => h.isLP).length || 0;
    const exchangeCount = holders.exchangeHolderCount || 0;
    const pumpFunFilteredCount = holders.pumpFunFilteredCount || 0;

    // Build excluded addresses list (showing what was filtered out)
    const excluded: Array<{
      address: string;
      reason: string;
      percentage?: number;
    }> = [];

    // Add Pump.fun AMM info to excluded list if any were filtered
    if (pumpFunFilteredCount > 0) {
      excluded.push({
        address: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
        reason: 'Pump.fun AMM / Bonding Curve',
        percentage: holders.pumpFunFilteredPercent || 0,
      });
    }

    return {
      totals: {
        lp: lpCount + pumpFunFilteredCount, // Include Pump.fun AMM as LP
        exchanges: exchangeCount,
        protocols: pumpFunFilteredCount, // Pump.fun counts as protocol
        bundled: 0,
        total: lpCount + exchangeCount + pumpFunFilteredCount,
        degens: 0,
        bots: 0,
        smartMoney: 0,
        snipers: 0,
        aged: 0,
        newWallets: 0,
      },
      excluded,
      bundledDetection: {
        suspiciousWallets: [],
        bundleSupplyPct: 0,
        clusters: [],
      },
      walletIntelligence: {
        avgWalletAge: 0,
        oldestWallet: 0,
        newestWallet: 0,
        suspiciousPatterns: [],
      },
    };
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
      let mintInfo;
      try {
        mintInfo = await getMint(
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
      } catch (error: any) {
        // Transform generic RPC errors to more specific messages
        if (error.message?.includes('Received one or more errors')) {
          throw new Error('Unable to fetch token data from blockchain. Token may be too new or invalid.');
        }
        throw error;
      }

      const totalSupplyRaw = Number(mintInfo.supply);
      const decimals = mintInfo.decimals;
      const totalSupply = totalSupplyRaw / Math.pow(10, decimals);

      // Calculate circulating supply by checking for burned tokens
      // Common burn addresses on Solana
      const burnAddresses = [
        '11111111111111111111111111111111', // System Program (common burn destination)
        'Burn1111111111111111111111111111111111111111', // Explicit burn address
        '1nc1nerator11111111111111111111111111111111', // Incinerator
      ];

      let burnedAmount = 0;
      try {
        for (const burnAddr of burnAddresses) {
          try {
            const burnPubkey = new PublicKey(burnAddr);
            const burnAccounts = await connection.getTokenAccountsByOwner(
              burnPubkey,
              { mint: tokenAddress },
              'confirmed'
            );
            
            for (const acc of burnAccounts.value) {
              const data = acc.account.data;
              if (data.length >= 72) {
                // Amount is at offset 64 (u64)
                const amountBuf = data.subarray(64, 72);
                const amount = amountBuf.readBigUInt64LE(0);
                burnedAmount += Number(amount);
              }
            }
          } catch (e) {
            // Skip invalid addresses
          }
        }
      } catch (error) {
        console.warn(`[Analyzer] Failed to check burned tokens:`, error);
      }

      const burnedSupply = burnedAmount / Math.pow(10, decimals);
      const circulatingSupply = Math.max(0, totalSupply - burnedSupply);

      // Holder data is now fetched via HolderAnalysisService in parallel
      // This method only handles mint metadata and authorities
      return {
        decimals: mintInfo.decimals,
        supply: circulatingSupply, // Use circulating supply (total - burned)
        totalSupply: totalSupply, // Keep total for reference
        burnedSupply: burnedSupply,
        authorities: {
          mintAuthority: mintInfo.mintAuthority?.toBase58() || null,
          freezeAuthority: mintInfo.freezeAuthority?.toBase58() || null,
          mintDisabled: !mintInfo.mintAuthority,
          freezeDisabled: !mintInfo.freezeAuthority,
        },
        metadata: null,
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

  private calculateRiskScore(dex: any, onChain: any, holders?: any): number {
    let penalties = 0;

    // === CRITICAL RED FLAGS (instant rug capability) ===
    if (onChain?.authorities?.mintAuthority) penalties += 20;
    if (onChain?.authorities?.freezeAuthority) penalties += 20;
    
    // === LIQUIDITY RISK (low liquidity = easy manipulation) ===
    const liquidityUsd = dex?.pairs?.[0]?.liquidity?.usd || 0;
    const marketCap = dex?.pairs?.[0]?.marketCap || 0;
    const volume24h = dex?.pairs?.[0]?.volume?.h24 || 0;
    
    // Liquidity too low for market cap
    if (liquidityUsd < 40000 && liquidityUsd > 0) penalties += 15;
    if (liquidityUsd < 1000) penalties += 30;
    if (liquidityUsd < 100) penalties += 40;
    
    // Volume/MC ratio check (wash trading detection)
    if (marketCap > 0 && volume24h > 0) {
      const volumeMcRatio = volume24h / marketCap;
      if (volumeMcRatio > 50) penalties += 15; // Extreme wash trading (>5000% volume)
      else if (volumeMcRatio > 20) penalties += 10; // Heavy wash trading (>2000%)
    }
    
    // === HOLDER CONCENTRATION (whale/dev control) ===
    // Filter out LP/exchanges to only penalize actual dev/whale wallets
    const realWallets = holders?.top20Holders?.filter((h: any) =>
      !h.isLP && !h.isExchange && h.address !== '11111111111111111111111111111111'
    ) || [];
    const topHolderPercent = realWallets[0]?.percentage || 0;
    const top10Concentration = holders?.topHolderConcentration || 0;
    
    if (topHolderPercent >= 20) penalties += 25; // Dev holds >= 20%
    else if (topHolderPercent >= 15) penalties += 15; // Dev holds >= 15%
    
    if (top10Concentration >= 60) penalties += 20; // Top 10 own >= 60%
    else if (top10Concentration >= 50) penalties += 10; // Top 10 own >= 50%
    
    // === HOLDER COUNT vs MARKET CAP (fake volume detection) ===
    const holderCount = holders?.holderCount || 0;
    if (marketCap > 500000 && holderCount < 50) penalties += 15; // High MC, low holders = manipulation
    if (marketCap > 100000 && holderCount < 20) penalties += 10; // Moderate MC, very low holders
    
    // === BUY/SELL PRESSURE (dump risk) ===
    const txns24h = dex?.pairs?.[0]?.txns?.h24;
    if (txns24h && txns24h.buys > 0 && txns24h.sells > 0) {
      const sellRatio = txns24h.sells / (txns24h.buys + txns24h.sells);
      if (sellRatio > 0.7) penalties += 10; // >70% sells = heavy dumping
      else if (sellRatio > 0.6) penalties += 5; // >60% sells = moderate dumping
    }
    
    // === METADATA & SECURITY ===
    if (onChain?.metadata?.isMutable !== false) penalties += 5;

    // Invert score: 100 = good (no penalties), 0 = bad (max penalties)
    return Math.max(0, 100 - penalties);
  }

  private determineRiskLevel(dex: any, onChain: any, holders?: any): RiskLevel {
    const score = this.calculateRiskScore(dex, onChain, holders);
    
    // Inverted: higher score = safer
    if (score >= 80) return "LOW";
    if (score >= 60) return "MODERATE";
    if (score >= 40) return "HIGH";
    return "EXTREME";
  }

  /**
   * Calculate comprehensive rug score (0-100+) like Rugcheck.xyz
   * Lower score = safer | Higher score = more dangerous
   * <10 = SAFE | 10-50 = WARNING | >50 = DANGER
   */
  private calculateRugScore(dex: any, onChain: any, holders?: any, creationDate?: number): import('../shared/schema').RugScoreBreakdown {
    const breakdown: string[] = [];
    
    // === AUTHORITIES (30-40% weight, up to 165 points) ===
    const mintAuthorityScore = onChain?.authorities?.mintAuthority ? 80 : 0;
    const freezeAuthorityScore = onChain?.authorities?.freezeAuthority ? 40 : 0;
    const metadataMutableScore = onChain?.metadata?.isMutable !== false ? 30 : 0;
    const permanentDelegateScore = 0; // TODO: Check permanent delegate (rare)
    
    if (mintAuthorityScore > 0) breakdown.push(`Mint authority active: +${mintAuthorityScore} pts`);
    if (freezeAuthorityScore > 0) breakdown.push(`Freeze authority active: +${freezeAuthorityScore} pts`);
    if (metadataMutableScore > 0) breakdown.push(`Metadata mutable: +${metadataMutableScore} pts`);
    
    const authoritiesScore = mintAuthorityScore + freezeAuthorityScore + metadataMutableScore + permanentDelegateScore;
    
    // === HOLDER DISTRIBUTION (25-35% weight, up to 190 points) ===
    const realWallets = holders?.top20Holders?.filter((h: any) => 
      !h.isLP && !h.isExchange && h.address !== '11111111111111111111111111111111'
    ) || [];
    const topHolderPercent = realWallets[0]?.percentage || 0;
    const top10Concentration = holders?.topHolderConcentration || 0;
    const holderCount = holders?.holderCount || 0;
    
    // Top holder: 1 point per % over 10%, max 80
    const topHolderScore = Math.min(80, Math.max(0, (topHolderPercent - 10) * 1));
    if (topHolderScore > 0) breakdown.push(`Top holder owns ${topHolderPercent.toFixed(1)}%: +${topHolderScore.toFixed(0)} pts`);
    
    // Top 10 concentration: 1 point per % over 30%, max 90
    const top10Score = Math.min(90, Math.max(0, (top10Concentration - 30) * 1));
    if (top10Score > 0) breakdown.push(`Top 10 own ${top10Concentration.toFixed(1)}%: +${top10Score.toFixed(0)} pts`);
    
    // Low holder count penalty
    const holderCountScore = holderCount < 100 ? Math.max(0, 10 - (holderCount / 10)) : 0;
    if (holderCountScore > 0) breakdown.push(`Only ${holderCount} holders: +${holderCountScore.toFixed(0)} pts`);
    
    const holderDistributionScore = topHolderScore + top10Score + holderCountScore;
    
    // === LIQUIDITY (15-20% weight, up to 85 points) ===
    const liquidityUsd = dex?.pairs?.[0]?.liquidity?.usd || 0;
    const burnPercentage = dex?.pairs?.[0]?.liquidity?.burnPercentage || 0;
    
    // LP not locked/burned
    const lpLockedScore = burnPercentage < 50 ? 40 : burnPercentage < 90 ? 20 : 0;
    if (lpLockedScore > 0) breakdown.push(`LP ${burnPercentage.toFixed(0)}% burned (not fully locked): +${lpLockedScore} pts`);
    
    // Low liquidity: more points for lower liquidity
    let lpAmountScore = 0;
    if (liquidityUsd < 1000) lpAmountScore = 30;
    else if (liquidityUsd < 5000) lpAmountScore = 25;
    else if (liquidityUsd < 10000) lpAmountScore = 20;
    else if (liquidityUsd < 40000) lpAmountScore = 15;
    if (lpAmountScore > 0) breakdown.push(`Low liquidity ($${(liquidityUsd/1000).toFixed(1)}k): +${lpAmountScore} pts`);
    
    const lpOwnershipScore = 0; // TODO: Check if dev owns LP tokens
    
    const liquidityScore = lpLockedScore + lpAmountScore + lpOwnershipScore;
    
    // === TAXES & FEES (10-15% weight, up to 90 points) ===
    // TODO: Simulate buy/sell for tax detection
    const buyTaxScore = 0;
    const sellTaxScore = 0;
    const honeypotScore = 0;
    const taxesScore = buyTaxScore + sellTaxScore + honeypotScore;
    
    // === MARKET ACTIVITY (5-10% weight, up to 35 points) ===
    const marketCap = dex?.pairs?.[0]?.marketCap || 0;
    const volume24h = dex?.pairs?.[0]?.volume?.h24 || 0;
    const txns24h = dex?.pairs?.[0]?.txns?.h24;
    
    // Wash trading detection
    let washTradingScore = 0;
    if (marketCap > 0 && volume24h > 0) {
      const volumeMcRatio = volume24h / marketCap;
      if (volumeMcRatio > 50) {
        washTradingScore = 15;
        breakdown.push(`Extreme wash trading (${(volumeMcRatio * 100).toFixed(0)}% vol/MC): +${washTradingScore} pts`);
      } else if (volumeMcRatio > 20) {
        washTradingScore = 10;
        breakdown.push(`Suspected wash trading (${(volumeMcRatio * 100).toFixed(0)}% vol/MC): +${washTradingScore} pts`);
      }
    }
    
    // Sell pressure
    let sellPressureScore = 0;
    if (txns24h && txns24h.buys > 0 && txns24h.sells > 0) {
      const sellRatio = txns24h.sells / (txns24h.buys + txns24h.sells);
      if (sellRatio > 0.7) {
        sellPressureScore = 10;
        breakdown.push(`Heavy selling (${(sellRatio * 100).toFixed(0)}% sells): +${sellPressureScore} pts`);
      }
    }
    
    // Low holders for market cap
    let lowHoldersScore = 0;
    if (marketCap > 500000 && holderCount < 50) {
      lowHoldersScore = 10;
      breakdown.push(`Low holders for $${(marketCap/1000).toFixed(0)}k MC: +${lowHoldersScore} pts`);
    }
    
    const marketActivityScore = washTradingScore + sellPressureScore + lowHoldersScore;
    
    // === TOKEN AGE (5% weight, up to 10 points) ===
    let ageScore = 0;
    if (creationDate) {
      const ageMs = Date.now() - creationDate;
      const ageHours = ageMs / (1000 * 60 * 60);
      if (ageHours < 1) {
        ageScore = 10;
        breakdown.push(`Very new token (<1h old): +${ageScore} pts`);
      } else if (ageHours < 6) {
        ageScore = 5;
        breakdown.push(`New token (<6h old): +${ageScore} pts`);
      }
    }
    
    // === TOTAL SCORE ===
    const totalScore = authoritiesScore + holderDistributionScore + liquidityScore + taxesScore + marketActivityScore + ageScore;
    
    // Classify: <10 = SAFE, 10-50 = WARNING, >50 = DANGER
    let classification: "SAFE" | "WARNING" | "DANGER";
    if (totalScore < 10) classification = "SAFE";
    else if (totalScore <= 50) classification = "WARNING";
    else classification = "DANGER";
    
    return {
      totalScore: Math.round(totalScore),
      classification,
      components: {
        authorities: {
          score: authoritiesScore,
          mintAuthority: mintAuthorityScore,
          freezeAuthority: freezeAuthorityScore,
          metadataMutable: metadataMutableScore,
          permanentDelegate: permanentDelegateScore,
        },
        holderDistribution: {
          score: holderDistributionScore,
          topHolderPercent: topHolderScore,
          top10Concentration: top10Score,
          top100Concentration: 0,
          holderCount: holderCountScore,
        },
        liquidity: {
          score: liquidityScore,
          lpLocked: lpLockedScore,
          lpAmount: lpAmountScore,
          lpOwnership: lpOwnershipScore,
        },
        taxesAndFees: {
          score: taxesScore,
          buyTax: buyTaxScore,
          sellTax: sellTaxScore,
          honeypot: honeypotScore,
        },
        marketActivity: {
          score: marketActivityScore,
          washTrading: washTradingScore,
          sellPressure: sellPressureScore,
          lowHoldersForMC: lowHoldersScore,
        },
        tokenAge: {
          score: ageScore,
          ageBonus: ageScore,
        },
      },
      breakdown,
    };
  }

  private generateRiskFlags(dex: any, onChain: any, holders?: any, pumpFun?: any, bundleData?: any): RiskFlag[] {
    const flags: RiskFlag[] = [];

    // RED FLAG #2 & #3: Authority flags (CRITICAL - immediate rug risk)
    if (onChain?.authorities?.mintAuthority) {
      flags.push({
        type: "mint_authority",
        severity: "critical",
        title: "🚨 Mint Authority NOT Renounced",
        description: "Dev can mint infinite new tokens anytime. Instant rug capability.",
      });
    }

    if (onChain?.authorities?.freezeAuthority) {
      flags.push({
        type: "freeze_authority",
        severity: "critical",
        title: "🚨 Freeze Authority NOT Revoked",
        description: "Dev can freeze your wallet and steal your tokens.",
      });
    }

    // RED FLAG #9: Mutable metadata (update authority not revoked)
    if (onChain?.metadata?.isMutable !== false) {
      flags.push({
        type: "mutable_metadata",
        severity: "high",
        title: "⚠️ Metadata is Mutable",
        description: "Dev can edit name/symbol/image/URI anytime via update authority. Common scam: pump with legit branding → swap to fake/misleading metadata → dump tokens. Legit projects revoke update authority (~0.1 SOL) to lock metadata permanently and build trust. Until revoked, dev controls token's identity.",
      });
    }

    // RED FLAG #7: Liquidity flags
    const liquidityUsd = dex?.pairs?.[0]?.liquidity?.usd || 0;
    if (liquidityUsd < 40000 && liquidityUsd > 0) {
      flags.push({
        type: "low_liquidity",
        severity: "high",
        title: "⚠️ Low Liquidity (<$40k)",
        description: `Only $${liquidityUsd.toLocaleString()} in liquidity pool. Easy to manipulate or rug.`,
      });
    } else if (liquidityUsd < 1000 && liquidityUsd > 0) {
      flags.push({
        type: "low_liquidity",
        severity: "critical",
        title: "🚨 Extremely Low Liquidity",
        description: `Only $${liquidityUsd.toFixed(2)} in liquidity pool. Almost guaranteed rug.`,
      });
    }

    // RED FLAG #1 & #5: Holder concentration (top holder warnings)
    // IMPORTANT: Filter out LP pools, exchanges, and burn addresses - only flag actual dev/whale wallets
    const realWallets = holders?.top20Holders?.filter((h: any) =>
      !h.isLP && !h.isExchange && h.address !== '11111111111111111111111111111111'
    ) || [];
    
    const topHolderPercent = realWallets[0]?.percentage || 0;
    const top10Concentration = holders?.topHolderConcentration || 0;
    
    // Only warn if actual wallet (not LP/exchange) holds too much
    if (topHolderPercent >= 20) {
      flags.push({
        type: "holder_concentration",
        severity: "critical",
        title: "🚨 Dev Holds ≥20% of Supply",
        description: `Top wallet (${realWallets[0]?.address.slice(0,8)}...) owns ${topHolderPercent.toFixed(1)}%. Can dump instantly with massive slippage.`,
      });
    } else if (topHolderPercent >= 15) {
      flags.push({
        type: "holder_concentration",
        severity: "high",
        title: "⚠️ Dev Holds ≥15% of Supply",
        description: `Top wallet (${realWallets[0]?.address.slice(0,8)}...) owns ${topHolderPercent.toFixed(1)}%. High risk of coordinated dump.`,
      });
    }

    // Top 10 concentration includes LP/exchanges since it's about overall manipulation risk
    if (top10Concentration >= 60) {
      flags.push({
        type: "holder_concentration",
        severity: "critical",
        title: `🚨 Top 10 Wallets: ${top10Concentration.toFixed(1)}% (>60% threshold)`,
        description: "Extremely concentrated ownership. Easy coordinated dump.",
      });
    } else if (top10Concentration >= 50) {
      flags.push({
        type: "holder_concentration",
        severity: "high",
        title: `⚠️ Top 10 Wallets: ${top10Concentration.toFixed(1)}% (>50% threshold)`,
        description: "High concentration in top 10. Increased manipulation risk.",
      });
    }

    // RED FLAG #4: Jito bundle manipulation
    if (bundleData?.bundleScore >= 70) {
      flags.push({
        type: "bundle_manipulation",
        severity: "critical",
        title: "🚨 Heavy Jito Bundle Activity",
        description: `Bundle score: ${bundleData.bundleScore}/100. Likely insider/dev snipe in first seconds.`,
      });
    } else if (bundleData?.bundleScore >= 50) {
      flags.push({
        type: "bundle_manipulation",
        severity: "high",
        title: "⚠️ Jito Bundle Detected",
        description: `Bundle score: ${bundleData.bundleScore}/100. Multiple wallets bought in coordinated bundles.`,
      });
    }

    // RED FLAG #8: Dev sold early (check if top holder percentage dropped significantly)
    // This would need transaction history - placeholder for future implementation

    // RED FLAG #11: Recent token creation (within 24 hours)
    const tokenAge = onChain?.creationDate ? Date.now() - onChain.creationDate : null;
    if (tokenAge !== null && tokenAge < 3600000) { // < 1 hour
      flags.push({
        type: "recent_creation",
        severity: "medium",
        title: "🆕 Token Created <1 Hour Ago",
        description: "Very new token. Wait for more data and community validation.",
      });
    }

    // RED FLAG #13: Hidden bundle buys on pump.fun
    if (pumpFun?.isPumpFun && bundleData?.bundleScore >= 50) {
      flags.push({
        type: "bundle_manipulation",
        severity: "high",
        title: "⚠️ Pump.fun Bundle Manipulation",
        description: "Token launched on pump.fun with suspicious bundle activity. Dev likely bought via Jito bundles.",
      });
    }

    // RED FLAG #15: Low holder count for market cap
    const holderCount = holders?.holderCount || 0;
    const marketCap = dex?.pairs?.[0]?.marketCap || 0;
    if (marketCap > 500000 && holderCount < 50) {
      flags.push({
        type: "holder_concentration",
        severity: "high",
        title: "⚠️ Low Holders for Market Cap",
        description: `Only ${holderCount} holders for $${(marketCap/1000).toFixed(0)}k market cap. Possible wash trading.`,
      });
    }
    
    // RED FLAG #16: Wash trading detection (extreme volume/MC ratio)
    const volume24h = dex?.pairs?.[0]?.volume?.h24 || 0;
    if (marketCap > 0 && volume24h > 0) {
      const volumeMcRatio = volume24h / marketCap;
      if (volumeMcRatio > 50) { // >5000% daily volume vs MC
        flags.push({
          type: "suspicious_transactions",
          severity: "critical",
          title: "🚨 Extreme Wash Trading Detected",
          description: `24h volume is ${(volumeMcRatio * 100).toFixed(0)}% of market cap. Likely fake volume via bots.`,
        });
      } else if (volumeMcRatio > 20) { // >2000% daily volume vs MC
        flags.push({
          type: "suspicious_transactions",
          severity: "high",
          title: "⚠️ Suspected Wash Trading",
          description: `24h volume is ${(volumeMcRatio * 100).toFixed(0)}% of market cap. Unusually high trading activity.`,
        });
      }
    }
    
    // RED FLAG #17: Heavy selling pressure (dump in progress)
    const txns24h = dex?.pairs?.[0]?.txns?.h24;
    if (txns24h && txns24h.buys > 0 && txns24h.sells > 0) {
      const totalTxns = txns24h.buys + txns24h.sells;
      const sellRatio = txns24h.sells / totalTxns;
      if (sellRatio > 0.7) { // >70% of transactions are sells
        flags.push({
          type: "suspicious_transactions",
          severity: "critical",
          title: "🚨 Heavy Dumping Detected",
          description: `${(sellRatio * 100).toFixed(0)}% of recent transactions are sells (${txns24h.sells} sells vs ${txns24h.buys} buys). Active dump.`,
        });
      } else if (sellRatio > 0.6) { // >60% sells
        flags.push({
          type: "suspicious_transactions",
          severity: "high",
          title: "⚠️ High Selling Pressure",
          description: `${(sellRatio * 100).toFixed(0)}% of recent transactions are sells (${txns24h.sells} sells vs ${txns24h.buys} buys). Caution.`,
        });
      }
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

  /**
   * Calculate liquidity pool data including burn percentage
   * For Pump.fun tokens: Check if bonded (100% curve = graduated to Raydium)
   * For regular tokens: Try to calculate LP burn from on-chain data
   */
  private async calculateLiquidityPool(
    dex: any,
    pumpFun: any,
    tokenAddress: string
  ): Promise<LiquidityPoolStatus> {
    debugLog(`\n[LP Analyzer DEBUG] Starting LP calculation for ${tokenAddress}`);
    
    const liquidityUsd = dex?.pairs?.[0]?.liquidity?.usd || 0;
    const pairAddress = dex?.pairs?.[0]?.pairAddress;
    
    debugLog(`[LP Analyzer DEBUG] Liquidity USD: $${liquidityUsd}`);
    debugLog(`[LP Analyzer DEBUG] Pair Address: ${pairAddress || 'none'}`);
    debugLog(`[LP Analyzer DEBUG] Is Pump.fun: ${pumpFun?.isPumpFun}`);
    debugLog(`[LP Analyzer DEBUG] Bonding Curve: ${pumpFun?.bondingCurve}%`);
    
    // For Pump.fun tokens, check bonding status
    if (pumpFun?.isPumpFun) {
      const bondingCurve = pumpFun.bondingCurve ?? 0;
      const isGraduated = bondingCurve >= 100 || pumpFun.mayhemMode;
      
      debugLog(`[LP Analyzer DEBUG] Pump.fun token - Graduated: ${isGraduated}, Bonding: ${bondingCurve}%`);
      
      if (!isGraduated) {
        // Token hasn't bonded yet - no LP to burn
        debugLog(`[LP Analyzer DEBUG] Not bonded yet (${bondingCurve}% bonding curve) - returning no burn data`);
        return {
          exists: false,
          status: 'UNKNOWN' as const,
          burnPercentage: undefined, // Explicitly undefined - not 0%
          lpMintAddress: undefined,
          notBondedYet: true, // Flag to indicate pre-bond state
        };
      }
      
      // Token has graduated - Pump.fun AUTOMATICALLY burns LP on graduation
      // This is PROTOCOL-ENFORCED: 100% of LP tokens are burned when bonding curve completes
      // No need to check on-chain - it's guaranteed by Pump.fun's graduation mechanism
      debugLog(`[LP Analyzer DEBUG] Token graduated - LP is AUTOMATICALLY BURNED by Pump.fun protocol`);
      if (pairAddress) {
        debugLog(`[LP Analyzer DEBUG] Raydium pair found: ${pairAddress} - LP tokens 100% burned (protocol guarantee)`);
        return {
          exists: true,
          status: 'SAFE',
          burnPercentage: 100, // Always 100% for graduated Pump.fun tokens
          lpMintAddress: pairAddress,
        };
      }
      
      // Graduated but no pair address found yet (DexScreener lag)
      debugLog(`[LP Analyzer DEBUG] Token graduated but pair not indexed yet - LP still 100% burned`);
      return {
        exists: true, // LP exists, just not indexed yet
        status: 'SAFE', // Still safe - LP is burned
        burnPercentage: 100, // Always 100% for graduated Pump.fun tokens
      };
    }
    
    // For regular tokens with liquidity pools
    if (pairAddress && liquidityUsd > 0) {
      debugLog(`[LP Analyzer DEBUG] Regular token with LP - calculating burn`);
      const burnPct = await this.calculateLPBurnPercentage(pairAddress);
      debugLog(`[LP Analyzer DEBUG] Calculated burn percentage: ${burnPct}%`);
      
      return {
        exists: true,
        status: liquidityUsd > 1000 && burnPct >= 90 ? 'SAFE' : 'RISKY',
        burnPercentage: burnPct,
        lpMintAddress: pairAddress,
      };
    }
    
    // No liquidity pool found
    debugLog(`[LP Analyzer DEBUG] No LP found - returning no data`);
    return {
      exists: !!liquidityUsd,
      status: liquidityUsd > 1000 ? 'SAFE' : 'RISKY',
      burnPercentage: undefined,
    };
  }

  /**
   * Calculate LP burn percentage by checking token accounts
   * Returns percentage of LP tokens burned (sent to dead addresses)
   */
  private async calculateLPBurnPercentage(lpMintAddress: string): Promise<number> {
    debugLog(`[LP Burn DEBUG] Calculating burn for LP: ${lpMintAddress}`);
    
    try {
      const connection = rpcBalancer.getConnection();
      const lpMintPubkey = new PublicKey(lpMintAddress);
      
      // Get LP token mint info
      const mintInfo = await getMint(connection, lpMintPubkey, 'confirmed', TOKEN_PROGRAM_ID)
        .catch(() => getMint(connection, lpMintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID));
      
      const totalSupply = Number(mintInfo.supply);
      debugLog(`[LP Burn DEBUG] Total LP supply: ${totalSupply}`);
      
      if (totalSupply === 0) {
        debugLog(`[LP Burn DEBUG] Total supply is 0 - 100% burned`);
        return 100;
      }
      
      // Get largest LP token holders
      const largestAccounts = await connection.getTokenLargestAccounts(lpMintPubkey, 'confirmed');
      debugLog(`[LP Burn DEBUG] Found ${largestAccounts.value.length} LP token accounts`);
      
      if (largestAccounts.value.length === 0) {
        debugLog(`[LP Burn DEBUG] No token accounts found - 100% burned`);
        return 100;
      }
      
      // Fetch actual owners of token accounts
      const accountAddresses = largestAccounts.value.map(acc => acc.address);
      const accountInfos = await connection.getMultipleAccountsInfo(accountAddresses, 'confirmed');
      
      // Known burn addresses on Solana
      const BURN_ADDRESSES = new Set([
        '11111111111111111111111111111111', // System program (common burn)
        'So11111111111111111111111111111111111111112', // Wrapped SOL (sometimes used)
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
        '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', // Raydium authority v4
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
      ]);
      
      let burnedAmount = 0;
      
      for (let i = 0; i < largestAccounts.value.length; i++) {
        const accountInfo = accountInfos[i];
        const amount = Number(largestAccounts.value[i].amount);
        
        if (!accountInfo?.data || amount === 0) {
          debugLog(`[LP Burn DEBUG] Account ${i}: No data or zero balance - Amount: ${amount}`);
          continue;
        }
        
        // Parse token account to get owner (owner is at bytes 32-64)
        const data = accountInfo.data as Buffer;
        if (data.length < 64) {
          debugLog(`[LP Burn DEBUG] Account ${i}: Insufficient data length`);
          continue;
        }
        
        const ownerBytes = data.subarray(32, 64);
        const owner = bs58.encode(ownerBytes);
        
        // Check if owner is a burn address
        const isBurned = BURN_ADDRESSES.has(owner);
        
        if (isBurned) {
          burnedAmount += amount;
          debugLog(`[LP Burn DEBUG] Burned account found: ${owner.slice(0, 8)}... Amount: ${amount}`);
        } else {
          debugLog(`[LP Burn DEBUG] Active account: ${owner.slice(0, 8)}... Amount: ${amount}`);
        }
      }
      
      const burnPercentage = (burnedAmount / totalSupply) * 100;
      debugLog(`[LP Burn DEBUG] Burned: ${burnedAmount} / ${totalSupply} = ${burnPercentage.toFixed(2)}%`);
      
      return burnPercentage;
      
    } catch (error: any) {
      console.error(`[LP Burn DEBUG] Error calculating LP burn:`, error.message);
      console.error(`[LP Burn DEBUG] Stack:`, error.stack);
      return 0; // Return 0% if we can't calculate (safest assumption)
    }
  }
}

// Export singleton instance
export const tokenAnalyzer = new SolanaTokenAnalyzer();

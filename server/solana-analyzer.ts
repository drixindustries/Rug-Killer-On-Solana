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
import { AgedWalletDetector } from "./services/aged-wallet-detector.js";
import { devsNightmareDetector } from "./services/devs-nightmare-detector.js";
import { serialRuggerDetector } from "./services/serial-rugger-detector.js";
import { socialRedFlagDetector } from "./services/social-red-flags.js";
import { syraxMLScorer, type SyraxFeatures } from "./services/syrax-ml-scorer.js";

// Singleton aged wallet detector
let agedWalletDetector: AgedWalletDetector | null = null;
function getAgedWalletDetector(): AgedWalletDetector {
  if (!agedWalletDetector) {
    agedWalletDetector = new AgedWalletDetector();
  }
  return agedWalletDetector;
}

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
    options: { skipExternal?: boolean; skipOnChain?: boolean; fastMode?: boolean } = {}
  ): Promise<TokenAnalysisResponse> {
    const startTime = Date.now();
    const isFastMode = options.fastMode ?? false;
    console.log(`🔍 [Analyzer] Starting analysis for ${tokenMintAddress}${isFastMode ? ' (FAST MODE)' : ''}`);

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

      // FAST MODE: Aggressive timeouts for 2-3 second response
      // NORMAL MODE: Standard timeouts for thorough analysis
      const TIMEOUTS = isFastMode ? {
        dexScreener: 2000,   // 2s (fast)
        onChain: 2000,       // 2s (fast)
        holders: 2500,       // 2.5s (fast)
        creationDate: 1500,  // 1.5s (fast)
        pumpFun: 1500,       // 1.5s (fast)
      } : {
        dexScreener: 8000,   // 8s (normal)
        onChain: 10000,      // 10s (normal)
        holders: 15000,      // 15s (normal)
        creationDate: 5000,  // 5s (normal)
        pumpFun: 5000,       // 5s (normal)
      };

      // Fetch data in parallel with timeouts
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
          withTimeout(this.dexScreener.getTokenData(tokenMintAddress), TIMEOUTS.dexScreener, 'DexScreener').then(v => ({ status: 'fulfilled' as const, value: v })),
        options.skipOnChain ? Promise.resolve({ status: 'fulfilled' as const, value: null }) : 
          withTimeout(this.getOnChainData(tokenAddress), TIMEOUTS.onChain, 'OnChain').then(v => ({ status: 'fulfilled' as const, value: v })),
        options.skipExternal ? Promise.resolve({ status: 'fulfilled' as const, value: null }) : 
          withTimeout(holderAnalysis.analyzeHolders(tokenMintAddress), TIMEOUTS.holders, 'Holders').then(v => ({ status: 'fulfilled' as const, value: v })),
        // Skip creation date in fast mode (not critical)
        (options.skipOnChain || isFastMode) ? Promise.resolve({ status: 'fulfilled' as const, value: null }) : 
          withTimeout(this.getTokenCreationDate(tokenAddress), TIMEOUTS.creationDate, 'CreationDate').then(v => ({ status: 'fulfilled' as const, value: v })),
        options.skipExternal ? Promise.resolve({ status: 'fulfilled' as const, value: null }) : 
          withTimeout(checkPumpFun(tokenMintAddress), TIMEOUTS.pumpFun, 'PumpFun').then(v => ({ status: 'fulfilled' as const, value: v })),
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
          name: dex?.pairs?.[0]?.baseToken?.name || onChain?.metadata?.name || "Unknown",
          symbol: dex?.pairs?.[0]?.baseToken?.symbol || onChain?.metadata?.symbol || "???",
          decimals: onChain?.decimals || 9,
          supply: onChain?.supply || 0,
          hasMetadata: !!onChain?.metadata || !!dex?.pairs?.[0]?.baseToken,
          // Read actual is_mutable flag from Metaplex metadata account
          // Most tokens (85%+) are intentionally mutable - only OG collections freeze metadata
          isMutable: onChain?.metadata?.isMutable ?? true, // Default to true if metadata not found (safer assumption)
        },
        
        // Holder analysis - now using comprehensive holder service
        holderCount: holders?.holderCount || 0,
        holderCountIsEstimate: holders?.holderCountIsEstimate ?? true, // Assume estimate if not provided
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
        riskScore: this.calculateRiskScore(dex, onChain, holders, pumpFun),
        riskLevel: this.determineRiskLevel(dex, onChain, holders, pumpFun),
        redFlags: this.generateRiskFlags(dex, onChain, holders, pumpFun, null),
        rugScoreBreakdown: this.calculateRugScore(dex, onChain, holders, creationDate || undefined, pumpFun),
        
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
      // In fast mode, use shorter timeout but still run TGN
      if (this.tgnDetector && !options.skipExternal) {
        try {
          const lpPoolAddress = dex?.pairs?.[0]?.pairAddress || undefined;
          const isPreMigration = holders?.isPreMigration || false;
          
          console.log(`[Analyzer] Running TGN analysis for ${tokenMintAddress}...`);
          
          // Use timeout wrapper for TGN in fast mode
          const tgnTimeout = isFastMode ? 2000 : 10000; // 2s fast, 10s normal
          const tgnPromise = this.tgnDetector.analyzeToken(tokenMintAddress, lpPoolAddress, isPreMigration);
          const tgnResult = await Promise.race([
            tgnPromise,
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('TGN timeout')), tgnTimeout))
          ]).catch(() => null);
          
          if (tgnResult) {
            response.tgnResult = tgnResult;
            console.log(`[Analyzer] TGN P(rug): ${(tgnResult.rugProbability * 100).toFixed(1)}% | Pre-migration: ${isPreMigration} | Patterns: ${tgnResult.patterns.length}`);
          }
          
          response.isPreMigration = isPreMigration;
          response.systemWalletsFiltered = holders?.systemWalletsFiltered || 0;
          response.lpPoolAddress = lpPoolAddress;
          
          // Check if migration was recently detected
          const migrationDetector = getMigrationDetector(rpcBalancer.getConnection());
          response.migrationDetected = migrationDetector.hasMigrated(tokenMintAddress);
        } catch (tgnError) {
          console.error('[Analyzer] TGN analysis failed:', tgnError);
          response.tgnResult = undefined;
        }
      }

      // JITO BUNDLE DETECTION - Analyze recent transactions for MEV bundles
      // In fast mode, use shorter timeout but still run detection
      if (!options.skipExternal) {
        const jitoTimeout = isFastMode ? 2000 : 10000; // 2s fast, 10s normal
        const jitoDetection = async () => {
          console.log(`[Analyzer] Running Jito bundle detection for ${tokenMintAddress}...`);
          
          const connection = rpcBalancer.getConnection();
          const bundleMonitor = getBundleMonitor(connection);
          
          // In fast mode, check fewer transactions for speed
          const txLimit = isFastMode ? 20 : 50;
          
          // Fetch recent transactions to analyze for bundle activity
          const signatures = await connection.getSignaturesForAddress(
            new PublicKey(tokenMintAddress),
            { limit: txLimit },
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
                  tipPayer: firstBundle.tipPayer,
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
            
            // SyraxAI-style bundle transfer detection
            if (holders && holders.top20Holders.length > 0) {
              console.log(`[Analyzer] Running SyraxAI-style bundle transfer detection...`);
              
              const bundleTransfers = await bundleMonitor.detectBundleTransfers(
                tokenMintAddress,
                holders.top20Holders.map(h => ({ address: h.address, percentage: h.percentage })),
                response.creationDate
              );
              
              if (bundleTransfers.hasBundleTransfers) {
                console.log(`[Analyzer] 🎯 BUNDLE TRANSFERS DETECTED:`);
                console.log(`  - Suspicious transfers: ${bundleTransfers.suspiciousTransferCount}`);
                console.log(`  - Total transferred: ${bundleTransfers.totalTransferredPercent.toFixed(1)}%`);
                console.log(`  - Risk score: ${bundleTransfers.riskScore}/100`);
                
                if (response.jitoBundleData) {
                  response.jitoBundleData.bundleTransfers = {
                    hasBundleTransfers: bundleTransfers.hasBundleTransfers,
                    totalTransferredPercent: bundleTransfers.totalTransferredPercent,
                    suspiciousTransferCount: bundleTransfers.suspiciousTransferCount,
                    patterns: bundleTransfers.patterns,
                    riskScore: bundleTransfers.riskScore,
                    risks: bundleTransfers.risks,
                  };
                }
                
                // Add red flag if high risk
                if (bundleTransfers.riskScore >= 50) {
                  response.redFlags.push({
                    type: 'bundle_manipulation',
                    severity: 'high',
                    title: '⚠️ Bundle Transfer Detected (SyraxAI-style)',
                    description: `${bundleTransfers.suspiciousTransferCount} suspicious transfers detected. ${bundleTransfers.totalTransferredPercent.toFixed(1)}% supply moved post-launch. Risk: ${bundleTransfers.riskScore}/100`,
                  });
                }
              }
            }
          }
        };
        
        try {
          await Promise.race([
            jitoDetection(),
            new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Jito timeout')), jitoTimeout))
          ]);
        } catch (bundleError: any) {
          if (bundleError.message === 'Jito timeout') {
            console.warn(`[Analyzer] Jito bundle detection timed out after ${jitoTimeout}ms`);
          } else {
            console.error('[Analyzer] Jito bundle detection failed:', bundleError.message);
          }
          response.jitoBundleData = undefined;
        }
      }
      
      // DEVS NIGHTMARE DETECTION - Nova/@badattrading_ style Team/Insider/Sniper analysis
      if (holders && holders.top20Holders && holders.top20Holders.length > 0 && !options.skipExternal) {
        const devsNightmareTimeout = isFastMode ? 3000 : 8000;
        try {
          console.log(`[Analyzer] Running DevsNightmare-style detection for ${tokenMintAddress}...`);
          
          const devsNightmarePromise = devsNightmareDetector.analyze(
            tokenMintAddress,
            holders.top20Holders.map(h => ({
              address: h.address,
              balance: h.balance,
              percentage: h.percentage
            })),
            {
              includeWalletAges: !isFastMode, // Only get ages in normal mode
              includeJitoCheck: false, // Already doing Jito check above
              priceUsd: response.marketData?.priceUsd || undefined,
            }
          );
          
          const devsNightmareResult = await Promise.race([
            devsNightmarePromise,
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('DevsNightmare timeout')), devsNightmareTimeout))
          ]).catch(() => null);
          
          if (devsNightmareResult) {
            response.devsNightmareData = {
              teamPercent: devsNightmareResult.teamPercent,
              insidersPercent: devsNightmareResult.insidersPercent,
              snipersPercent: devsNightmareResult.snipersPercent,
              cexBreakdown: devsNightmareResult.cexBreakdown,
              holderDistribution: devsNightmareResult.holderDistribution,
              bundlingScore: devsNightmareResult.bundlingScore,
              bundlingScoreBreakdown: devsNightmareResult.bundlingScoreBreakdown,
              knownBundlerDetected: devsNightmareResult.knownBundlerDetected,
              knownBundlerNames: devsNightmareResult.knownBundlerNames,
              knownBundlerPercent: devsNightmareResult.knownBundlerPercent,
              agedWalletStats: devsNightmareResult.agedWalletStats,
              risks: devsNightmareResult.risks,
              verdict: devsNightmareResult.verdict,
              confidence: devsNightmareResult.confidence,
            };
            
            console.log(`[Analyzer] DevsNightmare: Team ${devsNightmareResult.teamPercent.toFixed(1)}% | Insiders ${devsNightmareResult.insidersPercent.toFixed(1)}% | Snipers ${devsNightmareResult.snipersPercent.toFixed(1)}% | Score: ${devsNightmareResult.bundlingScore}/100 | Verdict: ${devsNightmareResult.verdict}`);
            
            // Add red flags from DevsNightmare analysis
            if (devsNightmareResult.verdict === 'BUNDLED_SCAM' || devsNightmareResult.verdict === 'AVOID') {
              response.redFlags.push({
                type: 'bundle_manipulation',
                severity: 'critical',
                title: `🚨 ${devsNightmareResult.verdict === 'AVOID' ? 'AVOID - Bundled Scam' : 'BUNDLED SCAM'}`,
                description: `DevsNightmare Score: ${devsNightmareResult.bundlingScore}/100. Team: ${devsNightmareResult.teamPercent.toFixed(1)}%, Insiders: ${devsNightmareResult.insidersPercent.toFixed(1)}%, Snipers: ${devsNightmareResult.snipersPercent.toFixed(1)}%`,
              });
            }
            
            if (devsNightmareResult.knownBundlerDetected) {
              response.redFlags.push({
                type: 'bundle_manipulation',
                severity: 'critical',
                title: '🚨 Known Bundler Detected',
                description: `Known bundlers: ${devsNightmareResult.knownBundlerNames.join(', ')} (${devsNightmareResult.knownBundlerPercent.toFixed(1)}% of supply)`,
              });
            }
            
            if (devsNightmareResult.cexBreakdown.risk === 'high') {
              response.redFlags.push({
                type: 'bundle_manipulation',
                severity: 'high',
                title: '⚠️ Suspicious CEX Funding Pattern',
                description: `CEX funding: ${devsNightmareResult.cexBreakdown.total.toFixed(1)}% (ideal: 50-60%). ${devsNightmareResult.cexBreakdown.mexc > 20 ? `MEXC: ${devsNightmareResult.cexBreakdown.mexc.toFixed(1)}% (scam signal)` : ''}`,
              });
            }
          }
        } catch (devsNightmareError: any) {
          if (devsNightmareError.message === 'DevsNightmare timeout') {
            console.warn(`[Analyzer] DevsNightmare detection timed out after ${devsNightmareTimeout}ms`);
          } else {
            console.error('[Analyzer] DevsNightmare detection failed:', devsNightmareError.message);
          }
        }
        
        // SERIAL RUGGER DETECTION - Check if deployer or top holders are known ruggers
        try {
          console.log(`[Analyzer] Checking for serial ruggers...`);
          
          // Get deployer address (first holder with high % is often deployer)
          const potentialDeployer = holders.top20Holders.find(h => h.percentage > 10)?.address || null;
          
          const ruggerCheck = await serialRuggerDetector.checkTokenForRuggers(
            tokenMintAddress,
            potentialDeployer,
            holders.top20Holders.map(h => ({ address: h.address, percentage: h.percentage }))
          );
          
          if (ruggerCheck.isHighRisk) {
            console.log(`[Analyzer] 🚨 SERIAL RUGGER DETECTED: ${ruggerCheck.verdict}`);
            
            response.redFlags.push({
              type: 'bundle_manipulation',
              severity: 'critical',
              title: '🚨 SERIAL RUGGER DETECTED',
              description: ruggerCheck.verdict,
            });
            
            // Add to analysis data if DevsNightmare data exists
            if (response.devsNightmareData) {
              response.devsNightmareData.risks.push(ruggerCheck.verdict);
              response.devsNightmareData.verdict = 'AVOID';
            }
          }
        } catch (ruggerError: any) {
          console.error('[Analyzer] Serial rugger check failed:', ruggerError.message);
        }
        
        // SOCIAL RED FLAG DETECTION - Missing socials, casino outflows
        try {
          console.log(`[Analyzer] Checking social red flags...`);
          
          const devWalletAddress = holders.top20Holders.find(h => h.percentage > 10)?.address;
          
          const socialResult = await socialRedFlagDetector.analyze(
            tokenMintAddress,
            devWalletAddress,
            dex
          );
          
          if (socialResult.riskScore > 0) {
            response.socialRedFlags = {
              socialPresence: socialResult.socialPresence,
              hasMissingSocials: socialResult.hasMissingSocials,
              missingSocialsRisk: socialResult.missingSocialsRisk,
              hasCasinoOutflows: socialResult.hasCasinoOutflows,
              totalCasinoOutflows: socialResult.totalCasinoOutflows,
              suspiciousPatterns: socialResult.suspiciousPatterns,
              riskScore: socialResult.riskScore,
              risks: socialResult.risks,
              verdict: socialResult.verdict,
            };
            
            console.log(`[Analyzer] Social red flags: Risk ${socialResult.riskScore}/100 | Verdict: ${socialResult.verdict}`);
            
            // Add red flags
            if (socialResult.hasMissingSocials && socialResult.missingSocialsRisk === 'high') {
              response.redFlags.push({
                type: 'suspicious_transactions',
                severity: 'high',
                title: '⚠️ No Socials - Instant Avoid',
                description: `Token has no website, Twitter, or Telegram. Per Nova: "Check distro, if you don't you give these people free money"`,
              });
            }
            
            if (socialResult.hasCasinoOutflows) {
              response.redFlags.push({
                type: 'suspicious_transactions',
                severity: 'critical',
                title: '🎰 Dev Sends Fees to Casino',
                description: `${socialResult.totalCasinoOutflows.toFixed(2)} SOL sent to gambling sites. Classic scam behavior.`,
              });
            }
          }
        } catch (socialError: any) {
          console.error('[Analyzer] Social red flag check failed:', socialError.message);
        }
      }
      
      // AGED WALLET DETECTION - Detect fake volume from aged wallets
      if (holders && holders.top20Holders && holders.top20Holders.length > 0 && !options.skipExternal) {
        const agedWalletTimeout = isFastMode ? 3000 : 8000;
        try {
          console.log(`[Analyzer] Running aged wallet detection for ${tokenMintAddress}...`);
          
          const detector = getAgedWalletDetector();
          const agedWalletPromise = detector.detectAgedWallets(
            tokenMintAddress,
            holders.top20Holders.map(h => ({
              address: h.address,
              balance: h.balance,
              percentage: h.percentage
            })),
            [] // Recent transactions - can add later
          );
          
          const agedWalletResult = await Promise.race([
            agedWalletPromise,
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Aged wallet timeout')), agedWalletTimeout))
          ]).catch(() => null);
          
          if (agedWalletResult) {
            response.agedWalletData = {
              agedWalletCount: agedWalletResult.agedWalletCount,
              totalFakeVolumePercent: agedWalletResult.totalFakeVolumePercent,
              riskScore: agedWalletResult.riskScore,
              patterns: agedWalletResult.patterns,
              suspiciousWallets: agedWalletResult.suspiciousAgedWallets?.slice(0, 10) || [],
              ageTiers: agedWalletResult.ageTiers,
              risks: agedWalletResult.risks,
            };
            
            console.log(`[Analyzer] Aged wallet detection complete: ${agedWalletResult.agedWalletCount} aged wallets, ${agedWalletResult.totalFakeVolumePercent.toFixed(1)}% fake volume, risk: ${agedWalletResult.riskScore}/100`);
            
            // Add red flag if high risk
            if (agedWalletResult.riskScore >= 60) {
              response.redFlags.push({
                type: 'aged_wallet_manipulation',
                severity: 'high',
                title: '🚨 Aged Wallet Manipulation',
                description: `${agedWalletResult.agedWalletCount} aged wallets detected creating fake volume (${agedWalletResult.totalFakeVolumePercent.toFixed(1)}%). Risk score: ${agedWalletResult.riskScore}/100`,
              });
            } else if (agedWalletResult.riskScore >= 30) {
              response.redFlags.push({
                type: 'aged_wallet_warning',
                severity: 'medium',
                title: '⚠️ Aged Wallet Activity',
                description: `${agedWalletResult.agedWalletCount} aged wallets detected. Possible fake volume: ${agedWalletResult.totalFakeVolumePercent.toFixed(1)}%`,
              });
            }
          } else {
            // Default to safe if detection fails
            response.agedWalletData = {
              agedWalletCount: 0,
              totalFakeVolumePercent: 0,
              riskScore: 0,
              patterns: {
                sameFundingSource: false,
                similarAges: false,
                coordinatedBuys: false,
                noSells: false,
                similarBuyAmounts: false
              },
              suspiciousWallets: [],
              ageTiers: { extreme: 0, high: 0, medium: 0, low: 0 },
              risks: [],
            };
          }
        } catch (agedWalletError: any) {
          if (agedWalletError.message === 'Aged wallet timeout') {
            console.warn(`[Analyzer] Aged wallet detection timed out after ${agedWalletTimeout}ms`);
          } else {
            console.error('[Analyzer] Aged wallet detection failed:', agedWalletError.message);
          }
          // Set default values on error
          response.agedWalletData = {
            agedWalletCount: 0,
            totalFakeVolumePercent: 0,
            riskScore: 0,
            patterns: {
              sameFundingSource: false,
              similarAges: false,
              coordinatedBuys: false,
              noSells: false,
              similarBuyAmounts: false
            },
            suspiciousWallets: [],
            ageTiers: { extreme: 0, high: 0, medium: 0, low: 0 },
            risks: [],
          };
        }
      } else {
        // No holders to analyze
        response.agedWalletData = {
          agedWalletCount: 0,
          totalFakeVolumePercent: 0,
          riskScore: 0,
          patterns: {
            sameFundingSource: false,
            similarAges: false,
            coordinatedBuys: false,
            noSells: false,
            similarBuyAmounts: false
          },
          suspiciousWallets: [],
          ageTiers: { extreme: 0, high: 0, medium: 0, low: 0 },
          risks: [],
        };
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
      
      // SYRAX ML SCORING - SyraxAI-style legitimacy scoring with composite risk
      if (!options.skipExternal) {
        try {
          console.log(`[Analyzer] Running SyraxML scoring...`);
          
          // Extract features for SyraxML scorer
          const top10Percent = response.topHolders?.slice(0, 10)
            .reduce((sum, h) => sum + (h.percentage || 0), 0) || 0;
          
          const cexPercent = response.devsNightmareData?.cexBreakdown?.total || 0;
          const agedClusterPercent = response.agedWalletData?.totalFakeVolumePercent || 0;
          
          // Calculate liquidity ratio (liquidity / market cap)
          const liquidityUsd = response.liquidityInfo?.poolSize || 0;
          const marketCap = response.dexscreenerData?.pairs?.[0]?.marketCap || 0;
          const liquidityRatio = marketCap > 0 ? liquidityUsd / marketCap : 0;
          
          const bundleRisk = response.jitoBundleData?.bundleTransfers?.riskScore || 
            (response.jitoBundleData?.hasBundleActivity ? 50 : 0);
          
          const holderCount = response.holderCount || 0;
          const photonProtected = response.jitoBundleData?.photonProtected || false;
          
          const syraxFeatures: SyraxFeatures = {
            top10Percent,
            cexPercent,
            agedClusterPercent,
            liquidityRatio,
            bundleRisk,
            holderCount,
            photonProtected,
          };
          
          const syraxResult = syraxMLScorer.calculateScore(syraxFeatures);
          
          // Calculate composite risk: (bundle_risk * 0.4) + (rug_probability * 0.6)
          const compositeRisk = syraxMLScorer.calculateCompositeRisk(bundleRisk, syraxResult.rugProbability);
          
          response.syraxMLData = {
            rugProbability: syraxResult.rugProbability,
            legitimacyScore: syraxResult.legitimacyScore,
            featureScores: syraxResult.featureScores,
            recommendation: syraxResult.recommendation,
            confidenceLevel: syraxResult.confidenceLevel,
            riskFactors: syraxResult.riskFactors,
            positiveFactors: syraxResult.positiveFactors,
            compositeRisk,
          };
          
          console.log(`[Analyzer] SyraxML: Legitimacy ${syraxResult.legitimacyScore}/100, Rug Prob ${syraxResult.rugProbability}%, Composite Risk ${compositeRisk}% | Recommendation: ${syraxResult.recommendation}`);
          
          // Add red flag if high rug probability
          if (syraxResult.rugProbability >= 70) {
            response.redFlags.push({
              type: 'ml_high_rug_probability',
              severity: 'critical',
              title: '🤖 ML: High Rug Probability',
              description: `SyraxAI-style ML scoring indicates ${syraxResult.rugProbability}% rug probability. Factors: ${syraxResult.riskFactors.slice(0, 2).join(', ')}`,
            });
          } else if (syraxResult.rugProbability >= 50) {
            response.redFlags.push({
              type: 'ml_elevated_risk',
              severity: 'high',
              title: '⚠️ ML: Elevated Risk',
              description: `ML scoring indicates ${syraxResult.rugProbability}% rug probability. Exercise caution.`,
            });
          }
          
        } catch (syraxError: any) {
          console.error('[Analyzer] SyraxML scoring failed:', syraxError.message);
        }
      }
      
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

      // Fetch Metaplex metadata to get isMutable flag
      const metaplexMetadata = await this.fetchMetaplexMetadata(connection, tokenAddress);

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
        metadata: metaplexMetadata,
      };
    } catch (error: any) {
      console.warn(`⚠️ [Analyzer] On-chain data fetch failed:`, error.message);
      return null;
    }
  }

  /**
   * Fetch and parse Metaplex Token Metadata account to get isMutable flag
   * The metadata account is a PDA derived from the mint address
   * 
   * Metaplex Metadata struct layout:
   * - key (1 byte)
   * - update_authority (32 bytes)
   * - mint (32 bytes)
   * - name (4 + up to 32 bytes - string with length prefix)
   * - symbol (4 + up to 10 bytes - string with length prefix)
   * - uri (4 + up to 200 bytes - string with length prefix)
   * - seller_fee_basis_points (2 bytes)
   * - creators (option: 1 byte + if present: 4 bytes count + 34 bytes per creator)
   * - primary_sale_happened (1 byte)
   * - is_mutable (1 byte) <-- THIS IS WHAT WE NEED
   */
  private async fetchMetaplexMetadata(connection: Connection, mintAddress: PublicKey): Promise<{
    isMutable: boolean;
    updateAuthority: string | null;
    name?: string;
    symbol?: string;
    uri?: string;
  } | null> {
    try {
      // Metaplex Token Metadata Program ID
      const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
      
      // Derive the metadata PDA
      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          METADATA_PROGRAM_ID.toBuffer(),
          mintAddress.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      );
      
      // Fetch the metadata account
      const metadataAccount = await connection.getAccountInfo(metadataPDA, 'confirmed');
      
      if (!metadataAccount || !metadataAccount.data || metadataAccount.data.length < 100) {
        debugLog(`[Metadata] No Metaplex metadata found for ${mintAddress.toBase58()}`);
        return null;
      }
      
      const data = metadataAccount.data;
      let offset = 0;
      
      // Skip key (1 byte)
      offset += 1;
      
      // Update authority (32 bytes)
      const updateAuthority = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
      offset += 32;
      
      // Skip mint (32 bytes) - we already know it
      offset += 32;
      
      // Parse name (length-prefixed string: 4 bytes length + string data)
      const nameLength = data.readUInt32LE(offset);
      offset += 4;
      const name = data.subarray(offset, offset + Math.min(nameLength, 32)).toString('utf8').replace(/\0/g, '').trim();
      offset += 32; // Always 32 bytes allocated for name
      
      // Parse symbol (length-prefixed string: 4 bytes length + string data)
      const symbolLength = data.readUInt32LE(offset);
      offset += 4;
      const symbol = data.subarray(offset, offset + Math.min(symbolLength, 10)).toString('utf8').replace(/\0/g, '').trim();
      offset += 10; // Always 10 bytes allocated for symbol
      
      // Parse URI (length-prefixed string: 4 bytes length + string data)
      const uriLength = data.readUInt32LE(offset);
      offset += 4;
      const uri = data.subarray(offset, offset + Math.min(uriLength, 200)).toString('utf8').replace(/\0/g, '').trim();
      offset += 200; // Always 200 bytes allocated for URI
      
      // Seller fee basis points (2 bytes)
      offset += 2;
      
      // Creators (Option<Vec<Creator>>)
      // First byte: 0 = None, 1 = Some
      const hasCreators = data[offset] === 1;
      offset += 1;
      
      if (hasCreators) {
        // Read number of creators (4 bytes)
        const creatorsCount = data.readUInt32LE(offset);
        offset += 4;
        
        // Skip each creator (32 bytes pubkey + 1 byte verified + 1 byte share = 34 bytes each)
        offset += creatorsCount * 34;
      }
      
      // Primary sale happened (1 byte boolean)
      offset += 1;
      
      // *** is_mutable (1 byte boolean) - THE KEY FLAG ***
      const isMutable = data[offset] === 1;
      
      debugLog(`[Metadata] Parsed metadata for ${mintAddress.toBase58().slice(0,8)}...:`);
      debugLog(`[Metadata]   - Name: ${name}`);
      debugLog(`[Metadata]   - Symbol: ${symbol}`);
      debugLog(`[Metadata]   - Update Authority: ${updateAuthority.slice(0,8)}...`);
      debugLog(`[Metadata]   - is_mutable: ${isMutable}`);
      
      return {
        isMutable,
        updateAuthority,
        name: name || undefined,
        symbol: symbol || undefined,
        uri: uri || undefined,
      };
      
    } catch (error: any) {
      debugLog(`[Metadata] Failed to fetch Metaplex metadata: ${error.message}`);
      return null;
    }
  }

  private calculateMarketCap(dex: any, onChain: any): number | null {
    const price = dex?.pairs?.[0]?.priceUsd ? parseFloat(dex.pairs[0].priceUsd) : null;
    const supply = onChain?.supply;
    
    if (!price || !supply) return null;
    return price * supply;
  }

  private calculateRiskScore(dex: any, onChain: any, holders?: any, pumpFun?: any): number {
    let penalties = 0;
    
    // Check if this is a pre-bonded pump.fun token (no LP exists yet)
    const isPreBonded = pumpFun?.isPumpFun && (pumpFun?.bondingCurve < 100) && !pumpFun?.mayhemMode;

    // === CRITICAL RED FLAGS (instant rug capability) ===
    if (onChain?.authorities?.mintAuthority) penalties += 20;
    if (onChain?.authorities?.freezeAuthority) penalties += 20;
    
    // === LIQUIDITY RISK (low liquidity = easy manipulation) ===
    // Skip liquidity penalties for pre-bonded pump.fun tokens (no LP exists yet)
    if (!isPreBonded) {
      const liquidityUsd = dex?.pairs?.[0]?.liquidity?.usd || 0;
      
      // Liquidity too low for market cap
      if (liquidityUsd < 40000 && liquidityUsd > 0) penalties += 15;
      if (liquidityUsd < 1000) penalties += 30;
      if (liquidityUsd < 100) penalties += 40;
    }
    
    const marketCap = dex?.pairs?.[0]?.marketCap || 0;
    const volume24h = dex?.pairs?.[0]?.volume?.h24 || 0;
    
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

  private determineRiskLevel(dex: any, onChain: any, holders?: any, pumpFun?: any): RiskLevel {
    const score = this.calculateRiskScore(dex, onChain, holders, pumpFun);
    
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
  private calculateRugScore(dex: any, onChain: any, holders?: any, creationDate?: number, pumpFun?: any): import('../shared/schema').RugScoreBreakdown {
    const breakdown: string[] = [];
    
    // Check if this is a pre-bonded pump.fun token (no LP exists yet)
    const isPreBonded = pumpFun?.isPumpFun && (pumpFun?.bondingCurve < 100) && !pumpFun?.mayhemMode;
    
    // === AUTHORITIES (30-40% weight, up to 125 points) ===
    const mintAuthorityScore = onChain?.authorities?.mintAuthority ? 80 : 0;
    const freezeAuthorityScore = onChain?.authorities?.freezeAuthority ? 40 : 0;
    // Metadata mutable is NORMAL for 85%+ of tokens - only give small penalty
    // Immutable metadata is a BONUS signal for OG collections, not a requirement
    const metadataMutableScore = onChain?.metadata?.isMutable !== false ? 5 : 0;
    const permanentDelegateScore = 0; // TODO: Check permanent delegate (rare)
    
    if (mintAuthorityScore > 0) breakdown.push(`Mint authority active: +${mintAuthorityScore} pts`);
    if (freezeAuthorityScore > 0) breakdown.push(`Freeze authority active: +${freezeAuthorityScore} pts`);
    // Only mention metadata mutable if other authorities are also active (compound risk)
    if (metadataMutableScore > 0 && (mintAuthorityScore > 0 || freezeAuthorityScore > 0)) {
      breakdown.push(`Metadata mutable: +${metadataMutableScore} pts`);
    }
    
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
    // Skip LP penalties for pre-bonded pump.fun tokens (no LP exists yet - it's on bonding curve)
    let lpLockedScore = 0;
    let lpAmountScore = 0;
    
    if (isPreBonded) {
      // Pre-bonded pump.fun token - no LP penalties, just note it
      breakdown.push(`Pre-bonded on Pump.fun (no LP yet)`);
    } else {
      const liquidityUsd = dex?.pairs?.[0]?.liquidity?.usd || 0;
      const burnPercentage = dex?.pairs?.[0]?.liquidity?.burnPercentage || 0;
      
      // LP not locked/burned
      lpLockedScore = burnPercentage < 50 ? 40 : burnPercentage < 90 ? 20 : 0;
      if (lpLockedScore > 0) breakdown.push(`LP ${burnPercentage.toFixed(0)}% burned (not fully locked): +${lpLockedScore} pts`);
      
      // Low liquidity: more points for lower liquidity
      if (liquidityUsd < 1000) lpAmountScore = 30;
      else if (liquidityUsd < 5000) lpAmountScore = 25;
      else if (liquidityUsd < 10000) lpAmountScore = 20;
      else if (liquidityUsd < 40000) lpAmountScore = 15;
      if (lpAmountScore > 0) breakdown.push(`Low liquidity ($${(liquidityUsd/1000).toFixed(1)}k): +${lpAmountScore} pts`);
    }
    
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

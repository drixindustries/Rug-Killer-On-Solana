/**
 * Centralized Holder Analysis Service
 * 
 * Uses ONLY accurate on-chain sources for holder data:
 * 1. Direct RPC scan via getProgramAccounts (most accurate, gets ALL holders)
 * 2. Helius RPC (enhanced features with API key)
 * 3. Standard RPC fallback (top holders only if scan fails)
 * 
 * Features:
 * - ACCURATE holder counts from on-chain data
 * - Top 20+ holder breakdown with labels
 * - Exchange/LP wallet filtering
 * - Caching to prevent rate limits
 * - Known wallet labeling (DEX, deployer, etc.)
 * 
 * Note: Removed Birdeye and GMGN as they provide inaccurate holder counts
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { redisCache } from './redis-cache.js';
import { rpcBalancer } from './rpc-balancer.js';
import { EXCHANGE_WALLETS, isExchangeWallet } from '../exchange-whitelist.js';
import { getKnownAddressInfo, getPumpFunBondingCurveAddress, getPumpFunAssociatedBondingCurveAddress, getPumpSwapAmmPoolAddress } from '../known-addresses.js';
import { isPumpFunAmm } from '../pumpfun-whitelist.js';
import { isMeteoraAmm } from '../meteora-whitelist.js';
import { isSystemWallet, isPumpFunBondingCurve, getSystemWalletType, filterHoldersWithStats, isDexProgramAccount } from '../pumpfun-system-wallets';
import { isPumpFunAmmWallet } from './pumpfun-amm-detector.js';
import { batchDetectExchanges, isKnownOrAutoExchange, getExchangeLabel } from './exchange-auto-detector.js';
import bs58 from 'bs58';

// Debug logging - only enable in development or when DEBUG_HOLDER_ANALYSIS=true
const DEBUG = process.env.DEBUG_HOLDER_ANALYSIS === 'true' || (process.env.NODE_ENV !== 'production' && process.env.DEBUG_HOLDER_ANALYSIS !== 'false');
const debugLog = DEBUG ? (...args: any[]) => console.log(...args) : () => {};

export interface HolderDetail {
  address: string;
  balance: number;
  percentage: number;
  uiAmount?: number;
  label?: string; // "Raydium Pool", "Orca LP", "Creator", "Exchange: Binance", etc.
  isExchange?: boolean;
  isLP?: boolean;
  isCreator?: boolean;
  isBundled?: boolean;
  isSniper?: boolean;
  isInsider?: boolean;
  isLargeHolder?: boolean; // True if >10% non-exchange holder (potential team wallet)
}

export interface HolderAnalysisResult {
  tokenAddress: string;
  holderCount: number;
  holderCountIsEstimate: boolean; // True if holderCount is from limited data (top 20 only)
  top20Holders: HolderDetail[];
  topHolderConcentration: number; // top 10 percentage
  exchangeHolderCount: number;
  exchangeSupplyPercent: number;
  lpSupplyPercent: number;
  pumpFunFilteredCount: number;
  pumpFunFilteredPercent: number;
  meteoraFilteredCount?: number;
  meteoraFilteredPercent?: number;
  systemWalletsFiltered: number; // Bonding curve + CEX + Raydium authorities
  isPreMigration: boolean; // True if bonding curve is top holder
  largeHolders: HolderDetail[]; // Holders with >10% supply (non-exchange, potential team wallets)
  source: 'birdeye' | 'gmgn' | 'helius' | 'rpc' | 'mixed';
  cachedAt: number;
}

export class HolderAnalysisService {
  private readonly CACHE_TTL = 900; // 15 minutes cache (increased from 5 min to reduce RPC load)
  
  // DEDUPLICATION: Track in-flight requests to prevent duplicate RPC calls
  private inFlightRequests: Map<string, Promise<HolderAnalysisResult>> = new Map();

  /**
   * Get comprehensive holder analysis for a token
   * Uses ONLY accurate on-chain sources (no third-party APIs with inaccurate counts)
   */
  async analyzeHolders(tokenAddress: string): Promise<HolderAnalysisResult> {
    // DEDUPLICATION: Check if we're already fetching this token
    const existingRequest = this.inFlightRequests.get(tokenAddress);
    if (existingRequest) {
      console.log(`[HolderAnalysis] ⏭️ Deduping request for ${tokenAddress.slice(0, 8)}...`);
      return existingRequest;
    }
    
    const cacheKey = `holder-analysis:v3:${tokenAddress}`;
    debugLog(`\n🔍 [HolderAnalysis DEBUG] Starting analysis for ${tokenAddress}`);
    debugLog(`[HolderAnalysis DEBUG] Cache key: ${cacheKey}`);

    // Track this request to prevent duplicates
    const requestPromise = redisCache.cacheFetch(
      cacheKey,
      async () => {
        debugLog(`[HolderAnalysis DEBUG] Cache MISS - fetching fresh data...`);
        
        // Try direct on-chain scan via getProgramAccounts FIRST (most accurate)
        debugLog(`[HolderAnalysis DEBUG] Step 1: Attempting on-chain RPC scan via getProgramAccounts...`);
        const programScan = await this.fetchFromProgramAccounts(tokenAddress);
        debugLog(`[HolderAnalysis DEBUG] getProgramAccounts result:`, {
          success: !!programScan,
          holderCount: programScan?.holderCount ?? 'null',
          top20Length: programScan?.top20Holders?.length ?? 0,
          source: programScan?.source
        });
        
        if (programScan && (programScan.holderCount > 0 || programScan.top20Holders.length > 0)) {
          console.log(`[HolderAnalysis] ✅ SUCCESS: Used on-chain RPC scan for ${tokenAddress} - ${programScan.holderCount} holders`);
          return programScan;
        }
        debugLog(`[HolderAnalysis DEBUG] ⚠️ getProgramAccounts failed or returned no data, trying fallbacks...`);

        // Try Helius as backup (requires API key but has accurate counts)
        debugLog(`[HolderAnalysis DEBUG] Step 2: Attempting Helius RPC...`);
        const heliusResult = await this.fetchFromHelius(tokenAddress);
        debugLog(`[HolderAnalysis DEBUG] Helius result:`, {
          success: !!heliusResult,
          holderCount: heliusResult?.holderCount ?? 'null',
          hasApiKey: !!process.env.HELIUS_API_KEY?.trim()
        });
        
        if (heliusResult && heliusResult.holderCount > 0) {
          console.log(`[HolderAnalysis] ✅ SUCCESS: Used Helius for ${tokenAddress} - ${heliusResult.holderCount} holders`);
          return heliusResult;
        }
        debugLog(`[HolderAnalysis DEBUG] ⚠️ Helius failed or returned no data, using RPC fallback...`);

        // Fallback to basic RPC (top 20 only, limited data but still accurate)
        debugLog(`[HolderAnalysis DEBUG] Step 3: Using basic RPC fallback (getTokenLargestAccounts)...`);
        const rpcResult = await this.fetchFromRPC(tokenAddress);
        debugLog(`[HolderAnalysis DEBUG] RPC fallback result:`, {
          holderCount: rpcResult.holderCount,
          top20Length: rpcResult.top20Holders.length,
          source: rpcResult.source
        });
        console.log(`[HolderAnalysis] ⚠️ FALLBACK: Used RPC fallback for ${tokenAddress} (limited to top 20 holders, holderCount=${rpcResult.holderCount})`);
        debugLog(`[HolderAnalysis DEBUG] === Analysis complete ===\n`);
        return rpcResult;
      },
      this.CACHE_TTL
    ).then(result => {
      debugLog(`[HolderAnalysis DEBUG] FINAL RESULT for ${tokenAddress}:`, {
        holderCount: result.holderCount,
        top20Length: result.top20Holders.length,
        source: result.source,
        fromCache: result.cachedAt < Date.now() - 1000 // Rough check if from cache
      });
      return result;
    });
    
    // Track in-flight request and ensure cleanup
    this.inFlightRequests.set(tokenAddress, requestPromise);
    try {
      return await requestPromise;
    } finally {
      this.inFlightRequests.delete(tokenAddress);
    }
  }

  /**
   * On-chain scan using getProgramAccounts filtered by mint
   * Pros: No indexer required, works on QuickNode/public RPC
   * Cons: Can be heavy for very popular tokens; we add safety caps
   */
  private async fetchFromProgramAccounts(tokenAddress: string): Promise<HolderAnalysisResult | null> {
    try {
      console.log(`[HolderAnalysis DEBUG - getProgramAccounts] Starting scan for ${tokenAddress}`);
      
      // getProgramAccounts requires premium RPC (Helius) - don't use free RPCs
      const heliusConnection = rpcBalancer.getHeliusConnection();
      if (!heliusConnection) {
        console.log(`[HolderAnalysis DEBUG - getProgramAccounts] Skipping - Helius not available for index methods`);
        return null;
      }
      
      const connection = heliusConnection;
      const rpcEndpoint = connection.rpcEndpoint;
      console.log(`[HolderAnalysis DEBUG - getProgramAccounts] Using Helius for index methods: ${rpcEndpoint.slice(0, 50)}...`);
      
      // Add timeout for getProgramAccounts (10 seconds for premium RPCs - increased for better accuracy)
      const timeoutMs = 10000;
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<null>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('getProgramAccounts timeout')), timeoutMs);
      });
      
      // Helper to clear timeout when race completes
      const clearTimeoutSafe = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };
      
      const mintPubkey = new PublicKey(tokenAddress);

      // Fetch mint info for decimals and supply
      console.log(`[HolderAnalysis DEBUG - getProgramAccounts] Fetching mint info...`);
      let mintInfo;
      try {
        mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_PROGRAM_ID)
          .catch(() => getMint(connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID));
      } catch (error: any) {
        if (error.message?.includes('Received one or more errors')) {
          console.warn(`[HolderAnalysis] RPC batch error fetching mint info for ${tokenAddress}`);
          return null;
        }
        throw error;
      }
      console.log(`[HolderAnalysis DEBUG - getProgramAccounts] Mint info received - decimals: ${mintInfo.decimals}, supply: ${mintInfo.supply.toString()}`);

      const totalSupplyRaw = BigInt(mintInfo.supply.toString());
      const decimals = mintInfo.decimals;

      // Helper to scan a token program (classic and 2022)
      const scanProgram = async (programId: PublicKey) => {
        // Request minimal bytes (0..80) to read mint, owner, amount
        const accounts = await connection.getProgramAccounts(programId, {
          commitment: 'confirmed',
          filters: [
            { memcmp: { offset: 0, bytes: mintPubkey.toBase58() } },
          ],
          dataSlice: { offset: 0, length: 80 },
        });
        return accounts;
      };

      // Wrap scan operations in timeout to prevent hanging
      const scanWithTimeout = async () => {
        console.log(`[HolderAnalysis DEBUG - getProgramAccounts] Scanning TOKEN_PROGRAM_ID...`);
        const classic = await scanProgram(TOKEN_PROGRAM_ID).catch((err) => {
          console.log(`[HolderAnalysis DEBUG - getProgramAccounts] TOKEN_PROGRAM_ID scan error:`, err.message);
          return [] as any[];
        });
        console.log(`[HolderAnalysis DEBUG - getProgramAccounts] TOKEN_PROGRAM_ID found ${classic.length} accounts`);
        
        console.log(`[HolderAnalysis DEBUG - getProgramAccounts] Scanning TOKEN_2022_PROGRAM_ID...`);
        const t2022 = await scanProgram(TOKEN_2022_PROGRAM_ID).catch((err) => {
          console.log(`[HolderAnalysis DEBUG - getProgramAccounts] TOKEN_2022_PROGRAM_ID scan error:`, err.message);
          return [] as any[];
        });
        console.log(`[HolderAnalysis DEBUG - getProgramAccounts] TOKEN_2022_PROGRAM_ID found ${t2022.length} accounts`);
        
        return [...classic, ...t2022];
      };

      let all: any[];
      try {
        all = await Promise.race([scanWithTimeout(), timeoutPromise]) as any[];
        clearTimeoutSafe(); // Clear timeout on success
      } catch (error: any) {
        clearTimeoutSafe(); // Clear timeout on error too
        if (error.message?.includes('timeout')) {
          console.log(`[HolderAnalysis DEBUG - getProgramAccounts] ⏱️ Timeout after ${timeoutMs}ms, using fallback`);
          return null;
        }
        throw error;
      }
      
      console.log(`[HolderAnalysis DEBUG - getProgramAccounts] Total accounts found: ${all.length}`);

      if (all.length === 0) {
        console.log(`[HolderAnalysis DEBUG - getProgramAccounts] ❌ No accounts found, returning null`);
        return null;
      }

      // Safety cap: if result is extremely large, bail to avoid overload
      const MAX_ACCOUNTS = 15000;
      if (all.length > MAX_ACCOUNTS) {
        console.warn(`[HolderAnalysis DEBUG - getProgramAccounts] ⚠️ Account count ${all.length} exceeds cap ${MAX_ACCOUNTS}, returning null`);
        // We still return null so other fallbacks can try
        return null;
      }

      type RawHolder = { address: string; amountRaw: bigint };
      const holders: RawHolder[] = [];

      for (const acc of all) {
        const data: Buffer = acc.account.data as unknown as Buffer;
        if (!data || data.length < 72) continue;
        // Amount at offset 64 (u64 little-endian)
        const amountRaw = data.readBigUInt64LE(64);
        if (amountRaw === 0n) continue;
        // Owner at offset 32..64 (32 bytes)
        const ownerBytes = data.subarray(32, 64);
        const owner = bs58.encode(ownerBytes);
        holders.push({ address: owner, amountRaw });
      }

      if (holders.length === 0) {
        return {
          tokenAddress,
          holderCount: 0,
          holderCountIsEstimate: true,
          top20Holders: [],
          topHolderConcentration: 0,
          exchangeHolderCount: 0,
          exchangeSupplyPercent: 0,
          lpSupplyPercent: 0,
          pumpFunFilteredCount: 0,
          pumpFunFilteredPercent: 0,
          systemWalletsFiltered: 0,
          isPreMigration: false,
          largeHolders: [],
          source: 'rpc',
          cachedAt: Date.now(),
        };
      }

      console.log(`[HolderAnalysis DEBUG - getProgramAccounts] Parsed ${holders.length} non-zero token accounts`);
      
      // Calculate pump.fun bonding curve addresses for this specific token
      const bondingCurveAddress = getPumpFunBondingCurveAddress(tokenAddress);
      const associatedBondingCurveAddress = getPumpFunAssociatedBondingCurveAddress(tokenAddress);
      // NEW: Calculate PumpSwap AMM pool address for graduated tokens
      const pumpSwapPoolAddress = getPumpSwapAmmPoolAddress(tokenAddress);
      console.log(`[HolderAnalysis] Pump.fun system addresses for ${tokenAddress}:`, {
        bondingCurve: bondingCurveAddress,
        associated: associatedBondingCurveAddress,
        pumpSwapPool: pumpSwapPoolAddress
      });
      
      // Aggregate by owner (some wallets may hold multiple token accounts)
      const byOwner = new Map<string, bigint>();
      for (const h of holders) {
        byOwner.set(h.address, (byOwner.get(h.address) || 0n) + h.amountRaw);
      }
      console.log(`[HolderAnalysis DEBUG - getProgramAccounts] Aggregated to ${byOwner.size} unique holders`);

      // Build holder list and sort by balance desc
      let pumpFunFilteredCount = 0;
      let pumpFunFilteredRaw = 0n;
      let meteoraFilteredCount = 0;
      let meteoraFilteredRaw = 0n;

      const nonSystemEntries = Array.from(byOwner.entries()).reduce<Array<{ address: string; amountRaw: bigint }>>((acc, [address, amountRaw]) => {
        // Filter pump.fun bonding curve addresses (both main and associated)
        if ((bondingCurveAddress && address === bondingCurveAddress) || (associatedBondingCurveAddress && address === associatedBondingCurveAddress)) {
          console.log(`[HolderAnalysis] ✅ Filtered bonding curve holder: ${address.slice(0, 8)}... (${Number(amountRaw) / 1e9} tokens)`);
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          return acc;
        }
        // NEW: Filter PumpSwap AMM pool address (graduated tokens - CRITICAL)
        if (pumpSwapPoolAddress && address === pumpSwapPoolAddress) {
          console.log(`[HolderAnalysis] ✅ Filtered PumpSwap AMM pool: ${address.slice(0, 8)}... (${Number(amountRaw) / 1e9} tokens)`);
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          return acc;
        }
        // Check Pump.fun AMM (includes pattern matching for 5Nkn..., pAMM...)
        // CRITICAL: Check this BEFORE system wallets to catch all Pump.fun AMM variants
        if (isPumpFunAmm(address)) {
          console.log(`[HolderAnalysis] ✅ Filtered Pump.fun/PumpSwap AMM: ${address.slice(0, 8)}...${address.slice(-8)} (${Number(amountRaw) / 1e9} tokens)`);
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          return acc;
        }
        // Check system wallets (Raydium, exchanges, etc.)
        if (isSystemWallet(address)) {
          console.log(`[HolderAnalysis] ✅ Filtered system wallet: ${address.slice(0, 8)}... (${getSystemWalletType(address)})`);
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          return acc;
        }
        if (isMeteoraAmm(address)) {
          console.log(`[HolderAnalysis] ✅ Filtered Meteora AMM: ${address.slice(0, 8)}...`);
          meteoraFilteredCount += 1;
          meteoraFilteredRaw += amountRaw;
          return acc;
        }
        acc.push({ address, amountRaw });
        return acc;
      }, []);

      const effectiveSupplyRaw = totalSupplyRaw - pumpFunFilteredRaw - meteoraFilteredRaw;
      const safeEffectiveSupplyRaw = effectiveSupplyRaw > 0n ? effectiveSupplyRaw : 1n;
      const effectiveSupply = Number(safeEffectiveSupplyRaw);
      const totalSupplyNumber = Number(totalSupplyRaw);
      const pumpFunFilteredPercent = totalSupplyNumber > 0
        ? (Number(pumpFunFilteredRaw) / totalSupplyNumber) * 100
        : 0;
      const meteoraFilteredPercent = totalSupplyNumber > 0
        ? (Number(meteoraFilteredRaw) / totalSupplyNumber) * 100
        : 0;

      // Additional async check for high-percentage holders that might be Pump.fun AMM wallets
      // This catches edge cases where pattern matching didn't work
      const suspiciousHighPercentageHolders = nonSystemEntries
        .filter(({ address, amountRaw }) => {
          const percentage = Number(amountRaw) / effectiveSupply * 100;
          // Check holders with >10% that weren't caught by pattern matching
          return percentage > 10 && !isPumpFunAmm(address) && !isSystemWallet(address);
        })
        .slice(0, 5); // Only check top 5 suspicious holders to avoid performance issues

      // Async check for Pump.fun AMM wallets (non-blocking, runs in parallel)
      const ammChecks = suspiciousHighPercentageHolders.map(async ({ address, amountRaw }) => {
        try {
          const detection = await isPumpFunAmmWallet(connection, address, tokenAddress);
          if (detection.isPumpFunAmm && detection.confidence === 'high') {
            console.log(`[HolderAnalysis] ✅ Async-detected Pump.fun AMM: ${address.slice(0, 8)}... (${detection.reason})`);
            return { address, isAmm: true };
          }
        } catch (error) {
          // Silently fail - don't block on async detection
        }
        return { address, isAmm: false };
      });

      const ammResults = await Promise.all(ammChecks).catch(() => []);
      const detectedAmmAddresses = new Set(
        ammResults.filter(r => r.isAmm).map(r => r.address)
      );

      // Filter out async-detected AMM wallets
      const finalNonSystemEntries = nonSystemEntries.filter(({ address }) => {
        if (detectedAmmAddresses.has(address)) {
          pumpFunFilteredCount += 1;
          // Note: amountRaw already counted in pumpFunFilteredRaw from initial filtering
          return false;
        }
        return true;
      });

      const list = finalNonSystemEntries
        .map(({ address, amountRaw }) => {
          const percentage = Number(amountRaw) / effectiveSupply * 100;
          const balance = Number(amountRaw) / Math.pow(10, decimals);
          const labeled = this.labelWallet(address, percentage);
          return {
            address,
            balance,
            percentage,
            uiAmount: balance,
            label: labeled.label,
            isExchange: labeled.isExchange,
            isLP: labeled.isLP,
            isCreator: labeled.isCreator,
            isLargeHolder: labeled.isLargeHolder,
          } as HolderDetail;
        })
        .sort((a, b) => b.balance - a.balance);

      const top20 = list.slice(0, 20);
      
      // Calculate top 10 concentration as percentage of TOTAL supply (not effective supply)
      // This shows what percentage of the total token supply is held by the top 10 wallets
      const top10TotalSupply = top20.slice(0, 10).reduce((sum, h) => {
        // Find the original amountRaw for this holder
        const holderEntry = finalNonSystemEntries.find(e => e.address === h.address);
        if (holderEntry) {
          return sum + Number(holderEntry.amountRaw);
        }
        return sum;
      }, 0);
      const top10Concentration = totalSupplyNumber > 0 
        ? (top10TotalSupply / totalSupplyNumber) * 100 
        : 0;
      
      const exchangeHolders = top20.filter(h => h.isExchange);
      const lpHolders = top20.filter(h => h.isLP);

      // Identify large holders (>10% non-exchange holders - potential team wallets)
      const largeHolders = list.filter(h => h.isLargeHolder && !h.isExchange);

      // holderCount should be TOTAL unique holders (including filtered system wallets)
      // This represents ALL wallets holding the token
      const totalHolderCount = byOwner.size;

      const result = {
        tokenAddress,
        holderCount: totalHolderCount, // Total holders including filtered ones
        holderCountIsEstimate: false, // getProgramAccounts gives accurate count
        top20Holders: top20,
        topHolderConcentration: top10Concentration, // Percentage of total supply held by top 10
        exchangeHolderCount: exchangeHolders.length,
        exchangeSupplyPercent: exchangeHolders.reduce((sum, h) => sum + h.percentage, 0),
        lpSupplyPercent: lpHolders.reduce((sum, h) => sum + h.percentage, 0),
        pumpFunFilteredCount,
        pumpFunFilteredPercent,
        meteoraFilteredCount,
        meteoraFilteredPercent,
        systemWalletsFiltered: pumpFunFilteredCount + meteoraFilteredCount,
        isPreMigration: false, // Will be calculated if needed
        largeHolders,
        source: 'rpc' as const,
        cachedAt: Date.now(),
      };
      
      console.log(`[HolderAnalysis DEBUG - getProgramAccounts] ✅ SUCCESS - Returning result:`, {
        holderCount: result.holderCount,
        top20Length: result.top20Holders.length,
        topHolderConc: result.topHolderConcentration.toFixed(2) + '%',
        exchanges: result.exchangeHolderCount,
        source: result.source
      });
      
      return result;
    } catch (error: any) {
      console.error('[HolderAnalysis DEBUG - getProgramAccounts] ❌ EXCEPTION:', error.message);
      console.error('[HolderAnalysis DEBUG - getProgramAccounts] Stack:', error.stack);
      return null;
    }
  }

  /**
   * Fetch holder data from Helius RPC
   * Enhanced fallback with improved error handling and longer timeout
   */
  private async fetchFromHelius(tokenAddress: string): Promise<HolderAnalysisResult | null> {
    const heliusKey = process.env.HELIUS_API_KEY?.trim();
    if (!heliusKey) {
      console.log(`[HolderAnalysis] fetchFromHelius: No Helius API key available`);
      return null;
    }

    try {
      console.log(`[HolderAnalysis] fetchFromHelius: Attempting Helius RPC with API key...`);
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, 'confirmed');

      // Add timeout for Helius calls (10 seconds for premium API)
      const timeoutMs = 10000;
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<null>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Helius RPC timeout')), timeoutMs);
      });

      // Helper to clear timeout
      const clearTimeoutSafe = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      const mintPubkey = new PublicKey(tokenAddress);

      // Fetch mint info with timeout protection
      let mintInfo;
      try {
        const mintPromise = getMint(connection, mintPubkey, 'confirmed', TOKEN_PROGRAM_ID)
          .catch(() => getMint(connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID));
        mintInfo = await Promise.race([mintPromise, timeoutPromise]) as any;
        clearTimeoutSafe(); // Clear timeout on success
      } catch (error: any) {
        clearTimeoutSafe();
        if (error.message?.includes('timeout')) {
          console.log(`[HolderAnalysis] fetchFromHelius: Timeout getting mint info`);
          return null;
        }
        throw error;
      }

      const totalSupplyRaw = Number(mintInfo.supply);
      const decimals = mintInfo.decimals;

      // Get largest accounts with timeout protection
      let largestAccounts;
      try {
        const largestPromise = connection.getTokenLargestAccounts(mintPubkey, 'confirmed');
        largestAccounts = await Promise.race([largestPromise, timeoutPromise]) as any;
        clearTimeoutSafe();
      } catch (error: any) {
        clearTimeoutSafe();
        if (error.message?.includes('timeout')) {
          console.log(`[HolderAnalysis] fetchFromHelius: Timeout getting largest accounts`);
          return null;
        }
        throw error;
      }

      const validAccounts = largestAccounts.value.filter((acc: any) => Number(acc.amount) > 0);

      if (validAccounts.length === 0) {
        console.log(`[HolderAnalysis] fetchFromHelius: No valid accounts found`);
        return null;
      }

      // Resolve owner addresses for top accounts
      const ownerLookup = await this.resolveTokenAccountOwners(
        connection,
        validAccounts.slice(0, Math.min(100, validAccounts.length)).map((acc: any) => acc.address)
      );

      // Process holders with filtering
      const filteredAccounts: Array<{ owner: string; amountRaw: number }> = [];
      let pumpFunFilteredCount = 0;
      let pumpFunFilteredRaw = 0;
      let meteoraFilteredCount = 0;
      let meteoraFilteredRaw = 0;

      // Calculate pump.fun bonding curve addresses
      const bondingCurveAddress = getPumpFunBondingCurveAddress(tokenAddress);
      const associatedBondingCurveAddress = getPumpFunAssociatedBondingCurveAddress(tokenAddress);
      const pumpSwapPoolAddress = getPumpSwapAmmPoolAddress(tokenAddress);

      for (const acc of validAccounts) {
        const amountRaw = Number(acc.amount);
        const ownerAddress = ownerLookup.get(acc.address.toBase58()) ?? acc.address.toBase58();

        // Filter pump.fun system addresses
        if ((bondingCurveAddress && ownerAddress === bondingCurveAddress) ||
            (associatedBondingCurveAddress && ownerAddress === associatedBondingCurveAddress)) {
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          continue;
        }

        if (pumpSwapPoolAddress && ownerAddress === pumpSwapPoolAddress) {
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          continue;
        }

        if (isPumpFunAmm(ownerAddress)) {
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          continue;
        }

        if (isSystemWallet(ownerAddress)) {
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          continue;
        }

        if (isMeteoraAmm(ownerAddress)) {
          meteoraFilteredCount += 1;
          meteoraFilteredRaw += amountRaw;
          continue;
        }

        filteredAccounts.push({ owner: ownerAddress, amountRaw });
      }

      const effectiveSupplyRaw = Math.max(totalSupplyRaw - pumpFunFilteredRaw - meteoraFilteredRaw, 1);
      const pumpFunFilteredPercent = totalSupplyRaw > 0 ? (pumpFunFilteredRaw / totalSupplyRaw) * 100 : 0;
      const meteoraFilteredPercent = totalSupplyRaw > 0 ? (meteoraFilteredRaw / totalSupplyRaw) * 100 : 0;

      const top20: HolderDetail[] = filteredAccounts.slice(0, 20).map(({ owner, amountRaw }) => {
        const balance = amountRaw / Math.pow(10, decimals);
        const percentage = (amountRaw / effectiveSupplyRaw) * 100;
        const labeled = this.labelWallet(owner, percentage);
        return {
          address: owner,
          balance,
          percentage,
          uiAmount: balance,
          label: labeled.label,
          isExchange: labeled.isExchange,
          isLP: labeled.isLP,
          isCreator: labeled.isCreator,
          isLargeHolder: labeled.isLargeHolder,
        };
      });

      // Calculate top 10 concentration
      const top10TotalSupply = top20.slice(0, 10).reduce((sum, h) => {
        const holderEntry = filteredAccounts.find(e => e.owner === h.address);
        if (holderEntry) {
          return sum + holderEntry.amountRaw;
        }
        return sum;
      }, 0);
      const top10Concentration = totalSupplyRaw > 0 ? (top10TotalSupply / totalSupplyRaw) * 100 : 0;

      const exchangeHolders = top20.filter(h => h.isExchange);
      const lpHolders = top20.filter(h => h.isLP);

      // Estimate total holder count from available data
      const totalUniqueHolders = new Set([
        ...filteredAccounts.map(a => a.owner),
        ...Array.from({ length: pumpFunFilteredCount + meteoraFilteredCount }, (_, i) => `filtered_${i}`)
      ]).size;

      const actualHolderCount = Math.max(totalUniqueHolders, filteredAccounts.length + pumpFunFilteredCount + meteoraFilteredCount);

      console.log(`[HolderAnalysis] fetchFromHelius: SUCCESS - ${actualHolderCount} holders from Helius`);

      return {
        tokenAddress,
        holderCount: actualHolderCount,
        holderCountIsEstimate: true, // Helius gives top accounts, so estimate total
        top20Holders: top20,
        topHolderConcentration: top10Concentration,
        exchangeHolderCount: exchangeHolders.length,
        exchangeSupplyPercent: exchangeHolders.reduce((sum, h) => sum + h.percentage, 0),
        lpSupplyPercent: lpHolders.reduce((sum, h) => sum + h.percentage, 0),
        pumpFunFilteredCount,
        pumpFunFilteredPercent,
        meteoraFilteredCount,
        meteoraFilteredPercent,
        systemWalletsFiltered: pumpFunFilteredCount + meteoraFilteredCount,
        isPreMigration: false,
        largeHolders,
        source: 'helius',
        cachedAt: Date.now(),
      };
    } catch (error: any) {
      console.error('[HolderAnalysis] fetchFromHelius: EXCEPTION:', error.message);
      return null;
    }

    /* DISABLED CODE - All code below is unreachable and commented out
    const heliusKey = process.env.HELIUS_API_KEY?.trim();
    if (!heliusKey) {
      return null; // Skip if no Helius key
    }

    try {
      // Helius provides enhanced getTokenAccounts with holder counts
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, 'confirmed');
      
      // Try to get holder count via Helius enhanced API
      // Note: This is a paid feature - check Helius docs for availability
      const mintPubkey = new PublicKey(tokenAddress);
      const mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_PROGRAM_ID)
        .catch(() => getMint(connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID));

      const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey, 'confirmed');
      const validAccounts = largestAccounts.value.filter(acc => Number(acc.amount) > 0);

      if (validAccounts.length === 0) {
        return null;
      }

      const totalSupplyRaw = Number(mintInfo.supply);
      const decimals = mintInfo.decimals;
      // Reduced from 200 to 50 to minimize RPC calls and avoid rate limits
      const lookupCount = Math.min(50, validAccounts.length);
      const ownerLookup = await this.resolveTokenAccountOwners(
        connection,
        validAccounts.slice(0, lookupCount).map(acc => acc.address)
      );

      const filteredAccounts: Array<{ owner: string; amountRaw: number }> = [];
      let pumpFunFilteredCount = 0;
      let pumpFunFilteredRaw = 0;
      let meteoraFilteredCount = 0;
      let meteoraFilteredRaw = 0;
      // Calculate pump.fun bonding curve addresses for this specific token
      const bondingCurveAddress = getPumpFunBondingCurveAddress(tokenAddress);
      const associatedBondingCurveAddress = getPumpFunAssociatedBondingCurveAddress(tokenAddress);
      // NEW: Calculate PumpSwap AMM pool address for graduated tokens
      const pumpSwapPoolAddress = getPumpSwapAmmPoolAddress(tokenAddress);
      
      let systemWalletsFiltered = 0;
      let systemWalletsFilteredRaw = 0;
      let isPreMigration = false;

      for (const acc of validAccounts) {
        const amountRaw = Number(acc.amount);
        const ownerAddress = ownerLookup.get(acc.address.toBase58()) ?? acc.address.toBase58();

        // Filter pump.fun bonding curve addresses (both main and associated)
        if ((bondingCurveAddress && ownerAddress === bondingCurveAddress) || (associatedBondingCurveAddress && ownerAddress === associatedBondingCurveAddress)) {
          console.log(`[HolderAnalysis] Filtered bonding curve holder: ${ownerAddress.slice(0, 8)}... (${amountRaw / 1e9} tokens)`);
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          isPreMigration = true;
          continue;
        }

        // NEW: Filter PumpSwap AMM pool address (graduated tokens - CRITICAL)
        if (pumpSwapPoolAddress && ownerAddress === pumpSwapPoolAddress) {
          console.log(`[HolderAnalysis] Filtered PumpSwap AMM pool: ${ownerAddress.slice(0, 8)}... (${amountRaw / 1e9} tokens)`);
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          continue;
        }

        if (isPumpFunAmm(ownerAddress)) {
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          continue;
        }

        if (isMeteoraAmm(ownerAddress)) {
          meteoraFilteredCount += 1;
          meteoraFilteredRaw += amountRaw;
          continue;
        }

        if (isSystemWallet(ownerAddress)) {
          systemWalletsFiltered += 1;
          systemWalletsFilteredRaw += amountRaw;
          if (isPumpFunBondingCurve(ownerAddress)) isPreMigration = true;
          continue;
        }

        // Auto-detect DEX program-derived accounts (vaults/routers) and whitelist them
        const isDexProgram = await isDexProgramAccount(connection, ownerAddress).catch(() => false);
        if (isDexProgram) {
          systemWalletsFiltered += 1;
          systemWalletsFilteredRaw += amountRaw;
          console.log(`[HolderAnalysis] Auto-whitelisted DEX program account: ${ownerAddress.slice(0, 8)}...`);
          continue;
        }

        filteredAccounts.push({ owner: ownerAddress, amountRaw });
      }

      const effectiveSupplyRaw = Math.max(totalSupplyRaw - pumpFunFilteredRaw - meteoraFilteredRaw - systemWalletsFilteredRaw, 1);
      const pumpFunFilteredPercent = totalSupplyRaw > 0 ? (pumpFunFilteredRaw / totalSupplyRaw) * 100 : 0;
      const meteoraFilteredPercent = totalSupplyRaw > 0 ? (meteoraFilteredRaw / totalSupplyRaw) * 100 : 0;

      const top20: HolderDetail[] = filteredAccounts.slice(0, 20).map(({ owner, amountRaw }) => {
        const balance = amountRaw / Math.pow(10, decimals);
        const percentage = (amountRaw / effectiveSupplyRaw) * 100;
        const labeled = this.labelWallet(owner, percentage);
        return {
          address: owner,
          balance,
          percentage,
          uiAmount: balance,
          label: labeled.label,
          isExchange: labeled.isExchange,
          isLP: labeled.isLP,
          isCreator: labeled.isCreator,
          isLargeHolder: labeled.isLargeHolder,
        };
      });

      // Calculate top 10 concentration as percentage of TOTAL supply (not effective supply)
      const top10TotalSupply = top20.slice(0, 10).reduce((sum, h) => {
        const holderEntry = filteredAccounts.find(e => e.owner === h.address);
        if (holderEntry) {
          return sum + holderEntry.amountRaw;
        }
        return sum;
      }, 0);
      const top10Concentration = totalSupplyRaw > 0 
        ? (top10TotalSupply / totalSupplyRaw) * 100 
        : 0;
      
      const exchangeHolders = top20.filter(h => h.isExchange);
      const lpHolders = top20.filter(h => h.isLP);

      // Identify large holders (>10% non-exchange holders - potential team wallets)
      const largeHolders = top20.filter(h => h.isLargeHolder && !h.isExchange);

      // Count total unique holders (including filtered ones)
      // For Helius method, we need to count all accounts including filtered
      const totalUniqueHolders = new Set([
        ...filteredAccounts.map(a => a.owner),
        ...Array.from({ length: pumpFunFilteredCount + meteoraFilteredCount + systemWalletsFiltered }, (_, i) => `filtered_${i}`)
      ]).size;
      
      // Try to get actual holder count if available, otherwise use estimate
      const actualHolderCount = totalUniqueHolders > filteredAccounts.length 
        ? totalUniqueHolders 
        : filteredAccounts.length + pumpFunFilteredCount + meteoraFilteredCount + systemWalletsFiltered;

      return {
        tokenAddress,
        holderCount: actualHolderCount, // Total holders including filtered ones
        holderCountIsEstimate: false, // Helius gives accurate count
        top20Holders: top20,
        topHolderConcentration: top10Concentration, // Percentage of total supply held by top 10
        exchangeHolderCount: exchangeHolders.length,
        exchangeSupplyPercent: exchangeHolders.reduce((sum, h) => sum + h.percentage, 0),
        lpSupplyPercent: lpHolders.reduce((sum, h) => sum + h.percentage, 0),
        pumpFunFilteredCount,
        pumpFunFilteredPercent,
        meteoraFilteredCount,
        meteoraFilteredPercent,
        systemWalletsFiltered,
        isPreMigration,
        source: 'helius',
        cachedAt: Date.now(),
      };
    } catch (error) {
      console.error('[HolderAnalysis] Helius fetch failed:', error);
      return null;
    }
    END OF DISABLED CODE */
  }

  /**
   * Fallback: Basic RPC using getTokenLargestAccounts
   * WARNING: This only returns top 20 holders and cannot provide total holder count
   */
  private async fetchFromRPC(tokenAddress: string): Promise<HolderAnalysisResult> {
    try {
      const connection = rpcBalancer.getConnection();
      const mintPubkey = new PublicKey(tokenAddress);

      const mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_PROGRAM_ID)
        .catch(() => getMint(connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID));

      // Retry logic for getTokenLargestAccounts with rate limit handling
      let largestAccounts;
      let retries = 0;
      const maxRetries = 2; // Reduced retries to fail faster
      
      while (retries <= maxRetries) {
        try {
          largestAccounts = await connection.getTokenLargestAccounts(mintPubkey, 'confirmed');
          break; // Success, exit retry loop
        } catch (error: any) {
          if (error.message?.includes('429') && retries < maxRetries) {
            retries++;
            const delay = Math.min(1000 * retries, 2000); // Cap at 2 seconds
            console.log(`[HolderAnalysis] Rate limited, retry ${retries}/${maxRetries} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error; // Give up after max retries or non-429 error
          }
        }
      }
      const validAccounts = largestAccounts.value.filter(acc => Number(acc.amount) > 0);

      const totalSupplyRaw = Number(mintInfo.supply);
      const decimals = mintInfo.decimals;
      // Reduced from 200 to 50 to minimize RPC calls and avoid rate limits
      const lookupCount = Math.min(50, validAccounts.length);
      const ownerLookup = await this.resolveTokenAccountOwners(
        connection,
        validAccounts.slice(0, lookupCount).map(acc => acc.address)
      );

      // Calculate pump.fun bonding curve addresses for this specific token
      const bondingCurveAddress = getPumpFunBondingCurveAddress(tokenAddress);
      const associatedBondingCurveAddress = getPumpFunAssociatedBondingCurveAddress(tokenAddress);
      // NEW: Calculate PumpSwap AMM pool address for graduated tokens
      const pumpSwapPoolAddress = getPumpSwapAmmPoolAddress(tokenAddress);

      const filteredAccounts: Array<{ owner: string; amountRaw: number }> = [];
      let pumpFunFilteredCount = 0;
      let pumpFunFilteredRaw = 0;
      let meteoraFilteredCount = 0;
      let meteoraFilteredRaw = 0;

      for (const acc of validAccounts) {
        const amountRaw = Number(acc.amount);
        const ownerAddress = ownerLookup.get(acc.address.toBase58()) ?? acc.address.toBase58();

        // Filter pump.fun bonding curve addresses (both main and associated)
        if ((bondingCurveAddress && ownerAddress === bondingCurveAddress) || (associatedBondingCurveAddress && ownerAddress === associatedBondingCurveAddress)) {
          console.log(`[HolderAnalysis] ✅ Filtered bonding curve holder: ${ownerAddress.slice(0, 8)}... (${amountRaw / 1e9} tokens)`);
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          continue;
        }

        // NEW: Filter PumpSwap AMM pool address (graduated tokens - CRITICAL)
        if (pumpSwapPoolAddress && ownerAddress === pumpSwapPoolAddress) {
          console.log(`[HolderAnalysis] ✅ Filtered PumpSwap AMM pool: ${ownerAddress.slice(0, 8)}... (${amountRaw / 1e9} tokens)`);
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          continue;
        }

        // Check Pump.fun AMM (includes pattern matching for 5Nkn..., pAMM...)
        // CRITICAL: Check this BEFORE system wallets to catch all Pump.fun AMM variants
        if (isPumpFunAmm(ownerAddress)) {
          console.log(`[HolderAnalysis] ✅ Filtered Pump.fun/PumpSwap AMM: ${ownerAddress.slice(0, 8)}...${ownerAddress.slice(-8)} (${amountRaw / 1e9} tokens)`);
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          continue;
        }

        // Check system wallets (includes Pump.fun system wallets)
        if (isSystemWallet(ownerAddress)) {
          console.log(`[HolderAnalysis] ✅ Filtered system wallet: ${ownerAddress.slice(0, 8)}... (${getSystemWalletType(ownerAddress)})`);
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          continue;
        }

        if (isMeteoraAmm(ownerAddress)) {
          console.log(`[HolderAnalysis] ✅ Filtered Meteora AMM: ${ownerAddress.slice(0, 8)}...`);
          meteoraFilteredCount += 1;
          meteoraFilteredRaw += amountRaw;
          continue;
        }

        filteredAccounts.push({ owner: ownerAddress, amountRaw });
      }

      const effectiveSupplyRaw = Math.max(totalSupplyRaw - pumpFunFilteredRaw - meteoraFilteredRaw, 1);
      const pumpFunFilteredPercent = totalSupplyRaw > 0 ? (pumpFunFilteredRaw / totalSupplyRaw) * 100 : 0;
      const meteoraFilteredPercent = totalSupplyRaw > 0 ? (meteoraFilteredRaw / totalSupplyRaw) * 100 : 0;

      const top20: HolderDetail[] = filteredAccounts.slice(0, 20).map(({ owner, amountRaw }) => {
        const balance = amountRaw / Math.pow(10, decimals);
        const percentage = (amountRaw / effectiveSupplyRaw) * 100;
        const labeled = this.labelWallet(owner, percentage);
        return {
          address: owner,
          balance,
          percentage,
          uiAmount: balance,
          label: labeled.label,
          isExchange: labeled.isExchange,
          isLP: labeled.isLP,
          isCreator: labeled.isCreator,
          isLargeHolder: labeled.isLargeHolder,
        };
      });

      // Calculate top 10 concentration as percentage of TOTAL supply (not effective supply)
      // This shows what percentage of the total token supply is held by the top 10 wallets
      const top10TotalSupply = top20.slice(0, 10).reduce((sum, h) => {
        // Find the original amountRaw for this holder
        const holderEntry = filteredAccounts.find(e => e.owner === h.address);
        if (holderEntry) {
          return sum + holderEntry.amountRaw;
        }
        return sum;
      }, 0);
      const top10Concentration = totalSupplyRaw > 0 
        ? (top10TotalSupply / totalSupplyRaw) * 100 
        : 0;
      
      const exchangeHolders = top20.filter(h => h.isExchange);
      const lpHolders = top20.filter(h => h.isLP);

      // Identify large holders (>10% non-exchange holders - potential team wallets)
      const largeHolders = top20.filter(h => h.isLargeHolder && !h.isExchange);

      // Try MULTIPLE APIs to get actual holder count (not limited to top 20)
      let actualHolderCount = filteredAccounts.length;
      let holderCountIsEstimate = true; // Assume estimate until proven otherwise
      
      // API 1: Try Solscan API
      try {
        console.log(`[HolderAnalysis DEBUG - RPC Fallback] Trying Solscan API for holder count...`);
        const solscanResponse = await fetch(`https://api.solscan.io/v2/token/meta?address=${tokenAddress}`, {
          signal: AbortSignal.timeout(3000),
          headers: { 'Accept': 'application/json' }
        });
        
        if (solscanResponse.ok) {
          const solscanData = await solscanResponse.json();
          if (solscanData?.data?.holder && solscanData.data.holder > 0) {
            actualHolderCount = solscanData.data.holder;
            holderCountIsEstimate = false;
            console.log(`[HolderAnalysis DEBUG - RPC Fallback] ✅ Got holder count from Solscan: ${actualHolderCount}`);
          }
        }
      } catch (err) {
        console.log(`[HolderAnalysis DEBUG - RPC Fallback] Solscan API failed`);
      }

      // API 2: Try RugCheck API if Solscan failed
      if (holderCountIsEstimate) {
        try {
          console.log(`[HolderAnalysis DEBUG - RPC Fallback] Trying RugCheck API for holder count...`);
          const rugcheckResponse = await fetch(`https://api.rugcheck.xyz/v1/tokens/${tokenAddress}/report`, {
            signal: AbortSignal.timeout(3000),
            headers: { 'Accept': 'application/json' }
          });
          
          if (rugcheckResponse.ok) {
            const rugcheckData = await rugcheckResponse.json();
            // RugCheck provides topHolders array - if there are more than 20, we know there are at least that many
            if (rugcheckData?.topHolders && rugcheckData.topHolders.length > 0) {
              // Use holderCount if available, otherwise estimate from data
              if (rugcheckData.holderCount && rugcheckData.holderCount > 0) {
                actualHolderCount = rugcheckData.holderCount;
                holderCountIsEstimate = false;
                console.log(`[HolderAnalysis DEBUG - RPC Fallback] ✅ Got holder count from RugCheck: ${actualHolderCount}`);
              }
            }
          }
        } catch (err) {
          console.log(`[HolderAnalysis DEBUG - RPC Fallback] RugCheck API failed`);
        }
      }

      // API 3: Try Helius DAS API if others failed
      if (holderCountIsEstimate && process.env.HELIUS_API_KEY) {
        try {
          console.log(`[HolderAnalysis DEBUG - RPC Fallback] Trying Helius DAS API for holder count...`);
          const heliusResponse = await fetch(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, {
            method: 'POST',
            signal: AbortSignal.timeout(3000),
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 'holder-count',
              method: 'getAsset',
              params: { id: tokenAddress }
            })
          });
          
          if (heliusResponse.ok) {
            const heliusData = await heliusResponse.json();
            // Helius DAS might have token_info.supply_holders
            if (heliusData?.result?.token_info?.holder_count) {
              actualHolderCount = heliusData.result.token_info.holder_count;
              holderCountIsEstimate = false;
              console.log(`[HolderAnalysis DEBUG - RPC Fallback] ✅ Got holder count from Helius DAS: ${actualHolderCount}`);
            }
          }
        } catch (err) {
          console.log(`[HolderAnalysis DEBUG - RPC Fallback] Helius DAS API failed`);
        }
      }

      // API 4: Try GMGN API for holder count
      if (holderCountIsEstimate) {
        try {
          console.log(`[HolderAnalysis DEBUG - RPC Fallback] Trying GMGN API for holder count...`);
          const gmgnResponse = await fetch(`https://gmgn.ai/defi/quotation/v1/tokens/sol/${tokenAddress}`, {
            signal: AbortSignal.timeout(3000),
            headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
          });
          
          if (gmgnResponse.ok) {
            const gmgnData = await gmgnResponse.json();
            if (gmgnData?.data?.holder_count && gmgnData.data.holder_count > 0) {
              actualHolderCount = gmgnData.data.holder_count;
              holderCountIsEstimate = false;
              console.log(`[HolderAnalysis DEBUG - RPC Fallback] ✅ Got holder count from GMGN: ${actualHolderCount}`);
            }
          }
        } catch (err) {
          console.log(`[HolderAnalysis DEBUG - RPC Fallback] GMGN API failed`);
        }
      }

      // API 5: Try Birdeye API for holder count
      if (holderCountIsEstimate && process.env.BIRDEYE_API_KEY) {
        try {
          console.log(`[HolderAnalysis DEBUG - RPC Fallback] Trying Birdeye API for holder count...`);
          const birdeyeResponse = await fetch(`https://public-api.birdeye.so/defi/token_overview?address=${tokenAddress}`, {
            signal: AbortSignal.timeout(3000),
            headers: { 
              'Accept': 'application/json',
              'X-API-KEY': process.env.BIRDEYE_API_KEY
            }
          });
          
          if (birdeyeResponse.ok) {
            const birdeyeData = await birdeyeResponse.json();
            if (birdeyeData?.data?.holder && birdeyeData.data.holder > 0) {
              actualHolderCount = birdeyeData.data.holder;
              holderCountIsEstimate = false;
              console.log(`[HolderAnalysis DEBUG - RPC Fallback] ✅ Got holder count from Birdeye: ${actualHolderCount}`);
            }
          }
        } catch (err) {
          console.log(`[HolderAnalysis DEBUG - RPC Fallback] Birdeye API failed`);
        }
      }

      console.log(`[HolderAnalysis DEBUG - RPC Fallback] Final holder count: ${actualHolderCount} (estimate: ${holderCountIsEstimate})`);

      return {
        tokenAddress,
        holderCount: actualHolderCount, // Total holders (from API if available)
        holderCountIsEstimate, // True if we couldn't get accurate count
        top20Holders: top20,
        topHolderConcentration: top10Concentration, // Percentage of total supply held by top 10
        exchangeHolderCount: exchangeHolders.length,
        exchangeSupplyPercent: exchangeHolders.reduce((sum, h) => sum + h.percentage, 0),
        lpSupplyPercent: lpHolders.reduce((sum, h) => sum + h.percentage, 0),
        pumpFunFilteredCount,
        pumpFunFilteredPercent,
        meteoraFilteredCount,
        meteoraFilteredPercent,
        systemWalletsFiltered: 0, // Not tracked in RPC fallback (limited data)
        isPreMigration: false,
        largeHolders,
        source: 'rpc',
        cachedAt: Date.now(),
      };
    } catch (error) {
      console.error('[HolderAnalysis] RPC fallback failed:', error);
      
      // Return empty result as absolute last resort
      return {
        tokenAddress,
        holderCount: 0,
        holderCountIsEstimate: true,
        top20Holders: [],
        topHolderConcentration: 0,
        exchangeHolderCount: 0,
        exchangeSupplyPercent: 0,
        lpSupplyPercent: 0,
        pumpFunFilteredCount: 0,
        pumpFunFilteredPercent: 0,
        systemWalletsFiltered: 0,
        isPreMigration: false,
        largeHolders: [],
        source: 'rpc',
        cachedAt: Date.now(),
      };
    }
  }

  private async resolveTokenAccountOwners(
    connection: Connection,
    tokenAccounts: PublicKey[]
  ): Promise<Map<string, string>> {
    const owners = new Map<string, string>();
    if (!tokenAccounts.length) {
      return owners;
    }

    // OPTIMIZED: Process chunks in parallel for 3-5x speed improvement
    const chunkSize = 50;
    const chunks: PublicKey[][] = [];
    for (let i = 0; i < tokenAccounts.length; i += chunkSize) {
      chunks.push(tokenAccounts.slice(i, i + chunkSize));
    }

    // Fetch all chunks with reduced concurrency to avoid rate limits (max 3 concurrent)
    const maxConcurrent = 3; // Reduced from 10 to 3 to avoid 429 errors
    for (let i = 0; i < chunks.length; i += maxConcurrent) {
      const batchChunks = chunks.slice(i, i + maxConcurrent);
      
      // Add small delay between batches to respect rate limits
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const results = await Promise.all(
        batchChunks.map(chunk => 
          connection.getMultipleAccountsInfo(chunk, 'confirmed')
            .catch(err => {
              console.warn('[HolderAnalysis] Owner resolution error:', err.message);
              return [];
            })
        )
      );

      results.forEach((infos, batchIdx) => {
        const chunk = batchChunks[batchIdx];
        infos.forEach((info, idx) => {
          if (!info?.data) return;
          const data = info.data as Buffer;
          if (data.length < 64) return;
          const ownerBytes = data.subarray(32, 64);
          const ownerAddress = bs58.encode(ownerBytes);
          owners.set(chunk[idx].toBase58(), ownerAddress);
        });
      });
    }

    return owners;
  }

  /**
   * Label a wallet address based on known addresses
   * Returns label and categorization flags
   */
  private labelWallet(address: string, percentage: number): {
    label?: string;
    isExchange: boolean;
    isLP: boolean;
    isCreator: boolean;
    isLargeHolder: boolean;
  } {
    // CRITICAL: Check system wallets FIRST before any heuristics
    // This prevents Pump.fun AMM wallets from being mislabeled as "Creator/Dev"
    if (isSystemWallet(address)) {
      const walletType = getSystemWalletType(address);
      return {
        label: walletType,
        isExchange: false,
        isLP: true,
        isCreator: false,
        isLargeHolder: false, // System wallets are filtered out, can't be large holders
      };
    }

    if (isPumpFunAmm(address)) {
      return {
        label: '🚀 PUMP FUN AMM WALLET',
        isExchange: false,
        isLP: true,
        isCreator: false,
        isLargeHolder: false, // AMM wallets are filtered out, can't be large holders
      };
    }

    if (isMeteoraAmm(address)) {
      return {
        label: 'Meteora DLMM Pool',
        isExchange: false,
        isLP: true,
        isCreator: false,
        isLargeHolder: false, // AMM wallets are filtered out, can't be large holders
      };
    }

    // Check exchanges (pre-listed + auto-detected)
    if (isKnownOrAutoExchange(address)) {
      const exchangeLabel = getExchangeLabel(address) || 'Exchange';
      return {
        label: exchangeLabel,
        isExchange: true,
        isLP: false,
        isCreator: false,
        isLargeHolder: false, // Exchange wallets are not flagged as team wallets
      };
    }

    // Check known addresses
    const knownAddressInfo = getKnownAddressInfo(address);
    if (knownAddressInfo) {
      const label = knownAddressInfo.label;
      return {
        label,
        isExchange: false,
        isLP: label.toLowerCase().includes('pool') || label.toLowerCase().includes('lp'),
        isCreator: label.toLowerCase().includes('creator') || label.toLowerCase().includes('deployer'),
        isLargeHolder: false, // Known addresses are typically not large holders
      };
    }

    // Heuristic: Very high percentage might be LP or creator
    // NOTE: These heuristics run AFTER all whitelist checks above
    if (percentage > 90) {
      return {
        label: 'Likely LP Pool',
        isExchange: false,
        isLP: true,
        isCreator: false,
        isLargeHolder: false, // LP pools are not flagged as team wallets
      };
    }

    if (percentage > 50) {
      return {
        label: 'Likely Creator/Dev',
        isExchange: false,
        isLP: false,
        isCreator: true,
        isLargeHolder: true, // Large holders (>50%) are potential team wallets
      };
    }

    // Check for large holders (>10%) - potential team wallets
    const isLargeHolder = percentage > 10;

    return {
      isExchange: false,
      isLP: false,
      isCreator: false,
      isLargeHolder,
    };
  }

  /**
   * Get a quick holder summary (used for alerts and quick scans)
   */
  async getQuickSummary(tokenAddress: string): Promise<{
    holderCount: number;
    topHolderConcentration: number;
    hasExchanges: boolean;
  }> {
    try {
      const analysis = await this.analyzeHolders(tokenAddress);
      return {
        holderCount: analysis.holderCount,
        topHolderConcentration: analysis.topHolderConcentration,
        hasExchanges: analysis.exchangeHolderCount > 0,
      };
    } catch (error) {
      console.error('[HolderAnalysis] Quick summary failed:', error);
      return {
        holderCount: 0,
        topHolderConcentration: 0,
        hasExchanges: false,
      };
    }
  }
}

// Export singleton instance
export const holderAnalysis = new HolderAnalysisService();

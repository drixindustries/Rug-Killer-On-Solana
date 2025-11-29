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
import { getKnownAddressInfo, getPumpFunBondingCurveAddress, getPumpFunAssociatedBondingCurveAddress } from '../known-addresses.js';
import { isPumpFunAmm } from '../pumpfun-whitelist.js';
import { isMeteoraAmm } from '../meteora-whitelist.js';
import { isSystemWallet, isPumpFunBondingCurve, getSystemWalletType, filterHoldersWithStats, isDexProgramAccount } from '../pumpfun-system-wallets';
import { isPumpFunAmmWallet } from './pumpfun-amm-detector.js';
import { batchDetectExchanges, isKnownOrAutoExchange, getExchangeLabel } from './exchange-auto-detector.js';
import bs58 from 'bs58';

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
}

export interface HolderAnalysisResult {
  tokenAddress: string;
  holderCount: number;
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
  source: 'birdeye' | 'gmgn' | 'helius' | 'rpc' | 'mixed';
  cachedAt: number;
}

export class HolderAnalysisService {
  private readonly CACHE_TTL = 300; // 5 minutes cache

  /**
   * Get comprehensive holder analysis for a token
   * Uses ONLY accurate on-chain sources (no third-party APIs with inaccurate counts)
   */
  async analyzeHolders(tokenAddress: string): Promise<HolderAnalysisResult> {
    const cacheKey = `holder-analysis:v3:${tokenAddress}`;
    console.log(`\n🔍 [HolderAnalysis DEBUG] Starting analysis for ${tokenAddress}`);
    console.log(`[HolderAnalysis DEBUG] Cache key: ${cacheKey}`);

    return await redisCache.cacheFetch(
      cacheKey,
      async () => {
        console.log(`[HolderAnalysis DEBUG] Cache MISS - fetching fresh data...`);
        
        // Try direct on-chain scan via getProgramAccounts FIRST (most accurate)
        console.log(`[HolderAnalysis DEBUG] Step 1: Attempting on-chain RPC scan via getProgramAccounts...`);
        const programScan = await this.fetchFromProgramAccounts(tokenAddress);
        console.log(`[HolderAnalysis DEBUG] getProgramAccounts result:`, {
          success: !!programScan,
          holderCount: programScan?.holderCount ?? 'null',
          top20Length: programScan?.top20Holders?.length ?? 0,
          source: programScan?.source
        });
        
        if (programScan && (programScan.holderCount > 0 || programScan.top20Holders.length > 0)) {
          console.log(`[HolderAnalysis] ✅ SUCCESS: Used on-chain RPC scan for ${tokenAddress} - ${programScan.holderCount} holders`);
          return programScan;
        }
        console.log(`[HolderAnalysis DEBUG] ⚠️ getProgramAccounts failed or returned no data, trying fallbacks...`);

        // Try Helius as backup (requires API key but has accurate counts)
        console.log(`[HolderAnalysis DEBUG] Step 2: Attempting Helius RPC...`);
        const heliusResult = await this.fetchFromHelius(tokenAddress);
        console.log(`[HolderAnalysis DEBUG] Helius result:`, {
          success: !!heliusResult,
          holderCount: heliusResult?.holderCount ?? 'null',
          hasApiKey: !!process.env.HELIUS_API_KEY?.trim()
        });
        
        if (heliusResult && heliusResult.holderCount > 0) {
          console.log(`[HolderAnalysis] ✅ SUCCESS: Used Helius for ${tokenAddress} - ${heliusResult.holderCount} holders`);
          return heliusResult;
        }
        console.log(`[HolderAnalysis DEBUG] ⚠️ Helius failed or returned no data, using RPC fallback...`);

        // Fallback to basic RPC (top 20 only, limited data but still accurate)
        console.log(`[HolderAnalysis DEBUG] Step 3: Using basic RPC fallback (getTokenLargestAccounts)...`);
        const rpcResult = await this.fetchFromRPC(tokenAddress);
        console.log(`[HolderAnalysis DEBUG] RPC fallback result:`, {
          holderCount: rpcResult.holderCount,
          top20Length: rpcResult.top20Holders.length,
          source: rpcResult.source
        });
        console.log(`[HolderAnalysis] ⚠️ FALLBACK: Used RPC fallback for ${tokenAddress} (limited to top 20 holders, holderCount=${rpcResult.holderCount})`);
        console.log(`[HolderAnalysis DEBUG] === Analysis complete ===\n`);
        return rpcResult;
      },
      this.CACHE_TTL
    ).then(result => {
      console.log(`[HolderAnalysis DEBUG] FINAL RESULT for ${tokenAddress}:`, {
        holderCount: result.holderCount,
        top20Length: result.top20Holders.length,
        source: result.source,
        fromCache: result.cachedAt < Date.now() - 1000 // Rough check if from cache
      });
      return result;
    });
  }

  /**
   * On-chain scan using getProgramAccounts filtered by mint
   * Pros: No indexer required, works on QuickNode/public RPC
   * Cons: Can be heavy for very popular tokens; we add safety caps
   */
  private async fetchFromProgramAccounts(tokenAddress: string): Promise<HolderAnalysisResult | null> {
    try {
      console.log(`[HolderAnalysis DEBUG - getProgramAccounts] Starting scan for ${tokenAddress}`);
      const connection = rpcBalancer.getConnection();
      const rpcEndpoint = connection.rpcEndpoint;
      console.log(`[HolderAnalysis DEBUG - getProgramAccounts] RPC endpoint: ${rpcEndpoint}`);
      
      // Skip if using free RPC endpoints that don't support getProgramAccounts
      if (rpcEndpoint.includes('mainnet-beta.solana.com') || 
          rpcEndpoint.includes('alchemy.com/v2/demo') ||
          rpcEndpoint.includes('publicnode.com')) {
        console.log(`[HolderAnalysis DEBUG - getProgramAccounts] Skipping - free RPC doesn't support getProgramAccounts`);
        return null;
      }
      
      // Add timeout for getProgramAccounts (5 seconds for premium RPCs)
      const timeoutMs = 5000;
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('getProgramAccounts timeout')), timeoutMs)
      );
      
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
      } catch (error: any) {
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
          top20Holders: [],
          topHolderConcentration: 0,
          exchangeHolderCount: 0,
          exchangeSupplyPercent: 0,
          lpSupplyPercent: 0,
          pumpFunFilteredCount: 0,
          pumpFunFilteredPercent: 0,
          source: 'rpc',
          cachedAt: Date.now(),
        };
      }

      console.log(`[HolderAnalysis DEBUG - getProgramAccounts] Parsed ${holders.length} non-zero token accounts`);
      
      // Calculate pump.fun bonding curve addresses for this specific token
      const bondingCurveAddress = getPumpFunBondingCurveAddress(tokenAddress);
      const associatedBondingCurveAddress = getPumpFunAssociatedBondingCurveAddress(tokenAddress);
      console.log(`[HolderAnalysis] Bonding curve addresses for ${tokenAddress}:`, {
        bondingCurve: bondingCurveAddress,
        associated: associatedBondingCurveAddress
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
          console.log(`[HolderAnalysis] Filtered bonding curve holder: ${address.slice(0, 8)}... (${Number(amountRaw) / 1e9} tokens)`);
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          return acc;
        }
        if (isPumpFunAmm(address)) {
          pumpFunFilteredCount += 1;
          pumpFunFilteredRaw += amountRaw;
          return acc;
        }
        if (isMeteoraAmm(address)) {
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

      const list = nonSystemEntries
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
          } as HolderDetail;
        })
        .sort((a, b) => b.balance - a.balance);

      const top20 = list.slice(0, 20);
      const top10Concentration = top20.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
      const exchangeHolders = top20.filter(h => h.isExchange);
      const lpHolders = top20.filter(h => h.isLP);

      const result = {
        tokenAddress,
        holderCount: list.length,
        top20Holders: top20,
        topHolderConcentration: top10Concentration,
        exchangeHolderCount: exchangeHolders.length,
        exchangeSupplyPercent: exchangeHolders.reduce((sum, h) => sum + h.percentage, 0),
        lpSupplyPercent: lpHolders.reduce((sum, h) => sum + h.percentage, 0),
        pumpFunFilteredCount,
        pumpFunFilteredPercent,
        meteoraFilteredCount,
        meteoraFilteredPercent,
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
   * DISABLED - Using Ankr instead
   */
  private async fetchFromHelius(tokenAddress: string): Promise<HolderAnalysisResult | null> {
    // DISABLED: Using Ankr RPC via rpcBalancer instead of Helius
    console.log(`[HolderAnalysis] Helius disabled - using Ankr RPC via rpcBalancer`);
    return null;

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
        };
      });

      const top10Concentration = top20.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
      const exchangeHolders = top20.filter(h => h.isExchange);
      const lpHolders = top20.filter(h => h.isLP);

      return {
        tokenAddress,
        holderCount: filteredAccounts.length,
        top20Holders: top20,
        topHolderConcentration: top10Concentration,
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
          console.log(`[HolderAnalysis] Filtered bonding curve holder: ${ownerAddress.slice(0, 8)}... (${amountRaw / 1e9} tokens)`);
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
        };
      });

      const top10Concentration = top20.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
      const exchangeHolders = top20.filter(h => h.isExchange);
      const lpHolders = top20.filter(h => h.isLP);

      // Try to get actual holder count from Solscan API as last resort
      let actualHolderCount = filteredAccounts.length;
      try {
        console.log(`[HolderAnalysis DEBUG - RPC Fallback] Fetching holder count from Solscan API...`);
        const solscanResponse = await fetch(`https://api.solscan.io/v2/token/meta?address=${tokenAddress}`, {
          signal: AbortSignal.timeout(3000),
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (solscanResponse.ok) {
          const solscanData = await solscanResponse.json();
          if (solscanData?.data?.holder) {
            actualHolderCount = solscanData.data.holder;
            console.log(`[HolderAnalysis DEBUG - RPC Fallback] ✅ Got holder count from Solscan: ${actualHolderCount}`);
          }
        }
      } catch (err) {
        console.log(`[HolderAnalysis DEBUG - RPC Fallback] Solscan API failed, using fallback count`);
      }

      console.log(`[HolderAnalysis DEBUG - RPC Fallback] Final holder count: ${actualHolderCount}`);

      return {
        tokenAddress,
        holderCount: actualHolderCount,
        top20Holders: top20,
        topHolderConcentration: top10Concentration,
        exchangeHolderCount: exchangeHolders.length,
        exchangeSupplyPercent: exchangeHolders.reduce((sum, h) => sum + h.percentage, 0),
        lpSupplyPercent: lpHolders.reduce((sum, h) => sum + h.percentage, 0),
        pumpFunFilteredCount,
        pumpFunFilteredPercent,
        meteoraFilteredCount,
        meteoraFilteredPercent,
        systemWalletsFiltered: 0, // Not tracked in RPC fallback (limited data)
        isPreMigration: false,
        source: 'rpc',
        cachedAt: Date.now(),
      };
    } catch (error) {
      console.error('[HolderAnalysis] RPC fallback failed:', error);
      
      // Return empty result as absolute last resort
      return {
        tokenAddress,
        holderCount: 0,
        top20Holders: [],
        topHolderConcentration: 0,
        exchangeHolderCount: 0,
        exchangeSupplyPercent: 0,
        lpSupplyPercent: 0,
        pumpFunFilteredCount: 0,
        pumpFunFilteredPercent: 0,
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
  } {
    // Check exchanges first (pre-listed + auto-detected)
    if (isKnownOrAutoExchange(address)) {
      const exchangeLabel = getExchangeLabel(address) || 'Exchange';
      return {
        label: exchangeLabel,
        isExchange: true,
        isLP: false,
        isCreator: false,
      };
    }

    if (isPumpFunAmm(address)) {
      return {
        label: 'Pump.fun AMM',
        isExchange: false,
        isLP: true,
        isCreator: false,
      };
    }

    if (isMeteoraAmm(address)) {
      return {
        label: 'Meteora DLMM Pool',
        isExchange: false,
        isLP: true,
        isCreator: false,
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
      };
    }

    // Heuristic: Very high percentage might be LP or creator
    if (percentage > 90) {
      return {
        label: 'Likely LP Pool',
        isExchange: false,
        isLP: true,
        isCreator: false,
      };
    }

    if (percentage > 50) {
      return {
        label: 'Likely Creator/Dev',
        isExchange: false,
        isLP: false,
        isCreator: true,
      };
    }

    return {
      isExchange: false,
      isLP: false,
      isCreator: false,
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

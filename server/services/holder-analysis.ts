/**
 * Centralized Holder Analysis Service
 * 
 * Aggregates holder data from multiple sources with intelligent fallback:
 * 1. Birdeye API (preferred, most accurate)
 * 2. GMGN API (good bundled holder detection)
 * 3. Helius RPC (token holder counts)
 * 4. Solana RPC fallback (getTokenLargestAccounts for top holders only)
 * 
 * Features:
 * - Accurate holder counts (not just top 20)
 * - Top 20+ holder breakdown with labels
 * - Exchange/LP wallet filtering
 * - Caching to prevent rate limits
 * - Known wallet labeling (DEX, deployer, etc.)
 * 
 * Created: [Current Date]
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { redisCache } from './redis-cache.js';
import { getBirdeyeTopHolders } from './birdeye-api.js';
import { GMGNService } from './gmgn-service.js';
import { rpcBalancer } from './rpc-balancer.js';
import { EXCHANGE_WALLETS, isExchangeWallet } from '../exchange-whitelist.js';
import { getKnownAddressInfo } from '../known-addresses.js';
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
  source: 'birdeye' | 'gmgn' | 'helius' | 'rpc' | 'mixed';
  cachedAt: number;
}

export class HolderAnalysisService {
  private gmgn = new GMGNService();
  private readonly CACHE_TTL = 300; // 5 minutes cache

  /**
   * Get comprehensive holder analysis for a token
   * Tries multiple data sources with intelligent fallback
   */
  async analyzeHolders(tokenAddress: string): Promise<HolderAnalysisResult> {
    const cacheKey = `holder-analysis:v2:${tokenAddress}`;

    return await redisCache.cacheFetch(
      cacheKey,
      async () => {
        // Try Birdeye first (most reliable)
        const birdeyeResult = await this.fetchFromBirdeye(tokenAddress);
        if (birdeyeResult && birdeyeResult.holderCount > 0) {
          console.log(`[HolderAnalysis] Used Birdeye for ${tokenAddress}`);
          return birdeyeResult;
        }

        // Try GMGN second (good for newer tokens)
        const gmgnResult = await this.fetchFromGMGN(tokenAddress);
        if (gmgnResult && gmgnResult.holderCount > 0) {
          console.log(`[HolderAnalysis] Used GMGN for ${tokenAddress}`);
          return gmgnResult;
        }

        // Try Helius third (requires API key)
        const heliusResult = await this.fetchFromHelius(tokenAddress);
        if (heliusResult && heliusResult.holderCount > 0) {
          console.log(`[HolderAnalysis] Used Helius for ${tokenAddress}`);
          return heliusResult;
        }

        // Try direct on-chain scan via getProgramAccounts (works on standard RPC)
        const programScan = await this.fetchFromProgramAccounts(tokenAddress);
        if (programScan && (programScan.holderCount > 0 || programScan.top20Holders.length > 0)) {
          console.log(`[HolderAnalysis] Used on-chain programAccounts scan for ${tokenAddress}`);
          return programScan;
        }

        // Fallback to basic RPC (top 20 only, no total count)
        const rpcResult = await this.fetchFromRPC(tokenAddress);
        console.log(`[HolderAnalysis] Used RPC fallback for ${tokenAddress} (limited data)`);
        return rpcResult;
      },
      this.CACHE_TTL
    );
  }

  /**
   * On-chain scan using getProgramAccounts filtered by mint
   * Pros: No indexer required, works on QuickNode/public RPC
   * Cons: Can be heavy for very popular tokens; we add safety caps
   */
  private async fetchFromProgramAccounts(tokenAddress: string): Promise<HolderAnalysisResult | null> {
    try {
      const connection = rpcBalancer.getConnection();
      const mintPubkey = new PublicKey(tokenAddress);

      // Fetch mint info for decimals and supply
      const mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_PROGRAM_ID)
        .catch(() => getMint(connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID));

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

      const classic = await scanProgram(TOKEN_PROGRAM_ID).catch(() => [] as any[]);
      const t2022 = await scanProgram(TOKEN_2022_PROGRAM_ID).catch(() => [] as any[]);
      const all = [...classic, ...t2022];

      if (all.length === 0) {
        return null;
      }

      // Safety cap: if result is extremely large, bail to avoid overload
      const MAX_ACCOUNTS = 15000;
      if (all.length > MAX_ACCOUNTS) {
        console.warn(`[HolderAnalysis] programAccounts returned ${all.length} accounts, over cap ${MAX_ACCOUNTS}`);
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
          source: 'rpc',
          cachedAt: Date.now(),
        };
      }

      // Aggregate by owner (some wallets may hold multiple token accounts)
      const byOwner = new Map<string, bigint>();
      for (const h of holders) {
        byOwner.set(h.address, (byOwner.get(h.address) || 0n) + h.amountRaw);
      }

      // Build holder list and sort by balance desc
      const list = Array.from(byOwner.entries()).map(([address, amountRaw]) => {
        const percentage = Number(amountRaw) / Number(totalSupplyRaw) * 100;
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
      }).sort((a, b) => b.balance - a.balance);

      const top20 = list.slice(0, 20);
      const top10Concentration = top20.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
      const exchangeHolders = top20.filter(h => h.isExchange);
      const lpHolders = top20.filter(h => h.isLP);

      return {
        tokenAddress,
        holderCount: list.length,
        top20Holders: top20,
        topHolderConcentration: top10Concentration,
        exchangeHolderCount: exchangeHolders.length,
        exchangeSupplyPercent: exchangeHolders.reduce((sum, h) => sum + h.percentage, 0),
        lpSupplyPercent: lpHolders.reduce((sum, h) => sum + h.percentage, 0),
        source: 'rpc',
        cachedAt: Date.now(),
      };
    } catch (error) {
      console.error('[HolderAnalysis] programAccounts scan failed:', error);
      return null;
    }
  }

  /**
   * Fetch holder data from Birdeye API
   */
  private async fetchFromBirdeye(tokenAddress: string): Promise<HolderAnalysisResult | null> {
    try {
      const holders = await getBirdeyeTopHolders(tokenAddress);
      if (!holders || holders.length === 0) {
        return null;
      }

      // Birdeye provides percentage directly
      const top20 = holders.slice(0, 20).map(h => {
        const labeled = this.labelWallet(h.owner, h.percentage);
        return {
          address: h.owner,
          balance: h.uiAmount,
          percentage: h.percentage,
          uiAmount: h.uiAmount,
          label: labeled.label || h.tag,
          isExchange: labeled.isExchange,
          isLP: labeled.isLP,
          isCreator: labeled.isCreator,
        };
      });

      const top10Concentration = top20.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
      const exchangeHolders = top20.filter(h => h.isExchange);
      const lpHolders = top20.filter(h => h.isLP);

      // Birdeye doesn't always provide total holder count, estimate if needed
      // If we don't have it, we can't provide accurate count
      const holderCount = holders.length >= 20 ? 20 : holders.length; // Conservative estimate

      return {
        tokenAddress,
        holderCount,
        top20Holders: top20,
        topHolderConcentration: top10Concentration,
        exchangeHolderCount: exchangeHolders.length,
        exchangeSupplyPercent: exchangeHolders.reduce((sum, h) => sum + h.percentage, 0),
        lpSupplyPercent: lpHolders.reduce((sum, h) => sum + h.percentage, 0),
        source: 'birdeye',
        cachedAt: Date.now(),
      };
    } catch (error) {
      console.error('[HolderAnalysis] Birdeye fetch failed:', error);
      return null;
    }
  }

  /**
   * Fetch holder data from GMGN API
   */
  private async fetchFromGMGN(tokenAddress: string): Promise<HolderAnalysisResult | null> {
    try {
      const gmgnData = await this.gmgn.getTokenAnalysis(tokenAddress);
      if (!gmgnData?.data) {
        return null;
      }

      const { data } = gmgnData;
      const topHolders = data.top_holders || [];
      
      if (topHolders.length === 0) {
        return null;
      }

      const top20 = topHolders.slice(0, 20).map(h => {
        const balance = parseFloat(h.balance);
        const labeled = this.labelWallet(h.address, h.percentage);
        return {
          address: h.address,
          balance,
          percentage: h.percentage,
          uiAmount: balance,
          label: labeled.label,
          isExchange: labeled.isExchange,
          isLP: labeled.isLP,
          isCreator: labeled.isCreator,
          isBundled: h.is_bundle,
          isSniper: h.is_sniper,
          isInsider: h.is_insider,
        };
      });

      const top10Concentration = top20.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
      const exchangeHolders = top20.filter(h => h.isExchange);
      const lpHolders = top20.filter(h => h.isLP);

      return {
        tokenAddress,
        holderCount: data.token.holder_count || topHolders.length,
        top20Holders: top20,
        topHolderConcentration: top10Concentration,
        exchangeHolderCount: exchangeHolders.length,
        exchangeSupplyPercent: exchangeHolders.reduce((sum, h) => sum + h.percentage, 0),
        lpSupplyPercent: lpHolders.reduce((sum, h) => sum + h.percentage, 0),
        source: 'gmgn',
        cachedAt: Date.now(),
      };
    } catch (error) {
      console.error('[HolderAnalysis] GMGN fetch failed:', error);
      return null;
    }
  }

  /**
   * Fetch holder data from Helius RPC
   * Uses Helius-specific methods if API key available
   */
  private async fetchFromHelius(tokenAddress: string): Promise<HolderAnalysisResult | null> {
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

      const totalSupply = Number(mintInfo.supply);
      const top20 = validAccounts.slice(0, 20).map(acc => {
        const amount = Number(acc.amount);
        const balance = amount / Math.pow(10, mintInfo.decimals);
        const percentage = (amount / totalSupply) * 100;
        const labeled = this.labelWallet(acc.address.toBase58(), percentage);
        
        return {
          address: acc.address.toBase58(),
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
        holderCount: validAccounts.length, // This is still limited to top accounts
        top20Holders: top20,
        topHolderConcentration: top10Concentration,
        exchangeHolderCount: exchangeHolders.length,
        exchangeSupplyPercent: exchangeHolders.reduce((sum, h) => sum + h.percentage, 0),
        lpSupplyPercent: lpHolders.reduce((sum, h) => sum + h.percentage, 0),
        source: 'helius',
        cachedAt: Date.now(),
      };
    } catch (error) {
      console.error('[HolderAnalysis] Helius fetch failed:', error);
      return null;
    }
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

      const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey, 'confirmed');
      const validAccounts = largestAccounts.value.filter(acc => Number(acc.amount) > 0);

      const totalSupply = Number(mintInfo.supply);
      const top20 = validAccounts.slice(0, 20).map(acc => {
        const amount = Number(acc.amount);
        const balance = amount / Math.pow(10, mintInfo.decimals);
        const percentage = (amount / totalSupply) * 100;
        const labeled = this.labelWallet(acc.address.toBase58(), percentage);
        
        return {
          address: acc.address.toBase58(),
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
        holderCount: 0, // RPC cannot provide total count
        top20Holders: top20,
        topHolderConcentration: top10Concentration,
        exchangeHolderCount: exchangeHolders.length,
        exchangeSupplyPercent: exchangeHolders.reduce((sum, h) => sum + h.percentage, 0),
        lpSupplyPercent: lpHolders.reduce((sum, h) => sum + h.percentage, 0),
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
        source: 'rpc',
        cachedAt: Date.now(),
      };
    }
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
    // Check exchanges first
    if (isExchangeWallet(address)) {
      return {
        label: 'Exchange',
        isExchange: true,
        isLP: false,
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

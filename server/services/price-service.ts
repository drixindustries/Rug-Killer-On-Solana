/**
 * Price Service
 * Fetches and normalizes token prices from DexScreener and Jupiter
 */

import axios from 'axios';
import { priceCache, CachedPrice } from './price-cache';

interface DexScreenerPairData {
  priceUsd?: string;
  priceNative?: string;
  fdv?: number;
  marketCap?: number;
  liquidity?: {
    usd?: number;
  };
  volume?: {
    h24?: number;
  };
  priceChange?: {
    h24?: number;
  };
}

export class PriceService {
  /**
   * Get price for a single token (uses cache if available)
   */
  async getPrice(tokenAddress: string, options: { useCache?: boolean } = {}): Promise<CachedPrice | null> {
    const { useCache = true } = options;

    // Try cache first
    if (useCache) {
      const cached = priceCache.get(tokenAddress);
      if (cached) {
        return cached;
      }
    }

    // Fetch from APIs
    const price = await this.fetchPrice(tokenAddress);
    
    if (price) {
      priceCache.set(tokenAddress, price);
      return priceCache.get(tokenAddress)!;
    }

    return null;
  }

  /**
   * Get prices for multiple tokens (batch operation with cache)
   */
  async getPrices(tokenAddresses: string[], options: { useCache?: boolean } = {}): Promise<Map<string, CachedPrice>> {
    const { useCache = true } = options;
    const results = new Map<string, CachedPrice>();
    const toFetch: string[] = [];

    // Check cache first
    if (useCache) {
      const cached = priceCache.getMultiple(tokenAddresses);
      for (const [address, price] of Array.from(cached.entries())) {
        results.set(address, price);
      }
    }

    // Determine which prices need fetching
    for (const address of tokenAddresses) {
      if (!results.has(address)) {
        toFetch.push(address);
      }
    }

    // Fetch missing prices in parallel
    if (toFetch.length > 0) {
      const promises = toFetch.map(address => this.fetchPrice(address));
      const fetched = await Promise.allSettled(promises);

      fetched.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const address = toFetch[index];
          priceCache.set(address, result.value);
          const cached = priceCache.get(address);
          if (cached) {
            results.set(address, cached);
          }
        }
      });
    }

    return results;
  }

  /**
   * Fetch price from external APIs (DexScreener primary, Jupiter fallback)
   */
  private async fetchPrice(tokenAddress: string): Promise<Omit<CachedPrice, 'lastUpdated'> | null> {
    try {
      // Try DexScreener first
      const dexPrice = await this.fetchFromDexScreener(tokenAddress);
      if (dexPrice) {
        return dexPrice;
      }

      // Fallback to Jupiter (if needed in future)
      // const jupiterPrice = await this.fetchFromJupiter(tokenAddress);
      // if (jupiterPrice) return jupiterPrice;

      return null;
    } catch (error) {
      console.error(`[PriceService] Error fetching price for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Fetch price from DexScreener API
   */
  private async fetchFromDexScreener(tokenAddress: string): Promise<Omit<CachedPrice, 'lastUpdated'> | null> {
    try {
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, {
        timeout: 5000,
      });

      if (response.data?.pairs && response.data.pairs.length > 0) {
        // Find the pair with highest liquidity
        const sortedPairs = response.data.pairs.sort(
          (a: DexScreenerPairData, b: DexScreenerPairData) => 
            (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        );

        const pair = sortedPairs[0];

        return {
          tokenAddress,
          priceUsd: parseFloat(pair.priceUsd || '0'),
          priceNative: parseFloat(pair.priceNative || '0'),
          marketCap: pair.marketCap || null,
          liquidity: pair.liquidity?.usd || null,
          volume24h: pair.volume?.h24 || null,
          priceChange24h: pair.priceChange?.h24 || null,
        };
      }

      return null;
    } catch (error) {
      console.error(`[DexScreener] Error for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Refresh prices for multiple tokens (background job use)
   */
  async refreshPrices(tokenAddresses: string[]): Promise<void> {
    console.log(`[PriceService] Refreshing prices for ${tokenAddresses.length} tokens`);
    await this.getPrices(tokenAddresses, { useCache: false });
  }
}

// Global singleton instance
export const priceService = new PriceService();

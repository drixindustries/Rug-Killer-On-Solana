/**
 * Price Cache Service
 * In-memory cache for token prices with TTL and batch fetching
 */

interface CachedPrice {
  tokenAddress: string;
  priceUsd: number;
  priceNative: number;
  marketCap: number | null;
  liquidity: number | null;
  volume24h: number | null;
  priceChange24h: number | null;
  lastUpdated: number; // timestamp
}

interface PriceCacheOptions {
  ttlMs?: number; // Time to live in milliseconds (default: 20000 = 20s)
  maxSize?: number; // Max cache entries (default: 1000)
}

export class PriceCache {
  private cache: Map<string, CachedPrice> = new Map();
  private ttlMs: number;
  private maxSize: number;

  constructor(options: PriceCacheOptions = {}) {
    this.ttlMs = options.ttlMs || 20000; // 20 seconds default
    this.maxSize = options.maxSize || 1000;
  }

  /**
   * Get cached price for a token
   * Returns null if not cached or expired
   */
  get(tokenAddress: string): CachedPrice | null {
    const cached = this.cache.get(tokenAddress);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.lastUpdated > this.ttlMs) {
      this.cache.delete(tokenAddress);
      return null;
    }

    return cached;
  }

  /**
   * Get multiple prices at once
   */
  getMultiple(tokenAddresses: string[]): Map<string, CachedPrice> {
    const results = new Map<string, CachedPrice>();
    
    for (const address of tokenAddresses) {
      const cached = this.get(address);
      if (cached) {
        results.set(address, cached);
      }
    }

    return results;
  }

  /**
   * Set price for a token
   */
  set(tokenAddress: string, price: Omit<CachedPrice, 'lastUpdated'>): void {
    // Enforce max size
    if (this.cache.size >= this.maxSize && !this.cache.has(tokenAddress)) {
      // Remove oldest entry (first entry in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(tokenAddress, {
      ...price,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Set multiple prices at once
   */
  setMultiple(prices: Array<Omit<CachedPrice, 'lastUpdated'>>): void {
    for (const price of prices) {
      this.set(price.tokenAddress, price);
    }
  }

  /**
   * Check if price is cached and fresh
   */
  has(tokenAddress: string): boolean {
    return this.get(tokenAddress) !== null;
  }

  /**
   * Clear cache for specific token
   */
  delete(tokenAddress: string): void {
    this.cache.delete(tokenAddress);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get all token addresses in the cache
   * Returns array of token addresses (does not filter by expiry)
   */
  getAllTokens(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get recently updated token addresses
   * @param minutes - Number of minutes to look back
   * @returns Array of token addresses updated within the last N minutes
   */
  getRecentlyUpdated(minutes: number): string[] {
    const now = Date.now();
    const cutoffTime = now - (minutes * 60 * 1000);
    const recentTokens: string[] = [];

    for (const [address, entry] of Array.from(this.cache.entries())) {
      if (entry.lastUpdated >= cutoffTime) {
        recentTokens.push(address);
      }
    }

    return recentTokens;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let freshEntries = 0;
    let staleEntries = 0;

    for (const entry of Array.from(this.cache.values())) {
      if (now - entry.lastUpdated > this.ttlMs) {
        staleEntries++;
      } else {
        freshEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      freshEntries,
      staleEntries,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
    };
  }

  /**
   * Cleanup stale entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [address, entry] of Array.from(this.cache.entries())) {
      if (now - entry.lastUpdated > this.ttlMs) {
        this.cache.delete(address);
        removed++;
      }
    }

    return removed;
  }
}

// Global singleton instance
// Increased TTL to 10 minutes for analytics dashboard data persistence
export const priceCache = new PriceCache({
  ttlMs: 10 * 60 * 1000, // 10 minutes (was 20 seconds)
  maxSize: 2000, // Support 2000 tokens
});

export type { CachedPrice };

import type { DexScreenerData } from "../shared/schema";
import { redisCache } from "./services/redis-cache.js";

const DEXSCREENER_API_URL = "https://api.dexscreener.com";

// Simple in-memory cache with TTL
interface CacheEntry {
  data: DexScreenerData | null;
  fetchedAt: number;
}

const CACHE: Map<string, CacheEntry> = new Map();
const DEFAULT_TTL_MS = 30_000; // 30s to keep fresh for rapid batch scans

export class DexScreenerService {
  private ttlMs: number;
  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  private buildData(raw: any): DexScreenerData | null {
    if (!raw?.pairs || raw.pairs.length === 0) return null;
    const solanaPairs = raw.pairs.filter((pair: any) => pair.chainId === 'solana');
    if (solanaPairs.length === 0) return null;
    return {
      pairs: solanaPairs.map((pair: any) => ({
        chainId: pair.chainId,
        dexId: pair.dexId,
        pairAddress: pair.pairAddress,
        baseToken: {
          address: pair.baseToken.address,
          name: pair.baseToken.name || '',
          symbol: pair.baseToken.symbol || '',
        },
        quoteToken: {
          address: pair.quoteToken.address,
          name: pair.quoteToken.name || '',
          symbol: pair.quoteToken.symbol || '',
        },
        priceUsd: pair.priceUsd || '0',
        priceNative: pair.priceNative || '0',
        txns: {
          m5: pair.txns?.m5 || { buys: 0, sells: 0 },
          h1: pair.txns?.h1 || { buys: 0, sells: 0 },
          h6: pair.txns?.h6 || { buys: 0, sells: 0 },
          h24: pair.txns?.h24 || { buys: 0, sells: 0 },
        },
        volume: {
          h24: parseFloat(pair.volume?.h24 || '0'),
          h6: parseFloat(pair.volume?.h6 || '0'),
          h1: parseFloat(pair.volume?.h1 || '0'),
          m5: parseFloat(pair.volume?.m5 || '0'),
        },
        priceChange: {
          m5: parseFloat(pair.priceChange?.m5 || '0'),
          h1: parseFloat(pair.priceChange?.h1 || '0'),
          h6: parseFloat(pair.priceChange?.h6 || '0'),
          h24: parseFloat(pair.priceChange?.h24 || '0'),
        },
        liquidity: pair.liquidity ? {
          usd: parseFloat(pair.liquidity.usd || '0'),
          base: parseFloat(pair.liquidity.base || '0'),
          quote: parseFloat(pair.liquidity.quote || '0'),
        } : undefined,
        fdv: pair.fdv ? parseFloat(pair.fdv) : undefined,
        marketCap: pair.marketCap ? parseFloat(pair.marketCap) : undefined,
        pairCreatedAt: pair.pairCreatedAt || undefined,
      })),
      schemaVersion: raw.schemaVersion || '1.0.0',
    };
  }

  async getTokenData(tokenAddress: string): Promise<DexScreenerData | null> {
    const now = Date.now();
    
    // Check Redis cache first (3 min TTL)
    const redisCached = await redisCache.get<DexScreenerData>(`dex:${tokenAddress}`);
    if (redisCached) {
      console.log(`[DexScreener] ⚡ Redis HIT: ${tokenAddress}`);
      return redisCached;
    }
    
    // Fallback to memory cache
    const cached = CACHE.get(tokenAddress);
    if (cached && (now - cached.fetchedAt) < this.ttlMs) {
      return cached.data;
    }
    try {
      const response = await fetch(`${DEXSCREENER_API_URL}/latest/dex/tokens/${tokenAddress}`, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) {
        console.error(`DexScreener API error: ${response.status} ${response.statusText}`);
        const entry: CacheEntry = { data: null, fetchedAt: now };
        CACHE.set(tokenAddress, entry);
        return null;
      }
      const raw = await response.json();
      const parsed = this.buildData(raw);
      CACHE.set(tokenAddress, { data: parsed, fetchedAt: now });
      
      // Cache in Redis for 3 minutes (180 seconds)
      if (parsed) {
        await redisCache.set(`dex:${tokenAddress}`, parsed, 180).catch(() => {});
      }
      
      return parsed;
    } catch (error) {
      console.error('DexScreener API error:', error);
      // Cache null to avoid hammering on transient failures
      CACHE.set(tokenAddress, { data: null, fetchedAt: now });
      return null;
    }
  }

  getMostLiquidPair(data: DexScreenerData) {
    if (!data.pairs || data.pairs.length === 0) return null;
    
    return data.pairs.reduce((prev, current) => {
      const prevLiq = prev.liquidity?.usd || 0;
      const currentLiq = current.liquidity?.usd || 0;
      return currentLiq > prevLiq ? current : prev;
    });
  }

  getSOLPair(data: DexScreenerData) {
    const solAddress = 'So11111111111111111111111111111111111111112';
    return data.pairs.find(pair => 
      pair.quoteToken.address === solAddress
    ) || this.getMostLiquidPair(data);
  }
}

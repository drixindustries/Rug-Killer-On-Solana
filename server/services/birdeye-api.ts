import axios from 'axios';
import { redisCache } from './redis-cache.ts';

const BIRDEYE_API = 'https://public-api.birdeye.so';
const API_KEY = process.env.BIRDEYE_API_KEY; // Only use if explicitly set

interface BirdeyeOverview {
  price: number;
  mc: number;
  liquidity: number;
  v24hUSD: number;
  priceChange24hPercent: number;
  lpBurned: boolean;
  twitter?: string;
  telegram?: string;
  website?: string;
}

interface BirdeyePricePoint {
  unixTime: number;
  value: number;
}

interface BirdeyeHolder {
  owner: string;
  uiAmount: number;
  percentage: number;
  tag?: string;
}

/**
 * Cached Birdeye overview (30 seconds cache)
 * Returns null if no API key configured
 */
export async function getBirdeyeOverview(tokenAddress: string): Promise<BirdeyeOverview | null> {
  if (!API_KEY) {
    // Silently return null if no API key - Birdeye is optional
    return null;
  }
  
  const cacheKey = `birdeye:overview:${tokenAddress}`;
  
  return await redisCache.cacheFetch(
    cacheKey,
    async () => {
      try {
        const response = await axios.get(`${BIRDEYE_API}/defi/overview`, {
          params: { address: tokenAddress },
          headers: { 'X-API-KEY': API_KEY, 'x-chain': 'solana' },
          timeout: 8000
        });
        
        return response.data?.data || null;
      } catch (error: any) {
        // Silently fail - Birdeye is optional
        if (error.response?.status === 401 || error.response?.status === 403) {
          // Invalid/forbidden API key - disable future attempts
          return null;
        }
        return null;
      }
    },
    30 // 30 seconds cache
  );
}

/**
 * Cached Birdeye price (30 seconds cache)  
 */
export async function getBirdeyePrice(tokenAddress: string): Promise<number | null> {
  if (!API_KEY) {
    return null;
  }
  
  const cacheKey = `birdeye:price:${tokenAddress}`;
  
  return await redisCache.cacheFetch(
    cacheKey,
    async () => {
      try {
        const response = await axios.get(`${BIRDEYE_API}/defi/price`, {
          params: { address: tokenAddress, address_type: 'token' },
          headers: { 'X-API-KEY': API_KEY, 'x-chain': 'solana' },
          timeout: 8000
        });
        
        return response.data?.data?.value || null;
      } catch (error: any) {
        // Silently fail - Birdeye is optional
        return null;
      }
    },
    30 // 30 seconds cache
  );
}

/**
 * Cached Birdeye price history (2 minutes cache)
 */
export async function getBirdeyePriceHistory(tokenAddress: string, days: number = 1): Promise<BirdeyePricePoint[]> {
  if (!API_KEY) {
    return [];
  }
  
  const cacheKey = `birdeye:history:${tokenAddress}:${days}`;
  
  return await redisCache.cacheFetch(
    cacheKey,
    async () => {
      try {
        const timeFrom = Math.floor(Date.now() / 1000) - (days * 86400);
        const response = await axios.get(`${BIRDEYE_API}/defi/price_history`, {
          params: { address: tokenAddress, time_from: timeFrom },
          headers: { 'X-API-KEY': API_KEY, 'x-chain': 'solana' },
          timeout: 10000
        });
        
        return response.data?.data || [];
      } catch (error: any) {
        // Silently fail - Birdeye is optional
        return [];
      }
    },
    120 // 2 minutes cache
  );
}

/**
 * Cached Birdeye top holders (5 minutes cache - rarely changes)
 */
export async function getBirdeyeTopHolders(tokenAddress: string): Promise<BirdeyeHolder[]> {
  if (!API_KEY || API_KEY === 'UNUSED') {
    return [];
  }
  
  const cacheKey = `birdeye:holders:${tokenAddress}`;
  
  return await redisCache.cacheFetch(
    cacheKey,
    async () => {
      try {
        const response = await axios.get(`${BIRDEYE_API}/token/top_holders`, {
          params: { address: tokenAddress },
          headers: { 'X-API-KEY': API_KEY, 'x-chain': 'solana' },
          timeout: 10000
        });
        
        return response.data?.data?.slice(0, 20) || [];
      } catch (error: any) {
        if (error.response?.status === 401) {
          console.error('[Birdeye] Invalid API key (401) - check BIRDEYE_API_KEY in Railway');
        }
        // Silently fail - Birdeye is optional
        return [];
      }
    },
    300 // 5 minutes cache
  );
}

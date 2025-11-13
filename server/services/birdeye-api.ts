import axios from 'axios';

const BIRDEYE_API = 'https://public-api.birdeye.so';
const API_KEY = process.env.BIRDEYE_API_KEY || '';

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

export async function getBirdeyeOverview(tokenAddress: string): Promise<BirdeyeOverview | null> {
  try {
    const response = await axios.get(`${BIRDEYE_API}/defi/overview`, {
      params: { address: tokenAddress },
      headers: API_KEY ? { 'X-API-KEY': API_KEY } : {},
      timeout: 10000
    });
    return response.data?.data || null;
  } catch (error) {
    console.error('[Birdeye] Overview error:', error);
    return null;
  }
}

export async function getBirdeyePriceHistory(tokenAddress: string, days: number = 1): Promise<BirdeyePricePoint[]> {
  try {
    const timeFrom = Math.floor(Date.now() / 1000) - (days * 86400);
    const response = await axios.get(`${BIRDEYE_API}/defi/price_history`, {
      params: { address: tokenAddress, time_from: timeFrom },
      headers: API_KEY ? { 'X-API-KEY': API_KEY } : {},
      timeout: 10000
    });
    return response.data?.data || [];
  } catch (error) {
    console.error('[Birdeye] Price history error:', error);
    return [];
  }
}

export async function getBirdeyeTopHolders(tokenAddress: string): Promise<BirdeyeHolder[]> {
  try {
    const response = await axios.get(`${BIRDEYE_API}/token/top_holders`, {
      params: { address: tokenAddress },
      headers: API_KEY ? { 'X-API-KEY': API_KEY } : {},
      timeout: 10000
    });
    return response.data?.data?.slice(0, 20) || [];
  } catch (error) {
    console.error('[Birdeye] Top holders error:', error);
    return [];
  }
}

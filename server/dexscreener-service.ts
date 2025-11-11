import type { DexScreenerData } from "@shared/schema";

const DEXSCREENER_API_URL = "https://api.dexscreener.com";

export class DexScreenerService {
  async getTokenData(tokenAddress: string): Promise<DexScreenerData | null> {
    try {
      const response = await fetch(
        `${DEXSCREENER_API_URL}/latest/dex/tokens/${tokenAddress}`,
        {
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        console.error(`DexScreener API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      
      if (!data.pairs || data.pairs.length === 0) {
        console.log(`DexScreener: No trading pairs found for token ${tokenAddress}`);
        return null;
      }

      const solanaPairs = data.pairs.filter((pair: any) => pair.chainId === 'solana');
      
      if (solanaPairs.length === 0) {
        console.log(`DexScreener: No Solana pairs found for token ${tokenAddress}`);
        return null;
      }

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
        schemaVersion: data.schemaVersion || '1.0.0',
      };
    } catch (error) {
      console.error("DexScreener API error:", error);
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

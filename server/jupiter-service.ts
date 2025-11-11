import type { JupiterPriceData } from "@shared/schema";

const JUPITER_PRICE_API_URL = "https://api.jup.ag/price/v2";

export class JupiterPriceService {
  async getTokenPrice(tokenAddress: string): Promise<JupiterPriceData | null> {
    try {
      const response = await fetch(
        `${JUPITER_PRICE_API_URL}?ids=${tokenAddress}`,
        {
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        console.error(`Jupiter API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      
      if (!data.data || !data.data[tokenAddress]) {
        console.log(`Jupiter: No price data available for token ${tokenAddress}`);
        return null;
      }

      const priceData = data.data[tokenAddress];
      
      return {
        id: priceData.id,
        type: priceData.type,
        price: priceData.price,
        extraInfo: priceData.extraInfo,
      };
    } catch (error) {
      console.error("Jupiter API error:", error);
      return null;
    }
  }
}

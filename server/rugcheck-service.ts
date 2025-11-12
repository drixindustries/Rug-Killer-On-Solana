import type { RugcheckData } from "@shared/schema";

const RUGCHECK_API_URL = "https://api.rugcheck.xyz/v1";
const RUGCHECK_API_KEY = process.env.RUGCHECK_API_KEY;

export class RugcheckService {
  async getTokenReport(mintAddress: string): Promise<RugcheckData | null> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (RUGCHECK_API_KEY) {
        headers["X-API-KEY"] = RUGCHECK_API_KEY;
      }

      const response = await fetch(
        `${RUGCHECK_API_URL}/tokens/${mintAddress}/report`,
        {
          headers,
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Rugcheck: Token ${mintAddress} not found`);
          return null;
        }
        console.error(`Rugcheck API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      
      return this.parseRugcheckResponse(data);
    } catch (error) {
      console.error("Rugcheck API error:", error);
      return null;
    }
  }

  private parseRugcheckResponse(data: any): RugcheckData {
    const risks: string[] = [];
    
    if (data.risks) {
      Object.keys(data.risks).forEach(key => {
        if (data.risks[key]?.level === "danger" || data.risks[key]?.level === "warn") {
          risks.push(data.risks[key]?.name || key);
        }
      });
    }

    const markets = (data.markets || []).map((market: any) => ({
      name: market.name || "Unknown",
      liquidity: market.lp?.lpUSD || 0,
      lpBurn: market.lp?.lpBurn || 0,
    }));

    const topHolders = (data.topHolders || []).map((holder: any) => ({
      address: holder.owner || "",  // Map 'owner' to 'address' for consistency
      pct: holder.pct || 0,
    }));

    return {
      score: data.score || 0,
      risks,
      markets,
      topHolders,
      fileMeta: data.fileMeta,
    };
  }

  async getTokenSummary(mintAddress: string): Promise<any> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (RUGCHECK_API_KEY) {
        headers["X-API-KEY"] = RUGCHECK_API_KEY;
      }

      const response = await fetch(
        `${RUGCHECK_API_URL}/tokens/${mintAddress}/report/summary`,
        {
          headers,
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Rugcheck summary API error:", error);
      return null;
    }
  }
}

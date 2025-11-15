/**
 * GMGN.AI API Integration
 * 
 * Provides advanced bundle detection and insider trading analysis
 * GMGN monitors first 70 buyers, snipers, and insider traders
 * 
 * API Endpoints:
 * - Token data: /defi/quotation/v1/tokens/sol/{address}
 * - Smart money tracking
 * - Bundle detection
 * 
 * Created: Nov 15, 2025
 */

interface GMGNTokenResponse {
  code: number;
  msg: string;
  data: {
    token: {
      address: string;
      symbol: string;
      name: string;
      decimals: number;
      total_supply: string;
      price: string;
      market_cap: string;
      liquidity: string;
      holder_count: number;
      created_at: number;
    };
    // Bundle & insider data
    smart_degen?: {
      count: number;
      total_cost: number;
      avg_cost: number;
      profit: number;
    };
    insider_count?: number;
    top_holders?: Array<{
      address: string;
      balance: string;
      percentage: number;
      is_bundle?: boolean;
      is_insider?: boolean;
      is_sniper?: boolean;
    }>;
    bundle_info?: {
      detected: boolean;
      wallet_count: number;
      total_supply_percent: number;
      wallets: string[];
    };
  };
}

export class GMGNService {
  private readonly BASE_URL = 'https://gmgn.ai/defi/quotation/v1';
  private readonly TIMEOUT_MS = 10000;

  /**
   * Fetch comprehensive token analysis from GMGN
   */
  async getTokenAnalysis(tokenAddress: string): Promise<GMGNTokenResponse | null> {
    try {
      const url = `${this.BASE_URL}/tokens/sol/${tokenAddress}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://gmgn.ai/'
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`GMGN API returned ${response.status}`);
        return null;
      }

      const data: GMGNTokenResponse = await response.json();
      
      if (data.code !== 0) {
        console.error(`GMGN API error: ${data.msg}`);
        return null;
      }

      return data;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.error('GMGN API timeout');
      } else {
        console.error('GMGN API error:', error);
      }
      return null;
    }
  }

  /**
   * Extract bundle detection info from GMGN data
   */
  extractBundleInfo(gmgnData: GMGNTokenResponse | null): {
    isBundled: boolean;
    bundleWalletCount: number;
    bundleSupplyPercent: number;
    insiderCount: number;
    sniperCount: number;
    suspiciousWallets: string[];
    confidence: number;
  } | null {
    if (!gmgnData?.data) return null;

    const { data } = gmgnData;
    const suspiciousWallets: string[] = [];
    let sniperCount = 0;

    // Count insiders and snipers from top holders
    if (data.top_holders) {
      data.top_holders.forEach(holder => {
        if (holder.is_bundle || holder.is_insider || holder.is_sniper) {
          suspiciousWallets.push(holder.address);
          if (holder.is_sniper) sniperCount++;
        }
      });
    }

    const bundleInfo = data.bundle_info || {
      detected: false,
      wallet_count: 0,
      total_supply_percent: 0,
      wallets: []
    };

    // Calculate confidence based on multiple signals
    let confidence = 0;
    if (bundleInfo.detected) confidence += 40;
    if (data.insider_count && data.insider_count > 5) confidence += 30;
    if (sniperCount > 3) confidence += 20;
    if (bundleInfo.total_supply_percent > 15) confidence += 10;

    return {
      isBundled: bundleInfo.detected,
      bundleWalletCount: bundleInfo.wallet_count,
      bundleSupplyPercent: bundleInfo.total_supply_percent,
      insiderCount: data.insider_count || 0,
      sniperCount,
      suspiciousWallets: Array.from(new Set([...suspiciousWallets, ...bundleInfo.wallets])),
      confidence: Math.min(100, confidence)
    };
  }

  /**
   * Check if token has smart money / insider activity
   */
  hasSmartMoneyActivity(gmgnData: GMGNTokenResponse | null): boolean {
    if (!gmgnData?.data?.smart_degen) return false;
    
    const { smart_degen } = gmgnData.data;
    // If 5+ smart traders with positive profit, it's a good signal
    return smart_degen.count >= 5 && smart_degen.profit > 0;
  }
}

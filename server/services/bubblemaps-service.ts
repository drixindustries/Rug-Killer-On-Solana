/**
 * Bubblemaps.io Integration
 * 
 * Provides wallet network visualization and cluster analysis
 * Free API for top-100 holders
 * 
 * https://bubblemaps.io/api/docs
 */

export interface BubblemapsNetwork {
  clusteredWallets: number;
  networkRiskScore: number; // 0-100
  connectedGroups: Array<{
    wallets: string[];
    totalSupplyPercent: number;
  }>;
  risks: string[];
}

export class BubblemapsService {
  private readonly API_URL = "https://api.bubblemaps.io/v1";
  private readonly API_KEY = process.env.BUBBLEMAPS_API_KEY; // Optional, free tier available
  
  /**
   * Analyzes wallet networks for a token
   * Detects clusters of related wallets (likely controlled by same entity)
   */
  async analyzeNetwork(tokenAddress: string, chain: string = "solana"): Promise<BubblemapsNetwork | null> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (this.API_KEY) {
        headers["Authorization"] = `Bearer ${this.API_KEY}`;
      }
      
      const response = await fetch(
        `${this.API_URL}/${chain}/token/${tokenAddress}/holders`,
        {
          headers,
          signal: AbortSignal.timeout(8000),
        }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Bubblemaps: Token ${tokenAddress} not found`);
          return null;
        }
        console.warn(`Bubblemaps API error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      return this.parseNetworkData(data);
      
    } catch (error) {
      console.error("Bubblemaps API error:", error);
      return null;
    }
  }
  
  private parseNetworkData(data: any): BubblemapsNetwork {
    const risks: string[] = [];
    let networkRiskScore = 0;
    const connectedGroups: BubblemapsNetwork['connectedGroups'] = [];
    
    // Parse holder clusters (wallets connected through transactions/transfers)
    const clusters = data.clusters || [];
    let clusteredWallets = 0;
    
    for (const cluster of clusters) {
      const wallets = cluster.addresses || [];
      const totalSupply = cluster.totalSupplyPercent || 0;
      
      if (wallets.length >= 3 && totalSupply >= 5) {
        clusteredWallets += wallets.length;
        connectedGroups.push({
          wallets,
          totalSupplyPercent: totalSupply
        });
        
        networkRiskScore += Math.min(30, wallets.length * 5);
        risks.push(`Cluster of ${wallets.length} connected wallets holding ${totalSupply.toFixed(1)}% of supply`);
      }
    }
    
    // Check for single entity controlling multiple wallets
    if (connectedGroups.length >= 2) {
      const totalClustered = connectedGroups.reduce((sum, g) => sum + g.totalSupplyPercent, 0);
      if (totalClustered > 30) {
        networkRiskScore += 25;
        risks.push(`Multiple wallet clusters control ${totalClustered.toFixed(1)}% total - likely single entity`);
      }
    }
    
    networkRiskScore = Math.min(100, networkRiskScore);
    
    return {
      clusteredWallets,
      networkRiskScore,
      connectedGroups,
      risks
    };
  }
  
  /**
   * Quick check if a token has suspicious network patterns
   * Returns true if network analysis suggests bundling/manipulation
   */
  async hasuspiciousNetwork(tokenAddress: string): Promise<boolean> {
    const network = await this.analyzeNetwork(tokenAddress);
    return network ? network.networkRiskScore >= 50 : false;
  }
}

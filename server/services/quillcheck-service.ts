/**
 * QuillCheck Integration
 * 
 * AI-powered honeypot simulation and tax detection
 * Free API with 1K calls/day limit
 * 
 * https://check.quillai.network
 */

export interface QuillCheckResult {
  riskScore: number; // 0-100
  isHoneypot: boolean;
  buyTax: number;
  sellTax: number;
  canSell: boolean;
  liquidityRisk: boolean;
  risks: string[];
}

export class QuillCheckService {
  private readonly API_URL = "https://api.quillai.network/v1";
  
  /**
   * Performs comprehensive honeypot and tax simulation
   * Detects asymmetric taxes, liquidity drains, and sell restrictions
   */
  async checkToken(tokenAddress: string, chain: string = "solana"): Promise<QuillCheckResult | null> {
    try {
      const response = await fetch(
        `${this.API_URL}/check/${chain}/${tokenAddress}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(5000),
        }
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn("QuillCheck: Rate limit exceeded");
          return null;
        }
        if (response.status === 404) {
          console.log(`QuillCheck: Token ${tokenAddress} not found`);
          return null;
        }
        console.warn(`QuillCheck API error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      return this.parseResult(data);
      
    } catch (error) {
      console.error("QuillCheck API error:", error);
      return null;
    }
  }
  
  private parseResult(data: any): QuillCheckResult {
    const risks: string[] = [];
    let riskScore = data.riskScore || 0;
    
    const buyTax = parseFloat(data.buyTax || "0");
    const sellTax = parseFloat(data.sellTax || "0");
    const isHoneypot = data.isHoneypot === true || data.honeypot === true;
    const canSell = data.canSell !== false && !isHoneypot;
    const liquidityRisk = data.liquidityRisk === true || data.liquidity?.risk === "high";
    
    // Analyze taxes
    if (buyTax > 10) {
      risks.push(`High buy tax: ${buyTax}%`);
      riskScore += Math.min(20, buyTax);
    }
    
    if (sellTax > 10) {
      risks.push(`High sell tax: ${sellTax}%`);
      riskScore += Math.min(30, sellTax * 1.5);
    }
    
    // Asymmetric taxes are major red flag
    if (sellTax - buyTax > 5) {
      risks.push(`Asymmetric taxes: ${sellTax}% sell vs ${buyTax}% buy - honeypot risk`);
      riskScore += 25;
    }
    
    // Honeypot detection
    if (isHoneypot) {
      risks.push("HONEYPOT DETECTED - Cannot sell tokens");
      riskScore = 100;
    }
    
    if (!canSell) {
      risks.push("Sell function is restricted or disabled");
      riskScore += 40;
    }
    
    // Liquidity risks
    if (liquidityRisk) {
      risks.push("Liquidity can be drained by contract owner");
      riskScore += 30;
    }
    
    riskScore = Math.min(100, riskScore);
    
    return {
      riskScore,
      isHoneypot,
      buyTax,
      sellTax,
      canSell,
      liquidityRisk,
      risks
    };
  }
  
  /**
   * Quick honeypot check
   * Returns true if token is definitely a honeypot
   */
  async isHoneypot(tokenAddress: string): Promise<boolean> {
    const result = await this.checkToken(tokenAddress);
    return result ? result.isHoneypot : false;
  }
}

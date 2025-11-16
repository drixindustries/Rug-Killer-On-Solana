/**
 * Liquidity Monitoring Service
 * 
 * Tracks liquidity pool changes to detect:
 * - LP removal during dumps
 * - Gradual liquidity drainage
 * - LP unlock and immediate removal
 * - Sudden liquidity drops
 * 
 * Created: Nov 15, 2025
 */

import type { DexScreenerPair } from "../../shared/schema.ts";

export interface LiquidityChange {
  type: 'sudden_drop' | 'gradual_drain' | 'lp_removal' | 'healthy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  evidence: {
    currentLiquidity: number;
    percentageChange?: number;
    timeWindow?: string;
  };
}

export interface LiquidityMonitorResult {
  isHealthy: boolean;
  riskScore: number; // 0-100, higher = more risky
  changes: LiquidityChange[];
  currentLiquidity: number;
  liquidityTrend: 'stable' | 'increasing' | 'decreasing' | 'critical_drop';
  risks: string[];
}

export class LiquidityMonitorService {
  private readonly MIN_SAFE_LIQUIDITY = 5000; // $5k minimum
  private readonly CRITICAL_DROP_THRESHOLD = 50; // 50% drop = critical
  private readonly HIGH_DROP_THRESHOLD = 30; // 30% drop = high risk

  /**
   * Monitor liquidity pool for suspicious changes
   */
  monitorLiquidity(
    dexPair: DexScreenerPair | null,
    historicalData?: {
      liquidity1hAgo?: number;
      liquidity6hAgo?: number;
      liquidity24hAgo?: number;
    }
  ): LiquidityMonitorResult {
    if (!dexPair || !dexPair.liquidity?.usd) {
      return this.createUnknownResult();
    }

    const currentLiquidity = dexPair.liquidity.usd;
    const changes: LiquidityChange[] = [];
    const risks: string[] = [];
    let riskScore = 0;

    // 1. CHECK ABSOLUTE LIQUIDITY LEVEL
    const lowLiquidityCheck = this.checkLowLiquidity(currentLiquidity);
    if (lowLiquidityCheck) {
      changes.push(lowLiquidityCheck);
      riskScore += 30;
    }

    // 2. CHECK FOR SUDDEN DROPS (if we have historical data)
    if (historicalData) {
      const suddenDrop = this.detectSuddenDrop(currentLiquidity, historicalData);
      if (suddenDrop) {
        changes.push(suddenDrop);
        riskScore += 40;
      }

      const gradualDrain = this.detectGradualDrain(currentLiquidity, historicalData);
      if (gradualDrain) {
        changes.push(gradualDrain);
        riskScore += 25;
      }
    }

    // 3. CROSS-CHECK WITH PRICE ACTION
    const priceChange = dexPair.priceChange.h1;
    if (priceChange < -40 && currentLiquidity < this.MIN_SAFE_LIQUIDITY * 2) {
      changes.push({
        type: 'lp_removal',
        severity: 'critical',
        confidence: 90,
        description: `LP drained during dump: -${Math.abs(priceChange).toFixed(0)}% price + low liquidity`,
        evidence: {
          currentLiquidity,
          percentageChange: priceChange
        }
      });
      riskScore += 35;
    }

    // Generate risk messages
    changes.forEach(change => {
      risks.push(`${this.getSeverityEmoji(change.severity)} ${change.description}`);
    });

    // Determine trend
    let liquidityTrend: 'stable' | 'increasing' | 'decreasing' | 'critical_drop' = 'stable';
    
    if (historicalData?.liquidity1hAgo) {
      const change1h = ((currentLiquidity - historicalData.liquidity1hAgo) / historicalData.liquidity1hAgo) * 100;
      
      if (change1h < -this.CRITICAL_DROP_THRESHOLD) {
        liquidityTrend = 'critical_drop';
      } else if (change1h < -10) {
        liquidityTrend = 'decreasing';
      } else if (change1h > 10) {
        liquidityTrend = 'increasing';
      }
    }

    return {
      isHealthy: riskScore < 30 && currentLiquidity >= this.MIN_SAFE_LIQUIDITY,
      riskScore: Math.min(100, riskScore),
      changes,
      currentLiquidity,
      liquidityTrend,
      risks
    };
  }

  /**
   * Check if liquidity is dangerously low
   */
  private checkLowLiquidity(liquidity: number): LiquidityChange | null {
    if (liquidity < 1000) {
      return {
        type: 'lp_removal',
        severity: 'critical',
        confidence: 100,
        description: `Extremely low liquidity: $${liquidity.toFixed(0)}`,
        evidence: { currentLiquidity: liquidity }
      };
    }

    if (liquidity < this.MIN_SAFE_LIQUIDITY) {
      return {
        type: 'lp_removal',
        severity: 'high',
        confidence: 85,
        description: `Low liquidity: $${liquidity.toFixed(0)} (risky)`,
        evidence: { currentLiquidity: liquidity }
      };
    }

    if (liquidity < 10000) {
      return {
        type: 'lp_removal',
        severity: 'medium',
        confidence: 60,
        description: `Moderate liquidity: $${liquidity.toFixed(0)}`,
        evidence: { currentLiquidity: liquidity }
      };
    }

    return null;
  }

  /**
   * Detect sudden liquidity drops (rug happening)
   */
  private detectSuddenDrop(
    current: number,
    historical: {
      liquidity1hAgo?: number;
      liquidity6hAgo?: number;
      liquidity24hAgo?: number;
    }
  ): LiquidityChange | null {
    // Check 1-hour drop
    if (historical.liquidity1hAgo) {
      const change1h = ((current - historical.liquidity1hAgo) / historical.liquidity1hAgo) * 100;
      
      if (change1h < -this.CRITICAL_DROP_THRESHOLD) {
        return {
          type: 'sudden_drop',
          severity: 'critical',
          confidence: 95,
          description: `LIQUIDITY DRAINED: -${Math.abs(change1h).toFixed(0)}% in 1 hour`,
          evidence: {
            currentLiquidity: current,
            percentageChange: change1h,
            timeWindow: '1 hour'
          }
        };
      }

      if (change1h < -this.HIGH_DROP_THRESHOLD) {
        return {
          type: 'sudden_drop',
          severity: 'high',
          confidence: 80,
          description: `Rapid liquidity drop: -${Math.abs(change1h).toFixed(0)}% in 1 hour`,
          evidence: {
            currentLiquidity: current,
            percentageChange: change1h,
            timeWindow: '1 hour'
          }
        };
      }
    }

    // Check 6-hour drop
    if (historical.liquidity6hAgo) {
      const change6h = ((current - historical.liquidity6hAgo) / historical.liquidity6hAgo) * 100;
      
      if (change6h < -60) {
        return {
          type: 'sudden_drop',
          severity: 'critical',
          confidence: 90,
          description: `Severe liquidity drain: -${Math.abs(change6h).toFixed(0)}% in 6 hours`,
          evidence: {
            currentLiquidity: current,
            percentageChange: change6h,
            timeWindow: '6 hours'
          }
        };
      }
    }

    return null;
  }

  /**
   * Detect gradual liquidity drainage (slow rug)
   */
  private detectGradualDrain(
    current: number,
    historical: {
      liquidity1hAgo?: number;
      liquidity6hAgo?: number;
      liquidity24hAgo?: number;
    }
  ): LiquidityChange | null {
    // Look for consistent downward trend
    if (historical.liquidity24hAgo && historical.liquidity6hAgo) {
      const change24h = ((current - historical.liquidity24hAgo) / historical.liquidity24hAgo) * 100;
      const change6h = historical.liquidity6hAgo 
        ? ((current - historical.liquidity6hAgo) / historical.liquidity6hAgo) * 100
        : 0;

      // Both periods show significant drops = gradual drain
      if (change24h < -40 && change6h < -20) {
        return {
          type: 'gradual_drain',
          severity: 'high',
          confidence: 75,
          description: `Gradual LP drain: -${Math.abs(change24h).toFixed(0)}% in 24h`,
          evidence: {
            currentLiquidity: current,
            percentageChange: change24h,
            timeWindow: '24 hours'
          }
        };
      }
    }

    return null;
  }

  /**
   * Calculate liquidity/market cap ratio (health indicator)
   */
  calculateLiquidityRatio(liquidity: number, marketCap: number): {
    ratio: number;
    health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    description: string;
  } {
    if (marketCap === 0) {
      return {
        ratio: 0,
        health: 'critical',
        description: 'Unknown market cap'
      };
    }

    const ratio = (liquidity / marketCap) * 100;

    if (ratio >= 10) {
      return {
        ratio,
        health: 'excellent',
        description: `Strong liquidity: ${ratio.toFixed(1)}% of mcap`
      };
    } else if (ratio >= 5) {
      return {
        ratio,
        health: 'good',
        description: `Healthy liquidity: ${ratio.toFixed(1)}% of mcap`
      };
    } else if (ratio >= 2) {
      return {
        ratio,
        health: 'fair',
        description: `Moderate liquidity: ${ratio.toFixed(1)}% of mcap`
      };
    } else if (ratio >= 1) {
      return {
        ratio,
        health: 'poor',
        description: `Low liquidity: ${ratio.toFixed(1)}% of mcap`
      };
    } else {
      return {
        ratio,
        health: 'critical',
        description: `Critical liquidity: ${ratio.toFixed(1)}% of mcap`
      };
    }
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  }

  private createUnknownResult(): LiquidityMonitorResult {
    return {
      isHealthy: false,
      riskScore: 50,
      changes: [{
        type: 'healthy',
        severity: 'medium',
        confidence: 0,
        description: 'No liquidity data available',
        evidence: { currentLiquidity: 0 }
      }],
      currentLiquidity: 0,
      liquidityTrend: 'stable',
      risks: ['⚠️ Cannot verify liquidity status']
    };
  }
}

// Export singleton
export const liquidityMonitor = new LiquidityMonitorService();

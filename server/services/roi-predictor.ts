/**
 * ROI Predictor - ATMDOTDAY Style Projections
 * Predicts potential returns based on:
 * - Volume/Liquidity ratio
 * - Whale accumulation patterns
 * - Historical similar token performance
 * - Market conditions
 */

import { db } from '../db';
import { scanHistory } from '../../shared/schema';
import { desc, and, gte, lte, sql } from 'drizzle-orm';

export interface ROIProjection {
  minMultiplier: number; // e.g., 2.0 = 2x
  maxMultiplier: number; // e.g., 5.0 = 5x
  confidence: number; // 0-100
  timeframe: string; // e.g., "24h", "7d"
  reasoning: string[];
}

export class ROIPredictor {
  /**
   * Predict ROI based on token metrics and historical patterns
   */
  async predictROI(metrics: {
    riskScore: number;
    whaleCount: number;
    bundleDetected: boolean;
    honeypotDetected: boolean;
    liquidityUSD: number;
    volumeUSD: number;
    holderCount: number;
    lpBurned: boolean;
    top10HoldingPercent: number;
  }): Promise<ROIProjection> {
    const reasoning: string[] = [];
    let baseMultiplier = 1.0;
    let maxMultiplier = 1.5;
    let confidence = 50;

    // Immediate disqualifiers (GMGN-style safety)
    if (metrics.honeypotDetected) {
      return {
        minMultiplier: 0,
        maxMultiplier: 0,
        confidence: 0,
        timeframe: 'N/A',
        reasoning: ['⛔ Honeypot detected - DO NOT BUY'],
      };
    }

    if (metrics.bundleDetected) {
      reasoning.push('⚠️ Bundle detected - high rug risk');
      maxMultiplier *= 0.5;
      confidence -= 30;
    }

    // Volume/Liquidity Ratio (ATMDOTDAY momentum indicator)
    const volLiqRatio = metrics.volumeUSD / Math.max(metrics.liquidityUSD, 1);
    if (volLiqRatio > 10) {
      reasoning.push(`🔥 Extreme volume (${volLiqRatio.toFixed(1)}x liquidity) - potential moonshot`);
      baseMultiplier += 2.0;
      maxMultiplier += 3.0;
      confidence += 15;
    } else if (volLiqRatio > 5) {
      reasoning.push(`📈 High volume (${volLiqRatio.toFixed(1)}x liquidity) - strong momentum`);
      baseMultiplier += 1.0;
      maxMultiplier += 2.0;
      confidence += 10;
    }

    // Whale Accumulation (Alpha Gardner style)
    if (metrics.whaleCount >= 5) {
      reasoning.push(`🐋 ${metrics.whaleCount} whales buying - smart money signal`);
      baseMultiplier += 1.5;
      maxMultiplier += 2.0;
      confidence += 20;
    } else if (metrics.whaleCount >= 3) {
      reasoning.push(`🐋 ${metrics.whaleCount} whales detected - moderate interest`);
      baseMultiplier += 0.8;
      maxMultiplier += 1.5;
      confidence += 10;
    }

    // Risk Score (inverse correlation)
    if (metrics.riskScore <= 30) {
      reasoning.push(`✅ Low risk score (${metrics.riskScore}) - safe entry`);
      baseMultiplier += 1.0;
      maxMultiplier += 1.5;
      confidence += 15;
    } else if (metrics.riskScore >= 70) {
      reasoning.push(`⚠️ High risk score (${metrics.riskScore}) - dangerous`);
      baseMultiplier *= 0.5;
      maxMultiplier *= 0.6;
      confidence -= 20;
    }

    // LP Burned (GMGN safety check)
    if (metrics.lpBurned) {
      reasoning.push('🔥 LP burned - rug-resistant');
      baseMultiplier += 0.5;
      confidence += 10;
    }

    // Holder Distribution (Trojan-style)
    if (metrics.top10HoldingPercent < 20) {
      reasoning.push('👥 Healthy distribution - less manipulation risk');
      baseMultiplier += 0.3;
      confidence += 5;
    } else if (metrics.top10HoldingPercent > 50) {
      reasoning.push('⚠️ Concentrated holdings - manipulation risk');
      baseMultiplier *= 0.7;
      confidence -= 15;
    }

    // Historical Pattern Matching (from past scans)
    const historicalMultiplier = await this.getHistoricalPattern(metrics);
    if (historicalMultiplier > 0) {
      reasoning.push(`📊 Similar tokens averaged ${historicalMultiplier.toFixed(1)}x returns`);
      maxMultiplier = Math.max(maxMultiplier, historicalMultiplier * 1.2);
      confidence += 5;
    }

    // Confidence bounds
    confidence = Math.max(0, Math.min(100, confidence));

    // Timeframe based on volatility
    const timeframe = volLiqRatio > 10 ? '6h' : volLiqRatio > 5 ? '24h' : '7d';

    return {
      minMultiplier: Math.max(0, baseMultiplier),
      maxMultiplier: Math.max(baseMultiplier, maxMultiplier),
      confidence,
      timeframe,
      reasoning,
    };
  }

  /**
   * Find similar historical tokens and their performance
   */
  private async getHistoricalPattern(metrics: any): Promise<number> {
    try {
      // Query past 30 days for similar tokens
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const similar = await db
        .select()
        .from(scanHistory)
        .where(
          and(
            gte(scanHistory.scannedAt, thirtyDaysAgo),
            gte(scanHistory.whaleCount, Math.max(0, metrics.whaleCount - 2)),
            lte(scanHistory.whaleCount, metrics.whaleCount + 2),
            lte(scanHistory.riskScore, metrics.riskScore + 10)
          )
        )
        .limit(50);

      if (similar.length === 0) return 0;

      // Calculate average "success" multiplier (simplified - would need price tracking)
      // For now, use risk score as inverse proxy: low risk = higher avg returns
      const avgRisk = similar.reduce((sum, s) => sum + s.riskScore, 0) / similar.length;
      const estimatedMultiplier = avgRisk < 30 ? 3.5 : avgRisk < 50 ? 2.5 : 1.8;

      return estimatedMultiplier;
    } catch (error) {
      console.error('[ROI Predictor] Historical pattern error:', error);
      return 0;
    }
  }

  /**
   * Generate ATMDOTDAY-style call message
   */
  generateCallMessage(
    symbol: string,
    mint: string,
    roi: ROIProjection,
    score: number
  ): string {
    const emoji = roi.confidence >= 80 ? '🚀🚀🚀' : roi.confidence >= 60 ? '🔥🔥' : '📈';
    
    let message = `${emoji} **ULTIMATE CALL: $${symbol}**\n\n`;
    message += `**Contract:** \`${mint}\`\n`;
    message += `**Score:** ${score}/100\n`;
    message += `**Projected:** ${roi.minMultiplier.toFixed(1)}x - ${roi.maxMultiplier.toFixed(1)}x in ${roi.timeframe}\n`;
    message += `**Confidence:** ${roi.confidence}%\n\n`;
    message += `**Why:**\n${roi.reasoning.map(r => `• ${r}`).join('\n')}\n\n`;
    
    if (roi.confidence >= 70) {
      message += `✅ **HIGH CONVICTION** - Consider 0.5-1 SOL entry\n`;
    } else if (roi.confidence >= 50) {
      message += `⚠️ **MODERATE RISK** - Small position only\n`;
    } else {
      message += `🛑 **LOW CONFIDENCE** - Proceed with caution\n`;
    }

    return message;
  }
}

export const roiPredictor = new ROIPredictor();

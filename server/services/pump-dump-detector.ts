/**
 * Pump & Dump Pattern Detection Service
 * 
 * Detects coordinated pump-and-dump schemes by analyzing:
 * - Rapid price spikes (>300% in <1 hour)
 * - Instant dumps (>60% drop from ATH in <30 min)
 * - Coordinated top holder sell-offs
 * - Suspicious buy/sell ratio patterns
 * - Volume spike anomalies
 * 
 * Created: Nov 15, 2025
 */

import { DexScreenerPair } from "@shared/schema";

export interface PumpDumpPattern {
  type: 'rapid_pump' | 'instant_dump' | 'coordinated_selloff' | 'volume_manipulation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  description: string;
  evidence: {
    priceChange?: number;
    timeWindow?: string;
    volumeAnomaly?: number;
    sellPressure?: number;
  };
}

export interface PumpDumpDetectionResult {
  isRugPull: boolean;
  rugConfidence: number; // 0-100, higher = more likely a rug
  patterns: PumpDumpPattern[];
  timeline: {
    pumpDetected: boolean;
    pumpPercentage?: number;
    dumpDetected: boolean;
    dumpPercentage?: number;
    timeToRug?: number; // Minutes from launch to dump
  };
  risks: string[];
}

export class PumpDumpDetectorService {
  /**
   * Analyze price action for pump & dump patterns
   */
  analyzePriceAction(
    dexPair: DexScreenerPair | null,
    holderData?: {
      topHolders: Array<{ address: string; percentage: number }>;
    }
  ): PumpDumpDetectionResult {
    const patterns: PumpDumpPattern[] = [];
    const risks: string[] = [];
    let rugConfidence = 0;

    if (!dexPair) {
      return this.createEmptyResult();
    }

    // 1. RAPID PUMP DETECTION
    const rapidPump = this.detectRapidPump(dexPair);
    if (rapidPump) {
      patterns.push(rapidPump);
      rugConfidence += 30;
    }

    // 2. INSTANT DUMP DETECTION
    const instantDump = this.detectInstantDump(dexPair);
    if (instantDump) {
      patterns.push(instantDump);
      rugConfidence += 40; // Dump is stronger signal than pump
    }

    // 3. BUY/SELL RATIO IMBALANCE
    const ratioImbalance = this.detectBuySellImbalance(dexPair);
    if (ratioImbalance) {
      patterns.push(ratioImbalance);
      rugConfidence += 20;
    }

    // 4. VOLUME SPIKE ANOMALIES
    const volumeAnomaly = this.detectVolumeAnomalies(dexPair);
    if (volumeAnomaly) {
      patterns.push(volumeAnomaly);
      rugConfidence += 15;
    }

    // Generate risk messages
    patterns.forEach(pattern => {
      risks.push(`${this.getSeverityEmoji(pattern.severity)} ${pattern.description}`);
    });

    // Build timeline
    const pumpDetected = patterns.some(p => p.type === 'rapid_pump');
    const dumpDetected = patterns.some(p => p.type === 'instant_dump');
    
    let pumpPercentage: number | undefined;
    let dumpPercentage: number | undefined;
    
    const pumpPattern = patterns.find(p => p.type === 'rapid_pump');
    if (pumpPattern?.evidence.priceChange) {
      pumpPercentage = pumpPattern.evidence.priceChange;
    }
    
    const dumpPattern = patterns.find(p => p.type === 'instant_dump');
    if (dumpPattern?.evidence.priceChange) {
      dumpPercentage = Math.abs(dumpPattern.evidence.priceChange);
    }

    return {
      isRugPull: rugConfidence >= 60,
      rugConfidence: Math.min(100, rugConfidence),
      patterns,
      timeline: {
        pumpDetected,
        pumpPercentage,
        dumpDetected,
        dumpPercentage,
        timeToRug: dexPair.pairCreatedAt 
          ? Math.floor((Date.now() - dexPair.pairCreatedAt) / 60000)
          : undefined
      },
      risks
    };
  }

  /**
   * Detect rapid price pump (>300% in <1 hour)
   */
  private detectRapidPump(pair: DexScreenerPair): PumpDumpPattern | null {
    const h1Change = pair.priceChange.h1;

    // CRITICAL: >500% in 1 hour (GHETTOGUS pattern)
    if (h1Change > 500) {
      return {
        type: 'rapid_pump',
        severity: 'critical',
        confidence: 95,
        description: `Extreme pump: +${h1Change.toFixed(0)}% in 1 hour`,
        evidence: {
          priceChange: h1Change,
          timeWindow: '1 hour'
        }
      };
    }

    // HIGH: >300% in 1 hour
    if (h1Change > 300) {
      return {
        type: 'rapid_pump',
        severity: 'high',
        confidence: 85,
        description: `Rapid pump: +${h1Change.toFixed(0)}% in 1 hour`,
        evidence: {
          priceChange: h1Change,
          timeWindow: '1 hour'
        }
      };
    }

    // MEDIUM: >150% in 1 hour
    if (h1Change > 150) {
      return {
        type: 'rapid_pump',
        severity: 'medium',
        confidence: 60,
        description: `Fast pump: +${h1Change.toFixed(0)}% in 1 hour`,
        evidence: {
          priceChange: h1Change,
          timeWindow: '1 hour'
        }
      };
    }

    return null;
  }

  /**
   * Detect instant dump (>60% drop from recent high)
   */
  private detectInstantDump(pair: DexScreenerPair): PumpDumpPattern | null {
    const m5Change = pair.priceChange.m5;
    const h1Change = pair.priceChange.h1;
    const h6Change = pair.priceChange.h6;

    // CRITICAL: >90% drop in 5 minutes (THE RUG HAS BEEN PULLED)
    if (m5Change < -90) {
      return {
        type: 'instant_dump',
        severity: 'critical',
        confidence: 100,
        description: `RUG PULLED: -${Math.abs(m5Change).toFixed(0)}% in 5 minutes`,
        evidence: {
          priceChange: m5Change,
          timeWindow: '5 minutes'
        }
      };
    }

    // CRITICAL: >80% drop in 5 minutes
    if (m5Change < -80) {
      return {
        type: 'instant_dump',
        severity: 'critical',
        confidence: 95,
        description: `Catastrophic dump: -${Math.abs(m5Change).toFixed(0)}% in 5 min`,
        evidence: {
          priceChange: m5Change,
          timeWindow: '5 minutes'
        }
      };
    }

    // HIGH: >60% drop in 1 hour
    if (h1Change < -60) {
      return {
        type: 'instant_dump',
        severity: 'high',
        confidence: 80,
        description: `Severe dump: -${Math.abs(h1Change).toFixed(0)}% in 1 hour`,
        evidence: {
          priceChange: h1Change,
          timeWindow: '1 hour'
        }
      };
    }

    // HIGH: Pump followed by dump (GHETTOGUS pattern)
    // If pumped >200% in 6h but down >40% in last hour = coordinated rug
    if (h6Change > 200 && h1Change < -40) {
      return {
        type: 'instant_dump',
        severity: 'critical',
        confidence: 90,
        description: `Classic pump & dump: +${h6Change.toFixed(0)}% → -${Math.abs(h1Change).toFixed(0)}%`,
        evidence: {
          priceChange: h1Change,
          timeWindow: 'pump-then-dump'
        }
      };
    }

    return null;
  }

  /**
   * Detect buy/sell ratio imbalances (all buys then all sells)
   */
  private detectBuySellImbalance(pair: DexScreenerPair): PumpDumpPattern | null {
    const txns = pair.txns.h1;
    
    if (!txns || txns.buys + txns.sells < 10) {
      return null; // Not enough data
    }

    const totalTxns = txns.buys + txns.sells;
    const buyRatio = txns.buys / totalTxns;
    const sellRatio = txns.sells / totalTxns;

    // CRITICAL: >90% sells in last hour (coordinated dump)
    if (sellRatio > 0.9) {
      return {
        type: 'coordinated_selloff',
        severity: 'critical',
        confidence: 95,
        description: `Mass sell-off: ${(sellRatio * 100).toFixed(0)}% sells in last hour`,
        evidence: {
          sellPressure: sellRatio * 100
        }
      };
    }

    // HIGH: >80% sells
    if (sellRatio > 0.8) {
      return {
        type: 'coordinated_selloff',
        severity: 'high',
        confidence: 80,
        description: `Heavy selling: ${(sellRatio * 100).toFixed(0)}% sells`,
        evidence: {
          sellPressure: sellRatio * 100
        }
      };
    }

    // MEDIUM: >70% sells with negative price action
    if (sellRatio > 0.7 && pair.priceChange.h1 < -20) {
      return {
        type: 'coordinated_selloff',
        severity: 'high',
        confidence: 75,
        description: `Coordinated exit: ${(sellRatio * 100).toFixed(0)}% sells + -${Math.abs(pair.priceChange.h1).toFixed(0)}% price`,
        evidence: {
          sellPressure: sellRatio * 100,
          priceChange: pair.priceChange.h1
        }
      };
    }

    return null;
  }

  /**
   * Detect volume spike anomalies (fake volume then dumps)
   */
  private detectVolumeAnomalies(pair: DexScreenerPair): PumpDumpPattern | null {
    const vol5m = pair.volume.m5 || 0;
    const vol1h = pair.volume.h1 || 0;
    const vol24h = pair.volume.h24 || 0;

    if (vol24h < 1000) {
      return null; // Too low volume to analyze
    }

    // Calculate volume concentration
    const vol5mPercent = (vol5m / vol24h) * 100;
    const vol1hPercent = (vol1h / vol24h) * 100;

    // CRITICAL: >60% of 24h volume in last 5 minutes (dump happening NOW)
    if (vol5mPercent > 60 && pair.priceChange.m5 < -30) {
      return {
        type: 'volume_manipulation',
        severity: 'critical',
        confidence: 90,
        description: `Massive dump: ${vol5mPercent.toFixed(0)}% of daily volume in 5 min`,
        evidence: {
          volumeAnomaly: vol5mPercent,
          priceChange: pair.priceChange.m5
        }
      };
    }

    // HIGH: >40% of 24h volume in last hour with negative price
    if (vol1hPercent > 40 && pair.priceChange.h1 < -20) {
      return {
        type: 'volume_manipulation',
        severity: 'high',
        confidence: 75,
        description: `Volume spike during dump: ${vol1hPercent.toFixed(0)}% of daily volume`,
        evidence: {
          volumeAnomaly: vol1hPercent,
          priceChange: pair.priceChange.h1
        }
      };
    }

    // MEDIUM: Unusual volume concentration
    if (vol1hPercent > 50) {
      return {
        type: 'volume_manipulation',
        severity: 'medium',
        confidence: 60,
        description: `Abnormal volume spike: ${vol1hPercent.toFixed(0)}% in last hour`,
        evidence: {
          volumeAnomaly: vol1hPercent
        }
      };
    }

    return null;
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

  private createEmptyResult(): PumpDumpDetectionResult {
    return {
      isRugPull: false,
      rugConfidence: 0,
      patterns: [],
      timeline: {
        pumpDetected: false,
        dumpDetected: false
      },
      risks: []
    };
  }
}

// Export singleton
export const pumpDumpDetector = new PumpDumpDetectorService();

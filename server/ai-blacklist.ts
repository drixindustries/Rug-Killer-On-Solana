import { db } from "./db";
import { badActorLabels, analysisRuns } from "@shared/schema";
import type { TokenAnalysisResponse } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// ============================================================================
// PHASE 1: RULES-BASED BLACKLIST ENGINE
// ============================================================================

export interface BlacklistCheckResult {
  isBlacklisted: boolean;
  severity: number; // 0-100
  labels: Array<{
    type: string;
    severity: number;
    rugCount: number;
    confidence: number;
  }>;
  warnings: string[];
}

/**
 * Check if a wallet address is blacklisted
 */
export async function checkBlacklist(walletAddress: string): Promise<BlacklistCheckResult> {
  try {
    const labels = await db
      .select()
      .from(badActorLabels)
      .where(
        and(
          eq(badActorLabels.walletAddress, walletAddress),
          eq(badActorLabels.isActive, true)
        )
      );
    
    if (labels.length === 0) {
      return {
        isBlacklisted: false,
        severity: 0,
        labels: [],
        warnings: [],
      };
    }
    
    const maxSeverity = Math.max(...labels.map(l => l.severity));
    const warnings = labels.map(l => {
      if (l.rugCount > 0) {
        return `⚠️ ${l.labelType}: ${l.rugCount} confirmed rugs`;
      }
      return `⚠️ ${l.labelType}`;
    });
    
    return {
      isBlacklisted: true,
      severity: maxSeverity,
      labels: labels.map(l => ({
        type: l.labelType,
        severity: l.severity,
        rugCount: l.rugCount,
        confidence: l.confidence,
      })),
      warnings,
    };
  } catch (error) {
    console.error("Error checking blacklist:", error);
    return {
      isBlacklisted: false,
      severity: 0,
      labels: [],
      warnings: [],
    };
  }
}

/**
 * Analyze token and automatically flag suspicious actors
 * Uses deterministic rules based on risk patterns
 */
export async function analyzeAndFlag(
  analysis: TokenAnalysisResponse,
  userId?: string
): Promise<void> {
  try {
    // Store analysis run for ML training later
    await db.insert(analysisRuns).values({
      tokenAddress: analysis.tokenAddress,
      userId,
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel,
      analysisData: analysis as any,
      rugDetected: false, // Will be updated manually if confirmed
      userReported: false,
    });
    
    // RULE 1: Honeypot Detection (GoPlus scam flag)
    if (analysis.goplusData?.is_scam === '1') {
      await flagWallet(
        analysis.tokenAddress,
        'honeypot_creator',
        90,
        'GoPlus API detected honeypot',
        'rules_engine'
      );
    }
    
    // RULE 2: High sell tax (>10%)
    if (analysis.goplusData?.sell_tax) {
      const sellTax = parseFloat(analysis.goplusData.sell_tax);
      if (sellTax > 0.1) {
        await flagWallet(
          analysis.tokenAddress,
          'scammer',
          80,
          `Excessive sell tax: ${(sellTax * 100).toFixed(1)}%`,
          'rules_engine'
        );
      }
    }
    
    // RULE 3: Active mint authority + high risk
    if (
      analysis.mintAuthority.hasAuthority &&
      !analysis.mintAuthority.isRevoked &&
      analysis.riskScore > 70 &&
      analysis.mintAuthority.authorityAddress
    ) {
      await flagWallet(
        analysis.mintAuthority.authorityAddress,
        'rugger_dev',
        75,
        'Active mint authority on high-risk token',
        'rules_engine'
      );
    }
    
    // RULE 4: Active freeze authority + high risk
    if (
      analysis.freezeAuthority.hasAuthority &&
      !analysis.freezeAuthority.isRevoked &&
      analysis.riskScore > 70 &&
      analysis.freezeAuthority.authorityAddress
    ) {
      await flagWallet(
        analysis.freezeAuthority.authorityAddress,
        'rugger_dev',
        75,
        'Active freeze authority on high-risk token',
        'rules_engine'
      );
    }
    
    // RULE 5: Extreme holder concentration (>80% in top 10)
    if (analysis.topHolderConcentration > 80) {
      // Flag top holder if they hold >50%
      const topHolder = analysis.topHolders[0];
      if (topHolder && topHolder.percentage > 50) {
        await flagWallet(
          topHolder.address,
          'wash_trader',
          70,
          `Controls ${topHolder.percentage.toFixed(1)}% of supply`,
          'rules_engine'
        );
      }
    }
    
    // RULE 6: Low liquidity + high risk
    if (
      analysis.liquidityPool.status === 'RISKY' &&
      analysis.riskScore > 80 &&
      analysis.dexscreenerData?.pairs?.[0]
    ) {
      const pair = analysis.dexscreenerData.pairs[0];
      if (pair.liquidity && pair.liquidity.usd < 1000) {
        await flagWallet(
          analysis.tokenAddress,
          'scammer',
          85,
          `Low liquidity ($${pair.liquidity.usd.toFixed(0)}) + high risk score`,
          'rules_engine'
        );
      }
    }
    
  } catch (error) {
    console.error("Error in analyzeAndFlag:", error);
  }
}

/**
 * Flag a wallet as a bad actor
 */
async function flagWallet(
  walletAddress: string,
  labelType: string,
  severity: number,
  evidence: string,
  detectionMethod: string
): Promise<void> {
  try {
    // Check if wallet is already flagged with this label type
    const [existing] = await db
      .select()
      .from(badActorLabels)
      .where(
        and(
          eq(badActorLabels.walletAddress, walletAddress),
          eq(badActorLabels.labelType, labelType)
        )
      )
      .limit(1);
    
    if (existing) {
      // Only update if new severity is higher or if we have new evidence
      const existingEvidence = (existing.evidenceData as any) || {};
      const timestamp = new Date().toISOString();
      
      // Check if this exact evidence already exists to prevent spam
      const evidenceExists = Object.values(existingEvidence).includes(evidence);
      
      if (!evidenceExists && (severity > existing.severity || Object.keys(existingEvidence).length < 10)) {
        // Only increment rugCount when:
        // 1. This is NEW evidence (evidenceExists === false, already checked)
        // 2. Severity is severe (> 80)
        // 3. This is a new occurrence (not just a higher severity for same wallet)
        const shouldIncrementRugCount = severity > 80 && severity > existing.severity;
        
        await db
          .update(badActorLabels)
          .set({
            severity: Math.max(severity, existing.severity), // Take higher severity
            rugCount: shouldIncrementRugCount ? existing.rugCount + 1 : existing.rugCount,
            evidenceData: {
              ...existingEvidence,
              [timestamp]: evidence,
            },
            updatedAt: new Date(),
          })
          .where(eq(badActorLabels.id, existing.id));
        
        console.log(`🔄 Updated wallet ${walletAddress.slice(0, 8)}... label ${labelType} (severity: ${Math.max(severity, existing.severity)})`);
      }
    } else {
      // Create new label
      await db.insert(badActorLabels).values({
        walletAddress,
        labelType,
        severity,
        rugCount: 0,
        evidenceData: {
          [new Date().toISOString()]: evidence,
        },
        detectionMethod,
        confidence: 80, // Rules-based has 80% confidence
        isActive: true,
      });
      
      console.log(`🚨 Flagged wallet ${walletAddress.slice(0, 8)}... as ${labelType} (severity: ${severity})`);
    }
  } catch (error) {
    // Ignore unique constraint violations (wallet already flagged with this type)
    if ((error as any).code !== '23505') {
      console.error("Error flagging wallet:", error);
    }
  }
}

/**
 * Report a wallet as suspicious (user-initiated)
 */
export async function reportWallet(
  walletAddress: string,
  reportType: string,
  evidence: string,
  reportedBy?: string
): Promise<void> {
  try {
    await flagWallet(
      walletAddress,
      reportType,
      60, // User reports start at 60 severity
      `User report: ${evidence}`,
      'manual_report'
    );
    
    // TODO: Implement review queue for manual reports
    console.log(`📝 User report received for ${walletAddress.slice(0, 8)}...`);
  } catch (error) {
    console.error("Error reporting wallet:", error);
    throw error;
  }
}

/**
 * Get blacklist statistics
 */
export async function getBlacklistStats() {
  try {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${badActorLabels.isActive} = true)`,
        ruggers: sql<number>`count(*) filter (where ${badActorLabels.labelType} = 'rugger_dev')`,
        scammers: sql<number>`count(*) filter (where ${badActorLabels.labelType} = 'scammer')`,
        honeypots: sql<number>`count(*) filter (where ${badActorLabels.labelType} = 'honeypot_creator')`,
        avgSeverity: sql<number>`avg(${badActorLabels.severity})`,
      })
      .from(badActorLabels);
    
    return stats;
  } catch (error) {
    console.error("Error getting blacklist stats:", error);
    return {
      total: 0,
      active: 0,
      ruggers: 0,
      scammers: 0,
      honeypots: 0,
      avgSeverity: 0,
    };
  }
}

/**
 * Get top flagged wallets
 */
export async function getTopFlaggedWallets(limit: number = 100) {
  try {
    const wallets = await db
      .select()
      .from(badActorLabels)
      .where(eq(badActorLabels.isActive, true))
      .orderBy(desc(badActorLabels.severity), desc(badActorLabels.rugCount))
      .limit(limit);
    
    return wallets;
  } catch (error) {
    console.error("Error getting top flagged wallets:", error);
    return [];
  }
}

/**
 * Mark a rug as confirmed (admin function)
 */
export async function confirmRug(
  tokenAddress: string,
  reviewedBy: string,
  victimCount?: number,
  totalLosses?: string
): Promise<void> {
  try {
    // Update analysis run
    await db
      .update(analysisRuns)
      .set({ rugDetected: true })
      .where(eq(analysisRuns.tokenAddress, tokenAddress));
    
    // Update bad actor labels for all associated wallets
    const analysis = await db
      .select()
      .from(analysisRuns)
      .where(eq(analysisRuns.tokenAddress, tokenAddress))
      .limit(1);
    
    if (analysis.length > 0) {
      const analysisData = analysis[0].analysisData as any as TokenAnalysisResponse;
      
      // Flag mint authority as serial rugger
      if (analysisData.mintAuthority.authorityAddress) {
        const [label] = await db
          .select()
          .from(badActorLabels)
          .where(eq(badActorLabels.walletAddress, analysisData.mintAuthority.authorityAddress))
          .limit(1);
        
        if (label) {
          await db
            .update(badActorLabels)
            .set({
              labelType: 'serial_rugger',
              severity: Math.min(100, label.severity + 10),
              rugCount: label.rugCount + 1,
              totalVictims: victimCount,
              totalLosses,
              reviewedBy,
              reviewedAt: new Date(),
            })
            .where(eq(badActorLabels.id, label.id));
        }
      }
    }
    
    console.log(`✅ Confirmed rug for token ${tokenAddress}`);
  } catch (error) {
    console.error("Error confirming rug:", error);
    throw error;
  }
}

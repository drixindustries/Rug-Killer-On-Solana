import { storage } from "../storage";
import { priceCache } from "../services/price-cache";
import { tokenAnalyzer } from "../solana-analyzer";
import { getTopFlaggedWallets } from "../ai-blacklist";
import type { InsertTrendingToken } from "@shared/schema";

/**
 * Analytics Worker
 * Collects token snapshots, calculates trending scores, and aggregates risk statistics
 * Designed to run periodically via BullMQ or setInterval
 */

export class AnalyticsWorker {
  private isRunning = false;
  private snapshotIntervalId?: NodeJS.Timeout;
  private trendingIntervalId?: NodeJS.Timeout;
  private statsIntervalId?: NodeJS.Timeout;

  /**
   * Start all analytics workers
   */
  start() {
    if (this.isRunning) {
      console.log("Analytics worker already running");
      return;
    }

    console.log("Starting analytics workers...");
    this.isRunning = true;

    // Snapshot collector - every 5 minutes
    this.runSnapshotCollector().catch(console.error);
    this.snapshotIntervalId = setInterval(() => {
      this.runSnapshotCollector().catch(console.error);
    }, 5 * 60 * 1000); // 5 minutes

    // Trending calculator - every 5 minutes
    this.runTrendingCalculator().catch(console.error);
    this.trendingIntervalId = setInterval(() => {
      this.runTrendingCalculator().catch(console.error);
    }, 5 * 60 * 1000); // 5 minutes

    // Risk statistics aggregator - once daily
    this.runRiskAggregator().catch(console.error);
    this.statsIntervalId = setInterval(() => {
      this.runRiskAggregator().catch(console.error);
    }, 24 * 60 * 60 * 1000); // 24 hours

    console.log("Analytics workers started successfully");
  }

  /**
   * Stop all analytics workers
   */
  stop() {
    if (this.snapshotIntervalId) clearInterval(this.snapshotIntervalId);
    if (this.trendingIntervalId) clearInterval(this.trendingIntervalId);
    if (this.statsIntervalId) clearInterval(this.statsIntervalId);
    
    this.snapshotIntervalId = undefined;
    this.trendingIntervalId = undefined;
    this.statsIntervalId = undefined;
    this.isRunning = false;
    
    console.log("Analytics workers stopped");
  }

  /**
   * Snapshot Collector - Captures token data every 5 minutes
   * Queries tokens from price cache and saves analysis snapshots
   */
  private async runSnapshotCollector(): Promise<void> {
    try {
      console.log("[Snapshot Collector] Starting...");

      // Get all tokens from price cache (recently analyzed)
      const recentTokens = priceCache.getRecentlyUpdated(60); // Last 60 minutes

      if (recentTokens.length === 0) {
        console.log("[Snapshot Collector] No recent tokens to snapshot");
        return;
      }

      console.log(`[Snapshot Collector] Processing ${recentTokens.length} tokens`);

      // Process tokens in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < recentTokens.length; i += batchSize) {
        const batch = recentTokens.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (tokenAddress) => {
            try {
              // Get current price data
              const priceData = priceCache.get(tokenAddress);
              
              // Get current analysis (lightweight - from cache if available)
              const analysis = await tokenAnalyzer.analyze(tokenAddress);

              // Extract transaction count
              const txCount24h = analysis.marketData?.txns24h
                ? analysis.marketData.txns24h.buys + analysis.marketData.txns24h.sells
                : undefined;

              // Save snapshot
              await storage.saveTokenSnapshot({
                tokenAddress,
                priceUsd: priceData?.priceUsd?.toString() || null,
                riskScore: analysis.riskScore,
                holderCount: analysis.holderCount,
                volume24h: priceData?.volume24h?.toString() || null,
                liquidityUsd: priceData?.liquidity?.toString() || null,
                riskFlags: analysis.redFlags.map(f => f.type),
                txCount24h,
                analyzerVersion: "1.0",
              });
            } catch (error) {
              console.error(`[Snapshot Collector] Error processing ${tokenAddress}:`, error);
            }
          })
        );
      }

      console.log(`[Snapshot Collector] Completed - ${recentTokens.length} snapshots saved`);
    } catch (error) {
      console.error("[Snapshot Collector] Fatal error:", error);
    }
  }

  /**
   * Trending Calculator - Calculates trending scores every 5 minutes
   * Score formula: volume24h * 0.4 + velocity * 0.3 + analyses * 0.3
   */
  private async runTrendingCalculator(): Promise<void> {
    try {
      console.log("[Trending Calculator] Starting...");

      // Get all tokens from price cache
      const allTokens = priceCache.getAllTokens();

      if (allTokens.length === 0) {
        console.log("[Trending Calculator] No tokens to analyze");
        return;
      }

      // Calculate scores for each token
      const scoredTokens = await Promise.all(
        allTokens.map(async (tokenAddress) => {
          const priceData = priceCache.get(tokenAddress);
          if (!priceData) return null;

          // Get historical data for velocity calculation
          const historical = await storage.getHistoricalData(tokenAddress, 1); // Last 24h
          
          // Calculate velocity (rate of price change)
          let velocity = 0;
          if (historical.length >= 2) {
            const oldest = historical[0];
            const newest = historical[historical.length - 1];
            if (oldest.priceUsd && newest.priceUsd) {
              const oldPrice = parseFloat(oldest.priceUsd);
              const newPrice = parseFloat(newest.priceUsd);
              velocity = ((newPrice - oldPrice) / oldPrice) * 100;
            }
          }

          // Normalize volume (0-100 scale, assuming max volume of 10M)
          const volumeScore = Math.min(100, ((priceData.volume24h || 0) / 10_000_000) * 100) * 0.4;

          // Normalize velocity (0-100 scale, cap at +/-500%)
          const velocityScore = Math.min(100, Math.max(0, ((velocity + 500) / 1000) * 100)) * 0.3;

          // Analysis frequency score (more snapshots = more activity)
          const analysisScore = Math.min(100, historical.length * 2) * 0.3;

          const totalScore = volumeScore + velocityScore + analysisScore;

          return {
            tokenAddress,
            score: totalScore,
            scoreBreakdown: {
              volumeScore,
              velocityScore,
              analysisScore,
            },
            volume24h: priceData.volume24h,
            velocity,
          };
        })
      );

      // Filter nulls and sort by score
      const validScores = scoredTokens
        .filter((t): t is NonNullable<typeof t> => t !== null)
        .sort((a, b) => b.score - a.score);

      // Take top 50 and assign ranks
      const top50: InsertTrendingToken[] = validScores.slice(0, 50).map((token, index) => ({
        tokenAddress: token.tokenAddress,
        score: token.score.toString(),
        scoreBreakdown: token.scoreBreakdown,
        rank: index + 1,
        volume24h: token.volume24h?.toString(),
        velocity: token.velocity.toString(),
      }));

      // Update trending tokens table
      await storage.updateTrendingScores(top50);

      console.log(`[Trending Calculator] Completed - Top 50 tokens ranked`);
    } catch (error) {
      console.error("[Trending Calculator] Fatal error:", error);
    }
  }

  /**
   * Risk Statistics Aggregator - Runs daily
   * Aggregates risk data from snapshots and blacklist
   */
  private async runRiskAggregator(): Promise<void> {
    try {
      console.log("[Risk Aggregator] Starting...");

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get blacklist for rug detection count
      const blacklist = await getTopFlaggedWallets();

      // Aggregate 7-day stats
      await this.aggregateRiskWindow(sevenDaysAgo, now, blacklist.length);

      // Aggregate 30-day stats
      await this.aggregateRiskWindow(thirtyDaysAgo, now, blacklist.length);

      console.log("[Risk Aggregator] Completed");
    } catch (error) {
      console.error("[Risk Aggregator] Fatal error:", error);
    }
  }

  /**
   * Helper: Aggregate risk statistics for a time window
   */
  private async aggregateRiskWindow(
    windowStart: Date,
    windowEnd: Date,
    rugCount: number
  ): Promise<void> {
    // Get all snapshots in window (would need a more efficient query in production)
    const allSnapshots = await storage.getHistoricalData("", Math.ceil((windowEnd.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000)));

    // Count unique tokens
    const uniqueTokens = new Set(allSnapshots.map(s => s.tokenAddress));
    const totalAnalyzed = uniqueTokens.size;

    // Count common flags
    const flagCounts: Record<string, number> = {};
    for (const snapshot of allSnapshots) {
      if (snapshot.riskFlags && Array.isArray(snapshot.riskFlags)) {
        for (const flag of snapshot.riskFlags) {
          flagCounts[flag] = (flagCounts[flag] || 0) + 1;
        }
      }
    }

    // Save statistics
    await storage.saveRiskStatistics({
      windowStart,
      windowEnd,
      totalAnalyzed,
      rugDetected: rugCount,
      falsePositives: 0, // Would need manual tracking
      commonFlags: flagCounts,
    });

    console.log(`[Risk Aggregator] Saved stats for ${windowStart.toISOString()} to ${windowEnd.toISOString()}`);
  }
}

// Singleton instance
export const analyticsWorker = new AnalyticsWorker();

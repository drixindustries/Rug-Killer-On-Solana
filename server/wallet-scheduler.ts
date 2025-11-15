/**
 * Scheduled Jobs for Wallet Discovery and Management
 * 
 * Runs periodic tasks:
 * - Discover new profitable wallets from successful tokens
 * - Update wallet performance metrics
 * - Aggregate wallets from external sources
 * - Clean up inactive/low-performing wallets
 */

import { getWalletDiscoveryService } from './services/wallet-discovery';
import { getExternalWalletService } from './services/external-wallet-sources';
import { db } from './db';
import { kolWallets } from '../shared/schema';
import { lt, lte } from 'drizzle-orm';

export class WalletDiscoveryScheduler {
  private discoveryInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start all scheduled jobs
   */
  start(): void {
    if (this.isRunning) {
      console.log('[Wallet Scheduler] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[Wallet Scheduler] Starting wallet discovery scheduler...');

    // Run immediately on startup
    this.runDiscoveryJob().catch(console.error);

    // Then run every 6 hours
    this.discoveryInterval = setInterval(() => {
      this.runDiscoveryJob().catch(console.error);
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    this.isRunning = false;
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    console.log('[Wallet Scheduler] Stopped');
  }

  /**
   * Main discovery job
   */
  private async runDiscoveryJob(): Promise<void> {
    console.log('[Wallet Scheduler] Starting discovery job...');
    const startTime = Date.now();

    try {
      // 1. Get recently successful tokens from pump.fun
      const successfulTokens = await this.getRecentSuccessfulTokens();
      console.log(`[Wallet Scheduler] Found ${successfulTokens.length} successful tokens to analyze`);

      // 2. Discover wallets from those tokens
      if (successfulTokens.length > 0) {
        const discoveryService = getWalletDiscoveryService();
        const newWallets = await discoveryService.discoverProfitableWallets(successfulTokens);
        console.log(`[Wallet Scheduler] Discovered ${newWallets.length} new profitable wallets`);
      }

      // 3. Aggregate from external sources
      const externalService = getExternalWalletService();
      await externalService.aggregateAllSources();

      // 4. Clean up low-performing wallets
      await this.cleanupLowPerformingWallets();

      // 5. Update influence scores
      await this.updateInfluenceScores();

      const duration = Date.now() - startTime;
      console.log(`[Wallet Scheduler] Discovery job completed in ${duration}ms`);
    } catch (error) {
      console.error('[Wallet Scheduler] Discovery job failed:', error);
    }
  }

  /**
   * Get recently successful tokens (10x+ from launch)
   * In production, this would query DexScreener or pump.fun API
   */
  private async getRecentSuccessfulTokens(): Promise<string[]> {
    // TODO: Implement actual API calls
    // For now, return empty array
    // In production:
    // 1. Query DexScreener for tokens with high volume/gains
    // 2. Filter for tokens launched in last 7 days
    // 3. Filter for 10x+ gains
    // 4. Return their mint addresses
    
    console.log('[Wallet Scheduler] Token discovery not yet implemented - requires DexScreener API');
    return [];
  }

  /**
   * Remove wallets that haven't been active or are underperforming
   */
  private async cleanupLowPerformingWallets(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Remove auto-discovered wallets that:
      // - Haven't been active in 30 days
      // - Have influence score < 40
      const result = await db
        .delete(kolWallets)
        .where(
          db.and(
            db.eq(kolWallets.source, 'auto-discovered'),
            db.or(
              db.lt(kolWallets.lastActiveAt, thirtyDaysAgo),
              db.lte(kolWallets.influenceScore, 40)
            )
          )
        )
        .returning();

      console.log(`[Wallet Scheduler] Cleaned up ${result.length} inactive/low-performing wallets`);
    } catch (error) {
      console.error('[Wallet Scheduler] Cleanup error:', error);
    }
  }

  /**
   * Recalculate influence scores based on recent performance
   */
  private async updateInfluenceScores(): Promise<void> {
    try {
      const allWallets = await db.select().from(kolWallets);

      for (const wallet of allWallets) {
        const wins = wallet.wins || 0;
        const losses = wallet.losses || 0;
        const totalTrades = wins + losses;
        
        if (totalTrades > 0) {
          const winRate = wins / totalTrades;
          const profitBonus = Math.min(50, Number(wallet.profitSol || 0) * 2);
          const newScore = Math.min(100, Math.floor(winRate * 50 + profitBonus));

          if (newScore !== wallet.influenceScore) {
            await db
              .update(kolWallets)
              .set({ influenceScore: newScore, updatedAt: new Date() })
              .where(db.eq(kolWallets.id, wallet.id));
          }
        }
      }

      console.log(`[Wallet Scheduler] Updated influence scores for ${allWallets.length} wallets`);
    } catch (error) {
      console.error('[Wallet Scheduler] Influence score update error:', error);
    }
  }

  /**
   * Get current scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.discoveryInterval ? 'Every 6 hours' : 'Not scheduled',
    };
  }
}

// Singleton instance
let schedulerInstance: WalletDiscoveryScheduler | null = null;

export function getWalletScheduler(): WalletDiscoveryScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new WalletDiscoveryScheduler();
  }
  return schedulerInstance;
}

/**
 * Initialize wallet discovery on server startup
 */
export function initializeWalletDiscovery(): void {
  const scheduler = getWalletScheduler();
  scheduler.start();
  console.log('[Wallet Discovery] Scheduler initialized');
}

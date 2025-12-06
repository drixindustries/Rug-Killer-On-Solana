/**
 * Cache Pre-Warming Service
 * Pre-fetches and caches token data before users request it
 * Triggered by WebSocket events from Helius
 */

import { tokenAnalyzer } from '../solana-analyzer.js';
import { DexScreenerService } from '../dexscreener-service.js';
import { holderAnalysis } from './holder-analysis.js';
import { checkPumpFun } from './pumpfun-api.js';
import { redisCache } from './redis-cache.js';

class CachePreWarmingService {
  private dexScreener: DexScreenerService;
  private warmingInProgress: Set<string> = new Set();
  private warmedTokens: Map<string, number> = new Map(); // mint -> timestamp
  private readonly REWARM_INTERVAL = 4 * 60 * 1000; // 4 minutes (before 5 min cache expires)

  constructor() {
    this.dexScreener = new DexScreenerService();
  }

  /**
   * Pre-warm cache for a token (triggered by WebSocket detection)
   * Fetches ALL data in parallel so when user requests, it's instant
   */
  async warmToken(mintAddress: string): Promise<void> {
    // Skip if already warming or recently warmed
    if (this.warmingInProgress.has(mintAddress)) {
      console.log(`[Cache Warmer] ⏭️ Skip ${mintAddress} - already warming`);
      return;
    }

    const lastWarmed = this.warmedTokens.get(mintAddress);
    if (lastWarmed && Date.now() - lastWarmed < this.REWARM_INTERVAL) {
      console.log(`[Cache Warmer] ⏭️ Skip ${mintAddress} - warmed ${Math.round((Date.now() - lastWarmed) / 1000)}s ago`);
      return;
    }

    this.warmingInProgress.add(mintAddress);
    const startTime = Date.now();
    
    try {
      console.log(`[Cache Warmer] 🔥 Warming cache for ${mintAddress}...`);

      // Fetch all data sources in parallel with aggressive timeouts
      const warmPromises = [
        // DexScreener (most important for price/liquidity)
        this.dexScreener.getTokenData(mintAddress)
          .catch(() => null),
        
        // Pump.fun check (fast, 5s timeout)
        Promise.race([
          checkPumpFun(mintAddress),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]).catch(() => null),
        
        // Holder analysis (slower, 15s timeout)
        Promise.race([
          holderAnalysis.analyzeHolders(mintAddress),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
        ]).catch(() => null),
        
        // Full token analysis (caches everything)
        Promise.race([
          tokenAnalyzer.analyzeToken(mintAddress),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000))
        ]).catch(() => null),
      ];

      const [dex, pumpFun, holders, analysis] = await Promise.all(warmPromises);

      const elapsed = Date.now() - startTime;
      const successCount = [dex, pumpFun, holders, analysis].filter(Boolean).length;

      console.log(`[Cache Warmer] ✅ Warmed ${mintAddress} in ${elapsed}ms - ${successCount}/4 sources cached`);
      
      this.warmedTokens.set(mintAddress, Date.now());
      
      // Emit metrics
      this.emit('token_warmed', {
        mint: mintAddress,
        duration: elapsed,
        sources: successCount,
        cached: {
          dexScreener: !!dex,
          pumpFun: !!pumpFun,
          holders: !!holders,
          fullAnalysis: !!analysis,
        }
      });

    } catch (error) {
      console.error(`[Cache Warmer] ❌ Failed to warm ${mintAddress}:`, error);
    } finally {
      this.warmingInProgress.delete(mintAddress);
    }
  }

  /**
   * Pre-warm multiple tokens in batch (background job)
   */
  async warmBatch(mintAddresses: string[]): Promise<void> {
    console.log(`[Cache Warmer] 🔥 Batch warming ${mintAddresses.length} tokens...`);
    
    // Process in batches of 3 to avoid overwhelming RPC
    const batchSize = 3;
    for (let i = 0; i < mintAddresses.length; i += batchSize) {
      const batch = mintAddresses.slice(i, i + batchSize);
      await Promise.all(batch.map(mint => this.warmToken(mint)));
      
      // Small delay between batches
      if (i + batchSize < mintAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`[Cache Warmer] ✅ Batch complete - ${mintAddresses.length} tokens warmed`);
  }

  /**
   * Check if token is warmed (cached)
   */
  isWarmed(mintAddress: string): boolean {
    const lastWarmed = this.warmedTokens.get(mintAddress);
    if (!lastWarmed) return false;
    
    // Consider warmed if cached within last 4 minutes
    return Date.now() - lastWarmed < this.REWARM_INTERVAL;
  }

  /**
   * Get warming statistics
   */
  getStats() {
    return {
      warming: this.warmingInProgress.size,
      warmed: this.warmedTokens.size,
      tokens: Array.from(this.warmedTokens.entries()).map(([mint, time]) => ({
        mint,
        age: Math.round((Date.now() - time) / 1000),
      })),
    };
  }

  /**
   * Clear old warmed tokens (cleanup)
   */
  cleanup() {
    const now = Date.now();
    const expired: string[] = [];
    
    for (const [mint, timestamp] of this.warmedTokens.entries()) {
      if (now - timestamp > 10 * 60 * 1000) { // 10 minutes
        expired.push(mint);
      }
    }
    
    expired.forEach(mint => this.warmedTokens.delete(mint));
    
    if (expired.length > 0) {
      console.log(`[Cache Warmer] 🧹 Cleaned up ${expired.length} expired entries`);
    }
  }

  private emit(event: string, data: any) {
    // Could integrate with EventEmitter if needed
  }
}

// Singleton instance
export const cacheWarmer = new CachePreWarmingService();

// Cleanup old entries every 5 minutes
setInterval(() => {
  cacheWarmer.cleanup();
}, 5 * 60 * 1000);

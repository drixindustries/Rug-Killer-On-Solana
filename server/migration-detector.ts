/**
 * Pump.fun Migration Detector
 * 
 * Detects when tokens migrate from Pump.fun bonding curve to Raydium AMM.
 * Migration happens at ~$69K market cap: ~206.9M tokens + ~79 SOL deposited into new Raydium pool.
 * 
 * Critical for accurate rug detection:
 * - Pre-migration: Bonding curve holds 80-100% supply (ignore in metrics)
 * - Post-migration: Real holder distribution visible (apply strict checks)
 * 
 * Detection latency: <1 second via WebSocket monitoring
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { isPumpFunBondingCurve } from './pumpfun-system-wallets';

// ============================================================================
// Constants
// ============================================================================

/** Pump.fun migrator PDA - handles all migrations */
export const MIGRATOR_ACCOUNT = '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg';

/** Raydium AMM V4 program ID */
export const RAYDIUM_PROGRAM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';

/** Pump.fun main program ID */
export const PUMPFUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

// ============================================================================
// Types
// ============================================================================

export interface MigrationEvent {
  /** Token mint address */
  tokenMint: string;
  
  /** New Raydium LP pool address */
  raydiumLP: string;
  
  /** Migration transaction signature */
  signature: string;
  
  /** Unix timestamp (seconds) */
  timestamp: number;
  
  /** Block slot */
  slot: number;
  
  /** Initial liquidity (SOL) */
  initialLiquiditySOL?: number;
  
  /** Initial token amount */
  initialTokenAmount?: number;
}

export type MigrationCallback = (event: MigrationEvent) => void | Promise<void>;

// ============================================================================
// Migration Detector
// ============================================================================

export class MigrationDetector {
  private callbacks: MigrationCallback[] = [];
  private recentMigrations = new Map<string, MigrationEvent>(); // tokenMint -> event
  private isRunning = false;
  private subscriptionId: number | null = null;

  constructor(
    private connection: Connection,
    private options = {
      /** Max migrations to keep in memory */
      maxCacheSize: 1000,
      /** Enable debug logging */
      debug: process.env.MIGRATION_DETECTOR_DEBUG === 'true',
    }
  ) {}

  /**
   * Register a callback for migration events
   */
  onMigration(callback: MigrationCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Start listening for migrations via WebSocket
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[MIGRATION] Detector already running');
      return;
    }

    this.isRunning = true;
    console.log('[MIGRATION] Starting migration detector...');

    try {
      // Subscribe to logs mentioning migrator account
      this.subscriptionId = this.connection.onLogs(
        new PublicKey(MIGRATOR_ACCOUNT),
        async (logs, context) => {
          try {
            if (logs.err) return; // Skip failed transactions

            const signature = logs.signature;
            
            if (this.options.debug) {
              console.log(`[MIGRATION] Potential migration tx: ${signature}`);
            }

            // Decode transaction to extract migration details
            const migrationEvent = await this.decodeMigrationTx(signature);
            
            if (migrationEvent) {
              await this.handleMigrationEvent(migrationEvent);
            }
          } catch (error) {
            console.error('[MIGRATION] Error processing log:', error);
          }
        },
        'confirmed'
      );

      console.log('[MIGRATION] Detector started successfully (subscription ID:', this.subscriptionId, ')');
    } catch (error) {
      console.error('[MIGRATION] Failed to start detector:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop listening for migrations
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('[MIGRATION] Stopping migration detector...');
    
    if (this.subscriptionId !== null) {
      await this.connection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = null;
    }

    this.isRunning = false;
    console.log('[MIGRATION] Detector stopped');
  }

  /**
   * Decode migration transaction to extract token mint and LP address
   */
  private async decodeMigrationTx(signature: string): Promise<MigrationEvent | null> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx || !tx.meta || !tx.blockTime) {
        return null;
      }

      // Look for Raydium initialize instruction
      const instructions = tx.transaction.message.instructions;
      
      for (const ix of instructions) {
        // Check if it's a Raydium program instruction
        if ('programId' in ix && ix.programId.toBase58() === RAYDIUM_PROGRAM) {
          // Try to extract accounts from instruction
          if ('accounts' in ix && Array.isArray(ix.accounts)) {
            const accounts = ix.accounts as PublicKey[];
            
            // Typical Raydium initialize2 layout:
            // accounts[0] = token program
            // accounts[4] = amm (LP pool)
            // accounts[8] = pool coin token account (base mint - our token)
            // accounts[9] = pool pc token account (quote mint - WSOL)
            
            if (accounts.length >= 10) {
              const lpAddress = accounts[4]?.toBase58();
              
              // Find token mint from inner instructions or account changes
              const tokenMint = await this.extractTokenMintFromTx(tx);
              
              if (tokenMint && lpAddress) {
                const migrationEvent: MigrationEvent = {
                  tokenMint,
                  raydiumLP: lpAddress,
                  signature,
                  timestamp: tx.blockTime,
                  slot: tx.slot,
                };

                if (this.options.debug) {
                  console.log('[MIGRATION] Decoded migration:', migrationEvent);
                }

                return migrationEvent;
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      if (this.options.debug) {
        console.error('[MIGRATION] Error decoding tx:', error);
      }
      return null;
    }
  }

  /**
   * Extract token mint from transaction metadata
   * Looks for SPL token transfers in inner instructions
   */
  private async extractTokenMintFromTx(tx: any): Promise<string | null> {
    try {
      // Check pre/post token balances for new mints
      const preBalances = tx.meta?.preTokenBalances || [];
      const postBalances = tx.meta?.postTokenBalances || [];

      // Find token that appears in post but not pre (newly created LP)
      for (const post of postBalances) {
        const mint = post.mint;
        
        // Skip WSOL
        if (mint === 'So11111111111111111111111111111111111111112') continue;
        
        // Check if this is a new token (not in pre-balances)
        const inPre = preBalances.some((pre: any) => pre.mint === mint);
        if (!inPre) {
          return mint;
        }
      }

      // Fallback: look for most common non-WSOL mint in post-balances
      const mintCounts = new Map<string, number>();
      for (const balance of postBalances) {
        const mint = balance.mint;
        if (mint !== 'So11111111111111111111111111111111111111112') {
          mintCounts.set(mint, (mintCounts.get(mint) || 0) + 1);
        }
      }

      if (mintCounts.size > 0) {
        const [mostCommonMint] = [...mintCounts.entries()].sort((a, b) => b[1] - a[1])[0];
        return mostCommonMint;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Handle detected migration event
   */
  private async handleMigrationEvent(event: MigrationEvent): Promise<void> {
    // Cache event
    this.recentMigrations.set(event.tokenMint, event);
    
    // Trim cache if too large
    if (this.recentMigrations.size > this.options.maxCacheSize) {
      const firstKey = this.recentMigrations.keys().next().value;
      this.recentMigrations.delete(firstKey);
    }

    console.log(`[MIGRATION] 🚀 DETECTED: ${event.tokenMint} → Raydium LP ${event.raydiumLP.slice(0, 8)}...`);

    // Notify all callbacks
    for (const callback of this.callbacks) {
      try {
        await callback(event);
      } catch (error) {
        console.error('[MIGRATION] Callback error:', error);
      }
    }
  }

  /**
   * Check if a token has migrated (from cache)
   */
  hasMigrated(tokenMint: string): boolean {
    return this.recentMigrations.has(tokenMint);
  }

  /**
   * Get migration details for a token (from cache)
   */
  getMigrationEvent(tokenMint: string): MigrationEvent | null {
    return this.recentMigrations.get(tokenMint) || null;
  }

  /**
   * Check if token is in pre-migration phase by analyzing top holder
   * 
   * @param topHolderAddress Address of top holder
   * @returns true if top holder is bonding curve (pre-migration)
   */
  static isPreMigration(topHolderAddress: string): boolean {
    return isPumpFunBondingCurve(topHolderAddress);
  }

  /**
   * Get recent migrations (for analytics/vault detection)
   */
  getRecentMigrations(limit: number = 100): MigrationEvent[] {
    const events = Array.from(this.recentMigrations.values());
    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Manually check if a token has migrated by querying Raydium pools
   * Use this for tokens that may have migrated before detector started
   * 
   * @param tokenMint Token mint address
   * @returns Migration event if found, null otherwise
   */
  async checkMigrationStatus(tokenMint: string): Promise<MigrationEvent | null> {
    try {
      // Check cache first
      const cached = this.getMigrationEvent(tokenMint);
      if (cached) return cached;

      // Query DexScreener for Raydium pair
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
      const data = await response.json();

      const raydiumPair = data.pairs?.find((pair: any) => 
        pair.chainId === 'solana' && 
        pair.dexId === 'raydium'
      );

      if (raydiumPair) {
        // Token has migrated
        const event: MigrationEvent = {
          tokenMint,
          raydiumLP: raydiumPair.pairAddress,
          signature: 'historical', // Unknown signature
          timestamp: Math.floor(raydiumPair.pairCreatedAt / 1000) || Date.now(),
          slot: 0,
        };

        // Cache it
        this.recentMigrations.set(tokenMint, event);
        
        return event;
      }

      return null;
    } catch (error) {
      console.error('[MIGRATION] Error checking migration status:', error);
      return null;
    }
  }

  /**
   * Get detector statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      subscriptionId: this.subscriptionId,
      cachedMigrations: this.recentMigrations.size,
      callbacksRegistered: this.callbacks.length,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalDetector: MigrationDetector | null = null;

/**
 * Get or create global migration detector instance
 */
export function getMigrationDetector(connection?: Connection): MigrationDetector {
  if (!globalDetector && connection) {
    globalDetector = new MigrationDetector(connection);
  }
  
  if (!globalDetector) {
    throw new Error('Migration detector not initialized. Provide a Connection instance.');
  }
  
  return globalDetector;
}

// Export everything
export default MigrationDetector;

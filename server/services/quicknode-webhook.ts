/**
 * QuickNode Streams Webhook Service
 * Real-time blockchain data streaming using QuickNode Streams
 * 
 * Features:
 * - Account monitoring (new tokens, liquidity pools)
 * - Transaction filtering (DEX swaps, mints)
 * - Function call monitoring (specific program instructions)
 * - Low latency (~200ms from on-chain to webhook)
 */

import { EventEmitter } from 'events';
import { tokenAnalyzer } from '../solana-analyzer.ts';
import type { TokenAnalysisResponse } from '../../shared/schema.ts';

export interface QuickNodeStreamPayload {
  dataset: string;
  network: string;
  block: {
    number: number;
    hash: string;
    timestamp: number;
  };
  transaction: {
    hash: string;
    from: string;
    to?: string;
    value?: string;
    input?: string;
  };
  logs?: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
  type: 'account' | 'transaction' | 'function';
}

export interface QuickNodeAccountUpdate {
  account: string;
  lamports: number;
  owner: string;
  executable: boolean;
  rentEpoch: number;
  data: string;
  slot: number;
}

/**
 * QuickNode Streams Service
 */
export class QuickNodeWebhookService extends EventEmitter {
  private readonly QUICKNODE_STREAM_URL: string | undefined;
  private readonly QUICKNODE_STREAM_ID: string | undefined;
  private isActive = false;
  private processedTransactions = new Set<string>();
  private readonly MAX_CACHE_SIZE = 5000;

  // Programs to monitor
  private readonly MONITORED_PROGRAMS = [
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // SPL Token
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // Token-2022
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca
  ];

  constructor() {
    super();
    this.QUICKNODE_STREAM_URL = process.env.QUICKNODE_STREAM_URL?.trim();
    this.QUICKNODE_STREAM_ID = process.env.QUICKNODE_STREAM_ID?.trim();

    if (!this.QUICKNODE_STREAM_URL) {
      console.warn('[QuickNode Webhook] No stream URL configured');
    }
  }

  /**
   * Initialize webhook service
   */
  public async start(): Promise<void> {
    if (!this.QUICKNODE_STREAM_URL) {
      console.log('[QuickNode Webhook] Skipping - no stream URL configured');
      return;
    }

    try {
      console.log('[QuickNode Webhook] Starting stream monitoring...');
      this.isActive = true;
      this.emit('started');
      console.log('[QuickNode Webhook] ✅ Ready to receive stream events');
    } catch (error) {
      console.error('[QuickNode Webhook] Start error:', error);
      throw error;
    }
  }

  /**
   * Process incoming webhook payload from QuickNode Stream
   */
  public async processWebhook(payload: QuickNodeStreamPayload | QuickNodeStreamPayload[]): Promise<void> {
    const payloads = Array.isArray(payload) ? payload : [payload];
    
    console.log(`[QuickNode Webhook] Processing ${payloads.length} stream events`);

    for (const event of payloads) {
      try {
        const txHash = event.transaction?.hash;
        
        // Skip duplicates
        if (txHash && this.processedTransactions.has(txHash)) continue;
        if (txHash) this.addToCache(txHash);

        // Route by event type
        switch (event.type) {
          case 'account':
            await this.handleAccountUpdate(event);
            break;
          case 'transaction':
            await this.handleTransaction(event);
            break;
          case 'function':
            await this.handleFunctionCall(event);
            break;
          default:
            console.log('[QuickNode Webhook] Unknown event type:', event.type);
        }

        // Emit raw event
        this.emit('stream_event', event);
      } catch (error) {
        console.error('[QuickNode Webhook] Event processing error:', error);
      }
    }
  }

  /**
   * Handle account update (new token mint, LP pool creation, etc.)
   */
  private async handleAccountUpdate(event: QuickNodeStreamPayload): Promise<void> {
    try {
      console.log('[QuickNode Webhook] 📦 Account update:', event.transaction.to);
      
      // Check if this is a token mint account
      if (event.logs && event.logs.length > 0) {
        for (const log of event.logs) {
          // Token mint initialization signature
          if (this.isTokenMintLog(log)) {
            const mintAddress = log.address;
            
            console.log('[QuickNode Webhook] 🆕 New token mint detected:', mintAddress);
            
            this.emit('token_created', {
              mint: mintAddress,
              transaction: event.transaction.hash,
              block: event.block.number,
              timestamp: event.block.timestamp,
            });

            // Auto-analyze
            if (process.env.AUTO_ANALYZE_NEW_TOKENS === 'true') {
              await this.analyzeNewToken(mintAddress);
            }
          }
        }
      }
    } catch (error) {
      console.error('[QuickNode Webhook] Account update handler error:', error);
    }
  }

  /**
   * Handle transaction event
   */
  private async handleTransaction(event: QuickNodeStreamPayload): Promise<void> {
    try {
      console.log('[QuickNode Webhook] 💰 Transaction:', event.transaction.hash);
      
      this.emit('transaction', {
        hash: event.transaction.hash,
        from: event.transaction.from,
        to: event.transaction.to,
        value: event.transaction.value,
        block: event.block.number,
        timestamp: event.block.timestamp,
      });
    } catch (error) {
      console.error('[QuickNode Webhook] Transaction handler error:', error);
    }
  }

  /**
   * Handle program function call
   */
  private async handleFunctionCall(event: QuickNodeStreamPayload): Promise<void> {
    try {
      console.log('[QuickNode Webhook] ⚙️ Function call on program:', event.transaction.to);
      
      this.emit('function_call', {
        program: event.transaction.to,
        transaction: event.transaction.hash,
        input: event.transaction.input,
        block: event.block.number,
        timestamp: event.block.timestamp,
      });
    } catch (error) {
      console.error('[QuickNode Webhook] Function call handler error:', error);
    }
  }

  /**
   * Check if log is a token mint initialization
   */
  private isTokenMintLog(log: { address: string; topics: string[]; data: string }): boolean {
    // Check for InitializeMint or InitializeMint2 instruction
    // This is a simplified check - you may need to adjust based on actual log format
    return log.topics.length > 0 && (
      log.topics[0].includes('InitializeMint') ||
      log.data.includes('InitializeMint')
    );
  }

  /**
   * Auto-analyze newly detected token
   */
  private async analyzeNewToken(mintAddress: string): Promise<void> {
    try {
      console.log('[QuickNode Webhook] 🔍 Auto-analyzing token:', mintAddress);
      
      // Small delay to ensure token is indexed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const analysis = await tokenAnalyzer.analyzeToken(mintAddress);
      
      this.emit('token_analyzed', {
        mint: mintAddress,
        analysis,
        timestamp: Date.now(),
      });

      console.log(`[QuickNode Webhook] ✅ Analysis complete: ${analysis.metadata.symbol} - Risk: ${analysis.riskLevel}`);
    } catch (error) {
      console.error(`[QuickNode Webhook] Auto-analysis failed for ${mintAddress}:`, error);
    }
  }

  /**
   * Add transaction to processed cache
   */
  private addToCache(txHash: string): void {
    this.processedTransactions.add(txHash);
    
    // Prevent memory leak
    if (this.processedTransactions.size > this.MAX_CACHE_SIZE) {
      const firstKey = this.processedTransactions.values().next().value;
      this.processedTransactions.delete(firstKey);
    }
  }

  /**
   * Stop webhook service
   */
  public async stop(): Promise<void> {
    this.isActive = false;
    this.emit('stopped');
    console.log('[QuickNode Webhook] Monitoring stopped');
  }

  /**
   * Get service status
   */
  public getStatus() {
    return {
      isActive: this.isActive,
      hasStreamUrl: !!this.QUICKNODE_STREAM_URL,
      hasStreamId: !!this.QUICKNODE_STREAM_ID,
      processedCount: this.processedTransactions.size,
      monitoredPrograms: this.MONITORED_PROGRAMS.length,
    };
  }

  /**
   * Get monitored programs list
   */
  public getMonitoredPrograms(): string[] {
    return [...this.MONITORED_PROGRAMS];
  }
}

// Export singleton
export const quickNodeWebhook = new QuickNodeWebhookService();

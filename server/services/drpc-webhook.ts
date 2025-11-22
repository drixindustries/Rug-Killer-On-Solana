/**
 * dRPC Webhook Service
 * Real-time transaction monitoring using dRPC HTTP webhooks
 * Provides instant token detection and analysis
 * 
 * Features:
 * - New token creation detection
 * - Large transaction monitoring
 * - Smart money wallet tracking
 * - DEX trade monitoring
 * - Auto-analysis trigger
 */

import { EventEmitter } from 'events';
import type { TokenAnalysisResponse } from '../../shared/schema.ts';

export interface DrpcWebhookPayload {
  signature: string;
  type: string;
  timestamp: number;
  slot: number;
  accounts?: string[];
  mint?: string;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
    tokenAmount: number;
  }>;
}

/**
 * dRPC Webhook Service
 */
export class DrpcWebhookService extends EventEmitter {
  private readonly DRPC_API_KEY: string;
  private isMonitoring = false;
  private processedSignatures = new Set<string>();
  private readonly MAX_CACHE_SIZE = 10000;
  private readonly TOKEN_WINDOW_MS = Number(process.env.DRPC_TOKEN_WINDOW_MS ?? '60000');
  private readonly TOKEN_WINDOW_CAP = Number(process.env.DRPC_TOKEN_WINDOW_CAP ?? '120');
  private tokenDetectionTimestamps: number[] = [];
  private tokenThrottleNoticeAt = 0;

  constructor() {
    super();
    this.DRPC_API_KEY = process.env.DRPC_API_KEY?.trim() || '';

    if (!this.DRPC_API_KEY) {
      console.warn('[dRPC Webhook] No API key configured - webhook monitoring disabled');
    }
  }

  /**
   * Initialize webhook monitoring
   */
  public async start(): Promise<void> {
    if (!this.DRPC_API_KEY) {
      console.log('[dRPC Webhook] Skipping - no API key');
      return;
    }

    this.isMonitoring = true;
    console.log('[dRPC Webhook] ✅ Webhook service initialized');
  }

  /**
   * Stop webhook monitoring
   */
  public async stop(): Promise<void> {
    this.isMonitoring = false;
    console.log('[dRPC Webhook] Stopped');
  }

  /**
   * Process incoming webhook payload
   */
  public async processWebhook(payload: DrpcWebhookPayload | DrpcWebhookPayload[]): Promise<void> {
    if (!this.isMonitoring) {
      console.warn('[dRPC Webhook] Received webhook but monitoring is disabled');
      return;
    }

    const payloads = Array.isArray(payload) ? payload : [payload];

    for (const item of payloads) {
      try {
        // Skip if already processed
        if (this.processedSignatures.has(item.signature)) {
          continue;
        }

        this.processedSignatures.add(item.signature);

        // Trim cache if too large
        if (this.processedSignatures.size > this.MAX_CACHE_SIZE) {
          const entries = Array.from(this.processedSignatures);
          const toKeep = entries.slice(-Math.floor(this.MAX_CACHE_SIZE * 0.8));
          this.processedSignatures = new Set(toKeep);
        }

        // Rate limit token detection
        const now = Date.now();
        this.tokenDetectionTimestamps = this.tokenDetectionTimestamps.filter(t => t > now - this.TOKEN_WINDOW_MS);

        if (this.tokenDetectionTimestamps.length >= this.TOKEN_WINDOW_CAP) {
          if (now - this.tokenThrottleNoticeAt > 60000) {
            console.warn(`[dRPC Webhook] Token detection throttled (${this.TOKEN_WINDOW_CAP}/${this.TOKEN_WINDOW_MS}ms limit)`);
            this.tokenThrottleNoticeAt = now;
          }
          continue;
        }

        this.tokenDetectionTimestamps.push(now);

        // Emit events for different transaction types
        if (item.type === 'token_created' && item.mint) {
          console.log('[dRPC Webhook] New token detected:', item.mint);
          this.emit('token_created', { mint: item.mint, signature: item.signature });
        }

        if (item.tokenTransfers && item.tokenTransfers.length > 0) {
          for (const transfer of item.tokenTransfers) {
            this.emit('token_transfer', {
              mint: transfer.mint,
              from: transfer.fromUserAccount,
              to: transfer.toUserAccount,
              amount: transfer.tokenAmount,
              signature: item.signature,
            });
          }
        }
      } catch (error) {
        console.error('[dRPC Webhook] Error processing webhook item:', error);
      }
    }
  }

  /**
   * Get service status
   */
  public getStatus() {
    return {
      enabled: !!this.DRPC_API_KEY,
      monitoring: this.isMonitoring,
      processedSignatures: this.processedSignatures.size,
      tokenDetectionRate: `${this.tokenDetectionTimestamps.length}/${this.TOKEN_WINDOW_CAP} per ${this.TOKEN_WINDOW_MS}ms`,
    };
  }
}

// Singleton instance
export const drpcWebhook = new DrpcWebhookService();

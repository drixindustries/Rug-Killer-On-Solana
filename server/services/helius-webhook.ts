/**
 * Helius Webhook Service
 * Real-time transaction monitoring using Helius Enhanced WebSockets
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
import { Connection, PublicKey } from '@solana/web3.js';
import { tokenAnalyzer } from '../solana-analyzer.ts';
import type { TokenAnalysisResponse } from '../../shared/schema.ts';

export interface HeliusTransactionWebhook {
  signature: string;
  type: string;
  source: string;
  timestamp: number;
  slot: number;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
    tokenAmount: number;
  }>;
  accountData?: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges?: Array<{
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      userAccount: string;
    }>;
  }>;
  events?: {
    compressed?: boolean;
    setAuthority?: Array<{
      account: string;
      from: string;
      to: string;
      instructionIndex: number;
      innerInstructionIndex: number;
    }>;
  };
}

export interface HeliusWebhookPayload {
  webhook: {
    webhookURL: string;
    transactionTypes: string[];
    accountAddresses: string[];
    webhookType: string;
  };
  timestamp: number;
}

/**
 * Helius Enhanced Webhook Service
 */
export class HeliusWebhookService extends EventEmitter {
  private connection: Connection | null = null;
  private readonly HELIUS_API_KEY: string;
  private readonly HELIUS_WEBHOOK_ID: string | undefined;
  private subscriptionId: number | null = null;
  private isMonitoring = false;
  private processedSignatures = new Set<string>();
  private readonly MAX_CACHE_SIZE = 10000;
  private readonly TOKEN_WINDOW_MS = Number(process.env.HELIUS_TOKEN_WINDOW_MS ?? '60000');
  private readonly TOKEN_WINDOW_CAP = Number(process.env.HELIUS_TOKEN_WINDOW_CAP ?? '120');
  private readonly ANALYSIS_WINDOW_MS = Number(process.env.HELIUS_ANALYSIS_WINDOW_MS ?? '60000');
  private readonly ANALYSIS_WINDOW_CAP = Number(process.env.HELIUS_ANALYSIS_WINDOW_CAP ?? '12');
  private tokenDetectionTimestamps: number[] = [];
  private analysisTimestamps: number[] = [];
  private tokenThrottleNoticeAt = 0;
  private analysisThrottleNoticeAt = 0;

  // DEX program IDs to monitor
  private readonly DEX_PROGRAMS = [
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium V4
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca
    '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP', // Orca V2
    'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY', // Phoenix
  ];

  // Token program IDs
  private readonly TOKEN_PROGRAMS = [
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // SPL Token
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // Token-2022
  ];

  constructor() {
    super();
    this.HELIUS_API_KEY = process.env.HELIUS_API_KEY?.trim() || '';
    this.HELIUS_WEBHOOK_ID = process.env.HELIUS_WEBHOOK_ID?.trim();

    if (!this.HELIUS_API_KEY) {
      console.warn('[Helius Webhook] No API key configured - webhook monitoring disabled');
    }
  }

  /**
   * Initialize webhook monitoring
   */
  public async start(): Promise<void> {
    if (!this.HELIUS_API_KEY) {
      console.log('[Helius Webhook] Skipping - no API key');
      return;
    }

    try {
      console.log('[Helius Webhook] Starting HTTP-based monitoring...');
      
      // Connect to Helius RPC - HTTP only (WebSocket disabled to avoid 403 errors)
      // Helius webhooks provide real-time data via HTTP POST, no WebSocket needed
      this.connection = new Connection(
        `https://mainnet.helius-rpc.com/?api-key=${this.HELIUS_API_KEY}`,
        {
          commitment: 'confirmed',
          // wsEndpoint disabled - webhook provides real-time updates via HTTP
        }
      );

      // WebSocket subscriptions disabled - Helius webhook provides events via HTTP POST
      // await this.subscribeToTokenCreations();  // ❌ Requires WebSocket - causes 403 errors
      // await this.subscribeToDexTrades();       // ❌ Requires WebSocket - causes 403 errors

      this.isMonitoring = true;
      this.emit('started');
      console.log('[Helius Webhook] ✅ HTTP-based monitoring active (WebSocket subscriptions disabled)');
    } catch (error) {
      console.error('[Helius Webhook] Start error:', error);
      throw error;
    }
  }

  /**
   * Subscribe to new token creation events
   */
  private async subscribeToTokenCreations(): Promise<void> {
    if (!this.connection) return;

    try {
      // Monitor Token Program for new mint initializations
      this.subscriptionId = this.connection.onProgramAccountChange(
        new PublicKey(this.TOKEN_PROGRAMS[0]),
        async (accountInfo, context) => {
          try {
            const mintAddress = accountInfo.accountId.toBase58();
            
            // Skip if already processed
            if (this.processedSignatures.has(mintAddress)) return;
            this.addToCache(mintAddress);
            if (this.shouldThrottleTokenDetection()) {
              if (process.env.DEBUG_HELIUS_THROTTLE === 'true') {
                console.debug('[Helius Webhook] Throttled token detection:', mintAddress);
              }
              return;
            }
            
            console.log('[Helius Webhook] 🆕 New token detected:', mintAddress);
            
            // Emit raw event
            this.emit('token_created', {
              mint: mintAddress,
              slot: context.slot,
              timestamp: Date.now(),
            });

            // Auto-analyze if enabled
            if (process.env.AUTO_ANALYZE_NEW_TOKENS === 'true') {
              await this.analyzeNewToken(mintAddress);
            }
          } catch (error) {
            console.error('[Helius Webhook] Token creation handler error:', error);
          }
        },
        'confirmed',
        [
          {
            dataSize: 82, // Size of a mint account
          },
        ]
      );

      console.log('[Helius Webhook] Subscribed to token creations (ID:', this.subscriptionId, ')');
    } catch (error) {
      console.error('[Helius Webhook] Subscribe to token creations error:', error);
    }
  }

  /**
   * Subscribe to DEX trade events
   */
  private async subscribeToDexTrades(): Promise<void> {
    if (!this.connection) return;

    try {
      // Monitor Raydium for new trades
      const raydiumSubscription = this.connection.onProgramAccountChange(
        new PublicKey(this.DEX_PROGRAMS[1]),
        async (accountInfo, context) => {
          try {
            // Parse and emit trade event
            this.emit('dex_trade', {
              program: 'Raydium',
              account: accountInfo.accountId.toBase58(),
              slot: context.slot,
              timestamp: Date.now(),
            });
          } catch (error) {
            console.error('[Helius Webhook] DEX trade handler error:', error);
          }
        },
        'confirmed'
      );

      console.log('[Helius Webhook] Subscribed to DEX trades');
    } catch (error) {
      console.error('[Helius Webhook] Subscribe to DEX trades error:', error);
    }
  }

  /**
   * Process webhook payload from Helius
   */
  public async processWebhook(payload: HeliusTransactionWebhook[]): Promise<void> {
    console.log(`[Helius Webhook] Processing ${payload.length} transactions`);

    for (const tx of payload) {
      try {
        // Skip if already processed
        if (this.processedSignatures.has(tx.signature)) continue;
        
        this.addToCache(tx.signature);

        // Check for new token mints
        if (tx.type === 'TOKEN_MINT' || tx.events?.setAuthority) {
          await this.handleTokenCreation(tx);
        }

        // Check for large transfers
        if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
          await this.handleTokenTransfer(tx);
        }

        // Emit raw transaction event
        this.emit('transaction', tx);
      } catch (error) {
        console.error('[Helius Webhook] Transaction processing error:', error);
      }
    }
  }

  /**
   * Handle token creation event
   */
  private async handleTokenCreation(tx: HeliusTransactionWebhook): Promise<void> {
    try {
      // Extract mint address from authority changes
      const setAuthorityEvents = tx.events?.setAuthority || [];
      
      for (const event of setAuthorityEvents) {
        const mintAddress = event.account;
        if (this.processedSignatures.has(mintAddress)) {
          continue;
        }

        this.addToCache(mintAddress);
        if (this.shouldThrottleTokenDetection()) {
          if (process.env.DEBUG_HELIUS_THROTTLE === 'true') {
            console.debug('[Helius Webhook] Throttled token creation webhook:', mintAddress);
          }
          continue;
        }
        
        console.log('[Helius Webhook] 🆕 Token created via setAuthority:', mintAddress);
        
        this.emit('token_created', {
          mint: mintAddress,
          signature: tx.signature,
          timestamp: tx.timestamp,
          slot: tx.slot,
          from: event.from,
          to: event.to,
        });

        // Auto-analyze
        if (process.env.AUTO_ANALYZE_NEW_TOKENS === 'true') {
          await this.analyzeNewToken(mintAddress);
        }
      }
    } catch (error) {
      console.error('[Helius Webhook] Handle token creation error:', error);
    }
  }

  /**
   * Handle token transfer event
   */
  private async handleTokenTransfer(tx: HeliusTransactionWebhook): Promise<void> {
    try {
      for (const transfer of tx.tokenTransfers || []) {
        // Check for large transfers (potential whale activity)
        if (transfer.tokenAmount > 1000000) { // Adjust threshold as needed
          this.emit('large_transfer', {
            mint: transfer.mint,
            from: transfer.fromUserAccount,
            to: transfer.toUserAccount,
            amount: transfer.tokenAmount,
            signature: tx.signature,
            timestamp: tx.timestamp,
          });
        }
      }
    } catch (error) {
      console.error('[Helius Webhook] Handle token transfer error:', error);
    }
  }

  /**
   * Auto-analyze newly detected token
   */
  private async analyzeNewToken(mintAddress: string): Promise<void> {
    try {
      if (this.shouldThrottleAnalysis()) {
        if (process.env.DEBUG_HELIUS_THROTTLE === 'true') {
          console.debug('[Helius Webhook] Skipping analysis (rate limited):', mintAddress);
        }
        return;
      }
      console.log('[Helius Webhook] 🔍 Auto-analyzing token:', mintAddress);
      
      // Small delay to ensure token is fully initialized
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const analysis = await tokenAnalyzer.analyzeToken(mintAddress);
      
      this.emit('token_analyzed', {
        mint: mintAddress,
        analysis,
        timestamp: Date.now(),
      });

      console.log(`[Helius Webhook] ✅ Analysis complete: ${analysis.metadata.symbol} - Risk: ${analysis.riskLevel}`);
    } catch (error) {
      console.error(`[Helius Webhook] Auto-analysis failed for ${mintAddress}:`, error);
    }
  }

  private shouldThrottleTokenDetection(): boolean {
    if (this.TOKEN_WINDOW_CAP <= 0) {
      return false;
    }

    const now = Date.now();
    this.tokenDetectionTimestamps = this.tokenDetectionTimestamps.filter(ts => now - ts < this.TOKEN_WINDOW_MS);

    if (this.tokenDetectionTimestamps.length >= this.TOKEN_WINDOW_CAP) {
      if (now - this.tokenThrottleNoticeAt > 10000) {
        console.warn(
          `[Helius Webhook] Throttling token detections (${this.tokenDetectionTimestamps.length}/${this.TOKEN_WINDOW_CAP} in ${this.TOKEN_WINDOW_MS}ms)`
        );
        this.tokenThrottleNoticeAt = now;
      }
      return true;
    }

    this.tokenDetectionTimestamps.push(now);
    return false;
  }

  private shouldThrottleAnalysis(): boolean {
    if (this.ANALYSIS_WINDOW_CAP <= 0) {
      return false;
    }

    const now = Date.now();
    this.analysisTimestamps = this.analysisTimestamps.filter(ts => now - ts < this.ANALYSIS_WINDOW_MS);

    if (this.analysisTimestamps.length >= this.ANALYSIS_WINDOW_CAP) {
      if (now - this.analysisThrottleNoticeAt > 10000) {
        console.warn(
          `[Helius Webhook] Rate limiting auto-analysis (${this.analysisTimestamps.length}/${this.ANALYSIS_WINDOW_CAP} in ${this.ANALYSIS_WINDOW_MS}ms)`
        );
        this.analysisThrottleNoticeAt = now;
      }
      return true;
    }

    this.analysisTimestamps.push(now);
    return false;
  }

  /**
   * Add signature/mint to processed cache
   */
  private addToCache(id: string): void {
    this.processedSignatures.add(id);
    
    // Prevent memory leak by limiting cache size
    if (this.processedSignatures.size > this.MAX_CACHE_SIZE) {
      const firstKey = this.processedSignatures.values().next().value;
      this.processedSignatures.delete(firstKey);
    }
  }

  /**
   * Stop webhook monitoring
   */
  public async stop(): Promise<void> {
    try {
      if (this.subscriptionId !== null && this.connection) {
        await this.connection.removeProgramAccountChangeListener(this.subscriptionId);
        this.subscriptionId = null;
      }

      this.isMonitoring = false;
      this.emit('stopped');
      console.log('[Helius Webhook] Monitoring stopped');
    } catch (error) {
      console.error('[Helius Webhook] Stop error:', error);
    }
  }

  /**
   * Get service status
   */
  public getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      hasApiKey: !!this.HELIUS_API_KEY,
      hasWebhookId: !!this.HELIUS_WEBHOOK_ID,
      processedCount: this.processedSignatures.size,
      subscriptionActive: this.subscriptionId !== null,
    };
  }
}

// Export singleton
export const heliusWebhook = new HeliusWebhookService();

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
  // Optimized throttling windows - reduce Helius API usage by 75%+
  private readonly TOKEN_WINDOW_MS = Number(process.env.HELIUS_TOKEN_WINDOW_MS ?? '180000'); // 3 min (was 2 min)
  private readonly TOKEN_WINDOW_CAP = Number(process.env.HELIUS_TOKEN_WINDOW_CAP ?? '30'); // 30/window (was 60)
  private readonly ANALYSIS_WINDOW_MS = Number(process.env.HELIUS_ANALYSIS_WINDOW_MS ?? '60000'); // 1 min
  private readonly ANALYSIS_WINDOW_CAP = Number(process.env.HELIUS_ANALYSIS_WINDOW_CAP ?? '3'); // 3/min (was 6)
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

        // Check for smart money wallet activity
        if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
          try {
            await this.handleSmartMoneyDetection(tx);
          } catch (smError: any) {
            console.error('[Helius Webhook] Smart money detection error:', smError?.message || String(smError));
          }
        }

        // Emit raw transaction event
        this.emit('transaction', tx);
      } catch (error: any) {
        console.error('[Helius Webhook] Transaction processing error:', error?.message || String(error));
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
          // Find corresponding SOL transfer (native transfer)
          let solAmount: number | undefined;
          if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
            // Find native transfer that matches the token transfer participants
            const nativeTransfer = tx.nativeTransfers.find(nt => 
              (nt.fromUserAccount === transfer.fromUserAccount || nt.toUserAccount === transfer.toUserAccount) ||
              (nt.fromUserAccount === transfer.toUserAccount || nt.toUserAccount === transfer.fromUserAccount)
            );
            if (nativeTransfer) {
              solAmount = nativeTransfer.amount / 1e9; // Convert lamports to SOL
            }
          }

          this.emit('large_transfer', {
            mint: transfer.mint,
            from: transfer.fromUserAccount,
            to: transfer.toUserAccount,
            amount: transfer.tokenAmount,
            amountSol: solAmount,
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
   * Check if transaction involves smart money wallets and trigger alerts
   */
  private async handleSmartMoneyDetection(tx: HeliusTransactionWebhook): Promise<void> {
    try {
      const { db, smartWallets, kolWallets } = await import('../db.ts');
      const { eq, or } = await import('drizzle-orm');
      const { smartMoneyRelay, getDirective } = await import('./smart-money-relay.ts');
      
      // Extract all wallet addresses from transfers
      const walletAddresses = new Set<string>();
      for (const transfer of tx.tokenTransfers || []) {
        if (transfer.fromUserAccount) walletAddresses.add(transfer.fromUserAccount);
        if (transfer.toUserAccount) walletAddresses.add(transfer.toUserAccount);
      }

      if (walletAddresses.size === 0) return;

      // Query database for smart money wallets
      const walletsArray = Array.from(walletAddresses);
      const smartMoneyWallets = await db
        .select({
          walletAddress: smartWallets.walletAddress,
          displayName: smartWallets.displayName,
          influenceScore: smartWallets.influenceScore,
          winrate: smartWallets.winrate,
          profitLoss: smartWallets.profitLoss,
        })
        .from(smartWallets)
        .where(
          or(
            ...walletsArray.map(addr => eq(smartWallets.walletAddress, addr))
          )
        )
        .limit(50);

      // Filter out any wallets with missing walletAddress from query results
      const validSmartWallets = smartMoneyWallets.filter(w => w && w.walletAddress);
      
      if (validSmartWallets.length === 0) return;

      console.log(`[Helius Webhook] 🧠 Smart money detected: ${validSmartWallets.length} wallets in transaction ${tx.signature.slice(0, 8)}...`);

      // Group transfers by token mint
      const tokenMints = new Map<string, typeof validSmartWallets>();
      for (const transfer of tx.tokenTransfers || []) {
        if (!transfer || !transfer.mint) continue;
        
        const smartWallet = validSmartWallets.find(w =>
          w.walletAddress === transfer.fromUserAccount ||
          w.walletAddress === transfer.toUserAccount
        );

        if (smartWallet) {
          if (!tokenMints.has(transfer.mint)) {
            tokenMints.set(transfer.mint, []);
          }
          tokenMints.get(transfer.mint)!.push(smartWallet);
        }
      }

      // Publish smart money event for each token
      for (const [mint, wallets] of tokenMints.entries()) {
        // Map to eliteWallets (already filtered for valid walletAddress)
        const eliteWallets = wallets.map(w => ({
          address: w.walletAddress,
          winrate: typeof w.winrate === 'number' ? w.winrate : 0,
          profit: typeof w.profitLoss === 'number' ? w.profitLoss : 0,
          directive: getDirective(
            typeof w.winrate === 'number' ? w.winrate : 0, 
            typeof w.profitLoss === 'number' ? w.profitLoss : 0
          ),
        }));

        // Skip if no valid wallets after filtering
        if (eliteWallets.length === 0) continue;

        // Enrich with token analysis (including bundle detection)
        let analysisData: any = undefined;
        try {
          const { tokenAnalyzer } = await import('../solana-analyzer.js');
          console.log(`[Helius Webhook] Running token analysis for smart money alert: ${mint.slice(0, 8)}...`);
          
          const tokenAnalysis = await tokenAnalyzer.analyzeToken(mint);
          
          // Extract bundle information
          const isBundled = tokenAnalysis.jitoBundleData?.isBundle || 
                           (tokenAnalysis.advancedBundleData?.bundleScore >= 50) ||
                           false;
          const bundleScore = tokenAnalysis.jitoBundleData?.confidence === 'HIGH' ? 100 :
                             tokenAnalysis.jitoBundleData?.confidence === 'MEDIUM' ? 70 :
                             tokenAnalysis.advancedBundleData?.bundleScore || 0;
          
          analysisData = {
            riskScore: tokenAnalysis.riskScore,
            holderCount: tokenAnalysis.holderCount,
            topConcentration: tokenAnalysis.topHolderConcentration,
            agedWalletRisk: tokenAnalysis.agedWalletData?.totalFakeVolumePercent || 0,
            suspiciousFundingPct: tokenAnalysis.suspiciousFundingPct || 0,
            bundled: isBundled,
            bundleScore: bundleScore,
            bundleDetails: tokenAnalysis.jitoBundleData || tokenAnalysis.advancedBundleData,
          };
          
          console.log(`[Helius Webhook] ✅ Analysis complete - Risk: ${analysisData.riskScore}, Bundled: ${isBundled}, Bundle Score: ${bundleScore}`);
        } catch (analysisError: any) {
          console.warn(`[Helius Webhook] Failed to analyze token ${mint.slice(0, 8)}... for smart money alert:`, analysisError.message);
          // Continue without analysis - don't block smart money alerts
        }

        smartMoneyRelay.publish({
          tokenMint: mint,
          symbol: undefined, // Will be enriched by bot
          ageMinutes: 0,
          walletCount: eliteWallets.length,
          eliteWallets,
          allSample: eliteWallets.map(w => w.address.slice(0, 8) + '...'),
          analysis: analysisData,
          timestamp: tx.timestamp || Date.now(),
        });

        console.log(`[Helius Webhook] 📢 Published smart money alert for token ${mint.slice(0, 8)}... (${eliteWallets.length} wallets, bundled: ${analysisData?.bundled || false})`);
      }
    } catch (error: any) {
      // Don't spam logs with full stack traces - just log the message
      const errMsg = error?.message || String(error);
      if (!errMsg.includes('Cannot read properties of undefined')) {
        console.error('[Helius Webhook] Smart money detection error:', errMsg);
      }
      // Error already handled - transaction continues processing
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

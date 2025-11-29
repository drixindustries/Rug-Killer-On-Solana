import { EventEmitter } from 'events';
import { Connection, PublicKey } from '@solana/web3.js';
import { tokenAnalyzer } from '../solana-analyzer.js';
import { redisCache } from './redis-cache.js';
import { DexScreenerService } from '../dexscreener-service.js';
import { cacheWarmer } from './cache-warmer.js';

export interface AnkrTokenEvent {
  mint: string;
  signature: string;
  timestamp: number;
  blockTime?: number;
}

export interface AnkrWalletEvent {
  wallet: string;
  mint: string;
  amount: number;
  signature: string;
  timestamp: number;
  type: 'buy' | 'sell' | 'transfer';
}

/**
 * Ankr WebSocket Service
 * Uses Ankr's RPC WebSocket endpoint to monitor:
 * 1. Pump.fun program for new token launches
 * 2. Alpha wallet addresses for real-time activity
 * 3. Token account changes for early detection
 */
export class AnkrWebSocketService extends EventEmitter {
  private connection: Connection | null = null;
  private subscriptions: Map<number, string> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private isConnected = false;
  private shouldReconnect = true;
  private monitoredWallets: Set<string> = new Set();
  
  // Pump.fun program ID
  private readonly PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
  
  private readonly ankrWsUrl: string;
  private readonly enabled: boolean;

  constructor() {
    super();
    
    // Build Ankr URLs (both HTTP and WebSocket)
    const ankrKey = process.env.ANKR_API_KEY;
    const httpUrl = ankrKey 
      ? `https://rpc.ankr.com/solana/${ankrKey}` 
      : 'https://rpc.ankr.com/solana';
    
    // Prefer explicit override if provided
    const wsOverride = process.env.ANKR_WS_URL;
    // Default Ankr WebSocket endpoint format: wss://rpc.ankr.com/solana/ws/{API_KEY}
    // Some plans use premium routes; allow override via ANKR_WS_URL
    this.ankrWsUrl = wsOverride
      ? wsOverride
      : (ankrKey 
        ? `wss://rpc.ankr.com/solana/ws/${ankrKey}` 
        : 'wss://rpc.ankr.com/solana/ws');
    
    this.enabled = !!ankrKey;
    
    if (!this.enabled) {
      console.log('[Ankr WebSocket] Disabled - ANKR_API_KEY not configured');
    }
  }

  /**
   * Connect to Ankr WebSocket RPC
   */
  public async connect(): Promise<void> {
    if (!this.enabled) {
      console.log('[Ankr WebSocket] Monitoring disabled (no API key)');
      this.shouldReconnect = false;
      return;
    }

    if (this.connection && this.isConnected) {
      console.log('[Ankr WebSocket] Already connected');
      return;
    }

    try {
      const ankrKey = process.env.ANKR_API_KEY;
      const httpUrl = ankrKey 
        ? `https://rpc.ankr.com/solana/${ankrKey}` 
        : 'https://rpc.ankr.com/solana';
      
      console.log('[Ankr WebSocket] Connecting to:', httpUrl.replace(/\/[^/]+$/, '/***'));
      console.log('[Ankr WebSocket] wsEndpoint:', (this.ankrWsUrl || '').replace(/\/.+\//, 'wss://***/'));
      
      this.connection = new Connection(httpUrl, {
        commitment: 'confirmed',
        wsEndpoint: this.ankrWsUrl,
      });

      await this.setupSubscriptions();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
      
      console.log('[Ankr WebSocket] ✅ Connected and monitoring');
    } catch (error) {
      console.error('[Ankr WebSocket] Connection error:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Set up WebSocket subscriptions
   */
  private async setupSubscriptions(): Promise<void> {
    if (!this.connection) return;

    try {
      // Subscribe to Pump.fun program logs for new token creation
      await this.subscribeToPumpFunProgram();
      
      console.log('[Ankr WebSocket] Subscriptions active');
    } catch (error) {
      console.error('[Ankr WebSocket] Subscription setup error:', error);
      throw error;
    }
  }

  /**
   * Subscribe to Pump.fun program for new token launches
   */
  private async subscribeToPumpFunProgram(): Promise<void> {
    if (!this.connection) return;

    try {
      const programId = new PublicKey(this.PUMP_FUN_PROGRAM);
      
      const subscriptionId = this.connection.onLogs(
        programId,
        async (logs, context) => {
          await this.handleProgramLogs(logs, context);
        },
        'confirmed'
      );

      this.subscriptions.set(subscriptionId, 'pumpfun_program');
      console.log(`[Ankr WebSocket] Subscribed to Pump.fun program (ID: ${subscriptionId})`);
    } catch (error) {
      console.error('[Ankr WebSocket] Error subscribing to Pump.fun:', error);
      throw error;
    }
  }

  /**
   * Subscribe to a specific wallet address
   */
  public async subscribeToWallet(walletAddress: string): Promise<void> {
    if (!this.connection || this.monitoredWallets.has(walletAddress)) return;

    try {
      const walletPubkey = new PublicKey(walletAddress);
      
      const subscriptionId = this.connection.onAccountChange(
        walletPubkey,
        async (accountInfo, context) => {
          await this.handleWalletActivity(walletAddress, accountInfo, context);
        },
        'confirmed'
      );

      this.subscriptions.set(subscriptionId, `wallet_${walletAddress}`);
      this.monitoredWallets.add(walletAddress);
      
      console.log(`[Ankr WebSocket] Monitoring wallet: ${walletAddress.slice(0, 8)}... (ID: ${subscriptionId})`);
      this.emit('wallet_subscribed', { wallet: walletAddress, subscriptionId });
    } catch (error) {
      console.error(`[Ankr WebSocket] Error subscribing to wallet ${walletAddress}:`, error);
    }
  }

  /**
   * Subscribe to multiple alpha wallets
   */
  public async subscribeToAlphaWallets(walletAddresses: string[]): Promise<void> {
    console.log(`[Ankr WebSocket] Subscribing to ${walletAddresses.length} alpha wallets...`);
    
    for (const wallet of walletAddresses) {
      await this.subscribeToWallet(wallet);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`[Ankr WebSocket] ✅ Monitoring ${this.monitoredWallets.size} alpha wallets`);
  }

  /**
   * Handle Pump.fun program logs (new token detection)
   */
  private async handleProgramLogs(logs: any, context: any): Promise<void> {
    try {
      const logMessages = logs.logs || [];
      const signature = logs.signature;
      
      // Look for token creation patterns in logs
      const hasTokenCreation = logMessages.some((log: string) => 
        log.includes('InitializeMint') || 
        log.includes('Create') ||
        log.includes('initialize')
      );

      if (!hasTokenCreation) return;

      // Extract mint address from logs or fetch transaction details
      const transaction = await this.connection?.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!transaction) return;

      // Parse mint address from transaction
      const mintAddress = this.extractMintFromTransaction(transaction);
      
      if (mintAddress) {
        const tokenEvent: AnkrTokenEvent = {
          mint: mintAddress,
          signature: signature,
          timestamp: Date.now(),
          blockTime: transaction.blockTime || undefined,
        };

        console.log(`[Ankr WebSocket] 🚀 New token detected: ${mintAddress}`);
        this.emit('token_created', tokenEvent);
        
        // Pre-warm cache (non-blocking)
        cacheWarmer.warmToken(mintAddress).catch(() => {});
      }
    } catch (error) {
      console.error('[Ankr WebSocket] Error handling program logs:', error);
    }
  }

  /**
   * Handle wallet account changes
   */
  private async handleWalletActivity(
    walletAddress: string, 
    accountInfo: any, 
    context: any
  ): Promise<void> {
    try {
      console.log(`[Ankr WebSocket] 💰 Activity detected: ${walletAddress.slice(0, 8)}...`);
      
      // Get recent transactions for this wallet
      const signatures = await this.connection?.getSignaturesForAddress(
        new PublicKey(walletAddress),
        { limit: 1 },
        'confirmed'
      );

      if (!signatures || signatures.length === 0) return;

      const signature = signatures[0].signature;
      const transaction = await this.connection?.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!transaction) return;

      // Parse transaction to detect token interactions
      const mintAddress = this.extractMintFromTransaction(transaction);
      
      if (mintAddress) {
        const walletEvent: AnkrWalletEvent = {
          wallet: walletAddress,
          mint: mintAddress,
          amount: 0, // TODO: Parse amount from transaction
          signature: signature,
          timestamp: Date.now(),
          type: this.detectTransactionType(transaction),
        };

        console.log(`[Ankr WebSocket] Alpha wallet ${walletAddress.slice(0, 8)}... interacted with ${mintAddress}`);
        this.emit('wallet_activity', walletEvent);
        this.emit('alpha_wallet_trade', walletEvent);
      }
    } catch (error) {
      console.error('[Ankr WebSocket] Error handling wallet activity:', error);
    }
  }

  /**
   * Extract mint address from transaction
   */
  private extractMintFromTransaction(transaction: any): string | null {
    try {
      const accountKeys = transaction.transaction.message.accountKeys || 
                         transaction.transaction.message.staticAccountKeys || 
                         [];
      
      // Look for token mint in account keys (usually at index 1 or 2 for token operations)
      for (const key of accountKeys) {
        const pubkey = typeof key === 'string' ? key : key.pubkey?.toString();
        if (pubkey && this.isLikelyTokenMint(pubkey)) {
          return pubkey;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Detect if a pubkey is likely a token mint (basic heuristic)
   */
  private isLikelyTokenMint(pubkey: string): boolean {
    // Exclude known program IDs and system accounts
    const knownPrograms = [
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
      '11111111111111111111111111111111', // System program
      this.PUMP_FUN_PROGRAM,
    ];
    
    return !knownPrograms.includes(pubkey) && pubkey.length > 32;
  }

  /**
   * Detect transaction type (buy/sell/transfer)
   */
  private detectTransactionType(transaction: any): 'buy' | 'sell' | 'transfer' {
    // Basic detection - can be enhanced
    const instructions = transaction.transaction.message.instructions || [];
    
    // Look for specific instruction patterns
    // This is a simplified version - production would need more detailed parsing
    return 'transfer';
  }

  /**
   * Auto-scan detected token and pre-cache results
   */
  private async autoScanToken(mint: string): Promise<void> {
    try {
      console.log(`[Ankr WebSocket] 🚀 PRE-FETCHING token data for ${mint}...`);

      // Pre-fetch DexScreener data immediately
      const dexScreener = new DexScreenerService();
      const dexPromise = dexScreener.getTokenData(mint).catch(() => null);
      
      // Pre-fetch full analysis (will be cached by Redis)
      const analysisPromise = tokenAnalyzer.analyzeToken(mint).catch((err) => {
        console.error(`[Ankr WebSocket] Pre-fetch failed for ${mint}:`, err.message);
        return null;
      });

      // Execute in parallel
      const [dexData, analysis] = await Promise.all([dexPromise, analysisPromise]);
      
      if (dexData) {
        console.log(`[Ankr WebSocket] ✅ PRE-CACHED DexScreener for ${mint}`);
      }
      
      if (analysis) {
        console.log(`[Ankr WebSocket] ✅ PRE-CACHED full analysis for ${mint}`);
      }

      this.emit('token_analyzed', {
        mint,
        analysis,
        timestamp: Date.now(),
      });

      console.log(`[Ankr WebSocket] ✅ Scan complete: ${mint} - Risk: ${analysis.riskLevel}`);
    } catch (error) {
      console.error(`[Ankr WebSocket] Scan error for ${mint}:`, error);
      this.emit('scan_error', { mint, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Disconnect and cleanup
   */
  public async disconnect(): Promise<void> {
    console.log('[Ankr WebSocket] Disconnecting...');
    this.shouldReconnect = false;

    // Remove all subscriptions
    if (this.connection) {
      for (const [subscriptionId] of this.subscriptions) {
        try {
          await this.connection.removeAccountChangeListener(subscriptionId);
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    }

    this.subscriptions.clear();
    this.monitoredWallets.clear();
    this.connection = null;
    this.isConnected = false;
    
    this.emit('disconnected');
    console.log('[Ankr WebSocket] Disconnected');
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[Ankr WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`[Ankr WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Get service status
   */
  public getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      activeSubscriptions: this.subscriptions.size,
      monitoredWallets: this.monitoredWallets.size,
      enabled: this.enabled,
    };
  }

  /**
   * Unsubscribe from a wallet
   */
  public async unsubscribeFromWallet(walletAddress: string): Promise<void> {
    const entries = Array.from(this.subscriptions.entries());
    const entry = entries.find(([_, name]) => name === `wallet_${walletAddress}`);
    
    if (entry && this.connection) {
      const [subscriptionId] = entry;
      await this.connection.removeAccountChangeListener(subscriptionId);
      this.subscriptions.delete(subscriptionId);
      this.monitoredWallets.delete(walletAddress);
      
      console.log(`[Ankr WebSocket] Unsubscribed from wallet: ${walletAddress.slice(0, 8)}...`);
      this.emit('wallet_unsubscribed', { wallet: walletAddress });
    }
  }
}

// Export singleton instance
export const ankrWebSocket = new AnkrWebSocketService();

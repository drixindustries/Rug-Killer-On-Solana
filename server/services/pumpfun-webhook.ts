import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { tokenAnalyzer } from '../solana-analyzer.ts';
import type { TokenAnalysisResponse } from '../../shared/schema.ts';

export interface PumpFunToken {
  mint: string;
  symbol: string;
  name: string;
  totalSupply: number;
  decimals: number;
  createdAt: number;
  lpBurned?: boolean;
  lpLocked?: boolean;
  mintRevoked?: boolean;
  freezeRevoked?: boolean;
  bondingCurve?: number;
  devBought?: number;
}

export interface PumpFunWebSocketMessage {
  event: 'new_token' | 'tokenCreate' | 'trade' | 'graduation' | 'complete' | 'metadata_update';
  data: any;
  timestamp: number;
}

/**
 * Pump.fun WebSocket Service
 * Listens to Pump.fun's real-time API for new token launches
 * Auto-scans each token through the analyzer
 */
export class PumpFunWebhookService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private isConnected = false;
  private shouldReconnect = true;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly PUMP_FUN_WS_URL = process.env.PUMP_FUN_WS_URL || 'wss://pumpportal.fun/api/data';

  constructor() {
    super();
  }

  /**
   * Connect to Pump.fun WebSocket
   */
  public async connect(): Promise<void> {
    if (this.ws && this.isConnected) {
      console.log('[PumpFun] Already connected');
      return;
    }

    try {
      console.log('[PumpFun] Connecting to WebSocket:', this.PUMP_FUN_WS_URL);
      this.ws = new WebSocket(this.PUMP_FUN_WS_URL);

      this.ws.on('open', () => this.onOpen());
      this.ws.on('message', (data: WebSocket.Data) => this.onMessage(data));
      this.ws.on('error', (error: Error) => this.onError(error));
      this.ws.on('close', (code: number, reason: string) => this.onClose(code, reason));
      this.ws.on('ping', () => this.onPing());

      // Subscribe to new token events
      this.ws.on('open', () => {
        this.subscribe(['new_token', 'graduation']);
      });
    } catch (error) {
      console.error('[PumpFun] Connection error:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Subscribe to specific event types
   */
  private subscribe(events: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const subscribeMessage = {
      method: 'subscribe',
      keys: events,
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    console.log('[PumpFun] Subscribed to events:', events);
  }

  /**
   * Handle WebSocket open
   */
  private onOpen(): void {
    console.log('[PumpFun] WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.emit('connected');
  }

  /**
   * Handle incoming messages
   */
  private async onMessage(data: WebSocket.Data): Promise<void> {
    let message: PumpFunWebSocketMessage;
    try {
      message = JSON.parse(data.toString());
    } catch (parseError) {
      console.error('[PumpFun] Invalid JSON received:', parseError);
      return;
    }
    try {

      // Handle new token event
      if (message.event === 'new_token' || message.event === 'tokenCreate') {
        await this.handleNewToken(message.data);
      }

      // Handle graduation (token moved to Raydium)
      if (message.event === 'graduation' || message.event === 'complete') {
        this.emit('graduation', message.data);
      }

      // Emit raw message for external listeners
      this.emit('message', message);
    } catch (error) {
      console.error('[PumpFun] Error parsing message:', error);
    }
  }

  /**
   * Handle new token launch
   */
  private async handleNewToken(tokenData: any): Promise<void> {
    try {
      const token: PumpFunToken = {
        mint: tokenData.mint || tokenData.signature || tokenData.account,
        symbol: tokenData.symbol || tokenData.name?.substring(0, 10) || 'UNKNOWN',
        name: tokenData.name || tokenData.symbol || 'Unknown Token',
        totalSupply: tokenData.totalSupply || tokenData.supply || 1_000_000_000,
        decimals: tokenData.decimals || 6,
        createdAt: tokenData.timestamp || Date.now() / 1000,
        lpBurned: tokenData.lpBurned,
        lpLocked: tokenData.lpLocked,
        mintRevoked: tokenData.mintRevoked,
        freezeRevoked: tokenData.freezeRevoked,
        bondingCurve: tokenData.bondingCurveProgress,
        devBought: tokenData.creatorBought,
      };

      console.log(`[PumpFun] New token detected: ${token.symbol} (${token.mint})`);
      this.emit('new_token', token);

      // Auto-scan the token
      await this.autoScan(token);
    } catch (error) {
      console.error('[PumpFun] Error handling new token:', error);
    }
  }

  /**
   * Auto-scan new token through analyzer
   */
  private async autoScan(token: PumpFunToken): Promise<void> {
    try {
      console.log(`[PumpFun] Auto-scanning ${token.symbol}...`);

      // Analyze the token
      const analysis = await tokenAnalyzer.analyzeToken(token.mint);

      // Emit scan result
      this.emit('scan_complete', {
        token,
        analysis,
        timestamp: Date.now(),
      });

      console.log(`[PumpFun] Scan complete: ${token.symbol} - Score: ${analysis.riskScore}/100 (${analysis.riskLevel})`);
    } catch (error) {
      console.error(`[PumpFun] Error scanning ${token.symbol}:`, error);
      this.emit('scan_error', { token, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Handle WebSocket error
   */
  private onError(error: Error): void {
    // Check for 403 authentication errors
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
      console.error('[PumpFun] ⚠️  403 Authentication Error - Pump Portal may require API key or your IP is rate-limited');
      console.error('[PumpFun] Consider disabling pump.fun monitoring or contact pumpportal.fun for API access');
      // Stop reconnection completely on auth errors
      this.shouldReconnect = false;
      this.maxReconnectAttempts = 0;
    } else {
      console.error('[PumpFun] WebSocket error:', errorMsg);
    }
    this.emit('error', error);
  }

  /**
   * Handle WebSocket close
   */
  private onClose(code: number, reason: string): void {
    console.log(`[PumpFun] WebSocket closed: ${code} - ${reason}`);
    this.isConnected = false;
    this.stopHeartbeat();
    this.emit('disconnected', { code, reason });

    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle ping
   */
  private onPing(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.pong();
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[PumpFun] Max reconnection attempts reached');
      this.emit('max_reconnect_reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`[PumpFun] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  public disconnect(): void {
    this.shouldReconnect = false;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    console.log('[PumpFun] Disconnected');
  }

  /**
   * Get connection status
   */
  public getStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    wsUrl: string;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      wsUrl: this.PUMP_FUN_WS_URL,
    };
  }
}

// Singleton instance
export const pumpFunWebhook = new PumpFunWebhookService();

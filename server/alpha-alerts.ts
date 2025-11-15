import { Connection, PublicKey } from '@solana/web3.js';
import WebSocket from 'ws';
import { db } from './db';
import { kolWallets } from '../shared/schema';
import { gte } from 'drizzle-orm';

interface AlphaAlert {
  type: 'new_token' | 'whale_buy' | 'caller_signal';
  mint: string;
  source: string;
  timestamp: number;
  data?: any;
}

interface AlphaCallerConfig {
  wallet: string;
  name: string;
  enabled: boolean;
  influenceScore?: number;
}

// Alpha callers can be configured via environment variables or admin interface
// No default wallets are monitored to avoid legal issues with naming specific individuals/programs
const DEFAULT_ALPHA_CALLERS: AlphaCallerConfig[] = [];

export class AlphaAlertService {
  private connection: Connection;
  private listeners: Map<string, number> = new Map();
  private wsConnections: WebSocket[] = [];
  private alertCallbacks: ((alert: AlphaAlert) => void)[] = [];
  private isRunning = false;
  private alphaCallers: AlphaCallerConfig[];
  private autoRefreshInterval: NodeJS.Timeout | null = null;

  constructor(rpcUrl?: string, customCallers?: AlphaCallerConfig[]) {
    this.connection = new Connection(rpcUrl || 'https://api.mainnet-beta.solana.com', 'confirmed');
    this.alphaCallers = customCallers || DEFAULT_ALPHA_CALLERS;
  }

  /**
   * Load profitable wallets from database to monitor
   * Automatically includes discovered wallets + seeded KOLs
   */
  async loadWalletsFromDatabase(minInfluence: number = 60): Promise<void> {
    try {
      const topWallets = await db
        .select()
        .from(kolWallets)
        .where(gte(kolWallets.influenceScore, minInfluence))
        .limit(100); // Monitor top 100 wallets

      const walletsToAdd: AlphaCallerConfig[] = topWallets.map(w => ({
        wallet: w.walletAddress,
        name: w.displayName || `Trader ${w.walletAddress.substring(0, 6)}`,
        enabled: true,
        influenceScore: w.influenceScore || 50,
      }));

      // Merge with existing callers (avoid duplicates)
      for (const newWallet of walletsToAdd) {
        if (!this.alphaCallers.find(c => c.wallet === newWallet.wallet)) {
          this.alphaCallers.push(newWallet);
          
          // If already running, start monitoring this wallet
          if (this.isRunning) {
            this.monitorAlphaCaller(newWallet);
          }
        }
      }

      console.log(`[Alpha Alerts] Loaded ${walletsToAdd.length} wallets from database (min influence: ${minInfluence})`);
    } catch (error) {
      console.error('[Alpha Alerts] Error loading wallets from database:', error);
    }
  }

  /**
   * Auto-refresh wallet list every hour to pick up newly discovered wallets
   */
  private startAutoRefresh(): void {
    // Refresh every hour
    this.autoRefreshInterval = setInterval(async () => {
      console.log('[Alpha Alerts] Auto-refreshing wallet list...');
      await this.loadWalletsFromDatabase();
    }, 60 * 60 * 1000);
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  // Register callback for alerts
  onAlert(callback: (alert: AlphaAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  private async sendAlert(alert: AlphaAlert): Promise<void> {
    let message = '';
    if (alert.type === 'caller_signal') {
      message = `🚨 **ALPHA CALL from ${alert.source}**\n\n` +
        `📍 CA: \`${alert.mint}\`\n` +
        `👤 Caller: ${alert.source}\n` +
        `🔗 https://pump.fun/${alert.mint}\n` +
        `💎 https://dexscreener.com/solana/${alert.mint}`;
    } else if (alert.type === 'new_token') {
      message = `🔥 **NEW GEM DETECTED**\n\n` +
        `📍 CA: \`${alert.mint}\`\n` +
        `📊 Source: ${alert.source}\n` +
        `${alert.data?.name ? `🏷️ ${alert.data.name} (${alert.data.symbol})\n` : ''}` +
        `${alert.data?.marketCap ? `💰 MC: $${alert.data.marketCap.toLocaleString()}\n` : ''}` +
        `🔗 https://pump.fun/${alert.mint}`;
    } else {
      message = `⚡ **ALPHA ALERT**\n\n${alert.mint}\nSource: ${alert.source}`;
    }

    // Send to Discord webhook
    const DISCORD_WEBHOOK = process.env.ALPHA_DISCORD_WEBHOOK;
    if (DISCORD_WEBHOOK) {
      try {
        await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `@everyone ${message}`,
            username: 'RugKiller Alpha Alerts',
            avatar_url: 'https://i.imgur.com/rugkiller-icon.png',
          }),
        });
      } catch (error) {
        console.error('[ALPHA ALERT] Discord notification failed:', error);
      }
    }

    // Send to Telegram
    const TELEGRAM_TOKEN = process.env.ALPHA_TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT = process.env.ALPHA_TELEGRAM_CHAT_ID;
    if (TELEGRAM_TOKEN && TELEGRAM_CHAT) {
      try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT,
            text: message,
            parse_mode: 'Markdown',
          }),
        });
      } catch (error) {
        console.error('[ALPHA ALERT] Telegram notification failed:', error);
      }
    }
    
    // Also trigger callbacks for extensibility
    for (const callback of this.alertCallbacks) {
      try {
        await callback(alert);
      } catch (error) {
        console.error('[ALPHA ALERT] Callback error:', error);
      }
    }
  }

  // Check if token passes basic quality filters
  private async isQualityToken(mint: string): Promise<boolean> {
    try {
      const [rugCheck, dexScreener] = await Promise.all([
        fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`).then(r => r.json()).catch(() => null),
        fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`).then(r => r.json()).catch(() => null),
      ]);

      // Basic filters
      const hasGoodRugScore = rugCheck?.score > 85;
      const notHoneypot = !rugCheck?.isHoneypot;
      const hasLiquidity = (dexScreener?.pairs?.[0]?.liquidity?.usd || 0) > 5000;

      return hasGoodRugScore && notHoneypot && hasLiquidity;
    } catch (error) {
      console.error('[ALPHA ALERT] Quality check error:', error);
      return false;
    }
  }

  // Monitor alpha caller wallets for transactions
  private monitorAlphaCaller(caller: AlphaCallerConfig): void {
    if (!caller.enabled) return;

    try {
      const publicKey = new PublicKey(caller.wallet);
      
      const listenerId = this.connection.onLogs(
        publicKey,
        async (logs) => {
          try {
            // Look for token interactions in logs
            const buyPattern = /buy|swap|purchase/i;
            const mintPattern = /[1-9A-HJ-NP-Za-km-z]{32,44}/; // Solana address pattern
            
            for (const log of logs.logs) {
              if (buyPattern.test(log)) {
                const matches = log.match(mintPattern);
                if (matches && matches[0]) {
                  const mint = matches[0];
                  
                  // Basic validation and quality check
                  if (await this.isQualityToken(mint)) {
                    await this.sendAlert({
                      type: 'caller_signal',
                      mint,
                      source: caller.name,
                      timestamp: Date.now(),
                      data: {
                        wallet: caller.wallet,
                        transactionType: 'buy',
                      }
                    });
                  }
                }
              }
            }
          } catch (error) {
            console.error(`[ALPHA ALERT] Error processing ${caller.name} logs:`, error);
          }
        },
        'confirmed'
      );

      this.listeners.set(caller.wallet, listenerId);
    } catch (error) {
      console.error(`[ALPHA ALERT] Failed to monitor ${caller.name}:`, error);
    }
  }

  // Monitor pump.fun WebSocket for new token launches
  private startPumpFunMonitor(): void {
    try {
      const ws = new WebSocket('wss://pumpportal.fun/api/data');

      ws.on('open', () => {
        ws.send(JSON.stringify({ method: "subscribeNewToken" }));
      });

      ws.on('message', async (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString());
          
          if (msg.mint && msg.mint.length === 44) {
            // Check quality before alerting
            if (await this.isQualityToken(msg.mint)) {
              await this.sendAlert({
                type: 'new_token',
                mint: msg.mint,
                source: 'pump.fun',
                timestamp: Date.now(),
                data: {
                  name: msg.name,
                  symbol: msg.symbol,
                  marketCap: msg.marketCap,
                }
              });
            }
          }
        } catch (error) {
          console.error('[ALPHA ALERT] pump.fun message error:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('[ALPHA ALERT] pump.fun WebSocket error:', error);
      });

      ws.on('close', () => {
        if (this.isRunning) {
          setTimeout(() => this.startPumpFunMonitor(), 10000);
        }
      });

      this.wsConnections.push(ws);
    } catch (error) {
      console.error('[ALPHA ALERT] Failed to start pump.fun monitor:', error);
    }
  }

  // Start all monitoring
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Load wallets from database first
    await this.loadWalletsFromDatabase();

    for (const caller of this.alphaCallers) {
      this.monitorAlphaCaller(caller);
    }

    this.startPumpFunMonitor();
    this.startAutoRefresh();
    
    // Send startup notification directly (not through sendAlert to avoid fake links)
    const startupMessage = '🤖 **ANTIRUGILLER ALPHA ALERTS ONLINE**\n\n' +
      `✅ Monitoring ${this.alphaCallers.filter(c => c.enabled).length} top alpha callers\n` +
      `✅ Connected to pump.fun live feed\n` +
      `✅ Quality filters active (RugCheck > 85, No honeypots, Liquidity > $5K)\n\n` +
      `Contract: \`2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt\``;
    
    const DISCORD_WEBHOOK = process.env.ALPHA_DISCORD_WEBHOOK;
    if (DISCORD_WEBHOOK) {
      try {
        await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: startupMessage,
            username: 'RugKiller Alpha Alerts',
          }),
        });
      } catch (error) {
        console.error('[ALPHA ALERT] Discord startup notification failed:', error);
      }
    }

    const TELEGRAM_TOKEN = process.env.ALPHA_TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT = process.env.ALPHA_TELEGRAM_CHAT_ID;
    if (TELEGRAM_TOKEN && TELEGRAM_CHAT) {
      try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT,
            text: startupMessage,
            parse_mode: 'Markdown',
          }),
        });
      } catch (error) {
        console.error('[ALPHA ALERT] Telegram startup notification failed:', error);
      }
    }
  }

  // Stop all monitoring
  async stop(): Promise<void> {
    this.isRunning = false;

    this.stopAutoRefresh();

    // Remove wallet listeners
    for (const [wallet, listenerId] of Array.from(this.listeners.entries())) {
      try {
        await this.connection.removeOnLogsListener(listenerId);
      } catch (error) {
        console.error(`[ALPHA ALERT] Error removing listener for ${wallet}:`, error);
      }
    }
    this.listeners.clear();

    // Close WebSocket connections
    for (const ws of this.wsConnections) {
      try {
        ws.close();
      } catch (error) {
        console.error('[ALPHA ALERT] Error closing WebSocket:', error);
      }
    }
    this.wsConnections = [];
  }

  // Get current monitoring status
  getStatus() {
    return {
      isRunning: this.isRunning,
      monitoredCallers: this.alphaCallers.filter(c => c.enabled).length,
      totalCallers: this.alphaCallers.length,
      activeListeners: this.listeners.size,
      activeWebSockets: this.wsConnections.length,
      callers: this.alphaCallers,
    };
  }

  // Add custom alpha caller
  addCaller(wallet: string, name: string): void {
    if (!this.alphaCallers.find(c => c.wallet === wallet)) {
      const caller = { wallet, name, enabled: true };
      this.alphaCallers.push(caller);
      
      if (this.isRunning) {
        this.monitorAlphaCaller(caller);
      }
    }
  }

  // Remove custom alpha caller
  removeCaller(wallet: string): void {
    const index = this.alphaCallers.findIndex(c => c.wallet === wallet);
    if (index !== -1) {
      const caller = this.alphaCallers[index];
      this.alphaCallers.splice(index, 1);
      
      const listenerId = this.listeners.get(wallet);
      if (listenerId !== undefined) {
        this.connection.removeOnLogsListener(listenerId);
        this.listeners.delete(wallet);
      }
    }
  }
}

// Singleton instance
let alphaAlertInstance: AlphaAlertService | null = null;

export function getAlphaAlertService(): AlphaAlertService {
  if (!alphaAlertInstance) {
    alphaAlertInstance = new AlphaAlertService();
  }
  return alphaAlertInstance;
}

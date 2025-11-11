import { Connection, PublicKey } from '@solana/web3.js';
import WebSocket from 'ws';

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
}

// Top alpha callers on Solana to monitor
const DEFAULT_ALPHA_CALLERS: AlphaCallerConfig[] = [
  { wallet: '5s3cEXBY51wVkUtiGgrrha3Su9EpzyNiEyh8n1hMJRTE', name: 'Gemnl', enabled: true },
  { wallet: 'Ayif4n783bT6b6TvXoVEaQs8ozf4chYJgjnTaGeDpump', name: 'ATM.day', enabled: true },
  { wallet: 'Ch69ggMM11XUxMKTUVMk52VsPNToo1USqmjRVf9Epump', name: 'Alpha Gardner', enabled: true },
];

export class AlphaAlertService {
  private connection: Connection;
  private listeners: Map<string, number> = new Map();
  private wsConnections: WebSocket[] = [];
  private alertCallbacks: ((alert: AlphaAlert) => void)[] = [];
  private isRunning = false;
  private alphaCallers: AlphaCallerConfig[];

  constructor(rpcUrl?: string, customCallers?: AlphaCallerConfig[]) {
    this.connection = new Connection(rpcUrl || 'https://api.mainnet-beta.solana.com', 'confirmed');
    this.alphaCallers = customCallers || DEFAULT_ALPHA_CALLERS;
  }

  // Register callback for alerts
  onAlert(callback: (alert: AlphaAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  private async sendAlert(alert: AlphaAlert): Promise<void> {
    console.log(`[ALPHA ALERT] ${alert.type} from ${alert.source}: ${alert.mint}`);
    
    // Format alert message
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
      console.log(`[ALPHA ALERT] Monitoring ${caller.name} (${caller.wallet})`);
    } catch (error) {
      console.error(`[ALPHA ALERT] Failed to monitor ${caller.name}:`, error);
    }
  }

  // Monitor pump.fun WebSocket for new token launches
  private startPumpFunMonitor(): void {
    try {
      const ws = new WebSocket('wss://pumpportal.fun/api/data');

      ws.on('open', () => {
        console.log('[ALPHA ALERT] Connected to pump.fun WebSocket');
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
        console.log('[ALPHA ALERT] pump.fun WebSocket closed');
        
        // Auto-reconnect if still running
        if (this.isRunning) {
          console.log('[ALPHA ALERT] Reconnecting to pump.fun in 10 seconds...');
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
      console.log('[ALPHA ALERT] Service already running');
      return;
    }

    this.isRunning = true;
    console.log('[ALPHA ALERT] Starting alpha alert service...');

    // Monitor alpha callers
    for (const caller of this.alphaCallers) {
      this.monitorAlphaCaller(caller);
    }

    // Monitor pump.fun
    this.startPumpFunMonitor();

    console.log('[ALPHA ALERT] Service started successfully');
    
    // Send startup notification directly (not through sendAlert to avoid fake links)
    const startupMessage = '🤖 **RUGKILLER ALPHA ALERTS ONLINE**\n\n' +
      `✅ Monitoring ${this.alphaCallers.filter(c => c.enabled).length} top alpha callers\n` +
      `✅ Connected to pump.fun live feed\n` +
      `✅ Quality filters active (RugCheck > 85, No honeypots, Liquidity > $5K)\n\n` +
      `Contract: \`AAF1h3emV6qDXKGQ1v6km9qqv9Z6Pja9sPhDjrUCRtek\``;
    
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

    // Remove wallet listeners
    for (const [wallet, listenerId] of Array.from(this.listeners.entries())) {
      try {
        await this.connection.removeOnLogsListener(listenerId);
        console.log(`[ALPHA ALERT] Stopped monitoring ${wallet}`);
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

    console.log('[ALPHA ALERT] Service stopped');
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
      
      console.log(`[ALPHA ALERT] Added custom caller: ${name} (${wallet})`);
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
      
      console.log(`[ALPHA ALERT] Removed caller: ${caller.name} (${wallet})`);
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

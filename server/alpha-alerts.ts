import { Connection, PublicKey } from '@solana/web3.js';
import WebSocket from 'ws';
import { db } from './db';
import { kolWallets, smartWallets, smartSignals } from '../shared/schema.ts';
import { gte, and, eq } from 'drizzle-orm';
import { GMGNService } from './services/gmgn-service.ts';
import { NansenService, type NansenSmartMoneyTrade } from './services/nansen-service.ts';

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
  private gmgn = new GMGNService();
  private nansen = new NansenService();
  private nansenInterval: NodeJS.Timeout | null = null;
  private nansenCursor: string | null = null;
  private nansenSeenTransactions = new Set<string>();
  private nansenLastTimestamp = 0;
  private nansenPolling = false;

  constructor(rpcUrl?: string, customCallers?: AlphaCallerConfig[]) {
    // Resolve separate HTTP and WS endpoints to ensure subscriptions work reliably
    const explicitHttp = process.env.ALPHA_HTTP_RPC?.trim();
    const explicitWs = process.env.ALPHA_WS_RPC?.trim();

    // Helius preferred if key provided
    const heliusKey = process.env.HELIUS_API_KEY?.trim();
    const heliusHttp = heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}` : null;
    const heliusWs = heliusKey ? `wss://atlas-mainnet.helius-rpc.com/?api-key=${heliusKey}` : null;

    const httpEndpoint = explicitHttp || heliusHttp || rpcUrl || 'https://api.mainnet-beta.solana.com';
    const wsEndpoint = explicitWs || heliusWs || undefined;

    this.connection = new Connection(httpEndpoint, { commitment: 'confirmed', wsEndpoint });
    this.alphaCallers = customCallers || DEFAULT_ALPHA_CALLERS;
  }

  /**
   * Load profitable wallets from database to monitor
   * Automatically includes discovered wallets + seeded KOLs
   */
  async loadWalletsFromDatabase(minInfluence: number = 60): Promise<void> {
    try {
      // Prefer smart wallets DB; fallback to KOL if none
      let wallets: Array<{ walletAddress: string; displayName: string | null; influenceScore: number | null }>; 

      const smart = await db
        .select({ walletAddress: smartWallets.walletAddress, displayName: smartWallets.displayName, influenceScore: smartWallets.influenceScore })
        .from(smartWallets)
        .where(and(eq(smartWallets.isActive, true), gte(smartWallets.influenceScore, minInfluence)))
        .limit(100);

      if (smart.length > 0) {
        wallets = smart as any;
      } else {
        const kol = await db
          .select({ walletAddress: kolWallets.walletAddress, displayName: kolWallets.displayName, influenceScore: kolWallets.influenceScore })
          .from(kolWallets)
          .where(gte(kolWallets.influenceScore, minInfluence))
          .limit(100);
        wallets = kol as any;
      }

      const walletsToAdd: AlphaCallerConfig[] = wallets.map(w => ({
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

  private startNansenWatcher(): void {
    if (!this.nansen.isEnabled()) {
      console.log('[Alpha Alerts] Nansen smart money watcher disabled (missing API key)');
      return;
    }

    const lookbackMinutes = Number(process.env.NANSEN_LOOKBACK_MINUTES || 15);
    if (!this.nansenLastTimestamp) {
      const windowMs = Math.max(1, lookbackMinutes) * 60 * 1000;
      this.nansenLastTimestamp = Date.now() - windowMs;
    }

    const poll = async () => {
      if (this.nansenPolling) {
        return;
      }
      this.nansenPolling = true;
      try {
        const { trades, nextCursor } = await this.nansen.fetchSmartMoneyBuys({
          since: this.nansenLastTimestamp,
          cursor: this.nansenCursor,
        });

        if (nextCursor) {
          this.nansenCursor = nextCursor;
        }

        for (const trade of trades) {
          if (!trade.txHash || this.nansenSeenTransactions.has(trade.txHash)) {
            continue;
          }

          this.nansenSeenTransactions.add(trade.txHash);
          if (trade.timestamp && trade.timestamp > this.nansenLastTimestamp) {
            this.nansenLastTimestamp = trade.timestamp;
          }

          await this.handleNansenTrade(trade);
        }

        if (this.nansenSeenTransactions.size > 500) {
          const recent = Array.from(this.nansenSeenTransactions).slice(-400);
          this.nansenSeenTransactions = new Set(recent);
        }
      } catch (error) {
        console.error('[Alpha Alerts] Nansen watcher error:', error);
      } finally {
        this.nansenPolling = false;
      }
    };

    void poll();

    if (this.nansenInterval) {
      clearInterval(this.nansenInterval);
    }

    this.nansenInterval = setInterval(() => {
      void poll();
    }, this.nansen.getPollingInterval());
  }

  private stopNansenWatcher(): void {
    if (this.nansenInterval) {
      clearInterval(this.nansenInterval);
      this.nansenInterval = null;
    }
    this.nansenPolling = false;
  }

  private async handleNansenTrade(trade: NansenSmartMoneyTrade): Promise<void> {
    try {
      if (!trade.tokenAddress || trade.tokenAddress.length < 32) {
        return;
      }

      const isQuality = await this.isQualityToken(trade.tokenAddress);
      if (!isQuality) {
        return;
      }

      const timestamp = trade.timestamp || Date.now();
      const shortWallet = `${trade.walletAddress.slice(0, 4)}...${trade.walletAddress.slice(-4)}`;
      const walletLabel = trade.walletLabel?.trim() || `Smart Wallet ${shortWallet}`;
      const influenceRaw = trade.confidence !== undefined ? Math.round(trade.confidence) : 80;
      const influenceScore = Math.min(100, Math.max(40, influenceRaw));

      try {
        await db
          .insert(smartWallets)
          .values({
            walletAddress: trade.walletAddress,
            displayName: walletLabel,
            source: 'nansen',
            influenceScore,
            isActive: true,
            lastActiveAt: new Date(timestamp),
            notes: 'Imported via Nansen smart money feed',
          })
          .onConflictDoUpdate({
            target: smartWallets.walletAddress,
            set: {
              displayName: walletLabel,
              source: 'nansen',
              influenceScore,
              isActive: true,
              lastActiveAt: new Date(timestamp),
              updatedAt: new Date(),
            },
          });
      } catch (error) {
        console.error('[Alpha Alerts] Failed to upsert Nansen smart wallet:', error);
      }

      try {
        await db
          .insert(smartSignals)
          .values({
            walletAddress: trade.walletAddress,
            tokenAddress: trade.tokenAddress,
            action: 'buy',
            amountTokens: trade.amountToken !== undefined ? String(trade.amountToken) : undefined,
            priceUsd: trade.amountUsd !== undefined ? String(trade.amountUsd) : undefined,
            txSignature: trade.txHash,
            confidence: Number.isFinite(trade.confidence) ? Math.round(trade.confidence as number) : undefined,
            source: 'nansen',
            detectedAt: new Date(timestamp),
          })
          .onConflictDoNothing({ target: smartSignals.txSignature });
      } catch (error) {
        console.error('[Alpha Alerts] Failed to log Nansen smart signal:', error);
      }

      await this.sendAlert({
        type: 'caller_signal',
        mint: trade.tokenAddress,
        source: walletLabel,
        timestamp,
        data: {
          wallet: trade.walletAddress,
          tokenSymbol: trade.tokenSymbol,
          tokenName: trade.tokenName,
          amountUsd: trade.amountUsd,
          amountToken: trade.amountToken,
          txHash: trade.txHash,
          source: 'nansen',
          provider: 'Nansen',
          sourceUrl: trade.sourceUrl,
          confidence: influenceScore,
        },
      });
    } catch (error) {
      console.error('[Alpha Alerts] Error handling Nansen trade:', error);
    }
  }

  // Register callback for alerts; includes formatted message for convenience
  onAlert(callback: (alert: AlphaAlert, message: string) => void): void {
    this.alertCallbacks.push(callback);
  }

  private async sendAlert(alert: AlphaAlert): Promise<void> {
    let message = '';
    if (alert.type === 'caller_signal') {
      // Try to enrich with GMGN smart/bundle info
      let gmgnLines = '';
      try {
        const gmgnData = await this.gmgn.getTokenAnalysis(alert.mint);
        if (gmgnData) {
          const bundle = this.gmgn.extractBundleInfo(gmgnData);
          const smart = this.gmgn.hasSmartMoneyActivity(gmgnData);
          const smartDegen = gmgnData.data.smart_degen;
          const parts: string[] = [];
          if (smart && smartDegen) {
            parts.push(`🧠 Smart traders: ${smartDegen.count} (avg cost ${smartDegen.avg_cost?.toFixed?.(2) ?? smartDegen.avg_cost})`);
          }
          if (bundle) {
            parts.push(`🧩 Bundle: ${bundle.isBundled ? 'yes' : 'no'} (wallets ${bundle.bundleWalletCount}, conf ${bundle.confidence}%)`);
            if (bundle.insiderCount) parts.push(`🕵️ Insiders: ${bundle.insiderCount}`);
            if (bundle.sniperCount) parts.push(`🎯 Snipers: ${bundle.sniperCount}`);
          }
          if (parts.length > 0) {
            gmgnLines = parts.join('\n');
          }
        }
      } catch {}

      try {
        await db.insert(smartSignals).values({
          walletAddress: alert.data?.wallet || alert.source,
          tokenAddress: alert.mint,
          action: 'buy',
          source: 'alpha-alerts',
          detectedAt: new Date(),
        });
      } catch {}

      const walletAddress = typeof alert.data?.wallet === 'string' ? alert.data.wallet : undefined;
      const shortWallet = walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : null;
      const providerLabel = typeof alert.data?.provider === 'string' ? alert.data.provider : 'Alpha Alerts';
      const tokenSymbol = alert.data?.tokenSymbol || alert.data?.tokenName;
      const tokenName = alert.data?.tokenName && alert.data?.tokenName !== tokenSymbol ? alert.data?.tokenName : undefined;
      const amountToken = Number(alert.data?.amountToken);
      const amountUsd = Number(alert.data?.amountUsd);
      const txHash = typeof alert.data?.txHash === 'string' ? alert.data.txHash : undefined;
      const sourceUrl = typeof alert.data?.sourceUrl === 'string' ? alert.data.sourceUrl : undefined;

      const formatValue = (value: number, fraction: number) => {
        if (!Number.isFinite(value) || value <= 0) return undefined;
        return value.toLocaleString(undefined, { maximumFractionDigits: fraction });
      };

      const summaryLines: string[] = [];
      summaryLines.push(`📍 CA: \`${alert.mint}\``);
      summaryLines.push(`👤 Wallet: ${alert.source}${shortWallet ? ` (${shortWallet})` : ''}`);
      if (providerLabel) {
        summaryLines.push(`📡 Source: ${providerLabel}`);
      }
      if (walletAddress) {
        summaryLines.push(`🔑 Address: \`${walletAddress}\``);
      }
      if (tokenSymbol) {
        summaryLines.push(`🏷️ Token: ${tokenSymbol}${tokenName ? ` (${tokenName})` : ''}`);
      }
      const formattedSize = formatValue(amountToken, amountToken > 1 ? 2 : 4);
      if (formattedSize) {
        summaryLines.push(`🪙 Size: ${formattedSize} tokens`);
      }
      const formattedUsd = formatValue(amountUsd, amountUsd > 1000 ? 0 : 2);
      if (formattedUsd) {
        summaryLines.push(`💵 USD: $${formattedUsd}`);
      }
      if (gmgnLines) {
        summaryLines.push(gmgnLines);
      }
      if (txHash) {
        summaryLines.push(`🧾 Tx: \`${txHash}\``);
      }
      summaryLines.push(`🔗 https://pump.fun/${alert.mint}`);
      summaryLines.push(`💎 https://dexscreener.com/solana/${alert.mint}`);
      if (sourceUrl) {
        summaryLines.push(`🛰️ Trace: ${sourceUrl}`);
      }

      message = `🚨 **SMART MONEY BUY: ${alert.source}**\n\n${summaryLines.join('\n')}`;
    }
    
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
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
        await callback(alert, message);
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
      if (alert.type === 'caller_signal') {
        // Enrich with GMGN bundle/smart trader context
        let gmgnLines = '';
        try {
          const gmgnData = await this.gmgn.getTokenAnalysis(alert.mint);
          if (gmgnData) {
            const bundle = this.gmgn.extractBundleInfo(gmgnData);
            const smart = this.gmgn.hasSmartMoneyActivity(gmgnData);
            const smartDegen = gmgnData.data.smart_degen;
            const parts: string[] = [];
            if (smart && smartDegen) {
              parts.push(`🧠 Smart traders: ${smartDegen.count} (avg cost ${smartDegen.avg_cost?.toFixed?.(2) ?? smartDegen.avg_cost})`);
            }
            if (bundle) {
              parts.push(`🧩 Bundle: ${bundle.isBundled ? 'yes' : 'no'} (wallets ${bundle.bundleWalletCount}, conf ${bundle.confidence}%)`);
              if (bundle.insiderCount) parts.push(`🕵️ Insiders: ${bundle.insiderCount}`);
              if (bundle.sniperCount) parts.push(`🎯 Snipers: ${bundle.sniperCount}`);
            }
            if (parts.length > 0) {
              gmgnLines = parts.join('\n');
            }
          }
        } catch {}

        if (alert.data?.source !== 'nansen') {
          try {
            await db.insert(smartSignals).values({
              walletAddress: alert.data?.wallet || alert.source,
              tokenAddress: alert.mint,
              action: 'buy',
              source: 'alpha-alerts',
              detectedAt: new Date(),
            });
          } catch {}
        }

        const walletAddress: string | undefined = alert.data?.wallet;
        const shortWallet = walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : null;
        const providerLabel = alert.data?.provider || 'Alpha Alerts';
        const tokenSymbol = alert.data?.tokenSymbol || alert.data?.tokenName;
        const tokenName = alert.data?.tokenName && alert.data?.tokenName !== tokenSymbol ? alert.data?.tokenName : undefined;
        const amountTokenRaw = Number(alert.data?.amountToken);
        const amountUsdRaw = Number(alert.data?.amountUsd);
        const txHash = alert.data?.txHash;
        const sourceUrl = alert.data?.sourceUrl;

        const formatValue = (value: number, fraction: number) => {
          return Number.isFinite(value)
            ? value.toLocaleString(undefined, { maximumFractionDigits: fraction })
            : undefined;
        };

        const summaryLines: string[] = [];
        summaryLines.push(`📍 CA: \`${alert.mint}\``);
        summaryLines.push(`👤 Wallet: ${alert.source}${shortWallet ? ` (${shortWallet})` : ''}`);
        if (providerLabel) {
          summaryLines.push(`📡 Source: ${providerLabel}`);
        }
        if (walletAddress) {
          summaryLines.push(`🔑 Address: \`${walletAddress}\``);
        }
        if (tokenSymbol) {
          summaryLines.push(`🏷️ Token: ${tokenSymbol}${tokenName ? ` (${tokenName})` : ''}`);
        }
        const formattedSize = formatValue(amountTokenRaw, amountTokenRaw > 1 ? 2 : 4);
        if (formattedSize) {
          summaryLines.push(`🪙 Size: ${formattedSize} tokens`);
        }
        const formattedUsd = formatValue(amountUsdRaw, amountUsdRaw > 1000 ? 0 : 2);
        if (formattedUsd) {
          summaryLines.push(`💵 USD: $${formattedUsd}`);
        }
        if (gmgnLines) {
          summaryLines.push(gmgnLines);
        }
        if (txHash) {
          summaryLines.push(`🧾 Tx: \`${txHash}\``);
        }
        summaryLines.push(`🔗 https://pump.fun/${alert.mint}`);
        summaryLines.push(`💎 https://dexscreener.com/solana/${alert.mint}`);
        if (sourceUrl) {
          summaryLines.push(`🛰️ Trace: ${sourceUrl}`);
        }

        message = `🚨 **SMART MONEY BUY: ${alert.source}**\n\n${summaryLines.join('\n')}`;
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
    this.startNansenWatcher();
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
    this.stopNansenWatcher();
    this.nansenSeenTransactions.clear();

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
      } else {
        // Auto-start the service when a caller is added to ensure tracking begins
        try {
          // Fire and forget to avoid changing method signature
          void this.start();
        } catch (e) {
          console.error('[ALPHA ALERT] Autostart failed after addCaller:', e);
        }
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

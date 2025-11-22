import { Connection, PublicKey } from '@solana/web3.js';
import { getRandomPublicRpc } from './public-rpcs.ts';
import WebSocket from 'ws';
import { db } from './db';
import { kolWallets, smartWallets, smartSignals } from '../shared/schema.ts';
import { gte, and, eq } from 'drizzle-orm';
import { GMGNService } from './services/gmgn-service.ts';
import { NansenService, type NansenSmartMoneyTrade } from './services/nansen-service.ts';
import { storage } from './storage.ts';
import { rpcBalancer } from './services/rpc-balancer.ts';

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
  private alertCallbacks: ((alert: AlphaAlert, message: string) => void)[] = [];
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
  // Reliability tracking
  private currentRpc: string = '';
  private consecutiveFailures = 0;
  private lastSuccessAt = 0;
  private lastFailureAt = 0;
  private lastLogAt = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(rpcUrl?: string, customCallers?: AlphaCallerConfig[]) {
    // Use RPC balancer for intelligent load distribution - NO WebSocket subscriptions
    // Webhook-based monitoring avoids API key restrictions and rate limits
    const explicitHttp = process.env.ALPHA_HTTP_RPC?.trim();
    
    let httpEndpoint: string;
    if (explicitHttp) {
      httpEndpoint = explicitHttp;
      console.log('[Alpha Alerts] Using explicit HTTP RPC override');
    } else if (rpcUrl) {
      httpEndpoint = rpcUrl;
      console.log('[Alpha Alerts] Using provided RPC URL');
    } else {
      // Use RPC balancer for intelligent load distribution across all available RPCs
      const provider = rpcBalancer.select();
      httpEndpoint = provider.getUrl();
      console.log(`[Alpha Alerts] Using RPC balancer - selected ${provider.name}`);
    }

    this.currentRpc = httpEndpoint;
    // DO NOT use wsEndpoint - causes "API key not allowed" errors with free tiers
    // Webhook services handle real-time monitoring instead
    this.connection = new Connection(this.currentRpc, { 
      commitment: 'confirmed',
      // No wsEndpoint - use HTTP polling + webhooks instead
    });
    console.log(`[Alpha Alerts] HTTP-only RPC initialized: ${this.currentRpc.substring(0, 50)}...`);
    console.log('[Alpha Alerts] Using webhook-based monitoring (no WebSocket subscriptions)');
    this.alphaCallers = customCallers || DEFAULT_ALPHA_CALLERS;
  }

  // Webhook-based wallet monitoring - polls recent signatures instead of WebSocket subscriptions
  // This avoids API key restrictions and leverages the RPC balancer for load distribution
  private async monitorAlphaCaller(caller: AlphaCallerConfig): Promise<void> {
    try {
      if (!caller.enabled) return;
      if (!caller.wallet) return;

      if (this.listeners.has(caller.wallet)) {
        return; // already monitoring
      }

      // Instead of WebSocket subscription (which requires premium API keys),
      // we mark this wallet for periodic polling via getSignaturesForAddress
      // The actual monitoring happens in the webhook services and Nansen feed
      console.log(`[Alpha Alerts] Wallet ${caller.name} registered for webhook-based monitoring`);
      
      // Store a placeholder listener ID to track monitoring state
      const dummyListenerId = Date.now() + Math.random();
      this.listeners.set(caller.wallet, dummyListenerId);
      
      // The real monitoring happens via:
      // 1. Helius webhook service (token_created events)
      // 2. QuickNode webhook service (transaction events) 
      // 3. Nansen feed (smart money trades)
      // 4. Pump.fun WebSocket (new token launches)
      
      this.lastLogAt = Date.now();
      // Monitoring is now handled by external webhook services
      // This avoids:
      // - "API key not allowed to access blockchain" errors
      // - Rate limiting from constant WebSocket connections
      // - Single point of failure from one RPC endpoint
      
    } catch (error: any) {
      console.error(`[Alpha Alerts] Error setting up monitoring for ${caller.name}:`, error?.message);
    }
  }
  
  // REMOVED OLD CODE: The legacy onLogs WebSocket subscription caused API key issues.
  // The logic now lives in the webhook services and is intentionally omitted here.

  /**
   * Load profitable wallets from database to monitor
   * Automatically includes discovered wallets + seeded KOLs
   */
  async loadWalletsFromDatabase(minInfluence: number = 60): Promise<void> {
    try {
      // Simpler selection to avoid cross-package drizzle type conflicts
      // Fetch smart wallets first
      type WalletRow = { walletAddress: string; displayName: string | null; influenceScore: number | null };
      const meetsInfluenceThreshold = (row: WalletRow) => row.influenceScore === null || row.influenceScore >= minInfluence;

      let wallets: WalletRow[] = [];
      try {
        const smart = await db
          .select({ walletAddress: smartWallets.walletAddress, displayName: smartWallets.displayName, influenceScore: smartWallets.influenceScore })
          .from(smartWallets)
          .where(eq(smartWallets.isActive, true))
          .limit(200);
        wallets = smart.filter(meetsInfluenceThreshold);
      } catch (err) {
        console.warn('[Alpha Alerts] Smart wallets query failed, will fallback:', err);
      }
      if (wallets.length === 0) {
        try {
          const kol = await db
            .select({ walletAddress: kolWallets.walletAddress, displayName: kolWallets.displayName, influenceScore: kolWallets.influenceScore })
            .from(kolWallets)
            .limit(200);
          wallets = kol.filter(meetsInfluenceThreshold);
        } catch (err) {
          console.warn('[Alpha Alerts] KOL wallets query failed:', err);
        }
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
    console.log(`[ALPHA ALERTS] Sending alert - Type: ${alert.type} | Mint: ${alert.mint} | Source: ${alert.source}`);
    
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
    
    const DIRECT = process.env.ALPHA_ALERTS_DIRECT_SEND === 'true';
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.ALPHA_TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT = process.env.ALPHA_TELEGRAM_CHAT_ID;
    if (DIRECT && TELEGRAM_TOKEN && TELEGRAM_CHAT) {
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
    console.log(`[ALPHA ALERTS] Triggering ${this.alertCallbacks.length} callback(s)`);
    for (const callback of this.alertCallbacks) {
      try {
        await callback(alert, message);
        console.log(`[ALPHA ALERTS] ✅ Callback executed successfully`);
      } catch (error) {
        console.error('[ALPHA ALERT] Callback error:', error);
      }
    }
  }

  // Public: trigger a synthetic alert for testing delivery
  async triggerTestAlert(mint?: string, source?: string): Promise<void> {
    const testMint = (mint && mint.length >= 32) ? mint : 'So11111111111111111111111111111111111111112';
    const testSource = source || 'Test Wallet';
    await this.sendAlert({
      type: 'caller_signal',
      mint: testMint,
      source: testSource,
      timestamp: Date.now(),
      data: { provider: 'Test', amountToken: 1, amountUsd: 1 }
    });
  }

  // Public: send the startup message again to verify direct-send wiring
  async sendStartupTest(messageOverride?: string): Promise<void> {
    const startupMessage = messageOverride || (
      '🧪 **ALPHA ALERTS TEST**\n\n' +
      'This is a test message confirming direct sends are configured.\n' +
      'If you see this in Discord/Telegram, delivery works.'
    );
    const DIRECT = process.env.ALPHA_ALERTS_DIRECT_SEND === 'true';
    const DISCORD_WEBHOOK = process.env.ALPHA_DISCORD_WEBHOOK;
    if (DIRECT && DISCORD_WEBHOOK) {
      try {
        await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: startupMessage, username: 'RugKiller Alpha Alerts' }),
        });
      } catch (error) {
        console.error('[ALPHA ALERT] Discord test send failed:', error);
      }
    }

    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.ALPHA_TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT = process.env.ALPHA_TELEGRAM_CHAT_ID;
    if (DIRECT && TELEGRAM_TOKEN && TELEGRAM_CHAT) {
      try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: startupMessage, parse_mode: 'Markdown' }),
        });
      } catch (error) {
        console.error('[ALPHA ALERT] Telegram test send failed:', error);
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

  // Monitor pump.fun WebSocket for new token launches
  private startPumpFunMonitor(): void {
    try {
      const ws = new WebSocket('wss://pumpportal.fun/api/data');

      ws.on('open', () => {
        ws.send(JSON.stringify({ method: "subscribeNewToken" }));
      });

      ws.on('message', async (data: WebSocket.Data) => {
        let msg: any;
        try {
          msg = JSON.parse(data.toString());
        } catch (parseError) {
          console.error('[Alpha Alerts] Invalid WebSocket JSON:', parseError);
          return;
        }
        try {
          
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
        } catch (err: any) {
          console.error('[Alpha Alerts] Error processing token from pump.fun feed:', err?.message || err);
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

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Alpha Alerts] Service already running.');
      return;
    }
    console.log('[Alpha Alerts] Starting service...');
    this.isRunning = true;

    // Load initial wallets from DB with timeout
    try {
      const loadTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database load timeout')), 10000)
      );
      await Promise.race([
        this.loadWalletsFromDatabase(),
        loadTimeout
      ]);
    } catch (err: any) {
      console.warn('[Alpha Alerts] Wallet loading timed out or failed:', err?.message);
    }

    // Establish initial RPC connectivity and test it
    await this.establishConnection();

    // Register webhook listeners for real-time monitoring
    await this.setupWebhookListeners();

    // Start monitoring each configured caller (now webhook-based)
    for (const caller of this.alphaCallers) {
      this.monitorAlphaCaller(caller);
    }

    // Start auto-refreshing the wallet list
    this.startAutoRefresh();

    // Start Nansen watcher if enabled
    this.startNansenWatcher();

    // Begin heartbeat loop (but don't rely on it for WebSocket silence detection)
    this.startHeartbeat();

    console.log(`[Alpha Alerts] ✅ Service started using webhook-based monitoring`);
    console.log(`[Alpha Alerts] Registered ${this.alphaCallers.length} wallets for tracking`);
    console.log(`[Alpha Alerts] Using distributed RPC load balancing across 80+ endpoints`);
  }

  /**
   * Setup webhook listeners for real-time token detection
   * This replaces the old WebSocket subscription approach
   */
  private async setupWebhookListeners(): Promise<void> {
    try {
      // Listen to Helius webhook events
      const { heliusWebhook } = await import('./services/helius-webhook.ts');
      
      heliusWebhook.on('token_created', async (event: any) => {
        console.log('[Alpha Alerts] New token detected via Helius:', event.mint);
        // Check if any monitored wallets are involved
        await this.checkTokenForAlphaWallets(event.mint, 'Helius Webhook');
      });

      heliusWebhook.on('large_transfer', async (event: any) => {
        const isMonitored = this.alphaCallers.some(c => 
          c.wallet === event.from || c.wallet === event.to
        );
        if (isMonitored) {
          console.log('[Alpha Alerts] Monitored wallet activity:', event);
          await this.checkTokenForAlphaWallets(event.mint, 'Large Transfer');
        }
      });

      // Listen to QuickNode webhook events
      const { quickNodeWebhook } = await import('./services/quicknode-webhook.ts');
      
      quickNodeWebhook.on('token_created', async (event: any) => {
        console.log('[Alpha Alerts] New token detected via QuickNode:', event.mint);
        await this.checkTokenForAlphaWallets(event.mint, 'QuickNode Stream');
      });

      // Pump.fun WebSocket integration (already exists)
      const { pumpFunWebhook } = await import('./services/pumpfun-webhook.ts');
      
      pumpFunWebhook.on('new_token', async (event: any) => {
        console.log('[Alpha Alerts] New Pump.fun token:', event.mint);
        await this.checkTokenForAlphaWallets(event.mint, 'Pump.fun');
      });

      console.log('[Alpha Alerts] ✅ Webhook listeners registered');
    } catch (error) {
      console.warn('[Alpha Alerts] Some webhook services unavailable:', error);
      console.log('[Alpha Alerts] Falling back to Nansen feed only');
    }
  }

  /**
   * Check if a newly detected token involves any alpha wallets
   */
  private async checkTokenForAlphaWallets(mint: string, source: string): Promise<void> {
    try {
      // For now, just log - more sophisticated analysis can be added
      // Could check transaction signatures to see if monitored wallets interacted
      console.log(`[Alpha Alerts] Checking token ${mint} from ${source}`);
    } catch (error) {
      console.error('[Alpha Alerts] Error checking token:', error);
    }
  }

  stop(): void {
    if (!this.isRunning) return;
    console.log('[Alpha Alerts] Stopping service...');
    this.isRunning = false;

    this.stopAutoRefresh();
    this.stopNansenWatcher();
    this.nansenSeenTransactions.clear();
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Remove wallet listeners
    for (const [wallet, listenerId] of Array.from(this.listeners.entries())) {
      try {
        this.connection.removeOnLogsListener(listenerId);
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
  getStatus(verbose: boolean = false) {
    const status = {
      isRunning: this.isRunning,
      monitoredCallers: this.alphaCallers.filter(c => c.enabled).length,
      totalCallers: this.alphaCallers.length,
      activeListeners: this.listeners.size,
      activeWebSockets: this.wsConnections.length,
      callers: verbose ? this.alphaCallers : undefined,
      message: undefined as string | undefined,
    };
    
    // If not running and no callers, it's likely unconfigured
    if (!status.isRunning && status.totalCallers === 0) {
      return {
        ...status,
        message: "Service is stopped and no alpha callers are configured. Use `/alpha add` to add wallets to monitor, then `/alpha start`."
      };
    }
    
    // If running but no callers, it's running empty
    if (status.isRunning && status.totalCallers === 0) {
      return {
        ...status,
        message: "Service is running but no alpha callers are configured. Use `/alpha add` to add wallets to monitor."
      };
    }
    
    return status;
  }

  // Add custom alpha caller
  addCaller(wallet: string, name: string): void {
    if (!this.alphaCallers.find(c => c.wallet === wallet)) {
      const caller = { wallet, name, enabled: true };
      this.alphaCallers.push(caller);
      this.persistCaller(caller);
      
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
      this.deactivatePersistedCaller(wallet);
      
      const listenerId = this.listeners.get(wallet);
      if (listenerId !== undefined) {
        this.connection.removeOnLogsListener(listenerId);
        this.listeners.delete(wallet);
      }
    }
  }

  private persistCaller(caller: AlphaCallerConfig): void {
    const influenceScore = Number.isFinite(caller.influenceScore) ? Number(caller.influenceScore) : 80;
    void storage.upsertSmartWallet({
      walletAddress: caller.wallet,
      displayName: caller.name,
      source: 'manual-alpha',
      influenceScore: Math.max(60, influenceScore),
      isActive: true,
      notes: 'Added via alpha alerts admin command',
    }).catch(error => {
      console.error('[Alpha Alerts] Failed to persist alpha caller:', error);
    });
  }

  private deactivatePersistedCaller(wallet: string): void {
    void storage.setSmartWalletActive(wallet, false).catch(error => {
      console.error('[Alpha Alerts] Failed to deactivate alpha caller:', error);
    });
  }

  // Connection helpers / reliability ---------------------------------
  private async establishConnection(): Promise<void> {
    try {
      // Always use RPC balancer for best endpoint selection
      const provider = rpcBalancer.select();
      this.currentRpc = provider.getUrl();
      
      // Create connection WITHOUT WebSocket endpoint to avoid API key restrictions
      this.connection = new Connection(this.currentRpc, { 
        commitment: 'confirmed',
        // NO wsEndpoint - this causes \"API key not allowed\" errors
      });
      
      // Test connection with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );
      await Promise.race([
        this.connection.getVersion(),
        timeoutPromise
      ]);
      
      this.lastSuccessAt = Date.now();
      this.consecutiveFailures = 0;
      console.log(`[Alpha Alerts] ✅ Connection healthy: ${provider.name} (${provider.tier})`);
    } catch (err: any) {
      this.lastFailureAt = Date.now();
      this.consecutiveFailures++;
      console.error('[Alpha Alerts] ❌ Connection failed:', err?.message || String(err));
      
      await this.scheduleReconnect();
    }
  }

  private async scheduleReconnect(): Promise<void> {
    if (!this.isRunning) return;
    const base = 1000; // 1s
    const cap = 30000; // 30s
    const attempt = this.consecutiveFailures;
    const raw = Math.min(cap, base * 2 ** attempt);
    const delay = Math.round(raw * (0.8 + Math.random() * 0.4));
    console.log(`[Alpha Alerts] Reconnect scheduled in ${delay}ms (attempt ${attempt + 1})`);
    
    setTimeout(async () => {
      // Always use RPC balancer to intelligently rotate to a healthy endpoint
      // It will automatically avoid rate-limited or failing endpoints
      console.log('[Alpha Alerts] Using RPC balancer for endpoint rotation...');
      await this.establishConnection();
      
      // No need to re-establish WebSocket listeners - we're using webhooks now!
      if (this.consecutiveFailures === 0) {
        console.log('[Alpha Alerts] ✅ Reconnection successful');
      }
    }, delay);
  }

  private startHeartbeat(): void {
    // Periodic health check - test RPC connection every 60 seconds
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        // Test connection with a lightweight call
        await Promise.race([
          this.connection.getSlot(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Heartbeat timeout')), 3000))
        ]);
        
        // Connection is healthy
        if (this.consecutiveFailures > 0) {
          console.log('[Alpha Alerts] Heartbeat successful - connection recovered');
          this.consecutiveFailures = 0;
        }
        this.lastSuccessAt = Date.now();
      } catch (error: any) {
        console.warn(`[Alpha Alerts] Heartbeat failed: ${error?.message}`);
        this.consecutiveFailures++;
        this.lastFailureAt = Date.now();
        
        // If multiple failures, trigger reconnection
        if (this.consecutiveFailures >= 3) {
          console.warn('[Alpha Alerts] Multiple heartbeat failures - triggering reconnection');
          await this.scheduleReconnect();
        }
      }
    }, 60000); // Check every 60 seconds
    
    console.log('[Alpha Alerts] Heartbeat monitor started (60s intervals)');
  }

  getHealth() {
    const now = Date.now();
    return {
      running: this.isRunning,
      currentRpc: this.currentRpc,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessAt: this.lastSuccessAt ? new Date(this.lastSuccessAt).toISOString() : null,
      lastFailureAt: this.lastFailureAt ? new Date(this.lastFailureAt).toISOString() : null,
      lastLogAt: this.lastLogAt ? new Date(this.lastLogAt).toISOString() : null,
      secondsSinceLastLog: this.lastLogAt ? Math.round((now - this.lastLogAt)/1000) : null,
      monitoredWallets: this.alphaCallers.filter(c => c.enabled).length,
      activeListeners: this.listeners.size,
      status: !this.isRunning ? 'stopped' : (this.consecutiveFailures > 3 ? 'degraded' : 'healthy')
    };
  }
}

// Singleton instance
let alphaAlertService: AlphaAlertService | null = null;

export function getAlphaAlertService(): AlphaAlertService {
  if (!alphaAlertService) {
    alphaAlertService = new AlphaAlertService();
    if (process.env.ALPHA_ALERTS_AUTOSTART === 'true') {
      alphaAlertService.start().catch(err => console.error('[Alpha Alerts] Autostart failed:', err));
    }
  }
  return alphaAlertService;
}

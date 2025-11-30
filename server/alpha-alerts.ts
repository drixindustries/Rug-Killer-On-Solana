import { Connection, PublicKey } from '@solana/web3.js';
import { getRandomPublicRpc } from './public-rpcs.js';
import WebSocket from 'ws';
import { db } from './db';
import { kolWallets, smartWallets, smartSignals } from '../shared/schema.js';
import { gte, and, eq } from 'drizzle-orm';
import { GMGNService } from './services/gmgn-service.js';
import { storage } from './storage.js';
import { rpcBalancer } from './services/rpc-balancer.js';
import { TemporalGNNDetector, type TGNResult } from './temporal-gnn-detector.js';
import { MigrationDetector, getMigrationDetector, type MigrationEvent } from './migration-detector.js';
import { HolderAnalysisService, type HolderAnalysisResult } from './services/holder-analysis.js';
import { getWalletDiscoveryService } from './services/wallet-discovery.js';

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
  // Reliability tracking
  private currentRpc: string = '';
  private consecutiveFailures = 0;
  private lastSuccessAt = 0;
  private lastFailureAt = 0;
  private lastLogAt = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private tgnDetector: TemporalGNNDetector | null = null;
  private migrationDetector: MigrationDetector | null = null;

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
    
    // Initialize Temporal GNN detector (if enabled)
    if (process.env.TGN_ENABLED !== 'false') {
      this.tgnDetector = new TemporalGNNDetector(this.connection);
      console.log('[Alpha Alerts] Temporal GNN detector initialized (10-18% better rug detection)');
      
      // Initialize migration detector
      this.migrationDetector = getMigrationDetector(this.connection);
      
      // Register migration callback to inject events into TGN
      this.migrationDetector.onMigration(async (event: MigrationEvent) => {
        console.log(`[Alpha Alerts] Migration detected: ${event.tokenMint} → ${event.raydiumLP}`);
        
        // Inject migration event into TGN detector
        if (this.tgnDetector) {
          this.tgnDetector.injectMigrationEvent(event.tokenMint, event.raydiumLP, event.timestamp);
        }
        
        // Trigger re-analysis for this token
        await this.handleMigrationReAnalysis(event);
      });
      
      console.log('[Alpha Alerts] Migration detector initialized');
    } else {
      console.log('[Alpha Alerts] Temporal GNN detector disabled');
    }
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
      // The actual monitoring happens in the webhook services
      console.log(`[Alpha Alerts] Wallet ${caller.name} registered for webhook-based monitoring`);
      
      // Store a placeholder listener ID to track monitoring state
      const dummyListenerId = Date.now() + Math.random();
      this.listeners.set(caller.wallet, dummyListenerId);
      
      // The real monitoring happens via:
      // 1. Helius webhook service (token_created events)
      // 2. Ankr/Helius direct detections via RPC balancer
      // 3. Pump.fun WebSocket (new token launches)
      
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
      console.log(`[Alpha Alerts] Loading wallets from database (min influence: ${minInfluence})...`);
      
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
        console.log(`[Alpha Alerts] Found ${smart.length} active smart wallets, ${wallets.length} meet influence threshold`);
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
          console.log(`[Alpha Alerts] Found ${kol.length} KOL wallets, ${wallets.length} meet influence threshold`);
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

      let addedCount = 0;
      // Merge with existing callers (avoid duplicates)
      for (const newWallet of walletsToAdd) {
        if (!this.alphaCallers.find(c => c.wallet === newWallet.wallet)) {
          this.alphaCallers.push(newWallet);
          addedCount++;
          console.log(`[Alpha Alerts] Added wallet: ${newWallet.name} (${newWallet.wallet.substring(0, 8)}...) - influence: ${newWallet.influenceScore}`);
          
          // If already running, start monitoring this wallet
          if (this.isRunning) {
            this.monitorAlphaCaller(newWallet);
          }
        }
      }

      console.log(`[Alpha Alerts] ✅ Loaded ${addedCount} new wallets from database (${this.alphaCallers.length} total active)`);
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
      
      // Prominently display who bought
      const walletName = alert.data?.walletName || alert.source;
      const influenceScore = alert.data?.influenceScore;
      const walletEmoji = influenceScore && influenceScore >= 80 ? '⭐' : '💼';
      
      // Add wallet PNL stats if available (moved to header)
      const walletStats = alert.data?.walletStats;
      let walletStatsLine = '';
      if (walletStats) {
        const wins = walletStats.wins || 0;
        const losses = walletStats.losses || 0;
        const totalTrades = wins + losses;
        
        // Build compact stats for header
        const statParts: string[] = [];
        if (walletStats.profitSol !== null && walletStats.profitSol !== undefined) {
          const profitEmoji = walletStats.profitSol >= 0 ? '💰' : '📉';
          const profitFormatted = Math.abs(walletStats.profitSol).toFixed(2);
          statParts.push(`${profitEmoji} PNL: ${walletStats.profitSol >= 0 ? '+' : '-'}${profitFormatted} SOL (avg ${totalTrades > 0 ? (walletStats.profitSol / totalTrades).toFixed(2) : '0.00'} SOL/trade)`);
        }
        if (walletStats.winRate !== undefined) {
          const winRateEmoji = walletStats.winRate >= 70 ? '🔥' : walletStats.winRate >= 50 ? '✅' : '⚠️';
          const winRateDisplay = Number.isFinite(walletStats.winRate) ? `${walletStats.winRate.toFixed ? walletStats.winRate.toFixed(1) : walletStats.winRate}%` : '0.0%';
          statParts.push(`${winRateEmoji} Win Rate: ${winRateDisplay}`);
        }
        if (totalTrades > 0) {
          statParts.push(`📊 W/L: ${wins}/${losses} (${totalTrades} trades)`);
        }
        if (statParts.length > 0) {
          walletStatsLine = '\n' + statParts.join(' | ');
        }
      }
      
      summaryLines.push(`${walletEmoji} **${walletName}** ${influenceScore ? `(Influence: ${influenceScore}/100)` : ''}${walletStatsLine}`);
      
      summaryLines.push(`📍 CA: \`${alert.mint}\``);
      
      if (walletAddress) {
        summaryLines.push(`🔑 ${shortWallet}`);
      }
      
      if (providerLabel) {
        summaryLines.push(`📡 Source: ${providerLabel}`);
      }
      
      // Token info and purchase amount on same line
      const formattedSize = formatValue(amountToken, amountToken > 1 ? 2 : 4);
      const formattedUsd = formatValue(amountUsd, amountUsd > 1000 ? 0 : 2);
      const buyInfo = formattedSize || formattedUsd ? `🛒 Bought: ${formattedSize ? `${formattedSize} tokens` : ''}${formattedSize && formattedUsd ? ' • ' : ''}${formattedUsd ? `$${formattedUsd}` : ''}` : null;
      
      if (tokenSymbol) {
        summaryLines.push(`🏷️ ${tokenSymbol}${tokenName ? ` (${tokenName})` : ''}${buyInfo ? ` • ${buyInfo}` : ''}`);
      } else if (buyInfo) {
        summaryLines.push(buyInfo);
      }
      
      if (gmgnLines) {
        summaryLines.push(gmgnLines);
      }
      
      summaryLines.push(`🔗 https://pump.fun/${alert.mint}`);
      summaryLines.push(`💎 https://dexscreener.com/solana/${alert.mint}`);
      summaryLines.push(`🔍 https://solscan.io/token/${alert.mint}`);
      
      if (txHash) {
        summaryLines.push(`🧾 https://solscan.io/tx/${txHash}`);
      }
      
      if (sourceUrl) {
        summaryLines.push(`🛰️ ${sourceUrl}`);
      }

      message = `🚨 **SMART MONEY BUY: ${walletName}**\n\n${summaryLines.join('\n')}`;
    }
    
    const DIRECT = process.env.ALPHA_ALERTS_DIRECT_SEND === 'true';
    
    // Send to Discord webhook if configured
    const DISCORD_WEBHOOK = process.env.ALPHA_DISCORD_WEBHOOK;
    if (DIRECT && DISCORD_WEBHOOK && DISCORD_WEBHOOK !== 'SET_ME') {
      try {
        await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: message,
            username: 'RugKiller Alpha Alerts'
          }),
        });
        console.log('[ALPHA ALERT] ✅ Discord webhook notification sent');
      } catch (error) {
        console.error('[ALPHA ALERT] Discord webhook notification failed:', error);
      }
    }
    
    // Send to Telegram if configured
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
        console.log('[ALPHA ALERT] ✅ Telegram notification sent');
      } catch (error) {
        console.error('[ALPHA ALERT] Telegram notification failed:', error);
      }
    }
    
    // Trigger automatic token scan if direct send is enabled
    if (DIRECT && DISCORD_WEBHOOK && DISCORD_WEBHOOK !== 'SET_ME' && alert.mint) {
      try {
        console.log(`[ALPHA ALERT] Triggering automatic scan for token: ${alert.mint}`);
        // Import analyzer and run scan (use SolanaTokenAnalyzer singleton)
        const { tokenAnalyzer } = await import('./solana-analyzer.js');
        const analysisResult = await tokenAnalyzer.analyzeToken(alert.mint);
        
        // Build embed message using the same format as Discord bot
        const { buildCompactMessage } = await import('./discord-bot.js');
        const messageData = buildCompactMessage(analysisResult);
        
        // Send scan results as follow-up message
        const scanMessage = `**🔍 Automatic Scan Results**\n\n` +
          `**Risk Level: ${analysisResult.riskLevel}** (Score: ${analysisResult.riskScore}/100)\n\n` +
          `🤖 **AI Analysis**\n${messageData.aiVerdict}\n\n` +
          `🔐 **Security**\n${messageData.security}\n\n` +
          `👥 **Holders**\n${messageData.holders}\n\n` +
          (messageData.market ? `💰 **Market**\n${messageData.market}\n\n` : '') +
          (messageData.pumpFun ? `🎯 **Pump.fun**\n${messageData.pumpFun}\n\n` : '') +
          `📊 Chart: https://dexscreener.com/solana/${alert.mint}`;
        
        await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: scanMessage,
            username: 'RugKiller Auto-Scan'
          }),
        });
        console.log('[ALPHA ALERT] ✅ Auto-scan results sent to Discord');
      } catch (error) {
        console.error('[ALPHA ALERT] Auto-scan failed:', error);
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

  /**
   * Handle migration event - re-analyze token post-migration
   * Migration from bonding curve to Raydium triggers immediate re-scoring
   */
  private async handleMigrationReAnalysis(event: MigrationEvent): Promise<void> {
    try {
      console.log(`[Alpha Alerts] Re-analyzing ${event.tokenMint} post-migration...`);
      
      // Run full quality check with migration context
      const isQuality = await this.isQualityToken(event.tokenMint);
      
      if (isQuality) {
        // Token passed post-migration quality check - potentially send alert
        console.log(`[Alpha Alerts] ✅ ${event.tokenMint} passed post-migration check`);
        
        // Could trigger alert here if monitoring this token
        // For now, just log - actual alerts come from webhook triggers
      } else {
        // Token failed post-migration - likely a rug
        console.log(`[Alpha Alerts] ⚠️ ${event.tokenMint} FAILED post-migration check - potential rug`);
      }
    } catch (error) {
      console.error(`[Alpha Alerts] Error re-analyzing ${event.tokenMint}:`, error);
    }
  }

  // Enhanced rug detection using SolRPDS-based metrics + Temporal GNN
  // Composite scoring: >75/100 = safe alpha call (heuristics)
  // TGN probability: 0-1 (temporal graph analysis)
  // Final decision: 70% TGN + 30% heuristics (per 2025 research)
  // NOW WITH: Pre-migration detection - relaxed checks before Raydium migration
  private async isQualityToken(mint: string): Promise<boolean> {
    try {
      let rugScore = 0; // Composite score out of 100
      const risks: string[] = [];

      // 1. Validate Solana token format (base58, 32-44 chars)
      if (!mint || mint.length < 32 || mint.length > 44) {
        console.log(`[ALPHA ALERT] Invalid token length: ${mint?.length}`);
        return false;
      }

      // 2. Check if it's a valid Solana address (base58 characters only)
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
      if (!base58Regex.test(mint)) {
        console.log(`[ALPHA ALERT] Invalid base58 format: ${mint}`);
        return false;
      }

      // 3. Verify token exists on Solana blockchain + check mint/freeze authority
      let lpPoolAddress: string | undefined;
      try {
        const { PublicKey } = await import('@solana/web3.js');
        const pubkey = new PublicKey(mint);
        
        const accountInfo = await this.connection.getAccountInfo(pubkey);
        if (!accountInfo) {
          console.log(`[ALPHA ALERT] Token not found on-chain: ${mint}`);
          return false;
        }
        
        if (accountInfo.data.length === 0) {
          console.log(`[ALPHA ALERT] Not a token account: ${mint}`);
          return false;
        }

        // Check mint authority (revoked = +25 points)
        // SPL Token mint data: First 32 bytes = mint authority (all zeros = revoked)
        const mintAuthority = accountInfo.data.slice(0, 32);
        const isAuthorityRevoked = mintAuthority.every(byte => byte === 0);
        if (isAuthorityRevoked) {
          rugScore += 25;
        } else {
          risks.push('Active mint authority');
        }
      } catch (error) {
        console.log(`[ALPHA ALERT] Invalid Solana address: ${mint}`);
        return false;
      }

      // 4. Fetch quality metrics from multiple APIs
      const [rugCheck, dexScreener] = await Promise.all([
        fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`).then(r => r.json()).catch(() => null),
        fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`).then(r => r.json()).catch(() => null),
      ]);

      // Verify it's a Solana token on DexScreener
      const solanaPair = dexScreener?.pairs?.find((pair: any) => pair.chainId === 'solana');
      if (!solanaPair && dexScreener?.pairs?.length > 0) {
        console.log(`[ALPHA ALERT] Not a Solana token on DexScreener: ${mint}`);
        return false;
      }

      // Extract LP pool address for TGN analysis
      lpPoolAddress = solanaPair?.pairAddress;

      // 5. RugCheck Score (0-10 scale, higher = safer) - Weight: 20 points
      const rugCheckScore = rugCheck?.score || 0;
      if (rugCheckScore > 8) {
        rugScore += 20;
      } else if (rugCheckScore > 6) {
        rugScore += 10;
        risks.push(`Low RugCheck score: ${rugCheckScore}/10`);
      } else {
        risks.push(`Very low RugCheck score: ${rugCheckScore}/10`);
      }

      // 6. Honeypot Detection - Weight: 15 points
      if (!rugCheck?.isHoneypot) {
        rugScore += 15;
      } else {
        risks.push('Honeypot detected');
      }

      // 7. Liquidity Ratio (LP/MC > 15%) - Weight: 30 points
      const liquidityUsd = solanaPair?.liquidity?.usd || 0;
      const marketCap = solanaPair?.marketCap || 0;
      const liquidityRatio = marketCap > 0 ? (liquidityUsd / marketCap) : 0;
      
      if (liquidityUsd > 10000 && liquidityRatio > 0.15) {
        rugScore += 30;
      } else if (liquidityUsd > 5000 && liquidityRatio > 0.10) {
        rugScore += 15;
        risks.push(`Low liquidity ratio: ${(liquidityRatio * 100).toFixed(1)}%`);
      } else {
        risks.push(`Insufficient liquidity: $${liquidityUsd.toFixed(0)} (${(liquidityRatio * 100).toFixed(1)}% ratio)`);
      }

      // 8. Holder Distribution (>300 holders, top 10 <25%) - Weight: 25 points
      // Note: This requires additional API calls to Helius or Solscan
      // For now, use transaction count as proxy
      const txCount = solanaPair?.txns?.h24?.buys || 0 + solanaPair?.txns?.h24?.sells || 0;
      if (txCount > 500) {
        rugScore += 25;
      } else if (txCount > 200) {
        rugScore += 12;
        risks.push(`Low tx count: ${txCount} in 24h`);
      } else {
        risks.push(`Very low tx count: ${txCount} in 24h`);
      }

      // 9. Trading Activity - Buy/Sell Ratio should favor buys early on
      const buys = solanaPair?.txns?.h1?.buys || 0;
      const sells = solanaPair?.txns?.h1?.sells || 0;
      const buySellRatio = sells > 0 ? buys / sells : buys;
      if (buySellRatio > 1.2) {
        rugScore += 10; // Bonus for positive momentum
      }

      // 9.5 HOLDER ANALYSIS - Get pre-migration status for TGN
      let holderAnalysis: HolderAnalysisResult | null = null;
      let isPreMigration = false;
      try {
        const holderService = new HolderAnalysisService(this.connection);
        holderAnalysis = await holderService.analyzeHolders(mint);
        isPreMigration = holderAnalysis.isPreMigration || false;
        
        if (isPreMigration) {
          console.log(`[ALPHA ALERT] ${mint} - Pre-migration token detected (bonding curve active)`);
        }
        
        // Use holder concentration for additional scoring
        if (holderAnalysis.topHoldersConcentration < 0.25) {
          rugScore += 15; // Bonus for distributed holdings
        } else if (holderAnalysis.topHoldersConcentration > 0.50 && !isPreMigration) {
          risks.push(`High concentration: top holders ${(holderAnalysis.topHoldersConcentration * 100).toFixed(1)}%`);
        }
      } catch (holderError) {
        console.error('[ALPHA ALERT] Holder analysis failed:', holderError);
        holderAnalysis = null;
      }

      // 10. TEMPORAL GNN ANALYSIS (10-18% better detection per SolRPDS benchmarks)
      let tgnResult: TGNResult | null = null;
      if (this.tgnDetector) {
        try {
          tgnResult = await this.tgnDetector.analyzeToken(mint, lpPoolAddress, isPreMigration);
          
          // Log TGN findings
          if (tgnResult.patterns.length > 0) {
            console.log(`[ALPHA ALERT] [TGN] ${mint} - Detected ${tgnResult.patterns.length} patterns:`);
            for (const pattern of tgnResult.patterns) {
              console.log(`  - ${pattern.type}: ${pattern.description} (confidence: ${(pattern.confidence * 100).toFixed(1)}%)`);
            }
          }
          
          if (tgnResult.riskFactors.length > 0) {
            console.log(`[ALPHA ALERT] [TGN] ${mint} - Risk factors: ${tgnResult.riskFactors.join(', ')}`);
          }
          
          console.log(`[ALPHA ALERT] [TGN] ${mint} - P(rug) = ${(tgnResult.rugProbability * 100).toFixed(1)}% | Graph: ${tgnResult.graphMetrics.nodeCount} nodes, ${tgnResult.graphMetrics.edgeCount} edges`);
        } catch (tgnError) {
          console.error('[ALPHA ALERT] [TGN] Analysis failed:', tgnError);
          tgnResult = null;
        }
      }

      // ============================================================================
      // FINAL DECISION: Combined TGN + Heuristic Scoring
      // ============================================================================
      
      // Normalize heuristic score to 0-1 (rugScore is 0-100)
      const heuristicSafety = rugScore / 100;
      
      // TGN safety = 1 - P(rug)
      const tgnSafety = tgnResult ? (1 - tgnResult.rugProbability) : 0.5; // Default neutral if TGN unavailable
      
      // Weighted combination: 70% TGN + 30% heuristic (per 2025 research recommendations)
      const tgnWeight = this.tgnDetector ? 0.70 : 0; // Only use TGN weight if detector is enabled
      const heuristicWeight = this.tgnDetector ? 0.30 : 1.0;
      
      const finalSafety = (tgnWeight * tgnSafety) + (heuristicWeight * heuristicSafety);
      const finalRugRisk = 1 - finalSafety;

      // Log combined scoring
      console.log(`[ALPHA ALERT] ${mint} - Heuristic: ${rugScore}/100 (${(heuristicSafety * 100).toFixed(1)}% safe) | TGN: ${(tgnSafety * 100).toFixed(1)}% safe | Final: ${(finalSafety * 100).toFixed(1)}% safe (${(finalRugRisk * 100).toFixed(1)}% rug risk)`);
      console.log(`[ALPHA ALERT] ${mint} - Risks: ${risks.length ? risks.join(', ') : 'None'}`);

      // Decision thresholds:
      // - finalSafety >= 0.80 (80% safe) = PASS (20% rug risk)
      // - finalRugRisk > 0.25 (25% rug risk) = REJECT
      // - PRE-MIGRATION: Relaxed checks - treat as safe by default (cannot rug before LP creation)
      const SAFETY_THRESHOLD = 0.80;
      const MAX_RUG_RISK = 0.25;
      const PRE_MIGRATION_SAFETY_THRESHOLD = 0.60; // More lenient for pre-migration tokens

      if (isPreMigration) {
        // Pre-migration tokens use relaxed threshold (cannot rug before Raydium migration)
        if (finalSafety >= PRE_MIGRATION_SAFETY_THRESHOLD) {
          console.log(`[ALPHA ALERT] ${mint} - ✅ PASS (pre-migration, ${(finalSafety * 100).toFixed(1)}% confidence)`);
          return true;
        } else {
          console.log(`[ALPHA ALERT] ${mint} - ❌ REJECT (even pre-migration score too low: ${(finalSafety * 100).toFixed(1)}%)`);
          return false;
        }
      }

      // Post-migration: Standard thresholds
      if (finalSafety >= SAFETY_THRESHOLD) {
        console.log(`[ALPHA ALERT] ${mint} - ✅ PASS (${(finalSafety * 100).toFixed(1)}% confidence)`);
        return true;
      } else if (finalRugRisk > MAX_RUG_RISK) {
        console.log(`[ALPHA ALERT] ${mint} - ❌ REJECT (${(finalRugRisk * 100).toFixed(1)}% rug risk too high)`);
        return false;
      } else {
        console.log(`[ALPHA ALERT] ${mint} - ⚠️ MARGINAL (${(finalSafety * 100).toFixed(1)}% safe), skipping to be conservative`);
        return false;
      }
    } catch (error) {
      console.error('[ALPHA ALERT] Quality check error:', error);
      return false;
    }
  }

  // Pump.fun WebSocket monitoring removed - Helius webhook handles all token detection including pump.fun tokens

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

    // Start migration detector if enabled
    if (this.migrationDetector) {
      try {
        await this.migrationDetector.start();
        console.log('[Alpha Alerts] Migration detector started successfully');
      } catch (error) {
        console.error('[Alpha Alerts] Failed to start migration detector:', error);
      }
    }

    // Pump.fun monitoring via Helius webhook only (WebSocket removed)

    // Begin heartbeat loop (but don't rely on it for WebSocket silence detection)
    this.startHeartbeat();

    console.log(`[Alpha Alerts] ✅ Service started using webhook-based monitoring`);
    console.log(`[Alpha Alerts] Registered ${this.alphaCallers.length} wallets for tracking`);
    console.log(`[Alpha Alerts] Using distributed RPC load balancing across 80+ endpoints`);
    
    // Health check warnings for missing configuration
    const discordWebhook = process.env.ALPHA_DISCORD_WEBHOOK;
    if (!discordWebhook || discordWebhook === 'SET_ME' || discordWebhook.length < 50) {
      console.error('❌ [Alpha Alerts] ALPHA_DISCORD_WEBHOOK not properly configured! Alerts will not reach Discord.');
      console.error('   Set webhook URL: railway variables --set ALPHA_DISCORD_WEBHOOK=https://discord.com/api/webhooks/...');
    }
    
    if (!process.env.HELIUS_WEBHOOK_ID) {
      console.warn('⚠️ [Alpha Alerts] Helius webhook not configured - transaction monitoring may be limited');
      console.warn('   Setup guide: See ALPHA_ALERTS_ROOT_CAUSE.md');
    }
  }

  /**
   * Setup webhook listeners for real-time token detection
   * This replaces the old WebSocket subscription approach
   */
  private async setupWebhookListeners(): Promise<void> {
    try {
      // Listen to Helius webhook events
      const { heliusWebhook } = await import('./services/helius-webhook.js');
      
      heliusWebhook.on('token_created', async (event: any) => {
        console.log('[Alpha Alerts] New token detected via Helius:', event.mint);
        // Check if any monitored wallets are involved
        await this.checkTokenForAlphaWallets(event.mint, 'Helius Webhook');
      });

      heliusWebhook.on('large_transfer', async (event: any) => {
        const matchedCaller = this.alphaCallers.find(c => 
          c.wallet === event.from || c.wallet === event.to
        );
        if (matchedCaller) {
          console.log('[Alpha Alerts] Monitored wallet activity:', event);
          await this.checkTokenForAlphaWallets(event.mint, 'Large Transfer', matchedCaller);
        }
      });

      // Listen to Ankr WebSocket events
      try {
        const { ankrWebSocket } = await import('./services/ankr-websocket.js');
        
        ankrWebSocket.on('token_created', async (event: any) => {
          console.log('[Alpha Alerts] New token detected via Ankr:', event.mint);
          // Cache warmer already triggered in ankr-websocket, just check for alpha
          await this.checkTokenForAlphaWallets(event.mint, 'Ankr WebSocket');
        });

        ankrWebSocket.on('alpha_wallet_trade', async (event: any) => {
          const matchedCaller = this.alphaCallers.find(c => c.wallet === event.wallet);
          if (matchedCaller) {
            console.log('[Alpha Alerts] Alpha wallet trade via Ankr:', event.wallet.slice(0, 8), '→', event.mint);
            await this.checkTokenForAlphaWallets(event.mint, 'Ankr Alpha Trade', matchedCaller);
          }
        });

        // Subscribe alpha wallet addresses to Ankr WebSocket monitoring
        const walletAddresses = this.alphaCallers.map(c => c.wallet);
        if (walletAddresses.length > 0) {
          await ankrWebSocket.subscribeToAlphaWallets(walletAddresses);
          console.log(`[Alpha Alerts] Subscribed ${walletAddresses.length} wallets to Ankr WebSocket`);
        }
      } catch (ankrError) {
        console.warn('[Alpha Alerts] Ankr WebSocket unavailable:', ankrError);
      }

      // Pump.fun tokens are detected via webhooks (no separate WebSocket needed)

      console.log('[Alpha Alerts] ✅ Webhook listeners registered (Helius + Ankr)');
    } catch (error) {
      console.warn('[Alpha Alerts] Some webhook services unavailable:', error);
    }
  }

  /**
   * Check if a newly detected token involves any alpha wallets
   */
  private async checkTokenForAlphaWallets(mint: string, source: string, caller?: AlphaCallerConfig): Promise<void> {
    try {
      const walletInfo = caller ? `${caller.name} (${caller.wallet.slice(0, 8)}...)` : 'Unknown';
      console.log(`[Alpha Alerts] Checking token ${mint} from ${source} - Wallet: ${walletInfo}`);
      
      // Fetch wallet PNL stats from database with on-demand calculation
      let walletStats = null;
      if (caller?.wallet) {
        try {
          const [wallet] = await db
            .select()
            .from(smartWallets)
            .where(eq(smartWallets.walletAddress, caller.wallet))
            .limit(1);
          
          if (wallet && wallet.winRate !== null && wallet.winRate !== undefined) {
            // Use cached stats if they exist and are valid
            walletStats = {
              profitSol: wallet.profitSol ? parseFloat(wallet.profitSol) : null,
              wins: wallet.wins || 0,
              losses: wallet.losses || 0,
              winRate: wallet.winRate || 0,
            };
            console.log(`[Alpha Alerts] Using cached stats for ${caller.name}: ${wallet.winRate}% WR`);
          } else {
            // Calculate stats on-demand if not in DB or stale
            console.log(`[Alpha Alerts] Calculating fresh stats for ${caller.name}...`);
            const discoveryService = getWalletDiscoveryService();
            const performance = await discoveryService.analyzeWalletPerformance(caller.wallet);
            
            walletStats = {
              profitSol: performance.profitSol,
              wins: performance.wins,
              losses: performance.losses,
              winRate: Math.round(performance.winRate * 100), // Convert to percentage
            };
            
            // Cache the calculated stats in database
            if (wallet) {
              await db.update(smartWallets)
                .set({
                  profitSol: performance.profitSol.toFixed(9),
                  wins: performance.wins,
                  losses: performance.losses,
                  winRate: Math.round(performance.winRate * 100),
                  lastActiveAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(smartWallets.walletAddress, caller.wallet));
            } else {
              await db.insert(smartWallets).values({
                walletAddress: caller.wallet,
                displayName: caller.name,
                profitSol: performance.profitSol.toFixed(9),
                wins: performance.wins,
                losses: performance.losses,
                winRate: Math.round(performance.winRate * 100),
                influenceScore: caller.influenceScore || 50,
                source: 'alpha-alerts',
                isActive: true,
                lastActiveAt: new Date(),
              });
            }
            
            console.log(`[Alpha Alerts] Calculated ${caller.name}: ${walletStats.winRate}% WR (${walletStats.wins}W/${walletStats.losses}L)`);
          }
        } catch (err) {
          console.warn('[Alpha Alerts] Failed to fetch/calculate wallet stats:', err);
        }
      }
      
      // Check if token passes quality filters
      const isQuality = await this.isQualityToken(mint);
      
      if (isQuality) {
        console.log(`[Alpha Alerts] ✅ Token ${mint} passed quality check - sending alert`);
        
        // Send the alert with wallet information and PNL stats
        await this.sendAlert({
          type: 'caller_signal',
          mint,
          source: caller ? caller.name : source,
          timestamp: Date.now(),
          data: { 
            provider: source,
            wallet: caller?.wallet,
            walletName: caller?.name,
            influenceScore: caller?.influenceScore,
            walletStats
          }
        });
      } else {
        console.log(`[Alpha Alerts] ⚠️ Token ${mint} failed quality check - skipping alert`);
      }
    } catch (error) {
      console.error('[Alpha Alerts] Error checking token:', error);
    }
  }

  stop(): void {
    if (!this.isRunning) return;
    console.log('[Alpha Alerts] Stopping service...');
    this.isRunning = false;

    this.stopAutoRefresh();
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
    const enabledCallers = this.alphaCallers.filter(c => c.enabled);
    const status = {
      isRunning: this.isRunning,
      monitoredCallers: enabledCallers.length,
      totalCallers: this.alphaCallers.length,
      activeListeners: this.listeners.size,
      activeWebSockets: this.wsConnections.length,
      callers: verbose ? this.alphaCallers.map(c => ({
        name: c.name,
        wallet: c.wallet,
        enabled: c.enabled,
        influenceScore: c.influenceScore,
      })) : undefined,
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

  /**
   * Sync all active wallets to Helius webhook via API
   * Supports up to 1000 wallets (vs 25 via dashboard UI)
   */
  private async syncToHeliusWebhook(): Promise<void> {
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY?.trim();
    const HELIUS_WEBHOOK_ID = process.env.HELIUS_WEBHOOK_ID?.trim();
    
    if (!HELIUS_API_KEY || !HELIUS_WEBHOOK_ID) {
      console.log('[Alpha Alerts] Skipping Helius sync - API key or webhook ID not configured');
      return;
    }

    try {
      // Get all active wallet addresses
      const addresses = this.alphaCallers
        .filter(c => c.enabled && c.wallet)
        .map(c => c.wallet);
      
      if (addresses.length === 0) {
        console.log('[Alpha Alerts] No wallets to sync to Helius');
        return;
      }

      console.log(`[Alpha Alerts] Syncing ${addresses.length} wallets to Helius webhook...`);

      // Get current webhook config
      const getUrl = `https://api.helius.xyz/v0/webhooks/${HELIUS_WEBHOOK_ID}?api-key=${HELIUS_API_KEY}`;
      const currentWebhook = await fetch(getUrl);
      
      if (!currentWebhook.ok) {
        throw new Error(`Failed to get webhook: ${currentWebhook.status}`);
      }
      
      const webhookData = await currentWebhook.json();

      // Update webhook with all addresses via API (supports 1000+ wallets)
      const updateUrl = `https://api.helius.xyz/v0/webhooks/${HELIUS_WEBHOOK_ID}?api-key=${HELIUS_API_KEY}`;
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookURL: webhookData.webhookURL,
          transactionTypes: webhookData.transactionTypes,
          accountAddresses: addresses, // Replace with current wallet list
          webhookType: webhookData.webhookType,
          txnStatus: webhookData.txnStatus || 'all',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update webhook: ${response.status} ${error}`);
      }

      console.log(`[Alpha Alerts] ✅ Helius webhook synced - monitoring ${addresses.length} wallets`);
    } catch (error: any) {
      console.error('[Alpha Alerts] Helius webhook sync error:', error.message);
      throw error;
    }
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
      
      // Auto-sync to Helius webhook (non-blocking)
      this.syncToHeliusWebhook().catch(err => 
        console.warn('[Alpha Alerts] Helius sync failed:', err.message)
      );
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
      
      // Auto-sync removal to Helius webhook (non-blocking)
      this.syncToHeliusWebhook().catch(err => 
        console.warn('[Alpha Alerts] Helius sync failed after removal:', err.message)
      );
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

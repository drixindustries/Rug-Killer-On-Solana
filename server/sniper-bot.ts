import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import WebSocket from 'ws';

// Configuration from environment variables
const PREFIX = process.env.SNIPER_VANITY_PREFIX || "RUGK";
const SUFFIX = process.env.SNIPER_VANITY_SUFFIX || "pump";
const BUY_AMOUNT = parseFloat(process.env.SNIPER_BUY_AMOUNT || "2.0");
const PRIVATE_KEY = process.env.SNIPER_PRIVATE_KEY;
const DISCORD_WEBHOOK = process.env.SNIPER_DISCORD_WEBHOOK;
const TELEGRAM_TOKEN = process.env.SNIPER_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.SNIPER_TELEGRAM_CHAT_ID;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const AUTO_SNIPE_ENABLED = process.env.SNIPER_AUTO_SNIPE_ENABLED === 'true';
const MIN_MARKET_CAP = parseFloat(process.env.SNIPER_MIN_MARKET_CAP || "0");
const MAX_MARKET_CAP = parseFloat(process.env.SNIPER_MAX_MARKET_CAP || "1000000");

interface PumpPortalNewToken {
  mint: string;
  name?: string;
  symbol?: string;
  marketCap?: number;
  timestamp?: number;
}

interface PumpPortalLaunchRequest {
  mint: string;
  privateKey: string;
  name: string;
  symbol: string;
  uri: string;
  autoBuy?: number;
}

interface PumpPortalTradeRequest {
  publicKey: string;
  privateKey: string;
  mint: string;
  amount: number;
  slippage: number;
  priorityFee: number;
}

interface PumpPortalResponse {
  signature?: string;
  error?: string;
  message?: string;
}

class SniperBot {
  private connection: Connection;
  private wallet: Keypair | null = null;
  private ws: WebSocket | null = null;
  private isRunning = false;
  private sniperStats = {
    tokensGrinded: 0,
    tokensLaunched: 0,
    tokensSniped: 0,
    totalVolume: 0,
    startTime: Date.now(),
  };

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    
    if (PRIVATE_KEY) {
      try {
        this.wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
        console.log(`[SNIPER] Wallet loaded: ${this.wallet.publicKey.toBase58()}`);
      } catch (error) {
        console.error('[SNIPER] Failed to load wallet from PRIVATE_KEY:', error);
      }
    }
  }

  async notify(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);

    // Discord webhook notification
    if (DISCORD_WEBHOOK) {
      try {
        await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: message,
            username: 'RugKiller Sniper',
          }),
        });
      } catch (error) {
        console.error('[SNIPER] Discord notification failed:', error);
      }
    }

    // Telegram bot notification
    if (TELEGRAM_TOKEN && TELEGRAM_CHAT) {
      try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT,
            text: message,
            parse_mode: 'HTML',
          }),
        });
      } catch (error) {
        console.error('[SNIPER] Telegram notification failed:', error);
      }
    }
  }

  grindVanity(): Keypair | null {
    console.log(`[SNIPER] Grinding vanity address: ${PREFIX}...${SUFFIX}`);
    this.notify(`🔨 Grinding vanity address: ${PREFIX}...${SUFFIX}`);

    let attempts = 0;
    const maxAttempts = 10000000; // Prevent infinite loop

    while (attempts < maxAttempts) {
      const mint = Keypair.generate();
      const addr = mint.publicKey.toBase58();
      
      if (addr.startsWith(PREFIX) && addr.endsWith(SUFFIX)) {
        this.sniperStats.tokensGrinded++;
        console.log(`[SNIPER] 🎯 Vanity found after ${attempts} attempts: ${addr}`);
        this.notify(`🎯 VANITY FOUND: ${addr}\n📊 Attempts: ${attempts.toLocaleString()}\n🔗 https://pump.fun/${addr}`);
        return mint;
      }
      
      attempts++;
      if (attempts % 100000 === 0) {
        console.log(`[SNIPER] Grinding... ${attempts.toLocaleString()} attempts`);
      }
    }

    console.log(`[SNIPER] Failed to find vanity after ${maxAttempts} attempts`);
    return null;
  }

  async launchAndSnipe(mintKeypair: Keypair): Promise<void> {
    if (!this.wallet) {
      console.error('[SNIPER] No wallet configured');
      return;
    }

    const mintPub = mintKeypair.publicKey.toBase58();
    console.log(`[SNIPER] Launching token: ${mintPub}`);

    try {
      const launchData: PumpPortalLaunchRequest = {
        mint: mintPub,
        privateKey: bs58.encode(mintKeypair.secretKey),
        name: "Rug Killer",
        symbol: "RUGK",
        uri: "https://arweave.net/placeholder-metadata", // Should be uploaded to IPFS/Arweave first
        autoBuy: BUY_AMOUNT,
      };

      const response = await fetch('https://pumpportal.fun/api/advanced-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(launchData),
      });

      const data: PumpPortalResponse = await response.json();

      if (data.signature) {
        this.sniperStats.tokensLaunched++;
        this.sniperStats.totalVolume += BUY_AMOUNT;
        
        const message = `🚀 RUGKILLER LIVE + SNIPED ${BUY_AMOUNT} SOL!\n` +
          `📍 CA: ${mintPub}\n` +
          `🔗 https://pump.fun/${mintPub}\n` +
          `✅ TX: https://solscan.io/tx/${data.signature}`;
        
        this.notify(message);
      } else {
        console.error('[SNIPER] Launch failed:', data);
        this.notify(`❌ Launch failed: ${data.error || data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[SNIPER] Launch error:', error);
      this.notify(`❌ Launch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async snipeToken(mint: string, tokenData?: PumpPortalNewToken): Promise<void> {
    if (!this.wallet || !PRIVATE_KEY) {
      console.error('[SNIPER] No wallet configured for sniping');
      return;
    }

    // Apply market cap filters if available
    if (tokenData?.marketCap) {
      if (tokenData.marketCap < MIN_MARKET_CAP || tokenData.marketCap > MAX_MARKET_CAP) {
        console.log(`[SNIPER] Skipping ${mint} - MC ${tokenData.marketCap} outside range [${MIN_MARKET_CAP}, ${MAX_MARKET_CAP}]`);
        return;
      }
    }

    console.log(`[SNIPER] Sniping token: ${mint}`);

    try {
      const tradeData: PumpPortalTradeRequest = {
        publicKey: this.wallet.publicKey.toBase58(),
        privateKey: PRIVATE_KEY,
        mint: mint,
        amount: BUY_AMOUNT,
        slippage: 15,
        priorityFee: 0.0005,
      };

      const response = await fetch('https://pumpportal.fun/api/trade-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData),
      });

      const data: PumpPortalResponse = await response.json();

      if (data.signature) {
        this.sniperStats.tokensSniped++;
        this.sniperStats.totalVolume += BUY_AMOUNT;
        
        const message = `🎯 SNIPED NEW TOKEN!\n` +
          `📍 CA: ${mint}\n` +
          `💰 Bought ${BUY_AMOUNT} SOL\n` +
          `${tokenData?.name ? `🏷️ ${tokenData.name} (${tokenData.symbol})\n` : ''}` +
          `${tokenData?.marketCap ? `📊 MC: $${tokenData.marketCap.toLocaleString()}\n` : ''}` +
          `🔗 https://pump.fun/${mint}\n` +
          `✅ TX: https://solscan.io/tx/${data.signature}`;
        
        this.notify(message);
      } else {
        console.error('[SNIPER] Snipe failed:', data);
      }
    } catch (error) {
      console.error('[SNIPER] Snipe error:', error);
    }
  }

  startWebSocketListener(): void {
    if (!AUTO_SNIPE_ENABLED) {
      console.log('[SNIPER] Auto-snipe disabled in config');
      return;
    }

    console.log('[SNIPER] Starting WebSocket listener for new tokens...');
    
    this.ws = new WebSocket('wss://pumpportal.fun/api/data');

    this.ws.on('open', () => {
      console.log('[SNIPER] WebSocket connected to pumpportal.fun');
      this.ws?.send(JSON.stringify({ method: "subscribeNewToken" }));
      this.notify('🔌 Connected to pump.fun live feed - monitoring new tokens');
    });

    this.ws.on('message', async (data: WebSocket.Data) => {
      try {
        const msg: PumpPortalNewToken = JSON.parse(data.toString());
        
        if (msg.mint) {
          console.log(`[SNIPER] New token detected: ${msg.mint}`);
          
          // Filter out non-pump tokens
          if (!msg.mint.includes('pump') && msg.mint.length === 44) {
            await this.snipeToken(msg.mint, msg);
          }
        }
      } catch (error) {
        console.error('[SNIPER] WebSocket message parse error:', error);
      }
    });

    this.ws.on('error', (error) => {
      console.error('[SNIPER] WebSocket error:', error);
      this.notify(`⚠️ WebSocket error: ${error.message}`);
    });

    this.ws.on('close', () => {
      console.log('[SNIPER] WebSocket connection closed');
      
      // Auto-reconnect after 5 seconds if still running
      if (this.isRunning) {
        console.log('[SNIPER] Reconnecting in 5 seconds...');
        setTimeout(() => this.startWebSocketListener(), 5000);
      }
    });
  }

  getStats() {
    const uptime = Date.now() - this.sniperStats.startTime;
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
    
    return {
      ...this.sniperStats,
      uptime: uptimeHours,
      walletAddress: this.wallet?.publicKey.toBase58() || 'Not configured',
      autoSnipeEnabled: AUTO_SNIPE_ENABLED,
      config: {
        prefix: PREFIX,
        suffix: SUFFIX,
        buyAmount: BUY_AMOUNT,
        minMarketCap: MIN_MARKET_CAP,
        maxMarketCap: MAX_MARKET_CAP,
      }
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[SNIPER] Bot already running');
      return;
    }

    this.isRunning = true;
    console.log('[SNIPER] RugKiller Sniper Bot STARTING...');
    
    await this.notify(
      '🤖 RugKiller Sniper Bot ONLINE\n' +
      `💼 Wallet: ${this.wallet?.publicKey.toBase58() || 'Not configured'}\n` +
      `🎯 Vanity: ${PREFIX}...${SUFFIX}\n` +
      `💰 Buy Amount: ${BUY_AMOUNT} SOL\n` +
      `📊 MC Range: $${MIN_MARKET_CAP.toLocaleString()} - $${MAX_MARKET_CAP.toLocaleString()}\n` +
      `🔄 Auto-Snipe: ${AUTO_SNIPE_ENABLED ? 'ENABLED' : 'DISABLED'}`
    );

    // Start WebSocket listener for auto-sniping
    if (AUTO_SNIPE_ENABLED) {
      this.startWebSocketListener();
    }

    console.log('[SNIPER] Bot started successfully');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    await this.notify('🛑 RugKiller Sniper Bot STOPPED');
    console.log('[SNIPER] Bot stopped');
  }

  // Manual vanity grind and launch (can be triggered via API)
  async grindAndLaunch(): Promise<void> {
    const vanityKeypair = this.grindVanity();
    
    if (vanityKeypair) {
      await this.launchAndSnipe(vanityKeypair);
    } else {
      this.notify('❌ Failed to generate vanity address');
    }
  }
}

// Singleton instance
let sniperBotInstance: SniperBot | null = null;

export function getSniperBot(): SniperBot {
  if (!sniperBotInstance) {
    sniperBotInstance = new SniperBot();
  }
  return sniperBotInstance;
}

export { SniperBot };

import type { Express } from "express";
import { createServer, type Server } from "http";
import { analyzeTokenSchema, insertWatchlistSchema } from "../shared/schema.ts";
import { tokenAnalyzer } from "./solana-analyzer.ts";
import { nameCache } from "./name-cache.ts";
// import { setupAuth, isAuthenticated } from "./replitAuth"; // Disabled for non-Replit deployments
import { storage } from "./storage.ts";
import { 
  createWhopCheckout, 
  getWhopMembership, 
  cancelWhopMembership,
  mapWhopStatus,
  mapPlanToTier,
  WHOP_PLAN_IDS 
} from "./whop-client.ts";
import { VanityAddressGenerator } from "./vanity-generator.ts";
import { z } from "zod";
import { nanoid } from "nanoid";
import { rpcBalancer } from "./services/rpc-balancer.ts";

// Stub authentication for Railway deployment (no Replit OIDC)
const setupAuth = async (app: Express) => {
  // No-op: Authentication disabled for Railway
  console.log('ℹ️ Authentication disabled (Railway deployment)');
};

const isAuthenticated = async (req: any, res: any, next: any) => {
  // Return 401 if not authenticated - client will redirect to login
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  req.user = { claims: { sub: req.session.userId, email: req.session.userEmail } };
  req.isAuthenticated = () => true;
  next();
};

export const hasActiveAccess = async (req: any, res: any, next: any) => {
  return next();
};

// Admin middleware - checks if user is authorized admin access
const isAdmin = async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Check if user is admin (you can customize this logic)
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
  const userEmail = req.user.claims.email;
  
  if (!adminEmails.includes(userEmail)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Helper to allow anonymous sessions for lightweight features (e.g., watchlist)
  const withUser = async (req: any, _res: any, next: any) => {
    try {
      // If already authenticated via session login, pass through
      if (req.session?.userId) {
        req.user = { claims: { sub: req.session.userId, email: req.session.userEmail } };
        req.isAuthenticated = () => true;
        return next();
      }

      // Create or reuse an anonymous user bound to the session
      if (!req.session) {
        // Should not happen with express-session enabled, but guard just in case
        return next(new Error('Session unavailable'));
      }

      const anonKey = 'anonUserId';
      let anonUserId = req.session[anonKey];
      if (!anonUserId) {
        anonUserId = `guest_${nanoid(16)}`;
        try {
          await storage.upsertUser({ id: anonUserId });
        } catch (e) {
          // If upsert fails for any reason, generate a fallback one
          anonUserId = `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          await storage.upsertUser({ id: anonUserId });
        }
        req.session[anonKey] = anonUserId;
      }

      req.user = { claims: { sub: anonUserId, email: undefined } };
      req.isAuthenticated = () => true;
      next();
    } catch (err) {
      next(err);
    }
  };

  const enableDebug = process.env.ENABLE_DEBUG_ENDPOINTS === 'true';
  if (enableDebug) {
    // Optional header-based protection for debug endpoints
    const requireDebugToken = (req: any, res: any, next: any) => {
      const expected = process.env.DEBUG_ENDPOINTS_TOKEN;
      if (!expected) return next();
      const token = req.header('x-debug-token') || req.query.token;
      if (token !== expected) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    };

    // Debug: RPC health snapshot (no secrets exposed)
    app.get('/api/debug/rpc', requireDebugToken, (_req, res) => {
      try {
        const providers = rpcBalancer.providers.map((p) => {
          const rawUrl = p.getUrl();
          let host = 'unknown';
          let suffix = '';
          try {
            const u = new URL(rawUrl);
            host = u.host;
            suffix = (u.pathname || '').slice(-6);
          } catch {}

          return {
            name: p.name,
            tier: p.tier,
            host,
            idSuffix: suffix, // last 6 chars of path, avoids exposing full keys
            score: p.score,
            avgLatency: p.avgLatency ?? null,
            consecutiveFails: p.consecutiveFails,
            requestCount: p.requestCount ?? 0,
            rateLimited: !!p.isRateLimited,
            rateLimitResetTime: p.rateLimitResetTime ? new Date(p.rateLimitResetTime).toISOString() : null,
            lastHealthCheck: p.lastHealthCheck ? new Date(p.lastHealthCheck).toISOString() : null,
            hasKey: 'hasKey' in p ? !!p.hasKey?.() : true,
          };
        });

        const healthyCount = rpcBalancer.providers.filter(p => p.score > 70).length;
        res.json({
          time: new Date().toISOString(),
          healthyCount,
          total: rpcBalancer.providers.length,
          providers,
        });
      } catch (err: any) {
        res.status(500).json({ error: err?.message || 'RPC debug error' });
      }
    });

    // Debug: send alpha test messages (direct sends) and synthetic alert
    app.post('/api/debug/alpha/test-startup', requireDebugToken, async (_req, res) => {
      try {
        const { getAlphaAlertService } = await import('./alpha-alerts.ts');
        const alpha = getAlphaAlertService();
        await alpha.sendStartupTest();
        res.json({ ok: true, sent: true });
      } catch (err: any) {
        res.status(500).json({ ok: false, error: err?.message || String(err) });
      }
    });

    app.post('/api/debug/alpha/test-alert', requireDebugToken, async (req, res) => {
      try {
        const { getAlphaAlertService } = await import('./alpha-alerts.ts');
        const alpha = getAlphaAlertService();
        const { mint, source } = req.body || {};
        await alpha.triggerTestAlert(mint, source);
        res.json({ ok: true, mint: mint || 'default', source: source || 'Test Wallet' });
      } catch (err: any) {
        res.status(500).json({ ok: false, error: err?.message || String(err) });
      }
    });

    // Debug: actively ping the currently selected RPC and report latency
    app.get('/api/debug/ping-rpc', requireDebugToken, async (req, res) => {
      const started = Date.now();
      try {
        const rawCount = parseInt(String((req.query.count ?? '1')));
        const count = Number.isFinite(rawCount) ? Math.max(1, Math.min(10, rawCount)) : 1;

        const provider = rpcBalancer.providers[0] ? rpcBalancer.select() : null;
        if (!provider) {
          return res.status(503).json({ error: 'No RPC providers configured' });
        }

        const url = provider.getUrl();
        const { host } = new URL(url);
        const { Connection } = await import('@solana/web3.js');

        const results: Array<{ latencyMs: number; slot?: number; method: string; error?: string }> = [];
        for (let i = 0; i < count; i++) {
          const t0 = Date.now();
          try {
            const conn = new Connection(url, { commitment: 'confirmed', wsEndpoint: undefined });
            const timeoutMs = 5000;
            const timeout = new Promise((_resolve, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs));
            try {
              const slot = await Promise.race([conn.getSlot(), timeout]) as number;
              results.push({ latencyMs: Date.now() - t0, slot, method: 'getSlot' });
            } catch (primaryErr: any) {
              // Fallback to getEpochInfo for providers that don't like getSlot
              const timeout2 = new Promise((_resolve, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs));
              const info = await Promise.race([conn.getEpochInfo(), timeout2]);
              results.push({ latencyMs: Date.now() - t0, slot: undefined, method: 'getEpochInfo' });
            }
          } catch (e: any) {
            results.push({ latencyMs: Date.now() - t0, method: 'error', error: e?.message || String(e) });
          }
        }

        const latencies = results.map(r => r.latencyMs);
        const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
        const min = Math.min(...latencies);
        const max = Math.max(...latencies);

        return res.json({
          provider: provider.name,
          tier: provider.tier,
          host,
          count,
          avgLatencyMs: avg,
          minLatencyMs: min,
          maxLatencyMs: max,
          tries: results,
          totalTimeMs: Date.now() - started,
          time: new Date().toISOString(),
        });
      } catch (err: any) {
        return res.status(500).json({
          error: err?.message || String(err),
          latencyMs: Date.now() - started,
          time: new Date().toISOString(),
        });
      }
    });
  } else {
    console.log('ℹ️ Debug endpoints disabled (set ENABLE_DEBUG_ENDPOINTS=true to enable)');
  }
  // Wallet logout endpoint
  app.post('/api/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // RPC Health Check
  app.get("/api/rpc/health", (req, res) => {
    const stats = rpcBalancer.getHealthStats();
    res.json({ providers: stats });
  });

  // Get server's public IP (for Railway IP whitelisting)
  app.get("/api/server-ip", async (req, res) => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json() as { ip: string };
      res.json({ 
        publicIP: data.ip,
        note: "Railway outbound IP for RPC whitelisting"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch IP" });
    }
  });

  // Trending Calls Endpoint
  app.get("/api/trending-calls", async (req, res) => {
    try {
      const { trendingCallsTracker } = await import('./trending-calls-tracker.js');
      const timeframe = (req.query.timeframe as '1h' | '6h' | '24h' | '7d') || '24h';
      const platform = req.query.platform as 'discord' | 'telegram' | undefined;
      
      const calls = trendingCallsTracker.getTrendingCalls(timeframe, platform);
      
      // Convert Sets to arrays for JSON serialization
      const serializedCalls = calls.map(call => ({
        id: call.id,
        symbol: call.symbol,
        contractAddress: call.contractAddress,
        platform: call.platform,
        channelName: call.channelNames[0] || 'Unknown',
        mentions: call.mentions,
        uniqueUsers: call.uniqueUsers.size,
        firstSeen: call.firstSeen,
        lastSeen: call.lastSeen,
        sentiment: call.sentiment,
        riskScore: call.riskScore,
      }));
      
      res.json(serializedCalls);
    } catch (error) {
      console.error('[TrendingCalls API] Error:', error);
      res.status(500).json({ error: "Failed to fetch trending calls" });
    }
  });

  // Aged Wallet Detection Endpoint
  app.post("/api/aged-wallets", async (req, res) => {
    try {
      const result = analyzeTokenSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid request format",
          errors: result.error.issues,
        });
      }

      const { tokenAddress } = result.data;
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);

      if (!analysis) {
        return res.status(404).json({
          message: "Token not found or analysis failed",
        });
      }

      res.json({
        tokenAddress: analysis.tokenAddress,
        metadata: analysis.metadata,
        agedWalletData: analysis.agedWalletData || null,
        risks: analysis.redFlags?.filter(f => f.category === 'aged_wallets') || [],
      });
    } catch (error: any) {
      console.error("Aged wallet API error:", error);
      res.status(500).json({
        message: "Internal server error",
        error: "Failed to process aged wallet detection request."
      });
    }
  });

  // Token Analysis Endpoint with Rate Limit Handling
  app.post("/api/analyze", async (req, res) => {
    try {
      const result = analyzeTokenSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid request format",
          errors: result.error.issues,
        });
      }

      const { tokenAddress } = result.data;

      // Rate limit tracking per IP
      const clientIP = req.ip || req.connection.remoteAddress;
      const rateLimitKey = `analyze:${clientIP}`;
      
      // Check if client is rate limited (simple in-memory store)
      const now = Date.now();
      if (!global.rateLimitStore) {
        global.rateLimitStore = new Map();
      }
      
      const clientData = global.rateLimitStore.get(rateLimitKey) || { count: 0, resetTime: now + 60000 };
      
      if (now > clientData.resetTime) {
        clientData.count = 0;
        clientData.resetTime = now + 60000; // Reset every minute
      }
      
      if (clientData.count >= 10) { // 10 requests per minute per IP
        return res.status(429).json({
          message: "Rate Limit Reached",
          error: "Too many analysis requests. Please try again in a few moments.",
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        });
      }
      
      clientData.count++;
      global.rateLimitStore.set(rateLimitKey, clientData);

      console.log(`[API] Analyzing token: ${tokenAddress} for IP: ${clientIP} (${clientData.count}/10)`);

      try {
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        try { nameCache.remember(tokenAddress, (analysis as any)?.metadata?.symbol, (analysis as any)?.metadata?.name); } catch {}
        
        res.json({
          success: true,
          ...analysis
        });
        
      } catch (error: any) {
        console.error("Token analysis error:", error);
        
        // Handle specific RPC rate limit errors
        if (error.message?.includes("rate limit") || error.message?.includes("429")) {
          return res.status(503).json({
            message: "Rate Limit Reached",
            error: "Unable to complete token analysis: Solana RPC rate limit reached. Please try again in a few moments.",
            retryAfter: 30,
            type: "rpc_rate_limit"
          });
        }
        
        // Handle other RPC errors
        if (error.message?.includes("RPC") || error.message?.includes("connection")) {
          return res.status(503).json({
            message: "Service Temporarily Unavailable",
            error: "RPC connection issues. Please try again shortly.",
            retryAfter: 10,
            type: "rpc_connection"
          });
        }
        
        // Generic error handling
        const statusCode = error.message?.includes("Invalid") ? 400 : 500;
        res.status(statusCode).json({
          message: statusCode === 400 ? "Invalid token address" : "Analysis failed",
          error: error.message || "An unexpected error occurred during token analysis.",
          tokenAddress
        });
      }

    } catch (error: any) {
      console.error("API error:", error);
      res.status(500).json({
        message: "Internal server error",
        error: "Failed to process analysis request."
      });
    }
  });

  // Subscription routes
  app.get('/api/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getSubscription(userId);
      
      if (!subscription) {
        // No subscription yet - create free trial
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7 days from now
        
        const newSubscription = await storage.createSubscription({
          userId,
          tier: "free_trial",
          status: "trialing", // Whop status for trial period
          trialEndsAt,
          currentPeriodEnd: trialEndsAt,
        });
        
        return res.json(newSubscription);
      }
      
      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Wallet connection routes - return proper status codes
  app.get('/api/wallet/status', async (req: any, res) => {
    try {
      // Return 401 if not authenticated - frontend will handle this gracefully
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.claims.sub;
      const wallet = await storage.getWalletConnection(userId);
      res.json(wallet || null);
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json({ message: "Failed to fetch wallet status" });
    }
  });

  // GET /api/wallet/challenge - Generate a one-time challenge for wallet verification
  // This prevents signature replay attacks by requiring fresh signatures
  app.get('/api/wallet/challenge', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Generate a fresh challenge that expires in 5 minutes
      const challenge = await storage.createChallenge(userId);
      
      res.json({
        challenge: challenge.challenge,
        expiresAt: challenge.expiresAt,
        message: "Sign this message with your wallet to prove ownership. This challenge expires in 5 minutes.",
      });
    } catch (error: any) {
      console.error("Error creating challenge:", error);
      res.status(500).json({ 
        message: "Failed to create challenge: " + error.message 
      });
    }
  });

  // GET /api/wallet/login-challenge - Public endpoint for wallet-based login
  // Generates challenge without requiring authentication
  app.get('/api/wallet/login-challenge', async (req: any, res) => {
    try {
      const { walletAddress } = req.query;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }
      
      // Use wallet address as temporary user ID for challenge
      const challenge = await storage.createChallenge(walletAddress as string);
      
      res.json({
        challenge: challenge.challenge,
        expiresAt: challenge.expiresAt,
        message: "Sign this message with your Phantom wallet to login. This challenge expires in 5 minutes.",
      });
    } catch (error: any) {
      console.error("Error creating login challenge:", error);
      res.status(500).json({ 
        message: "Failed to create challenge: " + error.message 
      });
    }
  });

  // POST /api/wallet/login - Public endpoint for wallet-based login
  // Verifies signature and creates user session
  app.post('/api/wallet/login', async (req: any, res) => {
    try {
      const { walletAddress, signature, challenge: challengeStr } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      if (!signature || !challengeStr) {
        return res.status(400).json({
          message: "Signature and challenge are required. First call GET /api/wallet/login-challenge to get a challenge, then sign it with your wallet."
        });
      }

      // Import Solana connection and crypto utilities
      const { PublicKey } = await import('@solana/web3.js');
      const nacl = await import('tweetnacl');
      const bs58 = await import('bs58');

      // SECURITY: Validate challenge to prevent replay attacks
      const challenge = await storage.getChallenge(challengeStr);
      
      if (!challenge) {
        return res.status(403).json({
          message: "Invalid challenge. Please request a new challenge via GET /api/wallet/login-challenge."
        });
      }
      
      if (challenge.userId !== walletAddress) {
        return res.status(403).json({
          message: "Challenge was issued to a different wallet."
        });
      }
      
      if (challenge.usedAt) {
        return res.status(403).json({
          message: "This challenge has already been used. Please request a new challenge."
        });
      }
      
      const now = new Date();
      if (challenge.expiresAt < now) {
        return res.status(403).json({
          message: "This challenge has expired. Please request a new challenge."
        });
      }

      try {
        const walletPubkey = new PublicKey(walletAddress);
        
        // SECURITY: Verify wallet ownership via signature
        const messageBytes = new TextEncoder().encode(challengeStr);
        const signatureBytes = bs58.default.decode(signature);
        const publicKeyBytes = walletPubkey.toBytes();
        
        const isValidSignature = nacl.default.sign.detached.verify(
          messageBytes,
          signatureBytes,
          publicKeyBytes
        );
        
        if (!isValidSignature) {
          return res.status(403).json({
            message: "Invalid signature. Please sign the challenge message with the correct wallet."
          });
        }
        
        await storage.markChallengeUsed(challenge.id);
        
        // Create user session from wallet signature
        if (!req.session) {
          req.session = {};
        }
        req.session.userId = walletAddress;
        req.session.userEmail = `${walletAddress.slice(0, 8)}@wallet.solana`;
        
        // Ensure user exists in database
        await storage.upsertUser({
          id: walletAddress,
          email: req.session.userEmail,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        });
        
        const user = await storage.getUser(walletAddress);
        
        res.json({
          user,
          message: "Successfully logged in with Phantom wallet!",
        });
        
      } catch (error: any) {
        console.error("Wallet login error:", error);
        throw error;
      }
      
    } catch (error: any) {
      console.error("Error logging in with wallet:", error);
      res.status(500).json({ 
        message: "Failed to login with wallet: " + error.message 
      });
    }
  });

  // POST /api/wallet/verify - Verify token holder status (10M+ tokens)
  // Note: Uses isAuthenticated (not hasActiveAccess) to allow users to verify eligibility
  // SECURITY: Requires signature proof of wallet ownership AND validates official token mint
  app.post('/api/wallet/verify', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { walletAddress, signature, challenge: challengeStr } = req.body;
      
      // SECURITY: Official token mint address - hardcoded to prevent bypass with junk tokens
      // This should be configured via environment variable in production
      const OFFICIAL_TOKEN_MINT = process.env.OFFICIAL_TOKEN_MINT_ADDRESS;
      
      if (!OFFICIAL_TOKEN_MINT) {
        return res.status(503).json({
          message: "Token gating is not configured yet. Please contact support or use a paid subscription."
        });
      }
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      if (!signature || !challengeStr) {
        return res.status(400).json({
          message: "Signature and challenge are required. First call GET /api/wallet/challenge to get a challenge, then sign it with your wallet."
        });
      }

      // SECURITY: Validate challenge to prevent replay attacks
      const challenge = await storage.getChallenge(challengeStr);
      
      if (!challenge) {
        return res.status(403).json({
          message: "Invalid challenge. Please request a new challenge via GET /api/wallet/challenge."
        });
      }
      
      if (challenge.userId !== userId) {
        console.warn(`❌ Challenge mismatch: ${challenge.userId} vs ${userId}`);
        return res.status(403).json({
          message: "Challenge was issued to a different user."
        });
      }
      
      if (challenge.usedAt) {
        console.warn(`❌ Challenge already used: ${challengeStr} by user ${userId}`);
        return res.status(403).json({
          message: "This challenge has already been used. Please request a new challenge."
        });
      }
      
      const now = new Date();
      if (challenge.expiresAt < now) {
        console.warn(`❌ Challenge expired: ${challengeStr} by user ${userId}`);
        return res.status(403).json({
          message: "This challenge has expired. Please request a new challenge."
        });
      }

      // Import Solana connection and crypto utilities
      const { Connection, PublicKey } = await import('@solana/web3.js');
      const { getAssociatedTokenAddress, getAccount, getMint } = await import('@solana/spl-token');
      const nacl = await import('tweetnacl');
      const bs58 = await import('bs58');
      
      const connection = new Connection(
        process.env.SHYFT_KEY ? `https://rpc.shyft.to?api_key=${process.env.SHYFT_KEY}` : 'https://api.mainnet-beta.solana.com',
        'confirmed'
      );

      try {
        const walletPubkey = new PublicKey(walletAddress);
        const mintPubkey = new PublicKey(OFFICIAL_TOKEN_MINT);
        
        // SECURITY: Verify wallet ownership via signature
        const messageBytes = new TextEncoder().encode(challengeStr);
        const signatureBytes = bs58.default.decode(signature);
        const publicKeyBytes = walletPubkey.toBytes();
        
        const isValidSignature = nacl.default.sign.detached.verify(
          messageBytes,
          signatureBytes,
          publicKeyBytes
        );
        
        if (!isValidSignature) {
          return res.status(403).json({
            message: "Invalid signature. Please sign the challenge message with the correct wallet."
          });
        }
        
        await storage.markChallengeUsed(challenge.id);
        
        // WALLET LOGIN: Create user session from wallet signature
        // This allows users to login with just their Phantom wallet
        if (!req.session) {
          req.session = {};
        }
        req.session.userId = walletAddress; // Use wallet address as user ID
        req.session.userEmail = `${walletAddress.slice(0, 8)}@wallet.solana`;
        
        // Ensure user exists in database
        await storage.upsertUser({
          id: walletAddress,
          email: req.session.userEmail,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        });
        
        // Get token mint info for correct decimals
        const mintInfo = await getMint(connection, mintPubkey);
        const decimals = mintInfo.decimals;
        
        // Get associated token account
        const tokenAccount = await getAssociatedTokenAddress(
          mintPubkey,
          walletPubkey
        );
        
        // Get token account info
        const accountInfo = await getAccount(connection, tokenAccount);
        const balance = Number(accountInfo.amount) / Math.pow(10, decimals);
        
        // Check if eligible (10M+ tokens)
        const isEligible = balance >= 10_000_000;
        
        // Check if wallet connection already exists
        const existing = await storage.getWalletByAddress(walletAddress);
        
        // Security: Only allow if wallet not already claimed by another user
        if (existing && existing.userId !== userId) {
          return res.status(403).json({
            message: "This wallet is already connected to another account."
          });
        }
        
        let wallet;
        if (existing) {
          // Update existing
          wallet = await storage.updateWalletBalance(walletAddress, balance, isEligible);
        } else {
          // Create new
          wallet = await storage.createWalletConnection({
            userId,
            walletAddress,
            tokenBalance: balance,
            isEligible,
          });
        }
        
        res.json({
          wallet,
          message: isEligible 
            ? `Congratulations! You hold ${balance.toLocaleString()} tokens and have full access.`
            : `You hold ${balance.toLocaleString()} tokens. You need 10M+ tokens for access.`,
        });
        
      } catch (error: any) {
        // Handle wallet/token not found
        if (error.message?.includes('could not find account')) {
          return res.status(404).json({ 
            message: "No token account found for this wallet and token mint. Make sure you're using the correct addresses." 
          });
        }
        throw error;
      }
      
    } catch (error: any) {
      console.error("Error verifying wallet:", error);
      res.status(500).json({ 
        message: "Failed to verify wallet: " + error.message 
      });
    }
  });

  // Whop subscription routes
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = req.body;

      if (!tier || !['basic', 'premium'].includes(tier)) {
        return res.status(400).json({ message: "Invalid tier. Must be 'basic' or 'premium'" });
      }

      const user = await storage.getUser(userId);
      if (!user?.email) {
        return res.status(400).json({ message: "User email is required" });
      }

      const planId = tier === 'individual' ? WHOP_PLAN_IDS.INDIVIDUAL : WHOP_PLAN_IDS.GROUP;
      
      if (!planId) {
        return res.status(500).json({ 
          message: `Whop plan ID not configured for ${tier} tier. Set WHOP_PLAN_ID_${tier.toUpperCase()}`
        });
      }

      const checkout = await createWhopCheckout({
        planId,
        userId: user.id,
        userEmail: user.email,
        metadata: { tier }
      });

      res.json({ url: checkout.checkoutUrl, sessionId: checkout.sessionId });
    } catch (error: any) {
      console.error("Error creating Whop checkout:", error);
      res.status(500).json({ message: "Error creating subscription: " + error.message });
    }
  });

  app.post('/api/cancel-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getSubscription(userId);

      if (!subscription?.whopMembershipId) {
        return res.status(400).json({ message: "No active subscription found" });
      }

      const cancelled = await cancelWhopMembership(subscription.whopMembershipId);
      
      if (cancelled) {
        await storage.updateSubscription(subscription.id, {
          status: 'cancelled',
        });
        res.json({ message: "Subscription cancelled successfully" });
      } else {
        res.status(500).json({ message: "Failed to cancel subscription" });
      }
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Error cancelling subscription: " + error.message });
    }
  });

  app.post('/api/whop/webhook', async (req, res) => {
    try {
      const event = req.body;

      switch (event.action) {
        case 'payment.succeeded': {
          const payment = event.data;
          break;
        }
        
        case 'membership.went_valid': {
          const membership = event.data;
          const whopUserId = membership.user?.id;
          const whopMembershipId = membership.id;
          const planId = membership.plan;
          const validUntil = membership.valid_until ? new Date(membership.valid_until * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          const tier = mapPlanToTier(planId);
          const status = mapWhopStatus(membership.status);

          // Try to find user by whopUserId or metadata
          const userId = membership.metadata?.user_id;
          
          if (userId) {
            const dbSubscription = await storage.getSubscription(userId);
            
            if (dbSubscription?.tier === 'lifetime') {
              break;
            }
            
            if (dbSubscription) {
              await storage.updateSubscription(dbSubscription.id, {
                tier,
                status,
                whopMembershipId,
                whopPlanId: planId,
                currentPeriodEnd: validUntil,
              });
            } else {
              await storage.createSubscription({
                userId,
                tier,
                status,
                whopMembershipId,
                whopPlanId: planId,
                currentPeriodEnd: validUntil,
              });
            }
          }
          
          break;
        }
        
        case 'membership.went_invalid': {
          const membership = event.data;
          const whopMembershipId = membership.id;
          
          const dbSubscription = await storage.getSubscriptionByWhopId(whopMembershipId);
          
          if (dbSubscription?.tier === 'lifetime') {
            break;
          }
          
          if (dbSubscription) {
            await storage.updateSubscription(dbSubscription.id, {
              status: 'expired',
            });
          }
          
          break;
        }
      }

      res.sendStatus(200);
    } catch (error: any) {
      console.error("Whop webhook error:", error);
      res.status(500).send('Webhook processing failed');
    }
  });

  // ============================================================================
  // CRYPTO PAYMENT ROUTES
  // ============================================================================
  
  // Import crypto payment service
  const cryptoPayments = await import('./crypto-payments.ts');
  
  // POST /api/create-crypto-payment - Generate crypto payment address
  app.post('/api/create-crypto-payment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { chain, tier } = req.body;
      
      // Only allow SOL payments until ETH/BTC are fully implemented
      if (!chain || chain !== 'SOL') {
        return res.status(400).json({ 
          message: "Only SOL payments are currently supported. ETH and BTC coming soon!",
          supported_chains: ['SOL']
        });
      }
      
      // Verify PHANTOM_WALLET_ADDRESS is configured
      if (!process.env.PHANTOM_WALLET_ADDRESS) {
        console.error("PHANTOM_WALLET_ADDRESS not configured!");
        return res.status(503).json({ 
          message: "Crypto payments are currently unavailable. Please use Whop subscription instead or contact support.",
        });
      }
      
      if (!tier || !['basic', 'premium'].includes(tier)) {
        return res.status(400).json({ message: "Invalid tier. Must be 'basic' or 'premium'" });
      }
      
      const result = await cryptoPayments.generatePaymentAddress(userId, chain, tier);
      
      res.json({
        paymentId: result.payment.id,
        address: result.cryptoAddress.address,
        amount: result.amountToPay,
        chain,
        tier,
        expiresAt: result.expiresAt,
      });
    } catch (error: any) {
      console.error("Error creating crypto payment:", error);
      res.status(500).json({ message: "Error creating crypto payment: " + error.message });
    }
  });
  
  // GET /api/crypto-payment/:paymentId - Check payment status
  app.get('/api/crypto-payment/:paymentId', isAuthenticated, async (req: any, res) => {
    try {
      const { paymentId } = req.params;
      const payment = await cryptoPayments.getPaymentStatus(paymentId);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json(payment);
    } catch (error: any) {
      console.error("Error fetching payment status:", error);
      res.status(500).json({ message: "Error fetching payment status: " + error.message });
    }
  });
  
  // POST /api/crypto-payment/:paymentId/check - Manually check for payment
  app.post('/api/crypto-payment/:paymentId/check', isAuthenticated, async (req: any, res) => {
    try {
      const { paymentId } = req.params;
      
      // Trigger manual check
      const payment = await cryptoPayments.checkSolPayment(paymentId);
      
      res.json(payment);
    } catch (error: any) {
      console.error("Error checking payment:", error);
      res.status(500).json({ message: "Error checking payment: " + error.message });
    }
  });
  
  // ============================================================================
  // BOT INVITE LINKS
  // ============================================================================
  
  // GET /api/bot/invite-links - Get Telegram and Discord bot invite links
  // OPEN ACCESS - No authentication required
  app.get('/api/bot/invite-links', async (req: any, res) => {
    try {
      const links: { telegram?: string; discord?: string; message: string } = {
        message: "You have access to premium bot features!",
      };
      
      // Telegram bot link (if configured)
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      if (telegramToken) {
        // Extract bot username from token (format: BOTID:TOKEN)
        // For now, return generic link - in production, you'd get username via Telegram API
        links.telegram = process.env.TELEGRAM_BOT_URL || `https://t.me/YOUR_BOT_USERNAME`;
      }
      
      // Discord bot link (if configured)
      const discordClientId = process.env.DISCORD_CLIENT_ID;
      if (discordClientId) {
        // OAuth2 invite URL with necessary permissions
        // Permissions: Send Messages (2048), Embed Links (16384), Use Slash Commands (2147483648)
        const permissions = '2147502080';
        links.discord = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&permissions=${permissions}&scope=bot%20applications.commands`;
      }
      
      if (!links.telegram && !links.discord) {
        return res.status(503).json({
          message: "Bot services are not configured yet. Please contact support."
        });
      }
      
      res.json(links);
    } catch (error: any) {
      console.error("Error getting bot invite links:", error);
      res.status(500).json({ 
        message: "Failed to get bot invite links: " + error.message 
      });
    }
  });
  
  // ============================================================================
  // AI BLACKLIST ROUTES
  // ============================================================================
  
  const blacklist = await import('./ai-blacklist.ts');
  
  // GET /api/blacklist/check/:wallet - Check if wallet is blacklisted
  app.get('/api/blacklist/check/:wallet', async (req, res) => {
    try {
      const { wallet } = req.params;
      const result = await blacklist.checkBlacklist(wallet);
      res.json(result);
    } catch (error: any) {
      console.error("Error checking blacklist:", error);
      res.status(500).json({ message: "Error checking blacklist: " + error.message });
    }
  });
  
  // POST /api/blacklist/report - Report a suspicious wallet
  app.post('/api/blacklist/report', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { walletAddress, reportType, evidence } = req.body;
      
      if (!walletAddress || !reportType || !evidence) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      await blacklist.reportWallet(walletAddress, reportType, evidence, userId);
      
      res.json({ message: "Report submitted successfully" });
    } catch (error: any) {
      console.error("Error reporting wallet:", error);
      res.status(500).json({ message: "Error reporting wallet: " + error.message });
    }
  });
  
  // GET /api/blacklist/stats - Get blacklist statistics
  app.get('/api/blacklist/stats', async (req, res) => {
    try {
      const stats = await blacklist.getBlacklistStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting blacklist stats:", error);
      res.status(500).json({ message: "Error getting blacklist stats: " + error.message });
    }
  });
  
  // GET /api/blacklist/top - Get top flagged wallets
  app.get('/api/blacklist/top', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const wallets = await blacklist.getTopFlaggedWallets(limit);
      res.json(wallets);
    } catch (error: any) {
      console.error("Error getting top flagged wallets:", error);
      res.status(500).json({ message: "Error getting top flagged wallets: " + error.message });
    }
  });
  
  // ============================================================================
  // WATCHLIST ROUTES
  // ============================================================================
  
  // GET /api/watchlist - Get user's watchlist
  app.get('/api/watchlist', withUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const watchlist = await storage.getWatchlist(userId);
      res.json(watchlist);
    } catch (error: any) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ message: "Failed to fetch watchlist: " + error.message });
    }
  });
  
  // POST /api/watchlist - Add token to watchlist
  app.post('/api/watchlist', withUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const result = insertWatchlistSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid request",
          errors: result.error.errors,
        });
      }
      
      const { tokenAddress, label } = result.data;
      
      const entry = await storage.addToWatchlist({
        userId,
        tokenAddress,
        label,
        metadata: null,
      });
      
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error adding to watchlist:", error);
      
      if (error.message?.includes('unique constraint') || error.code === '23505') {
        return res.status(409).json({ 
          message: "This token is already in your watchlist" 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to add to watchlist: " + error.message 
      });
    }
  });
  
  // DELETE /api/watchlist/:tokenAddress - Remove token from watchlist
  app.delete('/api/watchlist/:tokenAddress', withUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tokenAddress } = req.params;
      
      if (!tokenAddress || tokenAddress.length < 32 || tokenAddress.length > 44) {
        return res.status(400).json({ 
          message: "Invalid token address" 
        });
      }
      
      await storage.removeFromWatchlist(userId, tokenAddress);
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ 
        message: "Failed to remove from watchlist: " + error.message 
      });
    }
  });
  
  // ============================================================================
  // PRICE API ROUTES (Shared Cache for Watchlist, Portfolio, Alerts)
  // ============================================================================
  
  // GET /api/prices/:tokenAddress - Get price for single token
  app.get('/api/prices/:tokenAddress', async (req, res) => {
    try {
      const { priceService } = await import('./services/price-service.ts');
      const { tokenAddress } = req.params;
      
      const price = await priceService.getPrice(tokenAddress);
      
      if (!price) {
        return res.status(404).json({ 
          message: "Price not found for this token" 
        });
      }
      
      res.json(price);
    } catch (error: any) {
      console.error("Error fetching price:", error);
      res.status(500).json({ 
        message: "Failed to fetch price: " + error.message 
      });
    }
  });
  
  // POST /api/prices/batch - Get prices for multiple tokens
  app.post('/api/prices/batch', async (req, res) => {
    try {
      const { priceService } = await import('./services/price-service.ts');
      const { tokenAddresses } = req.body;
      
      if (!Array.isArray(tokenAddresses)) {
        return res.status(400).json({ 
          message: "tokenAddresses must be an array" 
        });
      }
      
      if (tokenAddresses.length > 100) {
        return res.status(400).json({ 
          message: "Maximum 100 tokens per request" 
        });
      }
      
      const prices = await priceService.getPrices(tokenAddresses);
      
      // Convert Map to object for JSON response
      const pricesObject: Record<string, any> = {};
      for (const [address, price] of Array.from(prices.entries())) {
        pricesObject[address] = price;
      }
      
      res.json(pricesObject);
    } catch (error: any) {
      console.error("Error fetching batch prices:", error);
      res.status(500).json({ 
        message: "Failed to fetch prices: " + error.message 
      });
    }
  });
  
  // ============================================================================
  // ANALYTICS ROUTES (Option C: Advanced Analytics Dashboard)
  // ============================================================================
  
  // GET /api/analytics/market-overview - Market overview with trending tokens
  app.get('/api/analytics/market-overview', async (req, res) => {
    try {
      const { priceCache } = await import('./services/price-cache.ts');
      const { getBlacklist } = await import('./ai-blacklist.ts');
      
      // Get trending tokens (top 10)
      const trending = await storage.getTrendingTokens(10);
      
      // Get recent snapshots for stats
      const recentTokens = priceCache.getRecentlyUpdated(60); // Last hour
      const totalAnalyzed = recentTokens.length;
      
      // Get blacklist count for rugs detected
      const blacklist = await getBlacklist();
      const rugsDetected = blacklist.length;
      
      // Calculate average risk score from trending tokens
      let avgRiskScore = 0;
      if (trending.length > 0) {
        const riskScores = await Promise.all(
          trending.slice(0, 5).map(async (t) => {
            const snapshots = await storage.getHistoricalData(t.tokenAddress, 1);
            return snapshots.length > 0 ? snapshots[snapshots.length - 1].riskScore : 0;
          })
        );
        avgRiskScore = Math.round(riskScores.reduce((a, b) => a + b, 0) / riskScores.length);
      }
      
      // Get active alerts count
      const activeAlerts = await storage.getActivePriceAlerts();
      
      res.json({
        totalAnalyzed,
        rugsDetected,
        avgRiskScore,
        activeAlerts: activeAlerts.length,
        trending: trending.map(t => ({
          tokenAddress: t.tokenAddress,
          score: parseFloat(t.score as string),
          rank: t.rank,
          volume24h: t.volume24h ? parseFloat(t.volume24h as string) : null,
          velocity: t.velocity ? parseFloat(t.velocity as string) : null,
        })),
      });
    } catch (error: any) {
      console.error("Error fetching market overview:", error);
      res.status(500).json({ message: "Failed to fetch market overview: " + error.message });
    }
  });
  
  // GET /api/analytics/historical/:tokenAddress - Historical token data
  app.get('/api/analytics/historical/:tokenAddress', async (req, res) => {
    try {
      const { tokenAddress } = req.params;
      const days = parseInt(req.query.days as string) || 7;
      
      if (!tokenAddress || tokenAddress.length < 32 || tokenAddress.length > 44) {
        return res.status(400).json({ message: "Invalid token address" });
      }
      
      if (days < 1 || days > 90) {
        return res.status(400).json({ message: "Days must be between 1 and 90" });
      }
      
      const historical = await storage.getHistoricalData(tokenAddress, days);
      
      res.json({
        tokenAddress,
        days,
        dataPoints: historical.length,
        data: historical.map(h => ({
          timestamp: h.capturedAt,
          priceUsd: h.priceUsd ? parseFloat(h.priceUsd as string) : null,
          riskScore: h.riskScore,
          holderCount: h.holderCount,
          volume24h: h.volume24h ? parseFloat(h.volume24h as string) : null,
          liquidityUsd: h.liquidityUsd ? parseFloat(h.liquidityUsd as string) : null,
          riskFlags: h.riskFlags,
          txCount24h: h.txCount24h,
        })),
      });
    } catch (error: any) {
      console.error("Error fetching historical data:", error);
      res.status(500).json({ message: "Failed to fetch historical data: " + error.message });
    }
  });
  
  // GET /api/analytics/risk-insights - Aggregate risk patterns
  app.get('/api/analytics/risk-insights', async (req, res) => {
    try {
      const stats7d = await storage.getRiskStatistics(7);
      const stats30d = await storage.getRiskStatistics(30);
      
      res.json({
        last7Days: stats7d ? {
          totalAnalyzed: stats7d.totalAnalyzed,
          rugDetected: stats7d.rugDetected,
          falsePositives: stats7d.falsePositives,
          detectionRate: stats7d.totalAnalyzed > 0 
            ? (stats7d.rugDetected / stats7d.totalAnalyzed * 100).toFixed(2)
            : 0,
          commonFlags: stats7d.commonFlags,
        } : null,
        last30Days: stats30d ? {
          totalAnalyzed: stats30d.totalAnalyzed,
          rugDetected: stats30d.rugDetected,
          falsePositives: stats30d.falsePositives,
          detectionRate: stats30d.totalAnalyzed > 0 
            ? (stats30d.rugDetected / stats30d.totalAnalyzed * 100).toFixed(2)
            : 0,
          commonFlags: stats30d.commonFlags,
        } : null,
      });
    } catch (error: any) {
      console.error("Error fetching risk insights:", error);
      res.status(500).json({ message: "Failed to fetch risk insights: " + error.message });
    }
  });
  
  // GET /api/analytics/hot-tokens - Real-time trending tokens feed
  app.get('/api/analytics/hot-tokens', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const trending = await storage.getTrendingTokens(limit);
      
      // Enrich with latest price data
      const { priceService } = await import('./services/price-service.ts');
      const enriched = await Promise.all(
        trending.map(async (t) => {
          const priceData = await priceService.getPrice(t.tokenAddress);
          const snapshots = await storage.getHistoricalData(t.tokenAddress, 1);
          const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
          
          return {
            tokenAddress: t.tokenAddress,
            score: parseFloat(t.score as string),
            rank: t.rank,
            volume24h: t.volume24h ? parseFloat(t.volume24h as string) : null,
            velocity: t.velocity ? parseFloat(t.velocity as string) : null,
            priceUsd: priceData?.priceUsd || null,
            priceChange24h: priceData?.priceChange24h || null,
            riskScore: latestSnapshot?.riskScore || null,
            updatedAt: t.updatedAt,
          };
        })
      );
      
      res.json(enriched);
    } catch (error: any) {
      console.error("Error fetching hot tokens:", error);
      res.status(500).json({ message: "Failed to fetch hot tokens: " + error.message });
    }
  });
  
  // GET /api/analytics/performance - Detection performance metrics
  app.get('/api/analytics/performance', async (req, res) => {
    try {
      const stats7d = await storage.getRiskStatistics(7);
      const stats30d = await storage.getRiskStatistics(30);
      
      const performance = {
        last7Days: stats7d ? {
          detectionRate: stats7d.totalAnalyzed > 0 
            ? ((stats7d.rugDetected / stats7d.totalAnalyzed) * 100).toFixed(2)
            : "0.00",
          falsePositiveRate: stats7d.totalAnalyzed > 0 
            ? ((stats7d.falsePositives / stats7d.totalAnalyzed) * 100).toFixed(2)
            : "0.00",
          coverage: stats7d.totalAnalyzed,
          avgAnalysisTime: "~2s", // Static for now
        } : null,
        last30Days: stats30d ? {
          detectionRate: stats30d.totalAnalyzed > 0 
            ? ((stats30d.rugDetected / stats30d.totalAnalyzed) * 100).toFixed(2)
            : "0.00",
          falsePositiveRate: stats30d.totalAnalyzed > 0 
            ? ((stats30d.falsePositives / stats30d.totalAnalyzed) * 100).toFixed(2)
            : "0.00",
          coverage: stats30d.totalAnalyzed,
          avgAnalysisTime: "~2s", // Static for now
        } : null,
      };
      
      res.json(performance);
    } catch (error: any) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics: " + error.message });
    }
  });
  
  // ============================================================================
  // PORTFOLIO ROUTES
  // ============================================================================
  
  // GET /api/portfolio/positions - Get user's portfolio positions
  app.get('/api/portfolio/positions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const positions = await storage.getPortfolioPositions(userId);
      res.json(positions);
    } catch (error: any) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ message: "Failed to fetch portfolio: " + error.message });
    }
  });
  
  // POST /api/portfolio/transactions - Record a new transaction
  app.post('/api/portfolio/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { insertPortfolioTransactionSchema } = await import('../shared/schema.ts');
      
      const result = insertPortfolioTransactionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid request",
          errors: result.error.errors,
        });
      }
      
      const { tokenAddress, txType, quantity, priceUsd, feeUsd, note, executedAt } = result.data;
      
      const txResult = await storage.recordTransaction(userId, {
        tokenAddress,
        txType,
        quantity: String(quantity),
        priceUsd: priceUsd !== undefined ? String(priceUsd) : undefined,
        feeUsd: feeUsd !== undefined ? String(feeUsd) : undefined,
        note,
        executedAt: executedAt ? new Date(executedAt) : new Date(),
      });
      
      res.status(201).json(txResult);
    } catch (error: any) {
      console.error("Error recording transaction:", error);
      
      if (error.message?.includes('Insufficient holdings') || 
          error.message?.includes('negative quantity')) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to record transaction: " + error.message });
    }
  });
  
  // GET /api/portfolio/transactions - Get transaction history
  app.get('/api/portfolio/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tokenAddress = req.query.tokenAddress as string | undefined;
      
      const transactions = await storage.getTransactionHistory(userId, tokenAddress);
      res.json(transactions);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions: " + error.message });
    }
  });
  
  // DELETE /api/portfolio/positions/:tokenAddress - Delete a position
  app.delete('/api/portfolio/positions/:tokenAddress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tokenAddress } = req.params;
      
      await storage.deletePosition(userId, tokenAddress);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting position:", error);
      res.status(500).json({ message: "Failed to delete position: " + error.message });
    }
  });
  
    // GET /api/portfolio/live/:walletAddress - Get live wallet holdings
    app.get('/api/portfolio/live/:walletAddress', async (req, res) => {
      try {
        const { walletAddress } = req.params;
      
        if (!walletAddress || walletAddress.length < 32 || walletAddress.length > 44) {
          return res.status(400).json({ message: "Invalid wallet address" });
        }

        const { Connection, PublicKey } = await import('@solana/web3.js');
        const { rpcBalancer } = await import('./services/rpc-balancer.ts');
        const { priceService } = await import('./services/price-service.ts');
        const { dexscreenerService } = await import('./dexscreener-service.ts');
      
        const connection = rpcBalancer.getConnection();
        const publicKey = new PublicKey(walletAddress);
      
        // Get all token accounts for this wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
        });
      
        const holdings = await Promise.all(
          tokenAccounts.value
            .filter(account => {
              const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
              return amount && amount > 0;
            })
            .map(async (account) => {
              const tokenAddress = account.account.data.parsed.info.mint;
              const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
              const decimals = account.account.data.parsed.info.tokenAmount.decimals;
            
              // Get price data
              let priceUsd = null;
              let valueUsd = null;
              let change24h = null;
              let symbol = 'Unknown';
              let name = 'Unknown Token';
              let logo = null;
            
              try {
                const priceData = await priceService.getPrice(tokenAddress);
                if (priceData?.priceUsd) {
                  priceUsd = priceData.priceUsd;
                  valueUsd = balance * priceUsd;
                }
              
                const dexData = await dexscreenerService.getTokenData(tokenAddress);
                if (dexData) {
                  symbol = dexData.baseToken?.symbol || symbol;
                  name = dexData.baseToken?.name || name;
                  change24h = dexData.priceChange?.h24 || null;
                  if (dexData.info?.imageUrl) {
                    logo = dexData.info.imageUrl;
                  }
                }
              } catch (err) {
                console.log(`Failed to get price for ${tokenAddress}:`, err);
              }
            
              return {
                tokenAddress,
                symbol,
                name,
                balance,
                decimals,
                priceUsd,
                valueUsd,
                change24h,
                logo
              };
            })
        );
      
        // Sort by value descending
        holdings.sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));
      
        res.json(holdings);
      } catch (error: any) {
        console.error("Error fetching live wallet holdings:", error);
        res.status(500).json({ message: "Failed to fetch wallet holdings: " + error.message });
      }
    });
  
  // ============================================================================
  // PRICE ALERTS ROUTES
  // ============================================================================
  
  // GET /api/alerts - Get user's price alerts
  app.get('/api/alerts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const alerts = await storage.getPriceAlerts(userId);
      res.json(alerts);
    } catch (error: any) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts: " + error.message });
    }
  });
  
  // POST /api/alerts - Create a new price alert
  app.post('/api/alerts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { insertPriceAlertSchema } = await import('../shared/schema.ts');
      
      const result = insertPriceAlertSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid request",
          errors: result.error.errors,
        });
      }
      
      const { tokenAddress, alertType, targetValue, lookbackWindowMinutes } = result.data;
      
      const alert = await storage.createPriceAlert({
        userId,
        tokenAddress,
        alertType,
        targetValue: typeof targetValue === 'number' ? targetValue.toString() : targetValue,
        lookbackWindowMinutes,
        isActive: true,
        lastPrice: null,
        triggeredAt: null,
        cancelledAt: null,
      });
      
      res.status(201).json(alert);
    } catch (error: any) {
      console.error("Error creating alert:", error);
      
      if (error.message?.includes('unique constraint') || error.code === '23505') {
        return res.status(409).json({ 
          message: "You already have this alert configured" 
        });
      }
      
      res.status(500).json({ message: "Failed to create alert: " + error.message });
    }
  });
  
  // PATCH /api/alerts/:id - Update alert (toggle active/inactive)
  app.patch('/api/alerts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { isActive } = req.body;
      
      // Verify ownership
      const alerts = await storage.getPriceAlerts(userId);
      if (!alerts.find(a => a.id === id)) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      const updated = await storage.updatePriceAlert(id, { isActive });
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating alert:", error);
      res.status(500).json({ message: "Failed to update alert: " + error.message });
    }
  });
  
  // DELETE /api/alerts/:id - Delete alert
  app.delete('/api/alerts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      await storage.deletePriceAlert(userId, id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting alert:", error);
      res.status(500).json({ message: "Failed to delete alert: " + error.message });
    }
  });
  
  // POST /api/analyze-token - Analyze a Solana token for rug pull risks
  // PROTECTED: Requires active subscription OR 10M+ tokens
  app.post("/api/analyze-token", hasActiveAccess, async (req, res) => {
    try {
      // Validate request body
      const result = analyzeTokenSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: result.error.errors,
        });
      }

      const { tokenAddress } = result.data;

      // Perform token analysis
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      try { nameCache.remember(tokenAddress, (analysis as any)?.metadata?.symbol, (analysis as any)?.metadata?.name); } catch {}
      
      // Get userId if authenticated
      const userId = (req as any).user?.claims?.sub;
      
      // Run AI blacklist analysis in background (don't block response)
      blacklist.analyzeAndFlag(analysis, userId).catch(err => {
        console.error("Background blacklist analysis error:", err);
      });
      
      // Check if mint/freeze authority is blacklisted
      const mintAuthority = analysis.authorities?.mintAuthority;
      const freezeAuthority = analysis.authorities?.freezeAuthority;
      
      const blacklistChecks = await Promise.all([
        mintAuthority 
          ? blacklist.checkBlacklist(mintAuthority)
          : Promise.resolve({ isBlacklisted: false, severity: 0, labels: [], warnings: [] }),
        freezeAuthority
          ? blacklist.checkBlacklist(freezeAuthority)
          : Promise.resolve({ isBlacklisted: false, severity: 0, labels: [], warnings: [] }),
        blacklist.checkBlacklist(tokenAddress),
      ]);
      
      // Add blacklist info to response
      const responseWithBlacklist = {
        ...analysis,
        blacklistInfo: {
          mintAuthority: blacklistChecks[0],
          freezeAuthority: blacklistChecks[1],
          token: blacklistChecks[2],
        },
      };

      return res.json(responseWithBlacklist);
    } catch (error) {
      console.error("Token analysis error:", error);
      
      return res.status(500).json({
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  // POST /api/compare-tokens - Compare multiple tokens side-by-side
  // Validation schema: accept array of 2-5 token addresses
  const compareTokensSchema = z.object({
    tokenAddresses: z.array(z.string().min(32).max(44)).min(2).max(5),
  });

  app.post("/api/compare-tokens", async (req, res) => {
    try {
      // Validate request body
      const result = compareTokensSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: result.error.errors,
          message: "Please provide 2-5 valid token addresses",
        });
      }

      const { tokenAddresses } = result.data;

      // Analyze each token in parallel
      const analysisPromises = tokenAddresses.map(async (tokenAddress) => {
        try {
          const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
          try { nameCache.remember(tokenAddress, (analysis as any)?.metadata?.symbol, (analysis as any)?.metadata?.name); } catch {}
          
          // Get userId if authenticated (optional)
          const userId = (req as any).user?.claims?.sub;
          
          // Run AI blacklist analysis in background (don't block response)
          if (userId) {
            blacklist.analyzeAndFlag(analysis, userId).catch(err => {
              console.error("Background blacklist analysis error:", err);
            });
          }
          
          // Check if mint/freeze authority is blacklisted
          const blacklistChecks = await Promise.all([
            analysis.mintAuthority.authorityAddress 
              ? blacklist.checkBlacklist(analysis.mintAuthority.authorityAddress)
              : Promise.resolve({ isBlacklisted: false, severity: 0, labels: [], warnings: [] }),
            analysis.freezeAuthority.authorityAddress
              ? blacklist.checkBlacklist(analysis.freezeAuthority.authorityAddress)
              : Promise.resolve({ isBlacklisted: false, severity: 0, labels: [], warnings: [] }),
            blacklist.checkBlacklist(tokenAddress),
          ]);
          
          return {
            ...analysis,
            blacklistInfo: {
              mintAuthority: blacklistChecks[0],
              freezeAuthority: blacklistChecks[1],
              token: blacklistChecks[2],
            },
          };
        } catch (error) {
          console.error(`Error analyzing token ${tokenAddress}:`, error);
          // Return error object for this specific token
          return {
            tokenAddress,
            error: true,
            message: error instanceof Error ? error.message : "Analysis failed",
          };
        }
      });

      // Wait for all analyses to complete
      const results = await Promise.all(analysisPromises);

      return res.json({
        comparisons: results,
        comparedAt: Date.now(),
      });
    } catch (error) {
      console.error("Token comparison error:", error);
      
      return res.status(500).json({
        error: "Comparison failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  // Subscription code redemption
  const redeemCodeSchema = z.object({
    code: z.string().min(1).max(50).trim().toUpperCase(),
  });

  app.post('/api/redeem-code', isAuthenticated, async (req: any, res) => {
    try {
      const { code } = redeemCodeSchema.parse(req.body);
      const userId = req.user.claims.sub;

      const result = await storage.redeemCode(userId, code);

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      return res.json({
        message: result.message,
        subscription: result.subscription,
      });
    } catch (error) {
      console.error("Code redemption error:", error);
      return res.status(500).json({
        error: "Redemption failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Vanity address generator routes
  const vanityEstimateSchema = z.object({
    pattern: z.string().min(1).max(10),
    matchType: z.enum(['prefix', 'suffix', 'contains']),
  });

  app.post('/api/vanity/estimate', isAuthenticated, async (req, res) => {
    try {
      const { pattern, matchType } = vanityEstimateSchema.parse(req.body);
      const estimate = VanityAddressGenerator.estimateDifficulty(pattern, matchType);
      return res.json(estimate);
    } catch (error) {
      console.error("Vanity estimate error:", error);
      return res.status(400).json({
        error: "Invalid request",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  const vanityGenerateSchema = z.object({
    pattern: z.string().min(1).max(10),
    matchType: z.enum(['prefix', 'suffix', 'contains']),
    caseSensitive: z.boolean().optional(),
    maxAttempts: z.number().min(1000).max(50_000_000).optional(),
  });

  app.post('/api/vanity/generate', isAuthenticated, async (req, res) => {
    try {
      const options = vanityGenerateSchema.parse(req.body);
      const generator = new VanityAddressGenerator();
      
      // Set a timeout to prevent hanging forever
      const timeout = setTimeout(() => {
        generator.stop();
      }, 60_000); // 60 second max

      const result = await generator.generate(options);
      clearTimeout(timeout);

      if (!result) {
        return res.status(404).json({
          error: "No match found",
          message: `Could not find a matching address within ${options.maxAttempts || 10_000_000} attempts`,
        });
      }

      return res.json(result);
    } catch (error) {
      console.error("Vanity generation error:", error);
      return res.status(500).json({
        error: "Generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ========================================
  // SOCIAL FEATURES - COMMENTS API
  // ========================================
  
  // POST /api/comments - Create comment
  app.post('/api/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { socialService } = await import('./services/social-service');
      
      // Rate limiting
      const rateLimit = await socialService.checkRateLimit(userId, 'comment');
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          message: `Rate limit exceeded. Please wait before commenting again.`,
          remaining: rateLimit.remaining 
        });
      }
      
      // Validate input
      const { tokenAddress, content, rating } = req.body;
      if (!tokenAddress || !content) {
        return res.status(400).json({ message: 'Token address and content required' });
      }
      
      // Sanitize content
      const sanitizedContent = socialService.sanitizeContent(content);
      
      // Spam detection
      const isSpam = await socialService.detectSpam(sanitizedContent);
      if (isSpam) {
        return res.status(400).json({ message: 'Content flagged as spam' });
      }
      
      const comment = await storage.createComment({
        userId,
        tokenAddress,
        commentText: sanitizedContent,
        rating: rating || null,
      });
      
      // Award points for commenting
      await socialService.awardPoints(userId, 'comment', 5, tokenAddress);
      
      res.json(comment);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ message: 'Failed to create comment' });
    }
  });
  
  // GET /api/comments/:tokenAddress - Get all comments
  app.get('/api/comments/:tokenAddress', async (req, res) => {
    try {
      const { tokenAddress } = req.params;
      const comments = await storage.getCommentsByToken(tokenAddress);
      res.json(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  });
  
  // GET /api/comments/flagged - Get flagged comments (admin only)
  app.get('/api/comments/flagged', isAdmin, async (req, res) => {
    try {
      const comments = await storage.getFlaggedComments();
      res.json(comments);
    } catch (error) {
      console.error('Error fetching flagged comments:', error);
      res.status(500).json({ message: 'Failed to fetch flagged comments' });
    }
  });
  
  // POST /api/comments/:id/vote - Upvote/downvote
  app.post('/api/comments/:id/vote', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { voteType } = req.body;
      
      if (!['upvote', 'downvote'].includes(voteType)) {
        return res.status(400).json({ message: 'Invalid vote type' });
      }
      
      // Check if already voted
      const existingVote = await storage.getUserCommentVote(userId, id);
      if (existingVote) {
        if (existingVote.voteType === voteType) {
          // Remove vote
          await storage.removeCommentVote(userId, id);
        } else {
          // Update vote
          await storage.removeCommentVote(userId, id);
          await storage.voteComment({ userId, commentId: id, voteType: voteType as 'upvote' | 'downvote' });
        }
      } else {
        await storage.voteComment({ userId, commentId: id, voteType: voteType as 'upvote' | 'downvote' });
      }
      
      // Update vote counts
      await storage.updateCommentVoteCounts(id);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error voting on comment:', error);
      res.status(500).json({ message: 'Failed to vote on comment' });
    }
  });
  
  // DELETE /api/comments/:id - Delete own comment
  app.delete('/api/comments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      await storage.deleteComment(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ message: 'Failed to delete comment' });
    }
  });
  
  // POST /api/comments/:id/flag - Flag inappropriate
  app.post('/api/comments/:id/flag', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const comment = await storage.flagComment(id);
      res.json(comment);
    } catch (error) {
      console.error('Error flagging comment:', error);
      res.status(500).json({ message: 'Failed to flag comment' });
    }
  });
  
  // ========================================
  // SOCIAL FEATURES - COMMUNITY VOTES API
  // ========================================
  
  // POST /api/community-votes - Submit vote
  app.post('/api/community-votes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { socialService } = await import('./services/social-service');
      
      // Rate limiting
      const rateLimit = await socialService.checkRateLimit(userId, 'vote');
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          message: `Rate limit exceeded. ${rateLimit.remaining} votes remaining.`,
          remaining: rateLimit.remaining 
        });
      }
      
      const { tokenAddress, voteType, confidence } = req.body;
      if (!tokenAddress || !voteType) {
        return res.status(400).json({ message: 'Token address and vote type required' });
      }
      
      if (!['safe', 'risky', 'scam'].includes(voteType)) {
        return res.status(400).json({ message: 'Invalid vote type' });
      }
      
      // Check if already voted
      const existingVote = await storage.getUserCommunityVote(tokenAddress, userId);
      if (existingVote) {
        // Update vote
        const updated = await storage.updateCommunityVote(existingVote.id, {
          voteType: voteType as 'safe' | 'risky' | 'scam',
          confidence: confidence || 50,
        });
        
        // Recalculate consensus
        await socialService.aggregateVotes(tokenAddress);
        
        return res.json(updated);
      }
      
      const vote = await storage.createCommunityVote({
        userId,
        tokenAddress,
        voteType: voteType as 'safe' | 'risky' | 'scam',
        confidence: confidence || 50,
      });
      
      // Award points for voting
      await socialService.awardPoints(userId, 'vote', 2, tokenAddress);
      
      // Recalculate consensus
      await socialService.aggregateVotes(tokenAddress);
      
      res.json(vote);
    } catch (error) {
      console.error('Error submitting vote:', error);
      res.status(500).json({ message: 'Failed to submit vote' });
    }
  });
  
  // GET /api/community-votes/:tokenAddress/summary - Get consensus
  app.get('/api/community-votes/:tokenAddress/summary', async (req, res) => {
    try {
      const { tokenAddress } = req.params;
      const summary = await storage.getCommunityVoteSummary(tokenAddress);
      res.json(summary || null);
    } catch (error) {
      console.error('Error fetching vote summary:', error);
      res.status(500).json({ message: 'Failed to fetch vote summary' });
    }
  });
  
  // PUT /api/community-votes/:id - Update vote
  app.put('/api/community-votes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { voteType, confidence } = req.body;
      
      const updated = await storage.updateCommunityVote(id, {
        voteType: voteType as 'safe' | 'risky' | 'scam',
        confidence,
      });
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating vote:', error);
      res.status(500).json({ message: 'Failed to update vote' });
    }
  });
  
  // DELETE /api/community-votes/:id - Delete vote
  app.delete('/api/community-votes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      await storage.deleteCommunityVote(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting vote:', error);
      res.status(500).json({ message: 'Failed to delete vote' });
    }
  });
  
  // ========================================
  // SOCIAL FEATURES - USER PROFILES API
  // ========================================
  
  // GET /api/profile/:userId - Get profile
  app.get('/api/profile/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const profile = await storage.getUserProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      
      res.json(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  });
  
  // PUT /api/profile - Update own profile
  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { socialService } = await import('./services/social-service');
      
      const { username, bio, visibility } = req.body;
      
      // Sanitize text inputs
      const sanitizedBio = bio ? socialService.sanitizeContent(bio) : undefined;
      
      // Check if profile exists
      let profile = await storage.getUserProfile(userId);
      if (!profile) {
        // Create profile
        profile = await storage.createUserProfile({
          userId,
          username: username || null,
          bio: sanitizedBio || null,
          visibility: visibility || 'public',
          reputationScore: 0,
          contributionCount: 0,
        });
      } else {
        // Update profile
        profile = await storage.updateUserProfile(userId, {
          username,
          bio: sanitizedBio,
          visibility,
        });
      }
      
      res.json(profile);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });
  
  // GET /api/profile/:userId/activities - Activity feed
  app.get('/api/profile/:userId/activities', async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const activities = await storage.getUserActivities(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ message: 'Failed to fetch activities' });
    }
  });
  
  // GET /api/leaderboard - Top users
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const users = await storage.getTopUsers(limit);
      res.json(users);
    } catch (error: any) {
      const message: string = error?.message || '';
      const code: string | undefined = error?.code;
      // If the table doesn't exist yet (e.g., migrations not applied), return empty list gracefully
      if (code === '42P01' || message.toLowerCase().includes('user_profiles')) {
        return res.json([]);
      }
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });
  
  // ========================================
  // SOCIAL FEATURES - WATCHLIST SHARING API
  // ========================================
  
  // POST /api/watchlists/share - Make public, get share_slug
  app.post('/api/watchlists/share', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { socialService } = await import('./services/social-service');
      const { name, description, tokenAddresses, isPublic } = req.body;
      
      if (!name || !tokenAddresses || !Array.isArray(tokenAddresses)) {
        return res.status(400).json({ message: 'Name and token addresses required' });
      }
      
      const slug = socialService.generateShareSlug();
      const sanitizedDescription = description ? socialService.sanitizeContent(description) : null;
      
      const sharedWatchlist = await storage.createSharedWatchlist({
        ownerId: userId,
        name,
        description: sanitizedDescription,
        shareSlug: slug,
        isPublic: isPublic !== undefined ? isPublic : true,
        followersCount: 0,
      });
      
      res.json(sharedWatchlist);
    } catch (error) {
      console.error('Error sharing watchlist:', error);
      res.status(500).json({ message: 'Failed to share watchlist' });
    }
  });
  
  // GET /api/watchlists/shared/:slug - Get by slug (public)
  app.get('/api/watchlists/shared/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const watchlist = await storage.getSharedWatchlistBySlug(slug);
      
      if (!watchlist) {
        return res.status(404).json({ message: 'Watchlist not found' });
      }
      
      if (!watchlist.isPublic) {
        return res.status(403).json({ message: 'This watchlist is private' });
      }
      
      res.json(watchlist);
    } catch (error) {
      console.error('Error fetching shared watchlist:', error);
      res.status(500).json({ message: 'Failed to fetch watchlist' });
    }
  });
  
  // POST /api/watchlists/:id/follow - Follow
  app.post('/api/watchlists/:id/follow', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const follower = await storage.followWatchlist(userId, id);
      res.json(follower);
    } catch (error) {
      console.error('Error following watchlist:', error);
      res.status(500).json({ message: 'Failed to follow watchlist' });
    }
  });
  
  // DELETE /api/watchlists/:id/unfollow - Unfollow
  app.delete('/api/watchlists/:id/unfollow', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      await storage.unfollowWatchlist(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error unfollowing watchlist:', error);
      res.status(500).json({ message: 'Failed to unfollow watchlist' });
    }
  });
  
  // GET /api/watchlists/following - Get followed lists
  app.get('/api/watchlists/following', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const watchlists = await storage.getFollowedWatchlists(userId);
      res.json(watchlists);
    } catch (error) {
      console.error('Error fetching followed watchlists:', error);
      res.status(500).json({ message: 'Failed to fetch followed watchlists' });
    }
  });
  
  // GET /api/watchlists/public - Browse public watchlists
  app.get('/api/watchlists/public', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const watchlists = await storage.getPublicWatchlists(limit);
      res.json(watchlists);
    } catch (error) {
      console.error('Error fetching public watchlists:', error);
      res.status(500).json({ message: 'Failed to fetch public watchlists' });
    }
  });
  
  // ========================================
  // SOCIAL FEATURES - TOKEN REPORTS API
  // ========================================
  
  // POST /api/reports - Submit report
  app.post('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { socialService } = await import('./services/social-service');
      
      // Rate limiting
      const rateLimit = await socialService.checkRateLimit(userId, 'report');
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          message: `Rate limit exceeded. ${rateLimit.remaining} reports remaining.`,
          remaining: rateLimit.remaining 
        });
      }
      
      const { tokenAddress, reportType, evidence, severity } = req.body;
      
      if (!tokenAddress || !reportType || !evidence) {
        return res.status(400).json({ message: 'Token address, report type, and evidence required' });
      }
      
      if (!['scam', 'honeypot', 'soft_rug', 'other'].includes(reportType)) {
        return res.status(400).json({ message: 'Invalid report type' });
      }
      
      const sanitizedEvidence = socialService.sanitizeContent(evidence);
      
      const report = await storage.createTokenReport({
        reporterId: userId,
        tokenAddress,
        reportType: reportType as 'scam' | 'honeypot' | 'soft_rug' | 'other',
        evidence: sanitizedEvidence,
        severityScore: severity || 3,
        status: 'pending',
      });
      
      // Award points for reporting
      await socialService.awardPoints(userId, 'report', 10, tokenAddress);
      
      res.json(report);
    } catch (error) {
      console.error('Error submitting report:', error);
      res.status(500).json({ message: 'Failed to submit report' });
    }
  });
  
  // GET /api/reports/:tokenAddress - Get reports
  app.get('/api/reports/:tokenAddress', async (req, res) => {
    try {
      const { tokenAddress } = req.params;
      const reports = await storage.getTokenReports(tokenAddress);
      res.json(reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({ message: 'Failed to fetch reports' });
    }
  });
  
  // PUT /api/reports/:id/review - Admin review
  app.put('/api/reports/:id/review', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, resolutionNotes } = req.body;
      
      if (!['pending', 'approved', 'dismissed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const report = await storage.updateTokenReport(id, {
        status: status as 'pending' | 'approved' | 'dismissed',
        resolutionNotes,
      });
      
      res.json(report);
    } catch (error) {
      console.error('Error reviewing report:', error);
      res.status(500).json({ message: 'Failed to review report' });
    }
  });
  
  // GET /api/reports/pending - Admin pending queue
  app.get('/api/reports/pending', isAdmin, async (req, res) => {
    try {
      const reports = await storage.getPendingReports();
      res.json(reports);
    } catch (error) {
      console.error('Error fetching pending reports:', error);
      res.status(500).json({ message: 'Failed to fetch pending reports' });
    }
  });
  
  // ========================================
  // SOCIAL FEATURES - SOCIAL SHARING API
  // ========================================
  
  // GET /api/share/preview/:tokenAddress - OG meta tags
  app.get('/api/share/preview/:tokenAddress', async (req, res) => {
    try {
      const { tokenAddress } = req.params;
      
      // You could fetch token analysis here to generate preview
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      
      const preview = {
        url: `${baseUrl}/?token=${tokenAddress}`,
        title: `Rug Killer Alpha Bot - Token Analysis`,
        description: `Analyze ${tokenAddress} for rug pull risks`,
        image: `${baseUrl}/favicon.png`,
      };
      
      res.json(preview);
    } catch (error) {
      console.error('Error generating preview:', error);
      res.status(500).json({ message: 'Failed to generate preview' });
    }
  });
  
  // GET /api/bot/invite-links - Bot invite links
  app.get('/api/bot/invite-links', async (req, res) => {
    try {
      res.json({
        telegram: 'https://t.me/RugKillerAlphaBot',
        discord: process.env.DISCORD_INVITE_URL || undefined,
      });
    } catch (error) {
      console.error('Error fetching bot invite links:', error);
      res.status(500).json({ message: 'Failed to fetch bot invite links' });
    }
  });

  // GET /api/share/twitter/:tokenAddress - Twitter URL
  app.get('/api/share/twitter/:tokenAddress', async (req, res) => {
    try {
      const { tokenAddress } = req.params;
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      
      const url = `${baseUrl}/?token=${tokenAddress}`;
      const text = `Check out this token analysis on Rug Killer Alpha Bot`;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      
      res.json({ url: twitterUrl });
    } catch (error) {
      console.error('Error generating Twitter URL:', error);
      res.status(500).json({ message: 'Failed to generate Twitter URL' });
    }
  });
  
  // GET /api/share/telegram/:tokenAddress - Telegram URL
  app.get('/api/share/telegram/:tokenAddress', async (req, res) => {
    try {
      const { tokenAddress } = req.params;
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      
      const url = `${baseUrl}/?token=${tokenAddress}`;
      const text = `Check out this token analysis on Rug Killer Alpha Bot`;
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      
      res.json({ url: telegramUrl });
    } catch (error) {
      console.error('Error generating Telegram URL:', error);
      res.status(500).json({ message: 'Failed to generate Telegram URL' });
    }
  });

  // ---------------------------------------------------------------------------
  // BOT HEALTH (non-sensitive)
  // ---------------------------------------------------------------------------
  app.get('/api/health/bot', async (_req, res) => {
    try {
      const discordEnabled = process.env.DISCORD_ENABLED === 'true';
      const discordConfigured = Boolean(
        process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_BOT_TOKEN !== 'PLACEHOLDER_TOKEN' &&
        process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_ID !== 'PLACEHOLDER_ID'
      );

      let discordRunning = false;
      try {
        const mod: any = await import('./discord-bot.ts');
        if (typeof mod.isDiscordBotRunning === 'function') {
          discordRunning = !!mod.isDiscordBotRunning();
        }
      } catch {
        // ignore - module not loaded yet
      }

      const telegramEnabled = process.env.TELEGRAM_ENABLED === 'true';
      const telegramConfigured = Boolean(
        process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'PLACEHOLDER_TOKEN'
      );

      res.json({
        discord: { enabled: discordEnabled, configured: discordConfigured, running: discordRunning },
        telegram: { enabled: telegramEnabled, configured: telegramConfigured }
      });
    } catch (error: any) {
      console.error('Error in /api/health/bot:', error);
      res.status(500).json({ message: 'Failed to get bot health: ' + error.message });
    }
  });

  // ---------------------------------------------------------------------------
  // BOT INVITE LINKS (non-sensitive)
  // ---------------------------------------------------------------------------
  app.get('/api/bot/invite-links', async (_req, res) => {
    try {
      const discordClientId = process.env.DISCORD_CLIENT_ID;
      const permissions = process.env.DISCORD_PERMISSIONS || '84992'; // View Channels + Send Messages + Embed Links + Read History
      const links: { discord?: string } = {};

      if (discordClientId) {
        links.discord = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&permissions=${permissions}&scope=bot%20applications.commands`;
      }

      res.json(links);
    } catch (error: any) {
      console.error('Error fetching bot invite links:', error);
      res.status(500).json({ message: 'Failed to fetch bot invite links' });
    }
  });

  // ========================================
  // ADMIN ROUTES
  // ========================================

  // Check if current user has admin access
  app.get('/api/admin/check', isAuthenticated, async (req: any, res) => {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    const userEmail = req.user.claims.email;
    res.json({ isAdmin: adminEmails.includes(userEmail) });
  });

  // ========================================
  // CREATOR WALLET ROUTES (Admin Only)
  // ========================================

  // GET /api/admin/creator-wallet - View creator wallet info (NO private key)
  app.get('/api/admin/creator-wallet', isAdmin, async (req, res) => {
    try {
      const { getCreatorWallet } = await import('./creator-wallet.ts');
      const wallet = getCreatorWallet();
      const info = await wallet.getWalletInfo();
      
      res.json({
        publicKey: info.publicKey,
        balance: info.balance,
        isConfigured: info.isConfigured,
        pumpFunUrl: info.publicKey ? `https://pump.fun/profile/${info.publicKey}` : null,
      });
    } catch (error) {
      console.error("Error fetching creator wallet:", error);
      res.status(500).json({ message: "Failed to fetch creator wallet" });
    }
  });

  // POST /api/admin/creator-wallet/generate - Generate new wallet (returns private key ONCE)
  app.post('/api/admin/creator-wallet/generate', isAdmin, async (req, res) => {
    try {
      const { CreatorWalletService } = await import('./creator-wallet.ts');
      const newWallet = CreatorWalletService.generateNewWallet();
      
      res.json({
        publicKey: newWallet.publicKey,
        privateKey: newWallet.privateKey,
        warning: 'SAVE THIS PRIVATE KEY IMMEDIATELY! Import it into Phantom wallet. It will never be shown again.',
        nextSteps: [
          '1. Copy the private key above',
          '2. Open Phantom wallet → Settings → Import Private Key',
          '3. Paste the private key',
          '4. Add CREATOR_WALLET_PRIVATE_KEY to Replit Secrets',
          '5. Restart the application',
          '6. Use this wallet to create tokens on pump.fun',
        ],
      });
    } catch (error) {
      console.error("Error generating creator wallet:", error);
      res.status(500).json({ message: "Failed to generate wallet" });
    }
  });

  // ========================================
  // TOKEN DEPLOYMENT ROUTES (Admin Only)
  // ========================================
  // NOTE: Token deployment functionality is not yet implemented.
  // These routes are disabled until the token-deployer module is created.

  // POST /api/admin/token/deploy - Deploy SPL token (NOT IMPLEMENTED)
  app.post('/api/admin/token/deploy', isAdmin, async (req, res) => {
    res.status(501).json({ 
      message: 'Token deployment feature is not yet implemented. Please use Solana CLI or other tools for now.' 
    });
  });

  // GET /api/admin/token/info/:mintAddress - Get token info (NOT IMPLEMENTED)
  app.get('/api/admin/token/info/:mintAddress', isAdmin, async (req, res) => {
    res.status(501).json({ 
      message: 'Token info feature is not yet implemented.' 
    });
  });

  // ========================================
  // WALLET DISCOVERY ROUTES (Admin Only)
  // ========================================

  // GET /api/admin/wallets/discovery/status - Get wallet discovery status
  app.get('/api/admin/wallets/discovery/status', isAdmin, async (req, res) => {
    try {
      const { getWalletScheduler } = await import('./wallet-scheduler.ts');
      const { getAlphaAlertService } = await import('./alpha-alerts.ts');
      
      const scheduler = getWalletScheduler();
      const alphaService = getAlphaAlertService();
      
      res.json({
        scheduler: scheduler.getStatus(),
        alphaAlerts: alphaService.getStatus(),
      });
    } catch (error) {
      console.error("Error getting wallet discovery status:", error);
      res.status(500).json({ message: "Failed to get status" });
    }
  });

  // POST /api/admin/wallets/discovery/run - Manually trigger wallet discovery
  app.post('/api/admin/wallets/discovery/run', isAdmin, async (req, res) => {
    try {
      const { getWalletDiscoveryService } = await import('./services/wallet-discovery.ts');
      const discoveryService = getWalletDiscoveryService();
      
      // This would be async - return immediately
      res.json({ message: 'Wallet discovery started', status: 'running' });
      
      // Run in background
      const tokenMints = req.body.tokenMints || [];
      discoveryService.discoverProfitableWallets(tokenMints).catch(err => {
        console.error('Manual wallet discovery failed:', err);
      });
    } catch (error) {
      console.error("Error starting wallet discovery:", error);
      res.status(500).json({ message: "Failed to start discovery" });
    }
  });

  // POST /api/admin/wallets/add - Manually add a wallet
  app.post('/api/admin/wallets/add', isAdmin, async (req, res) => {
    try {
      const { addManualWallet } = await import('./services/external-wallet-sources.ts');
      
      const { walletAddress, displayName, twitterHandle, source } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: 'walletAddress is required' });
      }

      await addManualWallet({
        walletAddress,
        displayName,
        twitterHandle,
        source: source || 'admin-manual',
      });

      res.json({ message: 'Wallet added successfully', wallet: walletAddress });
    } catch (error) {
      console.error("Error adding manual wallet:", error);
      res.status(500).json({ message: "Failed to add wallet" });
    }
  });

  // GET /api/admin/wallets/list - List all tracked wallets
  app.get('/api/admin/wallets/list', isAdmin, async (req, res) => {
    try {
      const { db } = await import('./db.ts');
      const { kolWallets } = await import('../shared/schema.ts');
      const { desc } = await import('drizzle-orm');
      
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const wallets = await db
        .select()
        .from(kolWallets)
        .orderBy(desc(kolWallets.influenceScore))
        .limit(limit)
        .offset(offset);

      const total = await db.select({ count: kolWallets.id }).from(kolWallets);

      res.json({
        wallets,
        total: total.length,
        limit,
        offset,
      });
    } catch (error) {
      console.error("Error listing wallets:", error);
      res.status(500).json({ message: "Failed to list wallets" });
    }
  });

  // DELETE /api/admin/wallets/:walletAddress - Remove a wallet
  app.delete('/api/admin/wallets/:walletAddress', isAdmin, async (req, res) => {
    try {
      const { db } = await import('./db.ts');
      const { kolWallets } = await import('../shared/schema.ts');
      const { eq } = await import('drizzle-orm');
      
      const { walletAddress } = req.params;
      
      await db
        .delete(kolWallets)
        .where(eq(kolWallets.walletAddress, walletAddress));

      res.json({ message: 'Wallet removed successfully' });
    } catch (error) {
      console.error("Error removing wallet:", error);
      res.status(500).json({ message: "Failed to remove wallet" });
    }
  });

  // POST /api/admin/wallets/external/sync - Sync from external sources
  app.post('/api/admin/wallets/external/sync', isAdmin, async (req, res) => {
    try {
      const { getExternalWalletService } = await import('./services/external-wallet-sources.ts');
      const externalService = getExternalWalletService();
      
      res.json({ message: 'External wallet sync started', status: 'running' });
      
      // Run in background
      externalService.aggregateAllSources().catch(err => {
        console.error('External wallet sync failed:', err);
      });
    } catch (error) {
      console.error("Error syncing external wallets:", error);
      res.status(500).json({ message: "Failed to sync external wallets" });
    }
  });

  // ============================================================================
  // LIVE SCAN HISTORY & PUMP.FUN WEBHOOK ROUTES
  // ============================================================================

  // GET /api/bot/invite-links - Get bot invite links for footer
  app.get('/api/bot/invite-links', (req, res) => {
    const telegramBotUsername = process.env.TELEGRAM_BOT_USERNAME;
    const discordInviteUrl = process.env.DISCORD_INVITE_URL;
    
    const links: {
      telegram?: string;
      discord?: string;
      message?: string;
    } = {};

    if (telegramBotUsername) {
      links.telegram = `https://t.me/${telegramBotUsername}`;
    }

    if (discordInviteUrl) {
      links.discord = discordInviteUrl;
    }

    res.json(links);
  });

  // GET /api/scan-history - Get recent scan history
  app.get('/api/scan-history', async (req, res) => {
    try {
      const { getScanHistory } = await import('./live-scan-websocket.ts');
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const scans = await getScanHistory(limit, offset);
      res.json({ scans, total: scans.length });
    } catch (error) {
      console.error("Error fetching scan history:", error);
      res.status(500).json({ message: "Failed to fetch scan history" });
    }
  });

  // GET /api/scan-stats - Get scan statistics
  app.get('/api/scan-stats', async (req, res) => {
    try {
      const { getScanStats } = await import('./live-scan-websocket.ts');
      const stats = await getScanStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching scan stats:", error);
      res.status(500).json({ message: "Failed to fetch scan stats" });
    }
  });

  // GET /api/live-scan/status - Get WebSocket and Pump.fun status
  app.get('/api/live-scan/status', async (req, res) => {
    try {
      const { liveScanWS } = await import('./live-scan-websocket.ts');
      const stats = liveScanWS.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching live scan status:", error);
      res.status(500).json({ message: "Failed to fetch status" });
    }
  });

  // Telegram webhook endpoint (for Railway compatibility)
  if (process.env.TELEGRAM_WEBHOOK_URL) {
    app.post('/telegram-webhook', async (req, res) => {
      try {
        const { getTelegramBot } = await import('./telegram-bot.ts');
        const bot = getTelegramBot();
        
        if (!bot) {
          console.error('Telegram webhook called but bot not initialized');
          return res.status(503).send('Bot not ready');
        }
        
        // Handle the update manually
        await bot.handleUpdate(req.body, res);
      } catch (error: any) {
        console.error('Telegram webhook error:', error);
        res.status(500).send('Internal error');
      }
    });
    console.log('✅ Telegram webhook endpoint registered at /telegram-webhook');
  }

  const httpServer = createServer(app);
  
  // Initialize WebSocket for live scans (optional)
  if (process.env.ENABLE_LIVE_SCAN === 'true') {
    (async () => {
      try {
        const { liveScanWS } = await import('./live-scan-websocket.ts');
        const { pumpFunWebhook } = await import('./services/pumpfun-webhook.ts');
        
        // Initialize WebSocket server
        liveScanWS.initialize(httpServer);
        
        // Connect to Pump.fun webhook (only if enabled)
        if (process.env.ENABLE_PUMPFUN_WEBHOOK === 'true') {
          await pumpFunWebhook.connect();
          console.log('✅ Pump.fun webhook enabled and connected');
        } else {
          console.log('ℹ️  Pump.fun webhook disabled (set ENABLE_PUMPFUN_WEBHOOK=true to enable)');
        }
      } catch (error: any) {
        console.warn('⚠️ Live scan WebSocket unavailable (silenced):', error?.message || String(error));
      }
    })();
  } else {
    console.log('ℹ️ Live scan WebSocket disabled (set ENABLE_LIVE_SCAN=true to enable)');
  }
  
  return httpServer;
}

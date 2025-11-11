import type { Express } from "express";
import { createServer, type Server } from "http";
import { analyzeTokenSchema } from "@shared/schema";
import { tokenAnalyzer } from "./solana-analyzer";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { 
  createWhopCheckout, 
  getWhopMembership, 
  cancelWhopMembership,
  mapWhopStatus,
  mapPlanToTier,
  WHOP_PLAN_IDS 
} from "./whop-client";
import { VanityAddressGenerator } from "./vanity-generator";
import { z } from "zod";

// Middleware: Requires active subscription OR 10M+ token holder status
// This gates all premium features including token analysis, crypto payments, and bot access
export const hasActiveAccess = async (req: any, res: any, next: any) => {
  try {
    // Must be authenticated first
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ 
        message: "Unauthorized. Please log in." 
      });
    }

    const userId = req.user.claims.sub;
    
    // Check access via storage helper
    const accessCheck = await storage.hasActiveAccess(userId);
    
    if (accessCheck.hasAccess) {
      // Log successful access for security monitoring
      console.log(`✅ Access granted to ${userId}: ${accessCheck.reason}`);
      return next();
    }
    
    // Access denied - provide clear reason
    console.warn(`❌ Access denied to ${userId}: ${accessCheck.reason}`);
    return res.status(403).json({
      message: accessCheck.reason,
      subscription: accessCheck.subscription ? {
        tier: accessCheck.subscription.tier,
        status: accessCheck.subscription.status,
        currentPeriodEnd: accessCheck.subscription.currentPeriodEnd,
      } : null,
      wallet: accessCheck.wallet ? {
        isEligible: accessCheck.wallet.isEligible,
        tokenBalance: accessCheck.wallet.tokenBalance,
        lastVerifiedAt: accessCheck.wallet.lastVerifiedAt,
      } : null,
    });
  } catch (error) {
    console.error("Error checking access:", error);
    return res.status(500).json({ 
      message: "Failed to verify access. Please try again." 
    });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

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

  // Wallet connection routes
  app.get('/api/wallet/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getWalletConnection(userId);
      res.json(wallet || null);
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json({ message: "Failed to fetch wallet" });
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
        process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
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
          console.warn(`❌ Invalid signature for wallet ${walletAddress} by user ${userId}`);
          return res.status(403).json({
            message: "Invalid signature. Please sign the challenge message with the correct wallet."
          });
        }
        
        // SECURITY: Mark challenge as used to prevent replay
        await storage.markChallengeUsed(challenge.id);
        
        console.log(`✅ Wallet ownership verified: ${walletAddress} by user ${userId} using challenge ${challengeStr}`);
        
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
        
        console.log(`✅ Wallet verified: ${walletAddress} - ${balance.toLocaleString()} tokens (${decimals} decimals) - eligible: ${isEligible}`);
        
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
      
      console.log(`Whop webhook received: ${event.action}`);

      switch (event.action) {
        case 'payment.succeeded': {
          const payment = event.data;
          console.log(`Payment succeeded: ${payment.id}, membership: ${payment.membership}`);
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
            
            // CRITICAL: Protect lifetime subscriptions from being downgraded by Whop webhooks
            if (dbSubscription?.tier === 'lifetime') {
              console.log(`⚠️  Ignoring Whop webhook for user ${userId} - already has lifetime subscription`);
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
          
          console.log(`Membership went valid: ${whopMembershipId} for user ${userId}`);
          break;
        }
        
        case 'membership.went_invalid': {
          const membership = event.data;
          const whopMembershipId = membership.id;
          
          const dbSubscription = await storage.getSubscriptionByWhopId(whopMembershipId);
          
          // CRITICAL: Protect lifetime subscriptions from being expired by Whop webhooks
          if (dbSubscription?.tier === 'lifetime') {
            console.log(`⚠️  Ignoring Whop invalid webhook for lifetime subscription ${whopMembershipId}`);
            break;
          }
          
          if (dbSubscription) {
            await storage.updateSubscription(dbSubscription.id, {
              status: 'expired',
            });
          }
          
          console.log(`Membership went invalid: ${whopMembershipId}`);
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
  const cryptoPayments = await import('./crypto-payments');
  
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
  // PROTECTED: Requires active subscription OR 10M+ tokens
  app.get('/api/bot/invite-links', hasActiveAccess, async (req: any, res) => {
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
  
  const blacklist = await import('./ai-blacklist');
  
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
      
      // Get userId if authenticated
      const userId = (req as any).user?.claims?.sub;
      
      // Run AI blacklist analysis in background (don't block response)
      blacklist.analyzeAndFlag(analysis, userId).catch(err => {
        console.error("Background blacklist analysis error:", err);
      });
      
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
  // CREATOR WALLET ROUTES (Admin Only)
  // ========================================
  
  // Admin middleware - checks if user is authorized to manage creator wallet
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

  // GET /api/admin/creator-wallet - View creator wallet info (NO private key)
  app.get('/api/admin/creator-wallet', isAdmin, async (req, res) => {
    try {
      const { getCreatorWallet } = await import('./creator-wallet');
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
      const { CreatorWalletService } = await import('./creator-wallet');
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

  const httpServer = createServer(app);
  return httpServer;
}

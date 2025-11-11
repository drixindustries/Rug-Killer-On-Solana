import type { Express } from "express";
import { createServer, type Server } from "http";
import { analyzeTokenSchema } from "@shared/schema";
import { tokenAnalyzer } from "./solana-analyzer";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

function extractBillingPeriod(subscription: Stripe.Subscription): { start: Date; end: Date } {
  if (subscription.items.data.length === 0) {
    console.warn(`No subscription items found for subscription ${subscription.id}, using current_period_* fields`);
    return {
      start: new Date(subscription.current_period_start * 1000),
      end: new Date(subscription.current_period_end * 1000),
    };
  }

  if (subscription.items.data.length !== 1) {
    console.warn(`Unexpected subscription item count: ${subscription.items.data.length}. Expected 1 for single-tier subscription.`);
  }

  const firstItem = subscription.items.data[0];
  const billingPeriod = (firstItem as any).billing_period;

  if (billingPeriod?.start && billingPeriod?.end) {
    return {
      start: new Date(billingPeriod.start * 1000),
      end: new Date(billingPeriod.end * 1000),
    };
  }

  console.warn(`billing_period missing on subscription ${subscription.id}, using subscription current_period_* fields`);
  return {
    start: new Date(subscription.current_period_start * 1000),
    end: new Date(subscription.current_period_end * 1000),
  };
}

function mapStripeStatus(stripeStatus: string): 'active' | 'cancelled' | 'trial' {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trial';
    case 'canceled':
    case 'unpaid':
    case 'past_due':
      return 'cancelled';
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return 'cancelled';
    default:
      console.warn(`Unknown Stripe subscription status: ${stripeStatus}, treating as cancelled`);
      return 'cancelled';
  }
}

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
          status: "active",
          trialEndsAt,
          currentPeriodStart: new Date(),
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

  // Stripe subscription routes
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

      let stripeCustomerId = user.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
          },
        });
        stripeCustomerId = customer.id;
      }

      const priceId = tier === 'basic' 
        ? process.env.STRIPE_PRICE_ID_BASIC 
        : process.env.STRIPE_PRICE_ID_PREMIUM;

      if (!priceId) {
        return res.status(500).json({ 
          message: `Missing Stripe price ID for ${tier} tier. Please configure STRIPE_PRICE_ID_${tier.toUpperCase()} environment variable.` 
        });
      }

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/subscription?success=true`,
        cancel_url: `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/subscription?cancelled=true`,
        metadata: {
          userId: user.id,
          tier,
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            tier,
          },
        },
      });

      await storage.updateUserStripeInfo(userId, stripeCustomerId);

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Error creating subscription: " + error.message });
    }
  });

  app.post('/api/cancel-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }

      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      const subscription = await storage.getSubscription(userId);
      if (subscription) {
        await storage.updateSubscription(subscription.id, {
          status: 'cancelled',
        });
      }

      res.json({ message: "Subscription cancelled successfully" });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Error cancelling subscription: " + error.message });
    }
  });

  app.post('/api/stripe/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).send('Webhook signature missing');
    }

    try {
      const rawBody = (req as any).rawBody;
      if (!rawBody) {
        return res.status(400).send('Missing raw body for webhook verification');
      }

      const event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const tier = session.metadata?.tier as 'basic' | 'premium';

          if (userId && session.subscription) {
            const subscriptionId = typeof session.subscription === 'string' 
              ? session.subscription 
              : session.subscription.id;

            await storage.updateUserStripeInfo(
              userId,
              session.customer as string,
              subscriptionId
            );

            const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
            const periods = extractBillingPeriod(stripeSubscription);

            const mappedStatus = mapStripeStatus(stripeSubscription.status);
            
            const existingSubscription = await storage.getSubscription(userId);
            if (existingSubscription) {
              await storage.updateSubscription(existingSubscription.id, {
                tier: tier || 'basic',
                status: mappedStatus,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscriptionId,
                currentPeriodStart: periods.start,
                currentPeriodEnd: periods.end,
              });
            } else {
              await storage.createSubscription({
                userId,
                tier: tier || 'basic',
                status: mappedStatus,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscriptionId,
                currentPeriodStart: periods.start,
                currentPeriodEnd: periods.end,
              });
            }
          }
          break;
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata?.userId;
          const tier = subscription.metadata?.tier as 'basic' | 'premium';

          if (userId) {
            const periods = extractBillingPeriod(subscription);
            const mappedStatus = mapStripeStatus(subscription.status);

            const dbSubscription = await storage.getSubscription(userId);
            if (dbSubscription) {
              await storage.updateSubscription(dbSubscription.id, {
                tier: tier || dbSubscription.tier,
                status: mappedStatus,
                currentPeriodStart: periods.start,
                currentPeriodEnd: periods.end,
              });
            } else {
              await storage.createSubscription({
                userId,
                tier: tier || 'basic',
                status: mappedStatus,
                stripeCustomerId: subscription.customer as string,
                stripeSubscriptionId: subscription.id,
                currentPeriodStart: periods.start,
                currentPeriodEnd: periods.end,
              });
            }
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });

  // POST /api/analyze-token - Analyze a Solana token for rug pull risks
  app.post("/api/analyze-token", async (req, res) => {
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

      return res.json(analysis);
    } catch (error) {
      console.error("Token analysis error:", error);
      
      return res.status(500).json({
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

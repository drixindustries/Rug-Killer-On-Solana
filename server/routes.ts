import type { Express } from "express";
import { createServer, type Server } from "http";
import { analyzeTokenSchema } from "@shared/schema";
import { tokenAnalyzer } from "./solana-analyzer";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";

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

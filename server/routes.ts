import type { Express } from "express";
import { createServer, type Server } from "http";
import { analyzeTokenSchema } from "@shared/schema";
import { tokenAnalyzer } from "./solana-analyzer";

export async function registerRoutes(app: Express): Promise<Server> {
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

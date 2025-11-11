import { z } from "zod";

// Token Analysis Request
export const analyzeTokenSchema = z.object({
  tokenAddress: z.string().min(32).max(44),
});

export type AnalyzeTokenRequest = z.infer<typeof analyzeTokenSchema>;

// Risk Levels
export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "EXTREME";

// Authority Status
export interface AuthorityStatus {
  hasAuthority: boolean;
  authorityAddress: string | null;
  isRevoked: boolean;
}

// Holder Information
export interface HolderInfo {
  rank: number;
  address: string;
  balance: number;
  percentage: number;
}

// Transaction Info
export interface TransactionInfo {
  signature: string;
  type: "swap" | "transfer" | "mint" | "burn";
  timestamp: number;
  from?: string;
  to?: string;
  amount?: number;
  suspicious?: boolean;
}

// Liquidity Pool Status
export interface LiquidityPoolStatus {
  exists: boolean;
  isLocked: boolean;
  isBurned: boolean;
  totalLiquidity?: number;
  status: "SAFE" | "RISKY" | "UNKNOWN";
}

// Token Metadata
export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  logoUri?: string;
  hasMetadata: boolean;
  isMutable: boolean;
}

// Risk Flag
export interface RiskFlag {
  type: "mint_authority" | "freeze_authority" | "low_liquidity" | "holder_concentration" | "suspicious_transactions" | "mutable_metadata" | "recent_creation";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
}

// Complete Token Analysis Response
export interface TokenAnalysisResponse {
  tokenAddress: string;
  riskScore: number;
  riskLevel: RiskLevel;
  analyzedAt: number;
  
  // Authority checks
  mintAuthority: AuthorityStatus;
  freezeAuthority: AuthorityStatus;
  
  // Token info
  metadata: TokenMetadata;
  
  // Holder analysis
  holderCount: number;
  topHolders: HolderInfo[];
  topHolderConcentration: number;
  
  // Liquidity
  liquidityPool: LiquidityPoolStatus;
  
  // Transactions
  recentTransactions: TransactionInfo[];
  suspiciousActivityDetected: boolean;
  
  // Risk assessment
  redFlags: RiskFlag[];
  
  // Creation info
  creationDate?: number;
}

// Storage schema (not used for in-memory but kept for consistency)
export const tokenAnalysisSchema = z.object({
  tokenAddress: z.string(),
  riskScore: z.number(),
  riskLevel: z.enum(["LOW", "MODERATE", "HIGH", "EXTREME"]),
  analyzedAt: z.number(),
});

export type TokenAnalysis = z.infer<typeof tokenAnalysisSchema>;

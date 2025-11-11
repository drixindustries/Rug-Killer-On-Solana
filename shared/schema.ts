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

// Rugcheck Data
export interface RugcheckData {
  score: number;
  risks: string[];
  markets: Array<{
    name: string;
    liquidity: number;
    lpBurn: number;
  }>;
  topHolders: Array<{
    owner: string;
    pct: number;
  }>;
  fileMeta?: {
    error?: string;
  };
}

// GoPlus Security Data
export interface GoPlusSecurityData {
  is_mintable: string;
  is_freezable: string;
  is_scam: string;
  buy_tax: string;
  sell_tax: string;
  transfer_fee_enable: string;
  can_take_back_ownership: string;
  is_open_source: string;
  is_true_token: string;
  holder_count: string;
  total_supply: string;
  liquidity: string;
  securityRisks: string[];
}

// DexScreener Market Data
export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  priceNative: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
}

export interface DexScreenerData {
  pairs: DexScreenerPair[];
  schemaVersion: string;
}

// Jupiter Price Data
export interface JupiterPriceData {
  id: string;
  type: string;
  price: string;
  extraInfo?: {
    lastSwappedPrice?: {
      lastJupiterSellAt: number;
      lastJupiterSellPrice: string;
      lastJupiterBuyAt: number;
      lastJupiterBuyPrice: string;
    };
    quotedPrice?: {
      buyPrice: string;
      buyAt: number;
      sellPrice: string;
      sellAt: number;
    };
    confidenceLevel?: string;
  };
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
  
  // External API data
  rugcheckData?: RugcheckData;
  goplusData?: GoPlusSecurityData;
  dexscreenerData?: DexScreenerData;
  jupiterPriceData?: JupiterPriceData;
}

// Storage schema (not used for in-memory but kept for consistency)
export const tokenAnalysisSchema = z.object({
  tokenAddress: z.string(),
  riskScore: z.number(),
  riskLevel: z.enum(["LOW", "MODERATE", "HIGH", "EXTREME"]),
  analyzedAt: z.number(),
});

export type TokenAnalysis = z.infer<typeof tokenAnalysisSchema>;

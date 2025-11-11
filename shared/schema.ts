import { z } from "zod";
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  boolean,
  integer,
  bigint,
} from "drizzle-orm/pg-core";

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

// ============================================================================
// DATABASE TABLES (Replit Auth + Subscription System)
// ============================================================================

// Session storage table (required by Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required by Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id").unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tier: varchar("tier").notNull(), // "free_trial", "basic", "premium"
  status: varchar("status").notNull(), // "active", "cancelled", "expired"
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_subscriptions_user_id").on(table.userId),
  index("idx_subscriptions_status").on(table.status),
]);

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// Wallet connections table (for token-gated access)
export const walletConnections = pgTable("wallet_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  walletAddress: varchar("wallet_address").notNull().unique(),
  tokenBalance: bigint("token_balance", { mode: "number" }).notNull().default(0),
  lastVerifiedAt: timestamp("last_verified_at").defaultNow(),
  isEligible: boolean("is_eligible").notNull().default(false), // true if balance >= 10M tokens
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_wallet_user_id").on(table.userId),
  index("idx_wallet_eligible").on(table.isEligible),
]);

export type WalletConnection = typeof walletConnections.$inferSelect;
export type InsertWalletConnection = typeof walletConnections.$inferInsert;

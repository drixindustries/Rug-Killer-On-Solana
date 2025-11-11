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
  uniqueIndex,
  serial,
  decimal,
  text,
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
  whopUserId: varchar("whop_user_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Subscriptions table
// Maps to Whop memberships: status values align with Whop lifecycle (valid, past_due, cancelled, expired)
// currentPeriodEnd maps to Whop's valid_until timestamp
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tier: varchar("tier").notNull(), // "free_trial", "basic", "premium"
  status: varchar("status").notNull(), // Whop states: "valid", "past_due", "cancelled", "expired", "trialing"
  whopMembershipId: varchar("whop_membership_id").notNull().unique(), // Canonical Whop membership reference
  whopPlanId: varchar("whop_plan_id").notNull(), // Whop plan ID (e.g., "plan_xxxxx")
  trialEndsAt: timestamp("trial_ends_at"), // For free trial tracking
  currentPeriodEnd: timestamp("current_period_end").notNull(), // Maps to Whop's valid_until
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_subscriptions_user_id").on(table.userId),
  index("idx_subscriptions_status").on(table.status),
  index("idx_subscriptions_whop_membership").on(table.whopMembershipId),
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

// Wallet verification challenges table (prevents signature replay attacks)
export const walletChallenges = pgTable("wallet_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  challenge: varchar("challenge").notNull().unique(), // Random nonce
  expiresAt: timestamp("expires_at").notNull(), // Expires after 5 minutes
  usedAt: timestamp("used_at"), // null if unused, timestamp if consumed
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_challenge_user").on(table.userId),
  index("idx_challenge_expires").on(table.expiresAt),
]);

export type WalletChallenge = typeof walletChallenges.$inferSelect;
export type InsertWalletChallenge = typeof walletChallenges.$inferInsert;

// ============================================================================
// KOL (KEY OPINION LEADER) TRACKING
// ============================================================================

// KOL wallet tracking for cabal detection and influence analysis
export const kolWallets = pgTable("kol_wallets", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }),
  twitterHandle: varchar("twitter_handle", { length: 255 }),
  telegramHandle: varchar("telegram_handle", { length: 255 }),
  rank: integer("rank"),
  profitSol: decimal("profit_sol", { precision: 20, scale: 9 }),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  influenceScore: integer("influence_score").default(50), // 0-100, higher = more influential
  isVerified: boolean("is_verified").default(false),
  source: varchar("source", { length: 50 }).default("kolscan"), // kolscan, manual, etc
  notes: text("notes"),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_kol_wallet_address").on(table.walletAddress),
  index("idx_kol_rank").on(table.rank),
  index("idx_kol_influence").on(table.influenceScore),
]);

export type KolWallet = typeof kolWallets.$inferSelect;
export type InsertKolWallet = typeof kolWallets.$inferInsert;

// ============================================================================
// CRYPTO PAYMENTS TABLES
// ============================================================================

// Crypto payment addresses table
export const cryptoAddresses = pgTable("crypto_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chain: varchar("chain").notNull(), // "SOL", "ETH", "BTC"
  address: varchar("address").notNull().unique(), // UNIQUE: Each blockchain address can only be used once
  tier: varchar("tier").notNull(), // "basic", "premium"
  expiresAt: timestamp("expires_at").notNull(), // Payment address expires after 1 hour
  isPaid: boolean("is_paid").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crypto_addresses_user").on(table.userId),
  index("idx_crypto_addresses_chain").on(table.chain),
]);

export type CryptoAddress = typeof cryptoAddresses.$inferSelect;
export type InsertCryptoAddress = typeof cryptoAddresses.$inferInsert;

// Payments table - tracks all crypto payments
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cryptoAddressId: varchar("crypto_address_id").notNull().unique().references(() => cryptoAddresses.id), // UNIQUE: One payment per address
  chain: varchar("chain").notNull(), // "SOL", "ETH", "BTC"
  tier: varchar("tier").notNull(), // "basic", "premium"
  amountExpected: varchar("amount_expected").notNull(), // Expected amount in crypto (as string for precision)
  amountReceived: varchar("amount_received"), // Actual amount received
  txHash: varchar("tx_hash").unique(), // UNIQUE: Prevent duplicate blockchain transaction processing
  fromAddress: varchar("from_address"), // Sender address
  status: varchar("status").notNull().default("pending"), // "pending", "confirmed", "failed", "expired"
  confirmations: integer("confirmations").notNull().default(0),
  confirmedAt: timestamp("confirmed_at"),
  subscriptionActivatedAt: timestamp("subscription_activated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_payments_user").on(table.userId),
  index("idx_payments_status").on(table.status),
]);

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// Payment audit log - tracks all blockchain checks
export const paymentAudit = pgTable("payment_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
  checkType: varchar("check_type").notNull(), // "blockchain_scan", "confirmation_update", "status_change"
  details: jsonb("details"), // Store check results
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payment_audit_payment").on(table.paymentId),
]);

export type PaymentAudit = typeof paymentAudit.$inferSelect;
export type InsertPaymentAudit = typeof paymentAudit.$inferInsert;

// ============================================================================
// AI BLACKLIST TABLES
// ============================================================================

// Analysis runs - stores historical token analysis for ML training
export const analysisRuns = pgTable("analysis_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenAddress: varchar("token_address").notNull(),
  userId: varchar("user_id").references(() => users.id),
  riskScore: integer("risk_score").notNull(), // 0-100
  riskLevel: varchar("risk_level").notNull(), // "LOW", "MODERATE", "HIGH", "EXTREME"
  analysisData: jsonb("analysis_data").notNull(), // Full TokenAnalysisResponse
  rugDetected: boolean("rug_detected").default(false), // Manual flag for confirmed rugs
  userReported: boolean("user_reported").default(false), // User reported as rug
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_analysis_token").on(table.tokenAddress),
  index("idx_analysis_rug").on(table.rugDetected),
  index("idx_analysis_created").on(table.createdAt),
]);

export type AnalysisRun = typeof analysisRuns.$inferSelect;
export type InsertAnalysisRun = typeof analysisRuns.$inferInsert;

// Bad actor labels - blacklist database
export const badActorLabels = pgTable("bad_actor_labels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address").notNull().unique(),
  labelType: varchar("label_type").notNull(), // "rugger_dev", "scammer", "honeypot_creator", "wash_trader", "serial_rugger"
  severity: integer("severity").notNull(), // 0-100 (higher = more dangerous)
  rugCount: integer("rug_count").notNull().default(0), // Number of confirmed rugs
  totalVictims: integer("total_victims").default(0), // Estimated victims
  totalLosses: varchar("total_losses"), // Estimated SOL lost by victims
  evidenceData: jsonb("evidence_data"), // Store evidence/patterns
  detectionMethod: varchar("detection_method").notNull(), // "rules_engine", "ml_model", "manual_report", "community_vote"
  confidence: integer("confidence").notNull(), // 0-100 confidence score
  isActive: boolean("is_active").notNull().default(true), // Can be deactivated if false positive
  reviewedBy: varchar("reviewed_by"), // Admin user ID who reviewed
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bad_actors_wallet").on(table.walletAddress),
  index("idx_bad_actors_severity").on(table.severity),
  index("idx_bad_actors_active").on(table.isActive),
  index("idx_bad_actors_label_type").on(table.labelType),
]);

export type BadActorLabel = typeof badActorLabels.$inferSelect;
export type InsertBadActorLabel = typeof badActorLabels.$inferInsert;

// Bot configuration table
export const botConfig = pgTable("bot_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: varchar("platform").notNull(), // "telegram", "discord"
  platformUserId: varchar("platform_user_id").notNull(), // Telegram chat ID or Discord user ID
  platformUsername: varchar("platform_username"),
  isActive: boolean("is_active").notNull().default(true),
  alertsEnabled: boolean("alerts_enabled").notNull().default(true),
  minRiskLevel: varchar("min_risk_level").default("MODERATE"), // Only alert for HIGH and EXTREME by default
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bot_config_user").on(table.userId),
  index("idx_bot_config_platform").on(table.platform),
  uniqueIndex("unique_bot_platform_user").on(table.platform, table.platformUserId), // UNIQUE: Prevent duplicate bot registrations
]);

export type BotConfig = typeof botConfig.$inferSelect;
export type InsertBotConfig = typeof botConfig.$inferInsert;

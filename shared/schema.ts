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
  isLocked?: boolean; // Only set when burn data is available
  isBurned?: boolean; // Only set when burn data is available
  totalLiquidity?: number;
  status: "SAFE" | "RISKY" | "UNKNOWN";
  burnPercentage?: number; // Undefined = unknown, not 0%
  lpMintAddress?: string;
  lpReserve?: number;
  actualSupply?: number;
  lpAddresses?: string[];
  notBondedYet?: boolean; // True for Pump.fun tokens that haven't graduated to Raydium yet
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
  type: "mint_authority" | "freeze_authority" | "low_liquidity" | "holder_concentration" | "suspicious_transactions" | "mutable_metadata" | "recent_creation" | "honeypot" | "tax" | "liquidity_drain" | "bundle_manipulation" | "wallet_network";
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
    address: string;
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

// Holder Filtering Metadata
export interface FilteredAddress {
  address: string;
  type: 'lp' | 'exchange' | 'protocol' | 'bundled';
  label?: string;
  reason: string;
}

export interface HolderFilteringMetadata {
  totals: {
    lp: number;
    exchanges: number;
    protocols: number;
    bundled: number;
    total: number;
    // GMGN-style wallet classifications
    degens: number;
    bots: number;
    smartMoney: number;
    snipers: number;
    aged: number; // Wallets older than 6 months
    newWallets: number; // Wallets created in last 30 days
  };
  excluded: FilteredAddress[];
  walletIntelligence?: {
    avgWalletAge: number; // Average age in days
    oldestWallet: number; // Age of oldest wallet in days
    newestWallet: number; // Age of newest wallet in days
    ageDistribution: {
      veryNew: number; // < 7 days
      new: number; // 7-30 days
      recent: number; // 30-90 days
      established: number; // 90-365 days
      aged: number; // > 365 days
    };
    classifications: {
      degens: { count: number; supplyPercent: number; addresses: string[] };
      bots: { count: number; supplyPercent: number; addresses: string[] };
      smartMoney: { count: number; supplyPercent: number; addresses: string[] };
      snipers: { count: number; supplyPercent: number; addresses: string[] };
    };
  };
  bundledDetection?: {
    strategy: 'percentageMatch' | 'sameBlock' | 'fundingSource';
    confidence: 'low' | 'medium' | 'high';
    details?: string;
    bundleSupplyPct?: number; // % of total supply controlled by bundled wallets
    bundledSupplyAmount?: number; // Actual token amount held by bundled wallets
  };
}

// Complete Token Analysis Response
export interface MarketData {
  priceUsd: number | null;
  priceNative: number | null;
  marketCap: number | null;
  fdv: number | null;
  volume24h: number | null;
  priceChange24h: number | null;
  txns24h: { buys: number; sells: number } | null;
  liquidityUsd: number | null;
  source: 'dexscreener' | 'rugcheck' | null;
  pairAddress?: string | null;
  dexId?: string | null;
  updatedAt?: number | null;
}

// Birdeye Data
export interface BirdeyeData {
  price: number;
  mc: number;
  liquidity: number;
  v24hUSD: number;
  priceChange24hPercent: number;
  lpBurned: boolean;
  twitter?: string;
  telegram?: string;
  website?: string;
}

// Pump.fun Data
export interface PumpFunData {
  isPumpFun: boolean;
  devBought: number;
  bondingCurve: number;
  mayhemMode?: boolean; // When bonding curve is complete and king-of-hill mechanics active
  king?: {
    address: string;
    percentage: number;
  };
}

  // Floor Detection (Buy Support Levels)
  export interface FloorData {
    hasFloor: boolean;
    floorPrice: number | null; // Primary floor price in USD
    floorConfidence: number; // 0-100, confidence in floor detection
    supportLevels: Array<{
      priceUsd: number;
      buyVolume: number; // Total volume bought at this level
      buyCount: number; // Number of buys at this level
      percentOfTotalBuys: number; // % of total buy volume
    }>;
    currentPriceVsFloor: number | null; // % above/below floor (negative = below)
    insight: string; // Human-readable floor analysis
  }

// AI Verdict
export interface AIVerdict {
  rating: string;
  verdict: string;
}

// QuillCheck Data (Honeypot & Tax Detection)
export interface QuillCheckData {
  riskScore: number; // 0-100
  isHoneypot: boolean;
  buyTax: number;
  sellTax: number;
  canSell: boolean;
  liquidityRisk: boolean;
  risks: string[];
}

// Comprehensive Honeypot Detection (2025 Advanced Methods)
export interface HoneypotDetectionResult {
  grade: "SAFE" | "CAUTION" | "WARNING" | "DANGER" | "CRITICAL"; // A/B/C/D/F grading
  score: number; // 0-100 (0=safe, 100=definite honeypot)
  canBuy: boolean;
  canSell: boolean;
  canTransfer: boolean;
  
  // Tax Analysis
  taxes: {
    buyTax: number;
    sellTax: number;
    transferTax: number;
    isVariable: boolean; // Changes based on amount/time
    maxObservedTax: number;
  };
  
  // Detection Methods Passed/Failed
  detectionMethods: {
    basicSimulation: "PASS" | "FAIL" | "UNKNOWN";
    swapReversal: "PASS" | "FAIL" | "UNKNOWN";
    transferTest: "PASS" | "FAIL" | "UNKNOWN";
    multiRouterTest: "PASS" | "FAIL" | "UNKNOWN";
    timeLockTest: "PASS" | "FAIL" | "UNKNOWN";
    balanceThresholdTest: "PASS" | "FAIL" | "UNKNOWN";
    bundleTest: "PASS" | "FAIL" | "UNKNOWN";
  };
  
  // Detected Evasion Techniques
  evasionTechniques: Array<{
    id: number; // 1-20 from the list
    name: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
  }>;
  
  // Specific Risks Found
  risks: string[];
  warnings: string[];
  
  // Metadata
  lastChecked: number;
  confidence: number; // 0-100 (how sure we are)
}

// Advanced Bundle Detection Data (Jito Timing Analysis)
export interface BundleDetectionData {
  bundleScore: number; // 0-100
  bundledSupplyPercent: number; // % of supply in bundled wallets
  suspiciousWallets: string[]; // Wallet addresses involved in bundle
  earlyBuyCluster?: {
    avgTimingGapMs: number; // Average gap between buys in cluster
    walletCount: number;
  };
  risks: string[];
}

// Network Analysis Data (Bubblemaps)
export interface NetworkAnalysisData {
  networkRiskScore: number; // 0-100
  clusteredWallets: number; // Number of wallets in clusters
  connectedGroups: Array<{
    wallets: string[];
    totalSupplyPercent: number;
  }>;
  risks: string[];
}

// Whale Buy Detection Data
export interface WhaleBuy {
  wallet: string;
  timestamp: number;
  amountTokens: number;
  percentageOfSupply: number;
  priceUSD?: number;
  txSignature: string;
  isExchange: boolean;
}

export interface WhaleDetectionData {
  whaleCount: number;
  totalWhaleSupplyPercent: number;
  whaleBuys: WhaleBuy[];
  largestBuy: WhaleBuy | null;
  averageBuySize: number;
  risks: string[];
  insight?: string; // Smart insight message
}

// GMGN.AI Bundle & Insider Data
export interface GMGNData {
  isBundled: boolean;
  bundleWalletCount: number;
  bundleSupplyPercent: number;
  insiderCount: number;
  sniperCount: number;
  suspiciousWallets: string[];
  confidence: number; // 0-100
  smartMoneyActive: boolean; // True if smart traders are involved
}

// Aged Wallet Detection (Fake Volume)
export interface AgedWalletData {
  agedWalletCount: number;
  totalFakeVolumePercent: number;
  riskScore: number; // 0-100
  patterns: {
    sameFundingSource: boolean;
    similarAges: boolean;
    coordinatedBuys: boolean;
    noSells: boolean;
  };
  suspiciousWallets: Array<{
    wallet: string;
    walletAge: number; // Days
    hasOnlyBuys: boolean;
  }>;
  risks: string[];
}

// Pump & Dump Detection (NEW)
export interface PumpDumpPattern {
  type: 'rapid_pump' | 'instant_dump' | 'coordinated_selloff' | 'volume_manipulation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  description: string;
  evidence: {
    priceChange?: number;
    timeWindow?: string;
    volumeAnomaly?: number;
    sellPressure?: number;
  };
}

export interface PumpDumpData {
  isRugPull: boolean;
  rugConfidence: number; // 0-100
  patterns: PumpDumpPattern[];
  timeline: {
    pumpDetected: boolean;
    pumpPercentage?: number;
    dumpDetected: boolean;
    dumpPercentage?: number;
    timeToRug?: number; // Minutes from launch to dump
  };
  risks: string[];
}

// Liquidity Monitoring (NEW)
export interface LiquidityChange {
  type: 'sudden_drop' | 'gradual_drain' | 'lp_removal' | 'healthy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  evidence: {
    currentLiquidity: number;
    percentageChange?: number;
    timeWindow?: string;
  };
}

export interface LiquidityMonitorData {
  isHealthy: boolean;
  riskScore: number; // 0-100
  changes: LiquidityChange[];
  currentLiquidity: number;
  liquidityTrend: 'stable' | 'increasing' | 'decreasing' | 'critical_drop';
  liquidityToMcapRatio?: {
    ratio: number;
    health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    description: string;
  };
  risks: string[];
}

// Top Holder Tracking (NEW)
export interface HolderActivity {
  wallet: string;
  rank: number;
  supplyPercent: number;
  activityType: 'selling' | 'buying' | 'holding' | 'unknown';
  recentTransactions: number;
  sellVolume?: number;
  buyVolume?: number;
}

export interface CoordinatedSelloff {
  detected: boolean;
  sellersCount: number;
  combinedSupplyPercent: number;
  timeWindow: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
}

export interface HolderTrackingData {
  coordinatedSelloff: CoordinatedSelloff | null;
  suspiciousActivities: HolderActivity[];
  topHolderStability: 'stable' | 'volatile' | 'mass_exodus';
  risks: string[];
}

// Funding Source Analysis (NEW)
export interface WalletFunding {
  wallet: string;
  fundingSource: string | null;
  fundingSourceType: 'exchange' | 'swap' | 'bridge' | 'dex' | 'unknown';
  riskLevel: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK' | 'UNKNOWN';
  fundingAmount?: number;
  fundingTime?: number;
  isRecentlyCreated: boolean;
}

export interface FundingPattern {
  type: 'coordinated_funding' | 'fresh_wallet_funding' | 'single_source_dominance' | 'swap_service_cluster';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  evidence: {
    fundingSource?: string;
    walletCount?: number;
    totalPercentage?: number;
    avgWalletAge?: number;
  };
}

export interface FundingAnalysisData {
  suspiciousFunding: boolean;
  totalSuspiciousPercentage: number;
  fundingPatterns: FundingPattern[];
  walletFunding: WalletFunding[];
  fundingSourceBreakdown: Record<string, number>;
  risks: string[];
}

// Detailed Rug Score Breakdown (professional-grade like Rugcheck.xyz)
export interface RugScoreBreakdown {
  totalScore: number; // 0-100+ (lower = safer, higher = more dangerous)
  classification: "SAFE" | "WARNING" | "DANGER"; // <10 = Safe, 10-50 = Warning, >50 = Danger
  components: {
    authorities: {
      score: number;
      mintAuthority: number; // 0-80 points
      freezeAuthority: number; // 0-40 points
      metadataMutable: number; // 0-30 points
      permanentDelegate: number; // 0-15 points
    };
    holderDistribution: {
      score: number;
      topHolderPercent: number; // 0-80 points (scaled by %)
      top10Concentration: number; // 0-90 points
      top100Concentration: number; // 0-20 points
      holderCount: number; // 0-10 points (inverse: fewer = worse)
    };
    liquidity: {
      score: number;
      lpLocked: number; // 0-40 points (unlocked = full)
      lpAmount: number; // 0-30 points (low liq = high score)
      lpOwnership: number; // 0-15 points (dev owns LP)
    };
    taxesAndFees: {
      score: number;
      buyTax: number; // 0-20 points
      sellTax: number; // 0-20 points
      honeypot: number; // 0-50 points (can't sell = max)
    };
    marketActivity: {
      score: number;
      washTrading: number; // 0-15 points (extreme vol/MC)
      sellPressure: number; // 0-10 points (>70% sells)
      lowHoldersForMC: number; // 0-10 points
    };
    tokenAge: {
      score: number;
      ageBonus: number; // 0-10 points (very new = penalty)
    };
  };
  breakdown: string[]; // Human-readable list of issues
}

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
  holderFiltering: HolderFilteringMetadata;
  
  // Liquidity
  liquidityPool: LiquidityPoolStatus;
  
  // Market data (normalized from DexScreener/Rugcheck)
  marketData?: MarketData;
  
  // Transactions
  recentTransactions: TransactionInfo[];
  suspiciousActivityDetected: boolean;
  
  // Risk assessment
  redFlags: RiskFlag[];
  rugScoreBreakdown?: RugScoreBreakdown; // NEW: Detailed rug score like Rugcheck.xyz
  
  // Creation info
  creationDate?: number;
  
  // AI-powered analysis
  aiVerdict?: AIVerdict;
  pumpFunData?: PumpFunData;
  birdeyeData?: BirdeyeData;
    floorData?: FloorData;
  
  // External API data (raw for debugging)
  rugcheckData?: RugcheckData;
  goplusData?: GoPlusSecurityData;
  dexscreenerData?: DexScreenerData;
  jupiterPriceData?: JupiterPriceData;
  
  // Advanced rug detection (2025)
  quillcheckData?: QuillCheckData;
  honeypotDetection?: HoneypotDetectionResult; // NEW: Comprehensive honeypot grading system
  advancedBundleData?: BundleDetectionData;
  networkAnalysis?: NetworkAnalysisData;
  whaleDetection?: WhaleDetectionData;
  gmgnData?: GMGNData; // GMGN.AI bundle & insider detection
  agedWalletData?: AgedWalletData; // Aged wallet fake volume detection
  pumpDumpData?: PumpDumpData; // Pump & dump pattern detection
  liquidityMonitor?: LiquidityMonitorData; // Real-time liquidity tracking
  holderTracking?: HolderTrackingData; // Top holder sell-off detection
  fundingAnalysis?: FundingAnalysisData; // Wallet funding source analysis
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
// DATABASE TABLES (Wallet Auth + Subscription System)
// ============================================================================

// Session storage table (required by express-session)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (wallet-based authentication)
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
  tier: varchar("tier").notNull(), // "free_trial", "individual", "group"
  status: varchar("status").notNull(), // Whop states: "valid", "past_due", "cancelled", "expired", "trialing"
  whopMembershipId: varchar("whop_membership_id").unique(), // Canonical Whop membership reference (nullable for free trials)
  whopPlanId: varchar("whop_plan_id"), // Whop plan ID (nullable for free trials)
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

// Subscription codes table (for lifetime access codes)
export const subscriptionCodes = pgTable("subscription_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  tier: varchar("tier").notNull(), // "lifetime", "individual", "group"
  maxUses: integer("max_uses").default(1), // null for unlimited
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"), // null for no expiration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_code").on(table.code),
  index("idx_code_active").on(table.isActive),
]);

export type SubscriptionCode = typeof subscriptionCodes.$inferSelect;
export type InsertSubscriptionCode = typeof subscriptionCodes.$inferInsert;

// Code redemptions table (tracks who redeemed which codes)
export const codeRedemptions = pgTable("code_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeId: varchar("code_id").notNull().references(() => subscriptionCodes.id),
  code: varchar("code").notNull(), // Denormalized for easier lookups
  redeemedAt: timestamp("redeemed_at").defaultNow(),
}, (table) => [
  index("idx_redemption_user").on(table.userId),
  index("idx_redemption_code").on(table.codeId),
]);

export type CodeRedemption = typeof codeRedemptions.$inferSelect;
export type InsertCodeRedemption = typeof codeRedemptions.$inferInsert;

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
// INFLUENTIAL WALLET TRACKING
// ============================================================================

// Smart money wallet tracking for coordinated activity detection and influence analysis
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

// ----------------------------------------------------------------------------
// SMART MONEY TABLES (separate from KOL)
// ----------------------------------------------------------------------------

export const smartWallets = pgTable("smart_wallets", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }),
  source: varchar("source", { length: 50 }).default("gmgn"),
  profitSol: decimal("profit_sol", { precision: 20, scale: 9 }),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  winRate: integer("win_rate").default(0), // 0-100 percentage
  influenceScore: integer("influence_score").default(50), // 0-100
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_smart_wallet_address").on(table.walletAddress),
  index("idx_smart_influence").on(table.influenceScore),
  index("idx_smart_active").on(table.isActive),
]);

export type SmartWallet = typeof smartWallets.$inferSelect;
export type InsertSmartWallet = typeof smartWallets.$inferInsert;

export const smartSignals = pgTable("smart_signals", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 255 }).notNull(),
  tokenAddress: varchar("token_address", { length: 44 }).notNull(),
  action: varchar("action", { length: 10 }).notNull().default("buy"), // 'buy' | 'sell'
  amountTokens: decimal("amount_tokens", { precision: 38, scale: 12 }),
  priceUsd: decimal("price_usd", { precision: 24, scale: 8 }),
  txSignature: varchar("tx_signature", { length: 120 }).unique(),
  confidence: integer("confidence").default(80), // 0-100
  source: varchar("source", { length: 50 }).default("alpha-alerts"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_smart_signals_token").on(table.tokenAddress),
  index("idx_smart_signals_detected").on(table.detectedAt),
]);

export type SmartSignal = typeof smartSignals.$inferSelect;
export type InsertSmartSignal = typeof smartSignals.$inferInsert;

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

// ============================================================================
// USER FEATURES TABLES (Option B: Watchlist, Portfolio, Alerts)
// ============================================================================

// Watchlist entries - users save tokens to track
export const watchlistEntries = pgTable("watchlist_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenAddress: varchar("token_address", { length: 44 }).notNull(),
  label: varchar("label", { length: 120 }), // Optional user label/note
  metadata: jsonb("metadata"), // Cached token name, symbol for quick display
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_watchlist_user").on(table.userId),
  uniqueIndex("unique_watchlist_user_token").on(table.userId, table.tokenAddress),
]);

export type WatchlistEntry = typeof watchlistEntries.$inferSelect;
export type InsertWatchlistEntry = typeof watchlistEntries.$inferInsert;

// Portfolio positions - aggregated holdings per token
export const portfolioPositions = pgTable("portfolio_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenAddress: varchar("token_address", { length: 44 }).notNull(),
  quantity: decimal("quantity", { precision: 38, scale: 12 }).notNull(),
  avgCostUsd: decimal("avg_cost_usd", { precision: 24, scale: 8 }), // Average purchase price
  realizedPnlUsd: decimal("realized_pnl_usd", { precision: 24, scale: 8 }).default("0"),
  latestPriceUsd: decimal("latest_price_usd", { precision: 24, scale: 8 }), // Cached from price worker
  unrealizedPnlUsd: decimal("unrealized_pnl_usd", { precision: 24, scale: 8 }), // Cached calculation
  pnlPct: decimal("pnl_pct", { precision: 10, scale: 4 }), // Percentage gain/loss
  lastRebalancedAt: timestamp("last_rebalanced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_portfolio_user").on(table.userId),
  uniqueIndex("unique_portfolio_user_token").on(table.userId, table.tokenAddress),
]);

export type PortfolioPosition = typeof portfolioPositions.$inferSelect;
export type InsertPortfolioPosition = typeof portfolioPositions.$inferInsert;

// Portfolio transactions - detailed transaction history
export const portfolioTransactions = pgTable("portfolio_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  positionId: varchar("position_id").notNull().references(() => portfolioPositions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Redundant for filtering
  txType: varchar("tx_type").notNull(), // "buy", "sell", "airdrop", "manual_adjust"
  quantity: decimal("quantity", { precision: 38, scale: 12 }).notNull(),
  priceUsd: decimal("price_usd", { precision: 24, scale: 8 }),
  feeUsd: decimal("fee_usd", { precision: 24, scale: 8 }).default("0"),
  note: text("note"), // User notes
  executedAt: timestamp("executed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_transaction_user_date").on(table.userId, table.executedAt),
  index("idx_transaction_position_date").on(table.positionId, table.executedAt),
]);

export type PortfolioTransaction = typeof portfolioTransactions.$inferSelect;
export type InsertPortfolioTransaction = typeof portfolioTransactions.$inferInsert;

// Price alerts - user-configured price notifications
export const priceAlerts = pgTable("price_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenAddress: varchar("token_address", { length: 44 }).notNull(),
  alertType: varchar("alert_type").notNull(), // "price_above", "price_below", "percent_change", "percent_drop"
  targetValue: decimal("target_value", { precision: 24, scale: 8 }).notNull(), // Price threshold or percentage
  lookbackWindowMinutes: integer("lookback_window_minutes"), // For percent_change/percent_drop
  isActive: boolean("is_active").notNull().default(true),
  lastPrice: decimal("last_price", { precision: 24, scale: 8 }), // Last checked price
  triggeredAt: timestamp("triggered_at"), // When alert fired
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_alerts_active_scan").on(table.isActive, table.alertType, table.tokenAddress),
  index("idx_alerts_user_status").on(table.userId, table.isActive),
  uniqueIndex("unique_alert_config").on(table.userId, table.tokenAddress, table.alertType, table.targetValue),
]);

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;

// Zod schemas for validation
export const insertWatchlistSchema = z.object({
  tokenAddress: z.string().min(32).max(44),
  label: z.string().max(120).optional(),
});

export const insertPortfolioPositionSchema = z.object({
  tokenAddress: z.string().min(32).max(44),
  quantity: z.string().or(z.number()),
  avgCostUsd: z.string().or(z.number()).optional(),
});

export const insertPortfolioTransactionSchema = z.object({
  tokenAddress: z.string().min(32).max(44), // Will be used to find position
  txType: z.enum(["buy", "sell", "airdrop", "manual_adjust"]),
  quantity: z.string().or(z.number()),
  priceUsd: z.string().or(z.number()).optional(),
  feeUsd: z.string().or(z.number()).optional(),
  note: z.string().optional(),
  executedAt: z.string().or(z.date()).optional(), // ISO string or Date
});

export const insertPriceAlertSchema = z.object({
  tokenAddress: z.string().min(32).max(44),
  alertType: z.enum(["price_above", "price_below", "percent_change", "percent_drop"]),
  targetValue: z.string().or(z.number()),
  lookbackWindowMinutes: z.number().int().positive().optional(),
});

export type InsertWatchlistRequest = z.infer<typeof insertWatchlistSchema>;
export type InsertPortfolioPositionRequest = z.infer<typeof insertPortfolioPositionSchema>;
export type InsertPortfolioTransactionRequest = z.infer<typeof insertPortfolioTransactionSchema>;
export type InsertPriceAlertRequest = z.infer<typeof insertPriceAlertSchema>;

// ============================================================================
// ANALYTICS TABLES (Option C: Advanced Analytics Dashboard)
// ============================================================================

// Token snapshots - historical data points for trend analysis
export const tokenSnapshots = pgTable("token_snapshots", {
  id: serial("id").primaryKey(),
  tokenAddress: varchar("token_address", { length: 44 }).notNull(),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
  priceUsd: decimal("price_usd", { precision: 20, scale: 8 }),
  riskScore: integer("risk_score").notNull(),
  holderCount: integer("holder_count"),
  volume24h: decimal("volume_24h", { precision: 20, scale: 2 }),
  liquidityUsd: decimal("liquidity_usd", { precision: 20, scale: 2 }),
  riskFlags: jsonb("risk_flags").$type<string[]>(), // Array of risk flag types
  txCount24h: integer("tx_count_24h"),
  analyzerVersion: varchar("analyzer_version", { length: 10 }).default("1.0"),
}, (table) => [
  index("idx_snapshots_token").on(table.tokenAddress),
  index("idx_snapshots_captured").on(table.capturedAt),
  index("idx_snapshots_token_time").on(table.tokenAddress, table.capturedAt),
]);

export type TokenSnapshot = typeof tokenSnapshots.$inferSelect;
export type InsertTokenSnapshot = typeof tokenSnapshots.$inferInsert;

// Trending tokens - calculated scores for hot/trending analysis
export const trendingTokens = pgTable("trending_tokens", {
  tokenAddress: varchar("token_address", { length: 44 }).primaryKey(),
  score: decimal("score", { precision: 10, scale: 2 }).notNull(),
  scoreBreakdown: jsonb("score_breakdown").$type<{
    volumeScore: number;
    velocityScore: number;
    analysisScore: number;
  }>().notNull(),
  rank: integer("rank").notNull(),
  volume24h: decimal("volume_24h", { precision: 20, scale: 2 }),
  velocity: decimal("velocity", { precision: 10, scale: 2 }), // Rate of change
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_trending_rank").on(table.rank),
  index("idx_trending_score").on(table.score),
  index("idx_trending_updated").on(table.updatedAt),
]);

export type TrendingToken = typeof trendingTokens.$inferSelect;
export type InsertTrendingToken = typeof trendingTokens.$inferInsert;

// Risk statistics - aggregated risk data for dashboard insights
export const riskStatistics = pgTable("risk_statistics", {
  id: serial("id").primaryKey(),
  windowStart: timestamp("window_start").notNull(),
  windowEnd: timestamp("window_end").notNull(),
  totalAnalyzed: integer("total_analyzed").notNull().default(0),
  rugDetected: integer("rug_detected").notNull().default(0),
  falsePositives: integer("false_positives").notNull().default(0),
  commonFlags: jsonb("common_flags").$type<Record<string, number>>().notNull(), // { "mint_authority": 42, ... }
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_risk_stats_window").on(table.windowStart, table.windowEnd),
  index("idx_risk_stats_updated").on(table.updatedAt),
]);

export type RiskStatistic = typeof riskStatistics.$inferSelect;
export type InsertRiskStatistic = typeof riskStatistics.$inferInsert;

// Zod schemas for analytics
export const insertTokenSnapshotSchema = z.object({
  tokenAddress: z.string().min(32).max(44),
  priceUsd: z.string().or(z.number()).optional(),
  riskScore: z.number().int().min(0).max(100),
  holderCount: z.number().int().optional(),
  volume24h: z.string().or(z.number()).optional(),
  liquidityUsd: z.string().or(z.number()).optional(),
  riskFlags: z.array(z.string()).optional(),
  txCount24h: z.number().int().optional(),
  analyzerVersion: z.string().max(10).optional(),
});

export const insertTrendingTokenSchema = z.object({
  tokenAddress: z.string().min(32).max(44),
  score: z.string().or(z.number()),
  scoreBreakdown: z.object({
    volumeScore: z.number(),
    velocityScore: z.number(),
    analysisScore: z.number(),
  }),
  rank: z.number().int(),
  volume24h: z.string().or(z.number()).optional(),
  velocity: z.string().or(z.number()).optional(),
});

export const insertRiskStatisticSchema = z.object({
  windowStart: z.string().or(z.date()),
  windowEnd: z.string().or(z.date()),
  totalAnalyzed: z.number().int(),
  rugDetected: z.number().int(),
  falsePositives: z.number().int(),
  commonFlags: z.record(z.number()),
});

export type InsertTokenSnapshotRequest = z.infer<typeof insertTokenSnapshotSchema>;
export type InsertTrendingTokenRequest = z.infer<typeof insertTrendingTokenSchema>;
export type InsertRiskStatisticRequest = z.infer<typeof insertRiskStatisticSchema>;

// ============================================================================
// SOCIAL FEATURES TABLES (Option D: Community Features)
// ============================================================================

// User profiles - extended user information for social features
export const userProfiles = pgTable("user_profiles", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  username: varchar("username", { length: 50 }).unique(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  reputationScore: integer("reputation_score").notNull().default(0),
  contributionCount: integer("contribution_count").notNull().default(0),
  visibility: varchar("visibility", { length: 20 }).notNull().default("public"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_profiles_reputation").on(table.reputationScore),
  index("idx_user_profiles_username").on(table.username),
]);

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// Token comments - user comments and ratings on tokens
export const tokenComments = pgTable("token_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenAddress: varchar("token_address", { length: 44 }).notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commentText: text("comment_text").notNull(),
  rating: integer("rating"), // 1-5 stars, nullable
  upvoteCount: integer("upvote_count").notNull().default(0),
  downvoteCount: integer("downvote_count").notNull().default(0),
  flagged: boolean("flagged").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_token_comments_token").on(table.tokenAddress),
  index("idx_token_comments_user").on(table.userId),
  index("idx_token_comments_created").on(table.createdAt),
]);

export type TokenComment = typeof tokenComments.$inferSelect;
export type InsertTokenComment = typeof tokenComments.$inferInsert;

// Comment votes - upvote/downvote tracking for comments
export const commentVotes = pgTable("comment_votes", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commentId: varchar("comment_id").notNull().references(() => tokenComments.id, { onDelete: "cascade" }),
  voteType: varchar("vote_type", { length: 10 }).notNull(), // 'up' or 'down'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("unique_comment_vote").on(table.userId, table.commentId),
  index("idx_comment_votes_comment").on(table.commentId),
]);

export type CommentVote = typeof commentVotes.$inferSelect;
export type InsertCommentVote = typeof commentVotes.$inferInsert;

// Community votes - user votes on token safety (safe/risky/scam)
export const communityVotes = pgTable("community_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenAddress: varchar("token_address", { length: 44 }).notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  voteType: varchar("vote_type", { length: 10 }).notNull(), // 'safe', 'risky', 'scam'
  confidence: integer("confidence").notNull(), // 1-5
  reason: text("reason"),
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull().default("1.0"), // Reputation-based weighting
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("unique_community_vote").on(table.tokenAddress, table.userId),
  index("idx_community_votes_token").on(table.tokenAddress),
  index("idx_community_votes_user").on(table.userId),
]);

export type CommunityVote = typeof communityVotes.$inferSelect;
export type InsertCommunityVote = typeof communityVotes.$inferInsert;

// Community vote summaries - aggregated consensus for each token
export const communityVoteSummaries = pgTable("community_vote_summaries", {
  tokenAddress: varchar("token_address", { length: 44 }).primaryKey(),
  safeWeight: decimal("safe_weight", { precision: 20, scale: 2 }).notNull().default("0"),
  riskyWeight: decimal("risky_weight", { precision: 20, scale: 2 }).notNull().default("0"),
  scamWeight: decimal("scam_weight", { precision: 20, scale: 2 }).notNull().default("0"),
  totalVotes: integer("total_votes").notNull().default(0),
  consensus: varchar("consensus", { length: 10 }), // 'safe', 'risky', 'scam', 'mixed'
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_community_vote_summaries_consensus").on(table.consensus),
]);

export type CommunityVoteSummary = typeof communityVoteSummaries.$inferSelect;
export type InsertCommunityVoteSummary = typeof communityVoteSummaries.$inferInsert;

// Shared watchlists - public watchlists that users can share and follow
export const sharedWatchlists = pgTable("shared_watchlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false),
  shareSlug: varchar("share_slug", { length: 20 }).notNull().unique(),
  followersCount: integer("followers_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_shared_watchlists_owner").on(table.ownerId),
  index("idx_shared_watchlists_public").on(table.isPublic),
  index("idx_shared_watchlists_slug").on(table.shareSlug),
]);

export type SharedWatchlist = typeof sharedWatchlists.$inferSelect;
export type InsertSharedWatchlist = typeof sharedWatchlists.$inferInsert;

// Watchlist followers - tracks who follows which shared watchlists
export const watchlistFollowers = pgTable("watchlist_followers", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  watchlistId: varchar("watchlist_id").notNull().references(() => sharedWatchlists.id, { onDelete: "cascade" }),
  followedAt: timestamp("followed_at").defaultNow(),
}, (table) => [
  uniqueIndex("unique_watchlist_follower").on(table.userId, table.watchlistId),
  index("idx_watchlist_followers_user").on(table.userId),
  index("idx_watchlist_followers_watchlist").on(table.watchlistId),
]);

export type WatchlistFollower = typeof watchlistFollowers.$inferSelect;
export type InsertWatchlistFollower = typeof watchlistFollowers.$inferInsert;

// Token reports - user-submitted rug pull reports
export const tokenReports = pgTable("token_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenAddress: varchar("token_address", { length: 44 }).notNull(),
  reporterId: varchar("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportType: varchar("report_type", { length: 20 }).notNull(), // 'scam', 'honeypot', 'soft_rug', 'other'
  evidence: text("evidence").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'under_review', 'verified', 'dismissed'
  reviewerId: varchar("reviewer_id").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  severityScore: integer("severity_score"), // 1-5
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_token_reports_token").on(table.tokenAddress),
  index("idx_token_reports_reporter").on(table.reporterId),
  index("idx_token_reports_status").on(table.status),
]);

export type TokenReport = typeof tokenReports.$inferSelect;
export type InsertTokenReport = typeof tokenReports.$inferInsert;

// User activities - tracks all user actions for reputation calculation
export const userActivities = pgTable("user_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  activityType: varchar("activity_type", { length: 20 }).notNull(), // 'comment', 'vote', 'report', 'helpful_vote', 'watchlist_share', 'follow'
  targetToken: varchar("target_token", { length: 44 }),
  targetWatchlist: varchar("target_watchlist"),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_activities_user").on(table.userId),
  index("idx_user_activities_created").on(table.createdAt),
  index("idx_user_activities_type").on(table.activityType),
]);

export type UserActivity = typeof userActivities.$inferSelect;
export type InsertUserActivity = typeof userActivities.$inferInsert;

// ============================================================================
// ALERT DESTINATIONS (Discord/Telegram group configurable channels)
// ============================================================================

export const alphaAlertTargets = pgTable("alpha_alert_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: varchar("platform", { length: 20 }).notNull(), // 'discord' | 'telegram'
  groupId: varchar("group_id", { length: 64 }).notNull(), // Discord guildId or Telegram chatId
  channelId: varchar("channel_id", { length: 64 }).notNull(), // Discord channelId or Telegram chatId (same as group for TG)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("unique_alpha_target").on(table.platform, table.groupId),
  index("idx_alpha_target_platform").on(table.platform),
]);

export type AlphaAlertTarget = typeof alphaAlertTargets.$inferSelect;
export type InsertAlphaAlertTarget = typeof alphaAlertTargets.$inferInsert;

// Separate routing for Smart Money Calls (top profitable wallet buys)
export const smartAlertTargets = pgTable("smart_alert_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: varchar("platform", { length: 20 }).notNull(), // 'discord' | 'telegram'
  groupId: varchar("group_id", { length: 64 }).notNull(), // Discord guildId or Telegram chatId
  channelId: varchar("channel_id", { length: 64 }).notNull(), // Discord channelId or Telegram chatId (same as group for TG)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("unique_smart_target").on(table.platform, table.groupId),
  index("idx_smart_target_platform").on(table.platform),
]);

export type SmartAlertTarget = typeof smartAlertTargets.$inferSelect;
export type InsertSmartAlertTarget = typeof smartAlertTargets.$inferInsert;

// Zod schemas for social features using createInsertSchema
import { createInsertSchema } from "drizzle-zod";

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ 
  createdAt: true 
}).extend({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  bio: z.string().max(500).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
});

export const insertTokenCommentSchema = createInsertSchema(tokenComments).omit({
  id: true,
  createdAt: true,
  upvoteCount: true,
  downvoteCount: true,
  flagged: true,
}).extend({
  tokenAddress: z.string().min(32).max(44),
  commentText: z.string().min(1).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
});

export const insertCommentVoteSchema = createInsertSchema(commentVotes).omit({
  createdAt: true,
}).extend({
  voteType: z.enum(["up", "down"]),
});

export const insertCommunityVoteSchema = createInsertSchema(communityVotes).omit({
  id: true,
  createdAt: true,
  weight: true,
}).extend({
  tokenAddress: z.string().min(32).max(44),
  voteType: z.enum(["safe", "risky", "scam"]),
  confidence: z.number().int().min(1).max(5),
  reason: z.string().max(1000).optional(),
});

export const insertSharedWatchlistSchema = createInsertSchema(sharedWatchlists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  shareSlug: true,
  followersCount: true,
}).extend({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export const insertTokenReportSchema = createInsertSchema(tokenReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  reviewerId: true,
  resolutionNotes: true,
}).extend({
  tokenAddress: z.string().min(32).max(44),
  reportType: z.enum(["scam", "honeypot", "soft_rug", "other"]),
  evidence: z.string().min(10).max(5000),
  severityScore: z.number().int().min(1).max(5).optional(),
});

export const insertUserActivitySchema = createInsertSchema(userActivities).omit({
  id: true,
  createdAt: true,
}).extend({
  activityType: z.enum(["comment", "vote", "report", "helpful_vote", "watchlist_share", "follow"]),
  points: z.number().int(),
});

export type InsertUserProfileRequest = z.infer<typeof insertUserProfileSchema>;
export type InsertTokenCommentRequest = z.infer<typeof insertTokenCommentSchema>;
export type InsertCommentVoteRequest = z.infer<typeof insertCommentVoteSchema>;
export type InsertCommunityVoteRequest = z.infer<typeof insertCommunityVoteSchema>;
export type InsertSharedWatchlistRequest = z.infer<typeof insertSharedWatchlistSchema>;
export type InsertTokenReportRequest = z.infer<typeof insertTokenReportSchema>;
export type InsertUserActivityRequest = z.infer<typeof insertUserActivitySchema>;

// ============================================================================
// LIVE SCAN HISTORY (Pump.fun Webhook)
// ============================================================================

export const scanHistory = pgTable("scan_history", {
  id: serial("id").primaryKey(),
  tokenAddress: varchar("token_address", { length: 44 }).notNull(),
  symbol: varchar("symbol", { length: 50 }).notNull(),
  name: varchar("name", { length: 200 }),
  riskScore: integer("risk_score").notNull(),
  riskLevel: varchar("risk_level", { length: 20 }).notNull(),
  grade: varchar("grade", { length: 20 }), // Diamond, Gold, Silver, Bronze, Red Flag
  whaleCount: integer("whale_count").default(0),
  bundleScore: integer("bundle_score"),
  honeypotDetected: boolean("honeypot_detected").default(false),
  analysisData: jsonb("analysis_data"), // Full TokenAnalysisResponse
  insight: text("insight"), // Smart professional insight
  chartUrl: text("chart_url"), // Base64 chart image
  source: varchar("source", { length: 50 }).default("pumpfun"), // pumpfun, manual, api
  scannedAt: timestamp("scanned_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenAddressIdx: index("scan_history_token_address_idx").on(table.tokenAddress),
  scannedAtIdx: index("scan_history_scanned_at_idx").on(table.scannedAt),
  riskScoreIdx: index("scan_history_risk_score_idx").on(table.riskScore),
  sourceIdx: index("scan_history_source_idx").on(table.source),
}));

export type ScanHistory = typeof scanHistory.$inferSelect;
export type InsertScanHistory = typeof scanHistory.$inferInsert;

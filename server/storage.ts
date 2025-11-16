import {
  users,
  subscriptions,
  subscriptionCodes,
  codeRedemptions,
  walletConnections,
  walletChallenges,
  kolWallets,
  watchlistEntries,
  portfolioPositions,
  portfolioTransactions,
  priceAlerts,
  tokenSnapshots,
  trendingTokens,
  riskStatistics,
  userProfiles,
  tokenComments,
  commentVotes,
  communityVotes,
  communityVoteSummaries,
  sharedWatchlists,
  watchlistFollowers,
  tokenReports,
  userActivities,
  type User,
  type UpsertUser,
  type SubscriptionCode,
  type InsertSubscriptionCode,
  type CodeRedemption,
  type InsertCodeRedemption,
  type Subscription,
  type InsertSubscription,
  type WalletConnection,
  type InsertWalletConnection,
  type WalletChallenge,
  type InsertWalletChallenge,
  type KolWallet,
  type WatchlistEntry,
  type InsertWatchlistEntry,
  type PortfolioPosition,
  type InsertPortfolioPosition,
  type PortfolioTransaction,
  type InsertPortfolioTransaction,
  type PriceAlert,
  type InsertPriceAlert,
  type TokenSnapshot,
  type InsertTokenSnapshot,
  type TrendingToken,
  type InsertTrendingToken,
  type RiskStatistic,
  type InsertRiskStatistic,
  type UserProfile,
  type InsertUserProfile,
  type TokenComment,
  type InsertTokenComment,
  type CommentVote,
  type InsertCommentVote,
  type CommunityVote,
  type InsertCommunityVote,
  type CommunityVoteSummary,
  type InsertCommunityVoteSummary,
  type SharedWatchlist,
  type InsertSharedWatchlist,
  type WatchlistFollower,
  type InsertWatchlistFollower,
  type TokenReport,
  type InsertTokenReport,
  type UserActivity,
  type InsertUserActivity,
} from "../shared/schema.ts";
import { db } from "./db.ts";
import { eq, and, isNull, lt, inArray, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (wallet-based authentication)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserWhopInfo(userId: string, whopUserId: string): Promise<User>;
  
  // Subscription operations
  getSubscription(userId: string): Promise<Subscription | undefined>;
  getSubscriptionByWhopId(whopMembershipId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, data: Partial<InsertSubscription>): Promise<Subscription>;
  
  // Subscription code operations
  getSubscriptionCode(code: string): Promise<SubscriptionCode | undefined>;
  redeemCode(userId: string, code: string): Promise<{ success: boolean; message: string; subscription?: Subscription }>;
  
  // Wallet connection operations
  getWalletConnection(userId: string): Promise<WalletConnection | undefined>;
  getWalletByAddress(walletAddress: string): Promise<WalletConnection | undefined>;
  createWalletConnection(wallet: InsertWalletConnection): Promise<WalletConnection>;
  updateWalletBalance(walletAddress: string, balance: number, isEligible: boolean): Promise<WalletConnection>;
  
  // Wallet challenge operations (anti-replay)
  createChallenge(userId: string): Promise<WalletChallenge>;
  getChallenge(challenge: string): Promise<WalletChallenge | undefined>;
  markChallengeUsed(challengeId: string): Promise<WalletChallenge>;
  
  // KOL wallet operations
  isKolWallet(walletAddress: string): Promise<boolean>;
  getKolWallet(walletAddress: string): Promise<KolWallet | undefined>;
  getTopKolWallets(limit?: number): Promise<KolWallet[]>;
  getKolWalletsByAddresses(addresses: string[]): Promise<KolWallet[]>;
  
  // Watchlist operations
  addToWatchlist(entry: Omit<InsertWatchlistEntry, 'id' | 'createdAt'>): Promise<WatchlistEntry>;
  removeFromWatchlist(userId: string, tokenAddress: string): Promise<void>;
  getWatchlist(userId: string): Promise<WatchlistEntry[]>;
  
  // Portfolio operations
  getPortfolioPositions(userId: string): Promise<PortfolioPosition[]>;
  getPortfolioPosition(userId: string, tokenAddress: string): Promise<PortfolioPosition | undefined>;
  recordTransaction(userId: string, tx: Omit<InsertPortfolioTransaction, 'id' | 'positionId' | 'userId' | 'createdAt'>): Promise<{ transaction: PortfolioTransaction; position: PortfolioPosition }>;
  getTransactionHistory(userId: string, tokenAddress?: string): Promise<PortfolioTransaction[]>;
  deletePosition(userId: string, tokenAddress: string): Promise<void>;
  
  // Price alerts operations
  createPriceAlert(alert: Omit<InsertPriceAlert, 'id' | 'createdAt'>): Promise<PriceAlert>;
  getPriceAlerts(userId: string): Promise<PriceAlert[]>;
  getActivePriceAlerts(): Promise<PriceAlert[]>;
  updatePriceAlert(alertId: string, data: Partial<InsertPriceAlert>): Promise<PriceAlert>;
  deletePriceAlert(userId: string, alertId: string): Promise<void>;
  triggerAlert(alertId: string, currentPrice: number): Promise<PriceAlert>;
  
  // Analytics operations
  saveTokenSnapshot(snapshot: Omit<InsertTokenSnapshot, 'id' | 'capturedAt'>): Promise<TokenSnapshot>;
  getHistoricalData(tokenAddress: string, days: number): Promise<TokenSnapshot[]>;
  getTrendingTokens(limit?: number): Promise<TrendingToken[]>;
  updateTrendingScores(tokens: InsertTrendingToken[]): Promise<void>;
  getRiskStatistics(windowDays: number): Promise<RiskStatistic | undefined>;
  saveRiskStatistics(stats: Omit<InsertRiskStatistic, 'id' | 'updatedAt'>): Promise<RiskStatistic>;
  
  // Social features - User profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: Omit<InsertUserProfile, 'createdAt'>): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile>;
  getTopUsers(limit?: number): Promise<UserProfile[]>;
  
  // Social features - Comments
  createComment(comment: Omit<InsertTokenComment, 'id' | 'createdAt' | 'upvoteCount' | 'downvoteCount' | 'flagged'>): Promise<TokenComment>;
  getCommentsByToken(tokenAddress: string): Promise<(TokenComment & { author: User | null })[]>;
  getFlaggedComments(): Promise<(TokenComment & { author: User | null })[]>;
  getComment(id: string): Promise<TokenComment | undefined>;
  deleteComment(id: string, userId: string): Promise<void>;
  flagComment(id: string): Promise<TokenComment>;
  updateCommentVoteCounts(commentId: string): Promise<void>;
  
  // Social features - Comment votes
  voteComment(vote: Omit<InsertCommentVote, 'createdAt'>): Promise<CommentVote>;
  removeCommentVote(userId: string, commentId: string): Promise<void>;
  getUserCommentVote(userId: string, commentId: string): Promise<CommentVote | undefined>;
  
  // Social features - Community votes
  createCommunityVote(vote: Omit<InsertCommunityVote, 'id' | 'createdAt'>): Promise<CommunityVote>;
  updateCommunityVote(id: string, data: Partial<InsertCommunityVote>): Promise<CommunityVote>;
  deleteCommunityVote(id: string, userId: string): Promise<void>;
  getUserCommunityVote(tokenAddress: string, userId: string): Promise<CommunityVote | undefined>;
  getCommunityVoteSummary(tokenAddress: string): Promise<CommunityVoteSummary | undefined>;
  upsertVoteSummary(summary: InsertCommunityVoteSummary): Promise<CommunityVoteSummary>;
  
  // Social features - Shared watchlists
  createSharedWatchlist(watchlist: Omit<InsertSharedWatchlist, 'id' | 'createdAt' | 'updatedAt'>): Promise<SharedWatchlist>;
  getSharedWatchlist(id: string): Promise<SharedWatchlist | undefined>;
  getSharedWatchlistBySlug(slug: string): Promise<SharedWatchlist | undefined>;
  updateSharedWatchlist(id: string, data: Partial<InsertSharedWatchlist>): Promise<SharedWatchlist>;
  getPublicWatchlists(limit?: number): Promise<SharedWatchlist[]>;
  getUserSharedWatchlists(userId: string): Promise<SharedWatchlist[]>;
  
  // Social features - Watchlist followers
  followWatchlist(userId: string, watchlistId: string): Promise<WatchlistFollower>;
  unfollowWatchlist(userId: string, watchlistId: string): Promise<void>;
  getFollowedWatchlists(userId: string): Promise<SharedWatchlist[]>;
  isFollowingWatchlist(userId: string, watchlistId: string): Promise<boolean>;
  
  // Social features - Token reports
  createTokenReport(report: Omit<InsertTokenReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<TokenReport>;
  getTokenReports(tokenAddress: string): Promise<(TokenReport & { reporter: User | null })[]>;
  updateTokenReport(id: string, data: Partial<InsertTokenReport>): Promise<TokenReport>;
  getPendingReports(): Promise<(TokenReport & { reporter: User | null })[]>;
  
  // Social features - User activities
  recordActivity(activity: Omit<InsertUserActivity, 'id' | 'createdAt'>): Promise<UserActivity>;
  getUserActivities(userId: string, limit?: number): Promise<UserActivity[]>;
  calculateUserReputation(userId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserWhopInfo(
    userId: string,
    whopUserId: string
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        whopUserId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Subscription operations
  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    return subscription;
  }

  async getSubscriptionByWhopId(whopMembershipId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.whopMembershipId, whopMembershipId));
    return subscription;
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db
      .insert(subscriptions)
      .values(subscriptionData)
      .returning();
    return subscription;
  }

  async updateSubscription(id: string, data: Partial<InsertSubscription>): Promise<Subscription> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription;
  }

  // Subscription code operations
  async getSubscriptionCode(code: string): Promise<SubscriptionCode | undefined> {
    const [subscriptionCode] = await db
      .select()
      .from(subscriptionCodes)
      .where(eq(subscriptionCodes.code, code));
    return subscriptionCode;
  }

  async redeemCode(userId: string, code: string): Promise<{ success: boolean; message: string; subscription?: Subscription }> {
    // Use transaction to prevent race conditions
    return await db.transaction(async (tx) => {
      // Lock the code row for update to prevent concurrent redemptions
      const [codeRecord] = await tx
        .select()
        .from(subscriptionCodes)
        .where(eq(subscriptionCodes.code, code))
        .for('update');
      
      if (!codeRecord) {
        return { success: false, message: 'Invalid code' };
      }
      
      if (!codeRecord.isActive) {
        return { success: false, message: 'This code has been deactivated' };
      }
      
      if (codeRecord.expiresAt && codeRecord.expiresAt < new Date()) {
        return { success: false, message: 'This code has expired' };
      }
      
      if (codeRecord.maxUses && codeRecord.usedCount >= codeRecord.maxUses) {
        return { success: false, message: 'This code has reached its maximum uses' };
      }
      
      // Check if user already redeemed this code
      const [existingRedemption] = await tx
        .select()
        .from(codeRedemptions)
        .where(and(
          eq(codeRedemptions.userId, userId),
          eq(codeRedemptions.code, code)
        ));
      
      if (existingRedemption) {
        return { success: false, message: 'You have already redeemed this code' };
      }
      
      // Create or update subscription
      const [existingSubscription] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId));
      
      let subscription: Subscription;
      
      if (existingSubscription) {
        // Update existing subscription to lifetime
        const [updated] = await tx
          .update(subscriptions)
          .set({
            tier: codeRecord.tier,
            status: 'valid',
            currentPeriodEnd: new Date('2099-12-31'),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, existingSubscription.id))
          .returning();
        subscription = updated;
      } else {
        // Create new subscription
        const [created] = await tx
          .insert(subscriptions)
          .values({
            userId,
            tier: codeRecord.tier,
            status: 'valid',
            currentPeriodEnd: new Date('2099-12-31'),
          })
          .returning();
        subscription = created;
      }
      
      // Record redemption
      await tx.insert(codeRedemptions).values({
        userId,
        codeId: codeRecord.id,
        code: codeRecord.code,
      });
      
      // Increment usage count using SQL to prevent race conditions
      await tx
        .update(subscriptionCodes)
        .set({ 
          usedCount: sql`${subscriptionCodes.usedCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionCodes.id, codeRecord.id));
      
      return { 
        success: true, 
        message: `Successfully activated ${codeRecord.tier} subscription!`,
        subscription,
      };
    });
  }

  // Access control - checks subscription OR token holder status
  async hasActiveAccess(userId: string): Promise<{
    hasAccess: boolean;
    reason: string;
    subscription?: Subscription;
    wallet?: WalletConnection;
  }> {
    const now = new Date();
    
    // Check subscription status (Whop vocabulary)
    const subscription = await this.getSubscription(userId);
    
    if (subscription) {
      // Lifetime tier never expires
      if (subscription.tier === 'lifetime' && subscription.status === 'valid') {
        return {
          hasAccess: true,
          reason: `Lifetime subscription (never expires)`,
          subscription,
        };
      }
      
      // Check if subscription is valid/trialing AND not expired
      const periodEnd = subscription.currentPeriodEnd || subscription.trialEndsAt;
      
      // Whop statuses: "valid" (active subscription), "trialing" (in trial), "past_due" (grace period)
      const activeStatuses = ['valid', 'trialing', 'past_due'];
      
      if (activeStatuses.includes(subscription.status) && periodEnd && periodEnd > now) {
        return {
          hasAccess: true,
          reason: `Active ${subscription.tier} subscription (${subscription.status}) until ${periodEnd.toISOString()}`,
          subscription,
        };
      }
      
      // Handle expired subscriptions - mark as expired
      if ((subscription.tier === 'free_trial' || subscription.status === 'trialing') && periodEnd && periodEnd <= now) {
        // Auto-expire the subscription/trial
        const updated = await this.updateSubscription(subscription.id, {
          status: 'expired',
        });
        
        // Update the local reference with fresh data
        subscription.status = updated.status;
        
        // Continue to check wallet, don't return yet
      }
    }
    
    // Check wallet token holder status (10M+ tokens)
    const wallet = await this.getWalletConnection(userId);
    
    if (wallet?.isEligible) {
      // Check if verification is recent (within 24 hours)
      const lastVerified = wallet.lastVerifiedAt ? new Date(wallet.lastVerifiedAt) : null;
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      if (lastVerified && lastVerified > twentyFourHoursAgo) {
        return {
          hasAccess: true,
          reason: `Token holder with ${wallet.tokenBalance.toLocaleString()} tokens (verified ${lastVerified.toISOString()})`,
          wallet,
        };
      } else {
        return {
          hasAccess: false,
          reason: 'Token balance verification expired (older than 24 hours). Please reverify your wallet.',
          wallet,
        };
      }
    }
    
    // No access
    if (subscription?.tier === 'free_trial') {
      return {
        hasAccess: false,
        reason: 'Free trial expired. Please subscribe or connect a wallet with 10M+ tokens.',
        subscription,
      };
    }
    
    return {
      hasAccess: false,
      reason: 'No active subscription or token holder status. Please subscribe or connect a wallet with 10M+ tokens.',
      subscription,
      wallet,
    };
  }

  // Wallet connection operations
  async getWalletConnection(userId: string): Promise<WalletConnection | undefined> {
    const [wallet] = await db
      .select()
      .from(walletConnections)
      .where(eq(walletConnections.userId, userId));
    return wallet;
  }

  async getWalletByAddress(walletAddress: string): Promise<WalletConnection | undefined> {
    const [wallet] = await db
      .select()
      .from(walletConnections)
      .where(eq(walletConnections.walletAddress, walletAddress));
    return wallet;
  }

  async createWalletConnection(walletData: InsertWalletConnection): Promise<WalletConnection> {
    const [wallet] = await db
      .insert(walletConnections)
      .values(walletData)
      .returning();
    return wallet;
  }

  async updateWalletBalance(
    walletAddress: string,
    balance: number,
    isEligible: boolean
  ): Promise<WalletConnection> {
    const [wallet] = await db
      .update(walletConnections)
      .set({
        tokenBalance: balance,
        isEligible,
        lastVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(walletConnections.walletAddress, walletAddress))
      .returning();
    return wallet;
  }

  // Wallet challenge operations (anti-replay)
  async createChallenge(userId: string): Promise<WalletChallenge> {
    // Generate random challenge (nonce)
    const challenge = `verify-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    const [created] = await db
      .insert(walletChallenges)
      .values({
        userId,
        challenge,
        expiresAt,
      })
      .returning();
    return created;
  }

  async getChallenge(challenge: string): Promise<WalletChallenge | undefined> {
    const [found] = await db
      .select()
      .from(walletChallenges)
      .where(eq(walletChallenges.challenge, challenge));
    return found;
  }

  async markChallengeUsed(challengeId: string): Promise<WalletChallenge> {
    const [updated] = await db
      .update(walletChallenges)
      .set({
        usedAt: new Date(),
      })
      .where(eq(walletChallenges.id, challengeId))
      .returning();
    return updated;
  }

  // KOL wallet operations
  async isKolWallet(walletAddress: string): Promise<boolean> {
    const [kol] = await db
      .select({ id: kolWallets.id })
      .from(kolWallets)
      .where(eq(kolWallets.walletAddress, walletAddress))
      .limit(1);
    return !!kol;
  }

  async getKolWallet(walletAddress: string): Promise<KolWallet | undefined> {
    const [kol] = await db
      .select()
      .from(kolWallets)
      .where(eq(kolWallets.walletAddress, walletAddress));
    return kol;
  }

  async getTopKolWallets(limit: number = 100): Promise<KolWallet[]> {
    return await db
      .select()
      .from(kolWallets)
      .where(eq(kolWallets.isVerified, true))
      .orderBy(desc(kolWallets.influenceScore), desc(kolWallets.rank))
      .limit(limit);
  }

  async getKolWalletsByAddresses(addresses: string[]): Promise<KolWallet[]> {
    if (addresses.length === 0) return [];
    
    return await db
      .select()
      .from(kolWallets)
      .where(inArray(kolWallets.walletAddress, addresses));
  }

  // Watchlist operations
  async addToWatchlist(entry: Omit<InsertWatchlistEntry, 'id' | 'createdAt'>): Promise<WatchlistEntry> {
    const [watchlistEntry] = await db
      .insert(watchlistEntries)
      .values(entry)
      .returning();
    return watchlistEntry;
  }

  async removeFromWatchlist(userId: string, tokenAddress: string): Promise<void> {
    await db
      .delete(watchlistEntries)
      .where(
        and(
          eq(watchlistEntries.userId, userId),
          eq(watchlistEntries.tokenAddress, tokenAddress)
        )
      );
  }

  async getWatchlist(userId: string): Promise<WatchlistEntry[]> {
    return await db
      .select()
      .from(watchlistEntries)
      .where(eq(watchlistEntries.userId, userId))
      .orderBy(desc(watchlistEntries.createdAt));
  }

  // Portfolio operations
  async getPortfolioPositions(userId: string): Promise<PortfolioPosition[]> {
    return await db
      .select()
      .from(portfolioPositions)
      .where(eq(portfolioPositions.userId, userId))
      .orderBy(desc(portfolioPositions.updatedAt));
  }

  async getPortfolioPosition(userId: string, tokenAddress: string): Promise<PortfolioPosition | undefined> {
    const [position] = await db
      .select()
      .from(portfolioPositions)
      .where(
        and(
          eq(portfolioPositions.userId, userId),
          eq(portfolioPositions.tokenAddress, tokenAddress)
        )
      );
    return position;
  }

  async recordTransaction(
    userId: string,
    tx: Omit<InsertPortfolioTransaction, 'id' | 'positionId' | 'userId' | 'createdAt'> & { tokenAddress: string }
  ): Promise<{ transaction: PortfolioTransaction; position: PortfolioPosition }> {
    const Decimal = (await import('decimal.js')).default;
    type DecimalType = InstanceType<typeof Decimal>;
    
    // Coerce and validate numeric inputs (FormData sends strings)
    const quantity = new Decimal(String(tx.quantity));
    if (quantity.isZero() || quantity.isNegative()) {
      throw new Error('Transaction quantity must be positive');
    }
    
    // Validate required fields per txType
    if (tx.txType === 'buy' || tx.txType === 'sell') {
      if (!tx.priceUsd || tx.priceUsd === '' || tx.priceUsd === null) {
        throw new Error(`priceUsd is required for ${tx.txType} transactions`);
      }
      // Validate priceUsd is numeric
      const price = new Decimal(String(tx.priceUsd));
      if (price.isNegative()) {
        throw new Error('Price must be positive');
      }
    }

    // Use database transaction with row-level locking
    const result = await db.transaction(async (trx) => {
      // Find or create position with SELECT FOR UPDATE (lock the row)
      let [position] = await trx
        .select()
        .from(portfolioPositions)
        .where(
          and(
            eq(portfolioPositions.userId, userId),
            eq(portfolioPositions.tokenAddress, tx.tokenAddress)
          )
        )
        .for('update');

      // Create position if doesn't exist
      if (!position) {
        [position] = await trx
          .insert(portfolioPositions)
          .values({
            userId,
            tokenAddress: tx.tokenAddress,
            quantity: '0',
            avgCostUsd: null,
            realizedPnlUsd: '0',
            latestPriceUsd: null,
            unrealizedPnlUsd: null,
            pnlPct: null,
            lastRebalancedAt: null,
          })
          .returning();
      }

      // Calculate updates using weighted-average cost basis with decimal.js
      const oldQuantity = new Decimal(position.quantity || '0');
      const oldAvgCost = position.avgCostUsd ? new Decimal(position.avgCostUsd) : new Decimal(0);
      const oldRealizedPnl = new Decimal(position.realizedPnlUsd || '0');
      const txPrice = tx.priceUsd ? new Decimal(tx.priceUsd.toString()) : new Decimal(0);
      const txFee = tx.feeUsd ? new Decimal(tx.feeUsd.toString()) : new Decimal(0);

      let newQuantity: DecimalType;
      let newAvgCost: DecimalType | null;
      let newRealizedPnl: DecimalType;

      switch (tx.txType) {
        case 'buy':
          // Weighted average: (oldQty * oldCost + buyQty * buyPrice + fee) / newQty
          newQuantity = oldQuantity.plus(quantity);
          const totalCost = oldQuantity.times(oldAvgCost).plus(quantity.times(txPrice)).plus(txFee);
          newAvgCost = totalCost.div(newQuantity);
          newRealizedPnl = oldRealizedPnl;
          break;

        case 'sell':
          // Validate sufficient holdings BEFORE any calculations
          if (oldQuantity.lessThan(quantity)) {
            throw new Error(`Insufficient holdings: have ${oldQuantity.toFixed(4)}, trying to sell ${quantity.toFixed(4)}`);
          }
          
          // Additional safety check - prevent negative quantities
          const afterSellQuantity = oldQuantity.minus(quantity);
          if (afterSellQuantity.isNegative()) {
            throw new Error(`Sell would result in negative quantity`);
          }
          
          // Realized P&L: (sellPrice * sellQty - fee) - (avgCost * sellQty)
          const proceeds = txPrice.times(quantity).minus(txFee);
          const costBasis = oldAvgCost.times(quantity);
          const realizedGain = proceeds.minus(costBasis);
          
          newQuantity = afterSellQuantity;
          newRealizedPnl = oldRealizedPnl.plus(realizedGain);
          
          // Keep avgCost if position remains, reset to null if fully liquidated
          newAvgCost = newQuantity.isZero() ? null : oldAvgCost;
          break;

        case 'airdrop':
          // Add zero-cost quantity without altering avgCost
          newQuantity = oldQuantity.plus(quantity);
          // Weighted average with zero cost: (oldQty * oldCost + qty * 0) / newQty
          newAvgCost = oldQuantity.isZero() ? new Decimal(0) : oldQuantity.times(oldAvgCost).div(newQuantity);
          newRealizedPnl = oldRealizedPnl;
          break;

        case 'manual_adjust':
          // Direct quantity change, preserve avgCost
          const adjustment = quantity.times(tx.priceUsd ? new Decimal(tx.priceUsd.toString()) : new Decimal(0));
          if (adjustment.isNegative()) {
            // Reduction
            if (oldQuantity.lessThan(quantity.abs())) {
              throw new Error('Manual adjustment would result in negative quantity');
            }
            newQuantity = oldQuantity.minus(quantity.abs());
          } else {
            // Increase
            newQuantity = oldQuantity.plus(quantity);
          }
          newAvgCost = oldAvgCost;
          newRealizedPnl = oldRealizedPnl;
          break;

        default:
          throw new Error(`Unknown transaction type: ${tx.txType}`);
      }

      // Enforce non-negative balance
      if (newQuantity.isNegative()) {
        throw new Error('Transaction would result in negative quantity');
      }

      // Insert transaction record
      const [transaction] = await trx
        .insert(portfolioTransactions)
        .values({
          positionId: position.id,
          userId,
          txType: tx.txType,
          quantity: quantity.toFixed(12),
          priceUsd: tx.priceUsd ? txPrice.toFixed(8) : null,
          feeUsd: txFee.toFixed(8),
          note: tx.note || null,
          executedAt: tx.executedAt || new Date(),
        })
        .returning();

      // Update position (unrealized P&L will be calculated by price worker)
      const [updatedPosition] = await trx
        .update(portfolioPositions)
        .set({
          quantity: newQuantity.toFixed(12),
          avgCostUsd: newAvgCost ? newAvgCost.toFixed(8) : null,
          realizedPnlUsd: newRealizedPnl.toFixed(8),
          updatedAt: new Date(),
        })
        .where(eq(portfolioPositions.id, position.id))
        .returning();

      return { transaction, position: updatedPosition };
    });

    return result;
  }

  async getTransactionHistory(userId: string, tokenAddress?: string): Promise<PortfolioTransaction[]> {
    if (tokenAddress) {
      // Get position first to filter by positionId
      const position = await this.getPortfolioPosition(userId, tokenAddress);
      if (!position) return [];
      
      return await db
        .select()
        .from(portfolioTransactions)
        .where(eq(portfolioTransactions.positionId, position.id))
        .orderBy(desc(portfolioTransactions.executedAt));
    }
    
    return await db
      .select()
      .from(portfolioTransactions)
      .where(eq(portfolioTransactions.userId, userId))
      .orderBy(desc(portfolioTransactions.executedAt));
  }

  async deletePosition(userId: string, tokenAddress: string): Promise<void> {
    await db
      .delete(portfolioPositions)
      .where(
        and(
          eq(portfolioPositions.userId, userId),
          eq(portfolioPositions.tokenAddress, tokenAddress)
        )
      );
    // Transactions cascade delete via FK
  }

  // Price alerts operations
  async createPriceAlert(alert: Omit<InsertPriceAlert, 'id' | 'createdAt'>): Promise<PriceAlert> {
    const [priceAlert] = await db
      .insert(priceAlerts)
      .values(alert)
      .returning();
    return priceAlert;
  }

  async getPriceAlerts(userId: string): Promise<PriceAlert[]> {
    return await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.userId, userId))
      .orderBy(desc(priceAlerts.createdAt));
  }

  async getActivePriceAlerts(): Promise<PriceAlert[]> {
    return await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.isActive, true));
  }

  async updatePriceAlert(alertId: string, data: Partial<InsertPriceAlert>): Promise<PriceAlert> {
    const [updated] = await db
      .update(priceAlerts)
      .set(data)
      .where(eq(priceAlerts.id, alertId))
      .returning();
    return updated;
  }

  async deletePriceAlert(userId: string, alertId: string): Promise<void> {
    await db
      .delete(priceAlerts)
      .where(
        and(
          eq(priceAlerts.id, alertId),
          eq(priceAlerts.userId, userId)
        )
      );
  }

  async triggerAlert(alertId: string, currentPrice: number): Promise<PriceAlert> {
    const [updated] = await db
      .update(priceAlerts)
      .set({
        isActive: false,
        triggeredAt: new Date(),
        lastPrice: currentPrice.toString(),
      })
      .where(eq(priceAlerts.id, alertId))
      .returning();
    return updated;
  }

  // Analytics operations
  async saveTokenSnapshot(snapshot: Omit<InsertTokenSnapshot, 'id' | 'capturedAt'>): Promise<TokenSnapshot> {
    const [saved] = await db
      .insert(tokenSnapshots)
      .values(snapshot)
      .returning();
    return saved;
  }

  async getHistoricalData(tokenAddress: string, days: number): Promise<TokenSnapshot[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await db
      .select()
      .from(tokenSnapshots)
      .where(
        and(
          eq(tokenSnapshots.tokenAddress, tokenAddress),
          sql`${tokenSnapshots.capturedAt} >= ${cutoffDate}`
        )
      )
      .orderBy(tokenSnapshots.capturedAt);
  }

  async getTrendingTokens(limit: number = 50): Promise<TrendingToken[]> {
    return await db
      .select()
      .from(trendingTokens)
      .orderBy(trendingTokens.rank)
      .limit(limit);
  }

  async updateTrendingScores(tokens: InsertTrendingToken[]): Promise<void> {
    if (tokens.length === 0) return;

    await db.transaction(async (tx) => {
      for (const token of tokens) {
        await tx
          .insert(trendingTokens)
          .values(token)
          .onConflictDoUpdate({
            target: trendingTokens.tokenAddress,
            set: {
              score: token.score,
              scoreBreakdown: token.scoreBreakdown,
              rank: token.rank,
              volume24h: token.volume24h,
              velocity: token.velocity,
              updatedAt: new Date(),
            },
          });
      }
    });
  }

  async getRiskStatistics(windowDays: number): Promise<RiskStatistic | undefined> {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    const [stats] = await db
      .select()
      .from(riskStatistics)
      .where(sql`${riskStatistics.windowStart} >= ${windowStart}`)
      .orderBy(desc(riskStatistics.windowEnd))
      .limit(1);

    return stats;
  }

  async saveRiskStatistics(stats: Omit<InsertRiskStatistic, 'id' | 'updatedAt'>): Promise<RiskStatistic> {
    const [saved] = await db
      .insert(riskStatistics)
      .values(stats)
      .returning();
    return saved;
  }

  // Social features - User profiles
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(profile: Omit<InsertUserProfile, 'createdAt'>): Promise<UserProfile> {
    const [newProfile] = await db.insert(userProfiles).values(profile).returning();
    return newProfile;
  }

  async updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile> {
    const [updated] = await db
      .update(userProfiles)
      .set(data)
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated;
  }

  async getTopUsers(limit: number = 10): Promise<UserProfile[]> {
    return await db
      .select()
      .from(userProfiles)
      .orderBy(desc(userProfiles.reputationScore))
      .limit(limit);
  }

  // Social features - Comments
  async createComment(comment: Omit<InsertTokenComment, 'id' | 'createdAt' | 'upvoteCount' | 'downvoteCount' | 'flagged'>): Promise<TokenComment> {
    const [newComment] = await db.insert(tokenComments).values(comment).returning();
    return newComment;
  }

  async getCommentsByToken(tokenAddress: string): Promise<(TokenComment & { author: User | null })[]> {
    const comments = await db
      .select({
        id: tokenComments.id,
        tokenAddress: tokenComments.tokenAddress,
        userId: tokenComments.userId,
        commentText: tokenComments.commentText,
        rating: tokenComments.rating,
        upvoteCount: tokenComments.upvoteCount,
        downvoteCount: tokenComments.downvoteCount,
        flagged: tokenComments.flagged,
        createdAt: tokenComments.createdAt,
        author: users,
      })
      .from(tokenComments)
      .leftJoin(users, eq(tokenComments.userId, users.id))
      .where(eq(tokenComments.tokenAddress, tokenAddress))
      .orderBy(desc(tokenComments.createdAt));
    
    return comments as (TokenComment & { author: User | null })[];
  }

  async getComment(id: string): Promise<TokenComment | undefined> {
    const [comment] = await db.select().from(tokenComments).where(eq(tokenComments.id, id));
    return comment;
  }

  async getFlaggedComments(): Promise<(TokenComment & { author: User | null })[]> {
    const comments = await db
      .select({
        id: tokenComments.id,
        tokenAddress: tokenComments.tokenAddress,
        userId: tokenComments.userId,
        commentText: tokenComments.commentText,
        rating: tokenComments.rating,
        upvoteCount: tokenComments.upvoteCount,
        downvoteCount: tokenComments.downvoteCount,
        flagged: tokenComments.flagged,
        createdAt: tokenComments.createdAt,
        author: users,
      })
      .from(tokenComments)
      .leftJoin(users, eq(tokenComments.userId, users.id))
      .where(eq(tokenComments.flagged, true))
      .orderBy(desc(tokenComments.createdAt));
    
    return comments as (TokenComment & { author: User | null })[];
  }

  async deleteComment(id: string, userId: string): Promise<void> {
    await db.delete(tokenComments).where(
      and(
        eq(tokenComments.id, id),
        eq(tokenComments.userId, userId)
      )
    );
  }

  async flagComment(id: string): Promise<TokenComment> {
    const [flagged] = await db
      .update(tokenComments)
      .set({ flagged: true })
      .where(eq(tokenComments.id, id))
      .returning();
    return flagged;
  }

  async updateCommentVoteCounts(commentId: string): Promise<void> {
    const votes = await db
      .select()
      .from(commentVotes)
      .where(eq(commentVotes.commentId, commentId));
    
    const upvotes = votes.filter(v => v.voteType === 'up').length;
    const downvotes = votes.filter(v => v.voteType === 'down').length;
    
    await db
      .update(tokenComments)
      .set({ upvoteCount: upvotes, downvoteCount: downvotes })
      .where(eq(tokenComments.id, commentId));
  }

  // Social features - Comment votes
  async voteComment(vote: Omit<InsertCommentVote, 'createdAt'>): Promise<CommentVote> {
    const [newVote] = await db
      .insert(commentVotes)
      .values(vote)
      .onConflictDoUpdate({
        target: [commentVotes.userId, commentVotes.commentId],
        set: { voteType: vote.voteType },
      })
      .returning();
    
    await this.updateCommentVoteCounts(vote.commentId);
    return newVote;
  }

  async removeCommentVote(userId: string, commentId: string): Promise<void> {
    await db.delete(commentVotes).where(
      and(
        eq(commentVotes.userId, userId),
        eq(commentVotes.commentId, commentId)
      )
    );
    await this.updateCommentVoteCounts(commentId);
  }

  async getUserCommentVote(userId: string, commentId: string): Promise<CommentVote | undefined> {
    const [vote] = await db
      .select()
      .from(commentVotes)
      .where(
        and(
          eq(commentVotes.userId, userId),
          eq(commentVotes.commentId, commentId)
        )
      );
    return vote;
  }

  // Social features - Community votes
  async createCommunityVote(vote: Omit<InsertCommunityVote, 'id' | 'createdAt'>): Promise<CommunityVote> {
    const [newVote] = await db
      .insert(communityVotes)
      .values(vote)
      .onConflictDoUpdate({
        target: [communityVotes.tokenAddress, communityVotes.userId],
        set: {
          voteType: vote.voteType,
          confidence: vote.confidence,
          reason: vote.reason,
          weight: vote.weight,
        },
      })
      .returning();
    return newVote;
  }

  async updateCommunityVote(id: string, data: Partial<InsertCommunityVote>): Promise<CommunityVote> {
    const [updated] = await db
      .update(communityVotes)
      .set(data)
      .where(eq(communityVotes.id, id))
      .returning();
    return updated;
  }

  async deleteCommunityVote(id: string, userId: string): Promise<void> {
    await db.delete(communityVotes).where(
      and(
        eq(communityVotes.id, id),
        eq(communityVotes.userId, userId)
      )
    );
  }

  async getUserCommunityVote(tokenAddress: string, userId: string): Promise<CommunityVote | undefined> {
    const [vote] = await db
      .select()
      .from(communityVotes)
      .where(
        and(
          eq(communityVotes.tokenAddress, tokenAddress),
          eq(communityVotes.userId, userId)
        )
      );
    return vote;
  }

  async getCommunityVoteSummary(tokenAddress: string): Promise<CommunityVoteSummary | undefined> {
    const [summary] = await db
      .select()
      .from(communityVoteSummaries)
      .where(eq(communityVoteSummaries.tokenAddress, tokenAddress));
    return summary;
  }

  async upsertVoteSummary(summary: InsertCommunityVoteSummary): Promise<CommunityVoteSummary> {
    const [upserted] = await db
      .insert(communityVoteSummaries)
      .values(summary)
      .onConflictDoUpdate({
        target: communityVoteSummaries.tokenAddress,
        set: {
          safeWeight: summary.safeWeight,
          riskyWeight: summary.riskyWeight,
          scamWeight: summary.scamWeight,
          totalVotes: summary.totalVotes,
          consensus: summary.consensus,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upserted;
  }

  // Social features - Shared watchlists
  async createSharedWatchlist(watchlist: Omit<InsertSharedWatchlist, 'id' | 'createdAt' | 'updatedAt'>): Promise<SharedWatchlist> {
    const [newWatchlist] = await db
      .insert(sharedWatchlists)
      .values(watchlist)
      .returning();
    return newWatchlist;
  }

  async getSharedWatchlist(id: string): Promise<SharedWatchlist | undefined> {
    const [watchlist] = await db
      .select()
      .from(sharedWatchlists)
      .where(eq(sharedWatchlists.id, id));
    return watchlist;
  }

  async getSharedWatchlistBySlug(slug: string): Promise<SharedWatchlist | undefined> {
    const [watchlist] = await db
      .select()
      .from(sharedWatchlists)
      .where(eq(sharedWatchlists.shareSlug, slug));
    return watchlist;
  }

  async updateSharedWatchlist(id: string, data: Partial<InsertSharedWatchlist>): Promise<SharedWatchlist> {
    const [updated] = await db
      .update(sharedWatchlists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sharedWatchlists.id, id))
      .returning();
    return updated;
  }

  async getPublicWatchlists(limit: number = 20): Promise<SharedWatchlist[]> {
    return await db
      .select()
      .from(sharedWatchlists)
      .where(eq(sharedWatchlists.isPublic, true))
      .orderBy(desc(sharedWatchlists.followersCount))
      .limit(limit);
  }

  async getUserSharedWatchlists(userId: string): Promise<SharedWatchlist[]> {
    return await db
      .select()
      .from(sharedWatchlists)
      .where(eq(sharedWatchlists.ownerId, userId))
      .orderBy(desc(sharedWatchlists.createdAt));
  }

  // Social features - Watchlist followers
  async followWatchlist(userId: string, watchlistId: string): Promise<WatchlistFollower> {
    const [follower] = await db
      .insert(watchlistFollowers)
      .values({ userId, watchlistId })
      .onConflictDoNothing()
      .returning();
    
    await db
      .update(sharedWatchlists)
      .set({
        followersCount: sql`${sharedWatchlists.followersCount} + 1`,
      })
      .where(eq(sharedWatchlists.id, watchlistId));
    
    return follower;
  }

  async unfollowWatchlist(userId: string, watchlistId: string): Promise<void> {
    await db
      .delete(watchlistFollowers)
      .where(
        and(
          eq(watchlistFollowers.userId, userId),
          eq(watchlistFollowers.watchlistId, watchlistId)
        )
      );
    
    await db
      .update(sharedWatchlists)
      .set({
        followersCount: sql`GREATEST(0, ${sharedWatchlists.followersCount} - 1)`,
      })
      .where(eq(sharedWatchlists.id, watchlistId));
  }

  async getFollowedWatchlists(userId: string): Promise<SharedWatchlist[]> {
    const followed = await db
      .select({
        watchlist: sharedWatchlists,
      })
      .from(watchlistFollowers)
      .innerJoin(sharedWatchlists, eq(watchlistFollowers.watchlistId, sharedWatchlists.id))
      .where(eq(watchlistFollowers.userId, userId));
    
    return followed.map(f => f.watchlist);
  }

  async isFollowingWatchlist(userId: string, watchlistId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(watchlistFollowers)
      .where(
        and(
          eq(watchlistFollowers.userId, userId),
          eq(watchlistFollowers.watchlistId, watchlistId)
        )
      );
    return !!result;
  }

  // Social features - Token reports
  async createTokenReport(report: Omit<InsertTokenReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<TokenReport> {
    const [newReport] = await db
      .insert(tokenReports)
      .values(report)
      .returning();
    return newReport;
  }

  async getTokenReports(tokenAddress: string): Promise<(TokenReport & { reporter: User | null })[]> {
    const reports = await db
      .select({
        id: tokenReports.id,
        tokenAddress: tokenReports.tokenAddress,
        reporterId: tokenReports.reporterId,
        reportType: tokenReports.reportType,
        evidence: tokenReports.evidence,
        status: tokenReports.status,
        reviewerId: tokenReports.reviewerId,
        resolutionNotes: tokenReports.resolutionNotes,
        severityScore: tokenReports.severityScore,
        createdAt: tokenReports.createdAt,
        updatedAt: tokenReports.updatedAt,
        reporter: users,
      })
      .from(tokenReports)
      .leftJoin(users, eq(tokenReports.reporterId, users.id))
      .where(eq(tokenReports.tokenAddress, tokenAddress))
      .orderBy(desc(tokenReports.createdAt));
    
    return reports as (TokenReport & { reporter: User | null })[];
  }

  async updateTokenReport(id: string, data: Partial<InsertTokenReport>): Promise<TokenReport> {
    const [updated] = await db
      .update(tokenReports)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tokenReports.id, id))
      .returning();
    return updated;
  }

  async getPendingReports(): Promise<(TokenReport & { reporter: User | null })[]> {
    const reports = await db
      .select({
        id: tokenReports.id,
        tokenAddress: tokenReports.tokenAddress,
        reporterId: tokenReports.reporterId,
        reportType: tokenReports.reportType,
        evidence: tokenReports.evidence,
        status: tokenReports.status,
        reviewerId: tokenReports.reviewerId,
        resolutionNotes: tokenReports.resolutionNotes,
        severityScore: tokenReports.severityScore,
        createdAt: tokenReports.createdAt,
        updatedAt: tokenReports.updatedAt,
        reporter: users,
      })
      .from(tokenReports)
      .leftJoin(users, eq(tokenReports.reporterId, users.id))
      .where(eq(tokenReports.status, 'pending'))
      .orderBy(desc(tokenReports.createdAt));
    
    return reports as (TokenReport & { reporter: User | null })[];
  }

  // Social features - User activities
  async recordActivity(activity: Omit<InsertUserActivity, 'id' | 'createdAt'>): Promise<UserActivity> {
    const [newActivity] = await db
      .insert(userActivities)
      .values(activity)
      .returning();
    return newActivity;
  }

  async getUserActivities(userId: string, limit: number = 50): Promise<UserActivity[]> {
    return await db
      .select()
      .from(userActivities)
      .where(eq(userActivities.userId, userId))
      .orderBy(desc(userActivities.createdAt))
      .limit(limit);
  }

  async calculateUserReputation(userId: string): Promise<number> {
    const result = await db
      .select({
        totalPoints: sql<number>`COALESCE(SUM(${userActivities.points}), 0)`,
      })
      .from(userActivities)
      .where(eq(userActivities.userId, userId));
    
    return result[0]?.totalPoints || 0;
  }
}

export const storage = new DatabaseStorage();

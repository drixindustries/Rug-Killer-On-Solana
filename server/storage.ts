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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, lt, inArray, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required by Replit Auth)
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
    
    // Validate required fields per txType
    if ((tx.txType === 'buy' || tx.txType === 'sell') && !tx.priceUsd) {
      throw new Error(`priceUsd is required for ${tx.txType} transactions`);
    }
    
    const quantity = new Decimal(tx.quantity.toString());
    if (quantity.isZero() || quantity.isNegative()) {
      throw new Error('Transaction quantity must be positive');
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
          // Validate sufficient holdings
          if (oldQuantity.lessThan(quantity)) {
            throw new Error(`Insufficient holdings: have ${oldQuantity.toString()}, trying to sell ${quantity.toString()}`);
          }
          
          // Realized P&L: (sellPrice * sellQty - fee) - (avgCost * sellQty)
          const proceeds = txPrice.times(quantity).minus(txFee);
          const costBasis = oldAvgCost.times(quantity);
          const realizedGain = proceeds.minus(costBasis);
          
          newQuantity = oldQuantity.minus(quantity);
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
}

export const storage = new DatabaseStorage();

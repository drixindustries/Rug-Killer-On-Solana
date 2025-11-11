import {
  users,
  subscriptions,
  subscriptionCodes,
  codeRedemptions,
  walletConnections,
  walletChallenges,
  kolWallets,
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
}

export const storage = new DatabaseStorage();

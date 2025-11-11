import {
  users,
  subscriptions,
  walletConnections,
  walletChallenges,
  type User,
  type UpsertUser,
  type Subscription,
  type InsertSubscription,
  type WalletConnection,
  type InsertWalletConnection,
  type WalletChallenge,
  type InsertWalletChallenge,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, lt } from "drizzle-orm";

export interface IStorage {
  // User operations (required by Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User>;
  
  // Subscription operations
  getSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, data: Partial<InsertSubscription>): Promise<Subscription>;
  
  // Wallet connection operations
  getWalletConnection(userId: string): Promise<WalletConnection | undefined>;
  getWalletByAddress(walletAddress: string): Promise<WalletConnection | undefined>;
  createWalletConnection(wallet: InsertWalletConnection): Promise<WalletConnection>;
  updateWalletBalance(walletAddress: string, balance: number, isEligible: boolean): Promise<WalletConnection>;
  
  // Wallet challenge operations (anti-replay)
  createChallenge(userId: string): Promise<WalletChallenge>;
  getChallenge(challenge: string): Promise<WalletChallenge | undefined>;
  markChallengeUsed(challengeId: string): Promise<WalletChallenge>;
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

  async updateUserStripeInfo(
    userId: string,
    stripeCustomerId: string,
    stripeSubscriptionId?: string
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
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

  // Access control - checks subscription OR token holder status
  async hasActiveAccess(userId: string): Promise<{
    hasAccess: boolean;
    reason: string;
    subscription?: Subscription;
    wallet?: WalletConnection;
  }> {
    const now = new Date();
    
    // Check subscription status
    const subscription = await this.getSubscription(userId);
    
    if (subscription) {
      // Check if subscription is active/trial AND not expired
      const periodEnd = subscription.currentPeriodEnd || subscription.trialEndsAt;
      
      // Allow both 'active' and 'trial' status (Stripe paid trials use 'trial')
      if ((subscription.status === 'active' || subscription.status === 'trial') && periodEnd && periodEnd > now) {
        return {
          hasAccess: true,
          reason: `Active ${subscription.tier} subscription (${subscription.status}) until ${periodEnd.toISOString()}`,
          subscription,
        };
      }
      
      // Handle expired trials - mark as expired
      if ((subscription.tier === 'free_trial' || subscription.status === 'trial') && periodEnd && periodEnd <= now) {
        // Auto-expire the trial
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
}

export const storage = new DatabaseStorage();

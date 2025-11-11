import {
  users,
  subscriptions,
  walletConnections,
  type User,
  type UpsertUser,
  type Subscription,
  type InsertSubscription,
  type WalletConnection,
  type InsertWalletConnection,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User operations (required by Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Subscription operations
  getSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, data: Partial<InsertSubscription>): Promise<Subscription>;
  
  // Wallet connection operations
  getWalletConnection(userId: string): Promise<WalletConnection | undefined>;
  getWalletByAddress(walletAddress: string): Promise<WalletConnection | undefined>;
  createWalletConnection(wallet: InsertWalletConnection): Promise<WalletConnection>;
  updateWalletBalance(walletAddress: string, balance: number, isEligible: boolean): Promise<WalletConnection>;
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
}

export const storage = new DatabaseStorage();

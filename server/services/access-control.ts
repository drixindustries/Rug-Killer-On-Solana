/**
 * Access Control Service
 * Handles token-gating, trial periods, and membership validation
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { sql } from 'drizzle-orm';
import { getWhopService } from './whop-service.js';
import { db } from '../db.js';
import { userAccessControl } from '../../shared/schema.js';

export interface AccessCheck {
  hasAccess: boolean;
  reason: string;
  accessType: 'trial' | 'token_holder' | 'paid_member' | 'denied';
  trialEndsAt?: Date;
  upgradeUrl?: string;
}

export class AccessControlService {
  private readonly connection: Connection;
  private readonly TOKEN_MINT: string;
  private readonly MIN_TOKEN_BALANCE = 10_000_000; // 10M tokens
  private readonly TRIAL_DAYS = 7;

  constructor(connection: Connection) {
    this.connection = connection;
    this.TOKEN_MINT = process.env.RUG_KILLER_TOKEN_MINT || '';
  }

  /**
   * Redeem a one-time master access code (admin bypass)
   */
  async redeemAccessCode(userId: string, platform: 'discord' | 'telegram', code: string, isGroup: boolean = false): Promise<{ success: boolean; message: string }> {
    const MASTER_CODE = process.env.ADMIN_ACCESS_CODE || 'RUG_KILLER_ELITE_2025';
    
    if (code !== MASTER_CODE) {
      return {
        success: false,
        message: 'Invalid access code'
      };
    }

    try {
      // Check if code has already been used by ANYONE
      const alreadyUsed = await db
        .select()
        .from(userAccessControl)
        .where(sql`${userAccessControl.whopMembershipId} = 'ADMIN_CODE_REDEEMED'`)
        .limit(1);

      if (alreadyUsed.length > 0) {
        return {
          success: false,
          message: '❌ This code has already been redeemed and cannot be used again.'
        };
      }

      const identifier = isGroup ? `${platform}_group:${userId}` : `${platform}:${userId}`;

      // Grant permanent access (expires in year 2099)
      const permanentExpiry = new Date('2099-12-31');
      
      // Check if user already has a record
      const existing = await db
        .select()
        .from(userAccessControl)
        .where(sql`${userAccessControl.identifier} = ${identifier}`)
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(userAccessControl)
          .set({
            accessType: 'paid',
            membershipExpiresAt: permanentExpiry,
            trialEndsAt: permanentExpiry,
            whopMembershipId: 'ADMIN_CODE_REDEEMED',
            lastValidatedAt: new Date(),
            updatedAt: new Date()
          })
          .where(sql`${userAccessControl.identifier} = ${identifier}`);
      } else {
        // Create new record
        await db
          .insert(userAccessControl)
          .values({
            identifier,
            isGroup,
            accessType: 'paid',
            membershipExpiresAt: permanentExpiry,
            trialEndsAt: permanentExpiry,
            whopMembershipId: 'ADMIN_CODE_REDEEMED',
            lastValidatedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }

      console.log(`[AccessControl] ONE-TIME admin code redeemed for ${identifier}`);

      return {
        success: true,
        message: '✅ Lifetime access granted! You will never be locked out.\n\n⚠️ This code is now burned and cannot be used again.'
      };
    } catch (error) {
      console.error('[AccessControl] Error redeeming code:', error);
      return {
        success: false,
        message: 'Error processing code. Please try again.'
      };
    }
  }

  /**
   * Check if a user/group has access to the bot
   */
  async checkAccess(
    userId: string, 
    platform: 'discord' | 'telegram',
    isGroup: boolean = false
  ): Promise<AccessCheck> {
    const identifier = isGroup ? `${platform}_group:${userId}` : `${platform}:${userId}`;

    // 1. Check if user is in trial period or has existing access
    const accessRecord = await this.getOrCreateAccessRecord(identifier, isGroup);
    
    // 2. Check if trial is still valid
    if (accessRecord.trialEndsAt && new Date() < accessRecord.trialEndsAt) {
      return {
        hasAccess: true,
        reason: `Trial period (ends ${accessRecord.trialEndsAt.toLocaleDateString()})`,
        accessType: 'trial',
        trialEndsAt: accessRecord.trialEndsAt
      };
    }

    // 3. Check Whop membership (paid access)
    const whopService = getWhopService();
    if (whopService.isConfigured() && !isGroup) {
      const membership = await whopService.checkMembership(userId, platform);
      if (membership && ['active', 'trialing'].includes(membership.status)) {
        // Update access record
        await this.updateAccessRecord(identifier, 'paid', membership.validUntil);
        
        return {
          hasAccess: true,
          reason: 'Active Whop membership',
          accessType: 'paid_member'
        };
      }
    }

    // 4. Check token holdings (if wallet is linked)
    if (accessRecord.walletAddress && this.TOKEN_MINT) {
      const hasTokens = await this.checkTokenBalance(accessRecord.walletAddress);
      if (hasTokens) {
        // Update access record
        await this.updateAccessRecord(identifier, 'token_holder');
        
        return {
          hasAccess: true,
          reason: `Holding ${this.MIN_TOKEN_BALANCE.toLocaleString()}+ tokens`,
          accessType: 'token_holder'
        };
      }
    }

    // 5. Trial expired and no valid access method
    const whopPlanId = process.env.WHOP_PLAN_ID || '';
    const upgradeUrl = whopService.isConfigured() && !isGroup
      ? await whopService.createCheckoutLink(userId, platform, whopPlanId)
      : null;

    return {
      hasAccess: false,
      reason: 'Trial expired. Please upgrade to continue.',
      accessType: 'denied',
      upgradeUrl: upgradeUrl || undefined
    };
  }

  /**
   * Link a wallet address to a user for token-gating
   */
  async linkWallet(userId: string, platform: 'discord' | 'telegram', walletAddress: string): Promise<boolean> {
    try {
      const identifier = `${platform}:${userId}`;
      
      await db
        .update(userAccessControl)
        .set({ 
          walletAddress,
          updatedAt: new Date()
        })
        .where(sql`${userAccessControl.identifier} = ${identifier}`);

      return true;
    } catch (error) {
      console.error('[AccessControl] Error linking wallet:', error);
      return false;
    }
  }

  /**
   * Check if wallet holds minimum token balance
   */
  private async checkTokenBalance(walletAddress: string): Promise<boolean> {
    if (!this.TOKEN_MINT) return false;

    try {
      const walletPubkey = new PublicKey(walletAddress);
      const mintPubkey = new PublicKey(this.TOKEN_MINT);

      // Get token accounts for this wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        walletPubkey,
        { mint: mintPubkey }
      );

      if (tokenAccounts.value.length === 0) return false;

      // Sum all token balances
      const totalBalance = tokenAccounts.value.reduce((sum, account) => {
        const balance = account.account.data.parsed?.info?.tokenAmount?.uiAmount || 0;
        return sum + balance;
      }, 0);

      return totalBalance >= this.MIN_TOKEN_BALANCE;
    } catch (error) {
      console.error('[AccessControl] Error checking token balance:', error);
      return false;
    }
  }

  /**
   * Get or create access record for a user/group
   */
  private async getOrCreateAccessRecord(identifier: string, isGroup: boolean): Promise<any> {
    try {
      // Try to get existing record
      const [existing] = await db
        .select()
        .from(userAccessControl)
        .where(sql`${userAccessControl.identifier} = ${identifier}`)
        .limit(1);

      if (existing) return existing;

      // Create new record with trial period
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + this.TRIAL_DAYS);

      const [newRecord] = await db
        .insert(userAccessControl)
        .values({
          identifier,
          isGroup,
          trialEndsAt,
          accessType: 'trial',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(`[AccessControl] New ${isGroup ? 'group' : 'user'} trial started: ${identifier} (ends ${trialEndsAt.toLocaleDateString()})`);

      return newRecord;
    } catch (error) {
      console.error('[AccessControl] Error managing access record:', error);
      // Return default trial for safety
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + this.TRIAL_DAYS);
      return { identifier, isGroup, trialEndsAt, accessType: 'trial' };
    }
  }

  /**
   * Update access record with new access type
   */
  private async updateAccessRecord(identifier: string, accessType: string, validUntil?: Date): Promise<void> {
    try {
      await db
        .update(userAccessControl)
        .set({
          accessType,
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
          ...(validUntil && { membershipExpiresAt: validUntil })
        })
        .where(sql`${userAccessControl.identifier} = ${identifier}`);
    } catch (error) {
      console.error('[AccessControl] Error updating access record:', error);
    }
  }
}

// Singleton instance
let accessControlService: AccessControlService | null = null;

export function getAccessControlService(connection?: Connection): AccessControlService {
  if (!accessControlService) {
    if (!connection) {
      throw new Error('Connection required to initialize AccessControlService');
    }
    accessControlService = new AccessControlService(connection);
  }
  return accessControlService;
}

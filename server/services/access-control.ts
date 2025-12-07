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
  private connection: Connection | null = null;
  private readonly TOKEN_MINT: string;
  private readonly MIN_TOKEN_BALANCE = 10_000_000; // 10M tokens
  private readonly TRIAL_DAYS = 7;

  constructor(connection?: Connection) {
    this.connection = connection || null;
    this.TOKEN_MINT = process.env.RUG_KILLER_TOKEN_MINT || '';
  }

  /**
   * Lazy-load connection when needed
   */
  private getConnection(): Connection | null {
    if (this.connection) return this.connection;
    
    try {
      // Try to get connection from RPC balancer
      const { rpcBalancer } = require('../services/rpc-balancer.js');
      if (rpcBalancer.providers && rpcBalancer.providers.length > 0) {
        const provider = rpcBalancer.select();
        const url = provider?.getUrl();
        if (url) {
          this.connection = new Connection(url, { commitment: 'confirmed' });
          console.log('[AccessControl] Lazy-loaded connection from RPC balancer:', provider.name);
          return this.connection;
        }
      }
    } catch (e) {
      console.warn('[AccessControl] Failed to lazy-load connection from RPC balancer:', e?.message || e);
    }
    
    // Fallback to public RPC
    try {
      const publicRpc = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      this.connection = new Connection(publicRpc, { commitment: 'confirmed' });
      console.log('[AccessControl] Lazy-loaded connection with fallback RPC:', publicRpc);
      return this.connection;
    } catch (e) {
      console.error('[AccessControl] Failed to lazy-load connection:', e?.message || e);
      return null;
    }
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
    
    // 2. Check if trial is still valid (with wallet requirement)
    if (accessRecord.trialEndsAt && new Date() < accessRecord.trialEndsAt) {
      // For free trial, wallet connection is MANDATORY
      if (!isGroup && !accessRecord.walletAddress) {
        return {
          hasAccess: false,
          reason: 'Wallet connection required. Connect your wallet at https://rugkilleralphabot.fun/access to start your 7-day free trial.',
          accessType: 'denied',
          upgradeUrl: 'https://rugkilleralphabot.fun/access'
        };
      }
      
      return {
        hasAccess: true,
        reason: `Trial period (ends ${accessRecord.trialEndsAt.toLocaleDateString()})`,
        accessType: 'trial',
        trialEndsAt: accessRecord.trialEndsAt
      };
    }

    // 3. Check if paid membership is still valid (check membershipExpiresAt)
    if (accessRecord.membershipExpiresAt && new Date() < accessRecord.membershipExpiresAt) {
      if (accessRecord.accessType === 'paid') {
        return {
          hasAccess: true,
          reason: `Paid membership (expires ${accessRecord.membershipExpiresAt.toLocaleDateString()})`,
          accessType: 'paid_member'
        };
      }
    }

    // 4. Check Whop membership (paid access) - refresh if needed
    const whopService = getWhopService();
    if (whopService.isConfigured() && !isGroup) {
      const membership = await whopService.checkMembership(userId, platform);
      if (membership && ['active', 'trialing'].includes(membership.status)) {
        // Update access record with new expiration
        const validUntil = membership.validUntil ? new Date(membership.validUntil) : undefined;
        await this.updateAccessRecord(identifier, 'paid', validUntil);
        
        return {
          hasAccess: true,
          reason: 'Active Whop membership',
          accessType: 'paid_member'
        };
      } else if (accessRecord.accessType === 'paid' && accessRecord.membershipExpiresAt && new Date() >= accessRecord.membershipExpiresAt) {
        // Membership expired - revoke access
        await this.updateAccessRecord(identifier, 'denied');
        return {
          hasAccess: false,
          reason: 'Subscription expired. Please renew to continue.',
          accessType: 'denied',
          upgradeUrl: whopService.isConfigured() ? await whopService.createCheckoutLink(userId, platform, process.env.WHOP_PLAN_ID || '') : undefined
        };
      }
    }

    // 5. Check token holdings (if wallet is linked)
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

    // 6. Trial expired and no valid access method
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

    const connection = this.getConnection();
    if (!connection) {
      console.warn('[AccessControl] No connection available for token balance check');
      return false;
    }

    try {
      const walletPubkey = new PublicKey(walletAddress);
      const mintPubkey = new PublicKey(this.TOKEN_MINT);

      // Get token accounts for this wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
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

  /**
   * Check access by wallet address (for access portal)
   */
  async checkAccessByWallet(walletAddress: string): Promise<AccessCheck & { userId?: string; platform?: string }> {
    try {
      // Find all access records linked to this wallet
      const records = await db
        .select()
        .from(userAccessControl)
        .where(sql`${userAccessControl.walletAddress} = ${walletAddress}`)
        .orderBy(sql`${userAccessControl.updatedAt} DESC`)
        .limit(1);

      if (records.length === 0) {
        return {
          hasAccess: false,
          reason: 'No access record found. Connect your wallet to start your trial.',
          accessType: 'denied',
          upgradeUrl: 'https://rugkilleralphabot.fun/access'
        };
      }

      const record = records[0];
      const now = new Date();

      // Check trial
      if (record.trialEndsAt && now < record.trialEndsAt) {
        return {
          hasAccess: true,
          reason: `Trial period (ends ${record.trialEndsAt.toLocaleDateString()})`,
          accessType: 'trial',
          trialEndsAt: record.trialEndsAt
        };
      }

      // Check paid membership
      if (record.membershipExpiresAt && now < record.membershipExpiresAt && record.accessType === 'paid') {
        return {
          hasAccess: true,
          reason: `Paid membership (expires ${record.membershipExpiresAt.toLocaleDateString()})`,
          accessType: 'paid_member'
        };
      }

      // Check token holder
      if (this.TOKEN_MINT) {
        const hasTokens = await this.checkTokenBalance(walletAddress);
        if (hasTokens) {
          await this.updateAccessRecord(record.identifier, 'token_holder');
          return {
            hasAccess: true,
            reason: `Holding ${this.MIN_TOKEN_BALANCE.toLocaleString()}+ tokens`,
            accessType: 'token_holder'
          };
        }
      }

      // Expired
      return {
        hasAccess: false,
        reason: record.trialEndsAt && now >= record.trialEndsAt 
          ? 'Trial expired. Please upgrade to continue.'
          : 'Access expired. Please renew your subscription.',
        accessType: 'denied',
        upgradeUrl: 'https://rugkilleralphabot.fun/pricing'
      };
    } catch (error) {
      console.error('[AccessControl] Error checking access by wallet:', error);
      return {
        hasAccess: false,
        reason: 'Error checking access status',
        accessType: 'denied'
      };
    }
  }

  /**
   * Start free trial for a wallet (called from access portal)
   */
  async startTrialForWallet(walletAddress: string): Promise<{ success: boolean; trialEndsAt?: Date; error?: string }> {
    try {
      // Check if wallet already has an access record
      const existing = await db
        .select()
        .from(userAccessControl)
        .where(sql`${userAccessControl.walletAddress} = ${walletAddress}`)
        .limit(1);

      if (existing.length > 0 && existing[0].trialEndsAt && new Date() < existing[0].trialEndsAt) {
        return {
          success: true,
          trialEndsAt: existing[0].trialEndsAt,
        };
      }

      // Create trial (will be linked when user connects via Discord/Telegram)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + this.TRIAL_DAYS);

      // Create a temporary identifier for wallet-based trial
      const identifier = `wallet:${walletAddress}`;
      
      const [record] = await db
        .insert(userAccessControl)
        .values({
          identifier,
          isGroup: false,
          walletAddress,
          trialEndsAt,
          accessType: 'trial',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastValidatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userAccessControl.identifier,
          set: {
            walletAddress,
            trialEndsAt,
            accessType: 'trial',
            updatedAt: new Date(),
            lastValidatedAt: new Date(),
          }
        })
        .returning();

      console.log(`[AccessControl] Trial started for wallet ${walletAddress.slice(0, 8)}... (ends ${trialEndsAt.toLocaleDateString()})`);

      return {
        success: true,
        trialEndsAt: record.trialEndsAt || trialEndsAt,
      };
    } catch (error: any) {
      console.error('[AccessControl] Error starting trial:', error);
      return {
        success: false,
        error: error.message || 'Failed to start trial'
      };
    }
  }

  /**
   * Daily validation job - checks all access records and updates expired ones
   */
  async validateAllAccess(): Promise<{ validated: number; expired: number; errors: number }> {
    let validated = 0;
    let expired = 0;
    let errors = 0;

    try {
      // Get all access records that need validation
      const records = await db
        .select()
        .from(userAccessControl)
        .where(
          sql`${userAccessControl.accessType} IN ('trial', 'paid')`
        );

      const now = new Date();
      const whopService = getWhopService();

      for (const record of records) {
        try {
          let shouldExpire = false;

          // Check trial expiration
          if (record.trialEndsAt && now >= record.trialEndsAt && record.accessType === 'trial') {
            shouldExpire = true;
          }

          // Check paid membership expiration
          if (record.membershipExpiresAt && now >= record.membershipExpiresAt && record.accessType === 'paid') {
            // For paid members, check Whop to see if subscription was renewed
            if (!record.isGroup && whopService.isConfigured()) {
              // Extract platform and userId from identifier
              const parts = record.identifier.split(':');
              if (parts.length >= 2) {
                const platform = parts[0] as 'discord' | 'telegram';
                const userId = parts.slice(1).join(':');
                const membership = await whopService.checkMembership(userId, platform);
                
                if (membership && ['active', 'trialing'].includes(membership.status) && membership.validUntil) {
                  // Subscription renewed - update expiration
                  await this.updateAccessRecord(record.identifier, 'paid', new Date(membership.validUntil));
                  validated++;
                  continue;
                }
              }
            }
            shouldExpire = true;
          }

          if (shouldExpire) {
            await this.updateAccessRecord(record.identifier, 'denied');
            expired++;
          } else {
            // Update last validated timestamp
            await db
              .update(userAccessControl)
              .set({ lastValidatedAt: now, updatedAt: now })
              .where(sql`${userAccessControl.identifier} = ${record.identifier}`);
            validated++;
          }
        } catch (error) {
          console.error(`[AccessControl] Error validating record ${record.identifier}:`, error);
          errors++;
        }
      }

      console.log(`[AccessControl] Daily validation complete: ${validated} validated, ${expired} expired, ${errors} errors`);
      return { validated, expired, errors };
    } catch (error) {
      console.error('[AccessControl] Error in daily validation:', error);
      return { validated, expired, errors: errors + 1 };
    }
  }
}

// Singleton instance
let accessControlService: AccessControlService | null = null;

export function getAccessControlService(connection?: Connection): AccessControlService {
  if (!accessControlService) {
    // Create service without requiring connection upfront
    // Connection will be lazy-loaded when needed for token balance checks
    accessControlService = new AccessControlService(connection);
    console.log('[AccessControl] Service initialized (connection will be lazy-loaded when needed)');
  }
  return accessControlService;
}

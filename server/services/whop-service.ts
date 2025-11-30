/**
 * Whop Integration Service
 * Handles membership validation, payments, and access control
 */

export interface WhopMembership {
  id: string;
  userId: string;
  productId: string;
  planId: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  validUntil: Date;
  metadata?: {
    discordId?: string;
    telegramId?: string;
    walletAddress?: string;
  };
}

export class WhopService {
  private readonly WHOP_API_KEY: string;
  private readonly WHOP_BASE_URL = 'https://api.whop.com/v2';
  private readonly PRODUCT_ID: string;

  constructor() {
    this.WHOP_API_KEY = process.env.WHOP_API_KEY || '';
    this.PRODUCT_ID = process.env.WHOP_PRODUCT_ID || '';
    
    if (!this.WHOP_API_KEY) {
      console.warn('[Whop] No API key configured - membership features disabled');
    }
  }

  /**
   * Verify if a user has an active Whop membership
   */
  async checkMembership(userId: string, platform: 'discord' | 'telegram'): Promise<WhopMembership | null> {
    if (!this.WHOP_API_KEY) return null;

    try {
      const response = await fetch(`${this.WHOP_BASE_URL}/memberships`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.WHOP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return null;

      const data = await response.json();
      const memberships = data.data || [];

      // Find active membership for this user
      const membership = memberships.find((m: any) => 
        m.metadata?.[`${platform}Id`] === userId &&
        ['active', 'trialing'].includes(m.status)
      );

      if (!membership) return null;

      return {
        id: membership.id,
        userId: membership.user_id,
        productId: membership.product_id,
        planId: membership.plan_id,
        status: membership.status,
        validUntil: new Date(membership.valid_until),
        metadata: membership.metadata
      };
    } catch (error) {
      console.error('[Whop] Error checking membership:', error);
      return null;
    }
  }

  /**
   * Create a Whop checkout link for a user
   */
  async createCheckoutLink(userId: string, platform: 'discord' | 'telegram', planId: string): Promise<string | null> {
    if (!this.WHOP_API_KEY) return null;

    try {
      const response = await fetch(`${this.WHOP_BASE_URL}/checkout_sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.WHOP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: this.PRODUCT_ID,
          plan_id: planId,
          metadata: {
            [`${platform}Id`]: userId
          }
        })
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.url || null;
    } catch (error) {
      console.error('[Whop] Error creating checkout link:', error);
      return null;
    }
  }

  /**
   * Check if Whop is configured
   */
  isConfigured(): boolean {
    return !!(this.WHOP_API_KEY && this.PRODUCT_ID);
  }
}

// Singleton instance
let whopService: WhopService | null = null;

export function getWhopService(): WhopService {
  if (!whopService) {
    whopService = new WhopService();
  }
  return whopService;
}

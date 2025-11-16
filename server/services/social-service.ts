import { storage } from "../storage.ts";
import { nanoid } from "nanoid";

export class SocialService {
  async calculateReputation(userId: string): Promise<number> {
    return await storage.calculateUserReputation(userId);
  }

  async aggregateVotes(tokenAddress: string): Promise<void> {
    const votes = await storage.getCommunityVoteSummary(tokenAddress);
    
    if (!votes) {
      return;
    }

    const safeWeight = parseFloat(votes.safeWeight?.toString() || "0");
    const riskyWeight = parseFloat(votes.riskyWeight?.toString() || "0");
    const scamWeight = parseFloat(votes.scamWeight?.toString() || "0");
    const totalWeight = safeWeight + riskyWeight + scamWeight;

    if (totalWeight === 0) {
      return;
    }

    const safePercent = (safeWeight / totalWeight) * 100;
    const riskyPercent = (riskyWeight / totalWeight) * 100;
    const scamPercent = (scamWeight / totalWeight) * 100;

    let consensus: 'safe' | 'risky' | 'scam' | 'mixed' = 'mixed';

    if (safePercent >= 60) {
      consensus = 'safe';
    } else if (scamPercent >= 40) {
      consensus = 'scam';
    } else if (riskyPercent >= 50) {
      consensus = 'risky';
    }

    await storage.upsertVoteSummary({
      tokenAddress,
      safeWeight: safeWeight.toString(),
      riskyWeight: riskyWeight.toString(),
      scamWeight: scamWeight.toString(),
      totalVotes: votes.totalVotes,
      consensus,
    });
  }

  generateShareSlug(): string {
    return nanoid(10);
  }

  sanitizeContent(text: string): string {
    return text
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>.*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .trim();
  }

  async checkRateLimit(userId: string, action: 'comment' | 'vote' | 'report'): Promise<{ allowed: boolean; remaining: number }> {
    const limits = {
      comment: { window: 60 * 60 * 1000, max: 5 },
      vote: { window: 60 * 1000, max: 10 },
      report: { window: 60 * 60 * 1000, max: 3 },
    };

    const limit = limits[action];
    const activities = await storage.getUserActivities(userId, 100);

    const cutoffTime = Date.now() - limit.window;
    const recentActions = activities.filter(
      a => 
        a.activityType === action && 
        a.createdAt && 
        new Date(a.createdAt).getTime() > cutoffTime
    );

    const count = recentActions.length;
    const remaining = Math.max(0, limit.max - count);

    return {
      allowed: count < limit.max,
      remaining,
    };
  }

  async detectSpam(text: string): Promise<boolean> {
    const spamPatterns = [
      /https?:\/\/[^\s]+/gi,
      /\b(buy|sell|pump|moon|100x|guaranteed)\b/gi,
      /(.)\1{5,}/,
      /\b(telegram|discord)\.(?:com|gg|me)\//gi,
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  async awardPoints(userId: string, activityType: string, points: number, targetToken?: string, targetWatchlist?: string): Promise<void> {
    await storage.recordActivity({
      userId,
      activityType: activityType as any,
      points,
      targetToken,
      targetWatchlist,
    });

    const totalReputation = await storage.calculateUserReputation(userId);
    
    const profile = await storage.getUserProfile(userId);
    if (profile) {
      await storage.updateUserProfile(userId, {
        reputationScore: totalReputation,
        contributionCount: profile.contributionCount + 1,
      });
    }
  }
}

export const socialService = new SocialService();

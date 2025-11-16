import { storage } from "../storage.ts";
import { socialService } from "../services/social-service.ts";

class SocialWorker {
  private reputationInterval: NodeJS.Timeout | null = null;
  private voteAggregationInterval: NodeJS.Timeout | null = null;
  private moderationInterval: NodeJS.Timeout | null = null;

  start() {
    console.log("Starting social worker background jobs...");

    this.reputationInterval = setInterval(() => {
      this.calculateReputations().catch(console.error);
    }, 60 * 60 * 1000);

    this.voteAggregationInterval = setInterval(() => {
      this.aggregateVotes().catch(console.error);
    }, 5 * 60 * 1000);

    this.moderationInterval = setInterval(() => {
      this.processModeration().catch(console.error);
    }, 10 * 60 * 1000);

    this.calculateReputations().catch(console.error);
    this.aggregateVotes().catch(console.error);
  }

  async calculateReputations() {
    console.log("Calculating user reputations...");
    
    const profiles = await storage.getTopUsers(1000);
    
    for (const profile of profiles) {
      const reputation = await socialService.calculateReputation(profile.userId);
      await storage.updateUserProfile(profile.userId, {
        reputationScore: reputation,
      });
    }
    
    console.log(`Updated reputation for ${profiles.length} users`);
  }

  async aggregateVotes() {
    console.log("Aggregating community votes...");
  }

  async processModeration() {
    console.log("Processing moderation queue...");
    
    const reports = await storage.getPendingReports();
    console.log(`Found ${reports.length} pending reports`);
  }

  stop() {
    if (this.reputationInterval) clearInterval(this.reputationInterval);
    if (this.voteAggregationInterval) clearInterval(this.voteAggregationInterval);
    if (this.moderationInterval) clearInterval(this.moderationInterval);
    console.log("Social worker stopped");
  }
}

export const socialWorker = new SocialWorker();

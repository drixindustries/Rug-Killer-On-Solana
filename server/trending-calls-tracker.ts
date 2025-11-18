/**
 * Trending Calls Tracker
 * Tracks cashtag ($SYMBOL) and contract address mentions across Discord and Telegram
 * Aggregates data for the trending calls page
 */

interface CallMention {
  symbol?: string;
  contractAddress: string;
  platform: 'discord' | 'telegram';
  channelId: string;
  channelName: string;
  userId: string;
  username: string;
  timestamp: number;
  messageContent: string;
}

interface TrendingCall {
  id: string;
  symbol?: string;
  contractAddress: string;
  platform: 'discord' | 'telegram' | 'both';
  channels: Set<string>;
  channelNames: string[];
  mentions: number;
  uniqueUsers: Set<string>;
  firstSeen: number;
  lastSeen: number;
  sentiment: 'bullish' | 'neutral' | 'bearish';
  riskScore?: number;
  recentMentions: CallMention[];
}

class TrendingCallsTracker {
  private calls: Map<string, TrendingCall> = new Map();
  private readonly MAX_HISTORY = 100;
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  
  constructor() {
    // Periodic cleanup of old data
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Track a new mention
   */
  trackMention(mention: CallMention) {
    const key = mention.contractAddress.toLowerCase();
    
    let call = this.calls.get(key);
    
    if (!call) {
      call = {
        id: key,
        symbol: mention.symbol,
        contractAddress: mention.contractAddress,
        platform: mention.platform,
        channels: new Set([mention.channelId]),
        channelNames: [mention.channelName],
        mentions: 0,
        uniqueUsers: new Set(),
        firstSeen: mention.timestamp,
        lastSeen: mention.timestamp,
        sentiment: this.detectSentiment(mention.messageContent),
        recentMentions: [],
      };
      this.calls.set(key, call);
    }
    
    // Update call data
    call.mentions++;
    call.lastSeen = mention.timestamp;
    call.uniqueUsers.add(mention.userId);
    call.channels.add(mention.channelId);
    
    if (!call.channelNames.includes(mention.channelName)) {
      call.channelNames.push(mention.channelName);
    }
    
    // Update platform (if mentioned on both platforms)
    if (call.platform !== mention.platform) {
      call.platform = 'both';
    }
    
    // Update symbol if not set
    if (!call.symbol && mention.symbol) {
      call.symbol = mention.symbol;
    }
    
    // Store recent mention
    call.recentMentions.unshift(mention);
    if (call.recentMentions.length > 20) {
      call.recentMentions = call.recentMentions.slice(0, 20);
    }
    
    // Update sentiment based on recent mentions
    call.sentiment = this.aggregateSentiment(call.recentMentions);
  }

  /**
   * Track a cashtag mention
   */
  trackCashtag(symbol: string, contractAddress: string, platform: 'discord' | 'telegram', channelId: string, channelName: string, userId: string, username: string, messageContent: string) {
    this.trackMention({
      symbol,
      contractAddress,
      platform,
      channelId,
      channelName,
      userId,
      username,
      timestamp: Date.now(),
      messageContent,
    });
  }

  /**
   * Track a contract address mention
   */
  trackAddress(contractAddress: string, platform: 'discord' | 'telegram', channelId: string, channelName: string, userId: string, username: string, messageContent: string) {
    this.trackMention({
      contractAddress,
      platform,
      channelId,
      channelName,
      userId,
      username,
      timestamp: Date.now(),
      messageContent,
    });
  }

  /**
   * Update risk score for a call
   */
  updateRiskScore(contractAddress: string, riskScore: number) {
    const call = this.calls.get(contractAddress.toLowerCase());
    if (call) {
      call.riskScore = riskScore;
    }
  }

  /**
   * Get trending calls with filters
   */
  getTrendingCalls(timeframe: '1h' | '6h' | '24h' | '7d' = '24h', platform?: 'discord' | 'telegram', minMentions: number = 2): TrendingCall[] {
    const now = Date.now();
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };
    
    const cutoff = now - timeframes[timeframe];
    
    return Array.from(this.calls.values())
      .filter(call => {
        // Filter by timeframe
        if (call.lastSeen < cutoff) return false;
        
        // Filter by platform
        if (platform && call.platform !== platform && call.platform !== 'both') return false;
        
        // Filter by minimum mentions
        if (call.mentions < minMentions) return false;
        
        return true;
      })
      .map(call => ({
        ...call,
        uniqueUsers: new Set(call.uniqueUsers), // Create new Set for serialization
        channels: new Set(call.channels),
      }))
      .sort((a, b) => {
        // Sort by weighted score: mentions * uniqueUsers * recency
        const scoreA = a.mentions * a.uniqueUsers.size * (1 / (now - a.lastSeen + 1));
        const scoreB = b.mentions * b.uniqueUsers.size * (1 / (now - b.lastSeen + 1));
        return scoreB - scoreA;
      })
      .slice(0, 50); // Top 50
  }

  /**
   * Get call details
   */
  getCall(contractAddress: string): TrendingCall | null {
    const call = this.calls.get(contractAddress.toLowerCase());
    if (!call) return null;
    
    return {
      ...call,
      uniqueUsers: new Set(call.uniqueUsers),
      channels: new Set(call.channels),
    };
  }

  /**
   * Detect sentiment from message content
   */
  private detectSentiment(message: string): 'bullish' | 'neutral' | 'bearish' {
    const lowerMsg = message.toLowerCase();
    
    const bullishWords = ['moon', 'pump', 'bullish', 'buy', 'lfg', 'gem', 'undervalued', 'based', 'fire', 'alpha'];
    const bearishWords = ['dump', 'rug', 'scam', 'bearish', 'sell', 'exit', 'avoid', 'red flag', 'sus'];
    
    let bullishCount = 0;
    let bearishCount = 0;
    
    bullishWords.forEach(word => {
      if (lowerMsg.includes(word)) bullishCount++;
    });
    
    bearishWords.forEach(word => {
      if (lowerMsg.includes(word)) bearishCount++;
    });
    
    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'neutral';
  }

  /**
   * Aggregate sentiment from multiple mentions
   */
  private aggregateSentiment(mentions: CallMention[]): 'bullish' | 'neutral' | 'bearish' {
    if (mentions.length === 0) return 'neutral';
    
    let bullish = 0;
    let bearish = 0;
    
    mentions.forEach(m => {
      const sentiment = this.detectSentiment(m.messageContent);
      if (sentiment === 'bullish') bullish++;
      if (sentiment === 'bearish') bearish++;
    });
    
    if (bullish > bearish * 1.5) return 'bullish';
    if (bearish > bullish * 1.5) return 'bearish';
    return 'neutral';
  }

  /**
   * Cleanup old data
   */
  private cleanup() {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const [key, call] of this.calls.entries()) {
      if (now - call.lastSeen > maxAge) {
        this.calls.delete(key);
      }
    }
    
    console.log(`[TrendingCalls] Cleanup complete. Active calls: ${this.calls.size}`);
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      totalCalls: this.calls.size,
      totalMentions: Array.from(this.calls.values()).reduce((sum, call) => sum + call.mentions, 0),
      uniqueUsers: new Set(Array.from(this.calls.values()).flatMap(call => Array.from(call.uniqueUsers))).size,
    };
  }
}

// Export singleton instance
export const trendingCallsTracker = new TrendingCallsTracker();

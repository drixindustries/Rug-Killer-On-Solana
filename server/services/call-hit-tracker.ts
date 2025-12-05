/**
 * Call Hit Tracker Service
 * Monitors token calls for 20%+ price gains and tracks caller performance
 * 
 * Features:
 * - Track calls and monitor for 20%+ gains
 * - Leaderboard of top callers
 * - Win rate calculation
 * - Discord/Telegram notifications on call hits
 */

import { db } from '../db.js';
import { eq, desc, gte, and } from 'drizzle-orm';

// Price fetching
async function getPrice(mint: string): Promise<number> {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      signal: AbortSignal.timeout(6000)
    });
    const data = await response.json();
    if (data?.pairs?.[0]?.priceUsd) {
      return parseFloat(data.pairs[0].priceUsd);
    }
  } catch (error) {
    console.error(`[CallTracker] Failed to fetch price for ${mint}:`, error);
  }
  return 0;
}

// Types
interface Call {
  id: string;
  contractAddress: string;
  symbol?: string;
  userId: string;
  username: string;
  chatId: string;
  platform: 'discord' | 'telegram';
  callText: string;
  initialPrice: number;
  currentPrice?: number;
  gainPct?: number;
  hitTarget: boolean;
  notified: boolean;
  calledAt: number;
  hitAt?: number;
}

interface CallerStats {
  userId: string;
  username: string;
  totalCalls: number;
  hits: number;
  misses: number;
  hitRate: number;
  avgGain: number;
  bestGain: number;
  totalGainPct: number;
}

// In-memory storage (production should use database)
const activeCalls: Map<string, Call> = new Map();
const callerStats: Map<string, CallerStats> = new Map();
const HIT_THRESHOLD = 0.20; // 20% gain
const CHECK_INTERVAL = 60000; // Check every minute
const CALL_EXPIRY = 24 * 60 * 60 * 1000; // Calls expire after 24 hours

// Callbacks for notifications
type NotifyCallback = (call: Call, gainPct: number) => Promise<void>;
const notifyCallbacks: NotifyCallback[] = [];

/**
 * Register a new call
 */
export async function registerCall(
  contractAddress: string,
  userId: string,
  username: string,
  chatId: string,
  platform: 'discord' | 'telegram',
  callText: string,
  symbol?: string
): Promise<Call | null> {
  const initialPrice = await getPrice(contractAddress);
  if (initialPrice <= 0) {
    console.log(`[CallTracker] Cannot register call - no price for ${contractAddress}`);
    return null;
  }
  
  const callId = `${contractAddress}_${userId}_${Date.now()}`;
  
  const call: Call = {
    id: callId,
    contractAddress: contractAddress.toLowerCase(),
    symbol,
    userId,
    username,
    chatId,
    platform,
    callText,
    initialPrice,
    hitTarget: false,
    notified: false,
    calledAt: Date.now()
  };
  
  activeCalls.set(callId, call);
  
  // Update caller stats
  let stats = callerStats.get(userId);
  if (!stats) {
    stats = {
      userId,
      username,
      totalCalls: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgGain: 0,
      bestGain: 0,
      totalGainPct: 0
    };
    callerStats.set(userId, stats);
  }
  stats.totalCalls++;
  stats.username = username; // Update username in case it changed
  
  console.log(`[CallTracker] Registered call: ${symbol || contractAddress.slice(0, 8)} by ${username} @ $${initialPrice.toFixed(8)}`);
  
  return call;
}

/**
 * Check all active calls for 20%+ gains
 */
export async function checkCalls(): Promise<Call[]> {
  const hits: Call[] = [];
  const now = Date.now();
  
  for (const [callId, call] of activeCalls.entries()) {
    // Skip already notified calls
    if (call.notified) continue;
    
    // Expire old calls
    if (now - call.calledAt > CALL_EXPIRY) {
      call.hitTarget = false;
      activeCalls.delete(callId);
      
      // Update caller stats as miss
      const stats = callerStats.get(call.userId);
      if (stats) {
        stats.misses++;
        stats.hitRate = stats.hits / (stats.hits + stats.misses) * 100;
      }
      continue;
    }
    
    // Check current price
    const currentPrice = await getPrice(call.contractAddress);
    if (currentPrice <= 0) continue;
    
    call.currentPrice = currentPrice;
    const gainPct = ((currentPrice - call.initialPrice) / call.initialPrice);
    call.gainPct = gainPct * 100;
    
    // Check if hit threshold
    if (gainPct >= HIT_THRESHOLD && !call.hitTarget) {
      call.hitTarget = true;
      call.hitAt = now;
      call.notified = true;
      
      // Update caller stats
      const stats = callerStats.get(call.userId);
      if (stats) {
        stats.hits++;
        stats.hitRate = stats.hits / (stats.hits + stats.misses) * 100;
        stats.totalGainPct += call.gainPct;
        stats.avgGain = stats.totalGainPct / stats.hits;
        if (call.gainPct > stats.bestGain) {
          stats.bestGain = call.gainPct;
        }
      }
      
      hits.push(call);
      
      // Notify
      console.log(`[CallTracker] 🎯 HIT! ${call.symbol || call.contractAddress.slice(0, 8)} +${call.gainPct.toFixed(1)}% by ${call.username}`);
      
      for (const callback of notifyCallbacks) {
        try {
          await callback(call, call.gainPct);
        } catch (error) {
          console.error('[CallTracker] Notification callback error:', error);
        }
      }
    }
  }
  
  return hits;
}

/**
 * Get leaderboard of top callers
 */
export function getLeaderboard(limit: number = 10): CallerStats[] {
  const allStats = Array.from(callerStats.values())
    .filter(s => s.totalCalls >= 3) // Minimum 3 calls
    .sort((a, b) => {
      // Sort by hit rate, then by total hits
      if (b.hitRate !== a.hitRate) return b.hitRate - a.hitRate;
      return b.hits - a.hits;
    })
    .slice(0, limit);
  
  return allStats.map((stats, index) => ({
    ...stats,
    rank: index + 1
  }));
}

/**
 * Get caller stats
 */
export function getCallerStats(userId: string): CallerStats | null {
  return callerStats.get(userId) || null;
}

/**
 * Get active calls for a contract
 */
export function getCallsForContract(contractAddress: string): Call[] {
  const ca = contractAddress.toLowerCase();
  return Array.from(activeCalls.values()).filter(c => c.contractAddress === ca);
}

/**
 * Register notification callback
 */
export function onCallHit(callback: NotifyCallback): void {
  notifyCallbacks.push(callback);
}

/**
 * Format leaderboard for Discord embed
 */
export function formatLeaderboardEmbed(leaderboard: CallerStats[]): any {
  const description = leaderboard.map((stats, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
    return `${medal} **${stats.username}**\n` +
           `   🎯 ${stats.hitRate.toFixed(1)}% hit rate | ` +
           `${stats.hits}/${stats.totalCalls} calls | ` +
           `Best: +${stats.bestGain.toFixed(0)}%`;
  }).join('\n\n');
  
  return {
    title: '🏆 Call Tracker Leaderboard',
    description: description || 'No callers with enough calls yet',
    color: 0xFFD700,
    footer: { text: 'Minimum 3 calls required | Tracks 20%+ gains' },
    timestamp: new Date().toISOString()
  };
}

/**
 * Format call hit notification
 */
export function formatCallHitEmbed(call: Call): any {
  const gainEmoji = call.gainPct! >= 100 ? '🚀' : call.gainPct! >= 50 ? '🔥' : '📈';
  
  return {
    title: `${gainEmoji} CALL HIT! +${call.gainPct!.toFixed(1)}%`,
    description: `**${call.symbol || call.contractAddress.slice(0, 12)}** hit target!\n\nCalled by: **${call.username}**`,
    color: 0x00FF88,
    fields: [
      {
        name: '💰 Entry Price',
        value: `$${call.initialPrice.toFixed(8)}`,
        inline: true
      },
      {
        name: '📈 Current Price',
        value: `$${call.currentPrice!.toFixed(8)}`,
        inline: true
      },
      {
        name: '🎯 Gain',
        value: `+${call.gainPct!.toFixed(1)}%`,
        inline: true
      },
      {
        name: '⏱️ Time to Hit',
        value: call.hitAt ? `${Math.round((call.hitAt - call.calledAt) / 60000)} min` : 'N/A',
        inline: true
      }
    ],
    footer: { text: `Contract: ${call.contractAddress}` },
    timestamp: new Date().toISOString()
  };
}

// Background checker
let checkInterval: NodeJS.Timeout | null = null;

export function startCallTracker(): void {
  if (checkInterval) return;
  
  console.log('[CallTracker] Starting call tracker service...');
  checkInterval = setInterval(async () => {
    try {
      await checkCalls();
    } catch (error) {
      console.error('[CallTracker] Check error:', error);
    }
  }, CHECK_INTERVAL);
}

export function stopCallTracker(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('[CallTracker] Stopped call tracker service');
  }
}

export const callHitTracker = {
  registerCall,
  checkCalls,
  getLeaderboard,
  getCallerStats,
  getCallsForContract,
  onCallHit,
  formatLeaderboardEmbed,
  formatCallHitEmbed,
  startCallTracker,
  stopCallTracker
};

export default callHitTracker;

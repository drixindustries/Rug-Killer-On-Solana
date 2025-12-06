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

// Price and market cap fetching
interface TokenData {
  price: number;
  mcap: number;
  symbol?: string;
}

async function getTokenData(mint: string): Promise<TokenData> {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      signal: AbortSignal.timeout(6000)
    });
    const data = await response.json();
    const pair = data?.pairs?.[0];
    if (pair) {
      return {
        price: parseFloat(pair.priceUsd || '0'),
        mcap: parseFloat(pair.marketCap || pair.fdv || '0'),
        symbol: pair.baseToken?.symbol
      };
    }
  } catch (error) {
    console.error(`[CallTracker] Failed to fetch data for ${mint}:`, error);
  }
  return { price: 0, mcap: 0 };
}

async function getPrice(mint: string): Promise<number> {
  const data = await getTokenData(mint);
  return data.price;
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
  initialMcap?: number;
  currentPrice?: number;
  currentMcap?: number;
  gainPct?: number;
  mcapGainPct?: number;
  hitTarget: boolean;
  notified: boolean;
  calledAt: number;
  hitAt?: number;
}

export type { Call, CallerStats };

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
const PUMP_ALERT_THRESHOLDS = [20, 50, 100, 200, 500]; // Alert at these % gains
const CHECK_INTERVAL = 60000; // Check every minute
const CALL_EXPIRY = 24 * 60 * 60 * 1000; // Calls expire after 24 hours

// PNL Alert channels per guild
const pnlChannels: Map<string, string> = new Map(); // guildId -> channelId

// Track which alerts have been sent (callId -> Set of thresholds hit)
const alertsSent: Map<string, Set<number>> = new Map();

// Callbacks for notifications
type NotifyCallback = (call: Call, gainPct: number) => Promise<void>;
type PumpAlertCallback = (call: Call, gainPct: number, threshold: number, channelId: string) => Promise<void>;
const notifyCallbacks: NotifyCallback[] = [];
const pumpAlertCallbacks: PumpAlertCallback[] = [];

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
 * Check all active calls for gains and send pump alerts
 */
export async function checkCalls(): Promise<Call[]> {
  const hits: Call[] = [];
  const now = Date.now();
  
  for (const [callId, call] of activeCalls.entries()) {
    // Expire old calls
    if (now - call.calledAt > CALL_EXPIRY) {
      if (!call.hitTarget) {
        // Update caller stats as miss
        const stats = callerStats.get(call.userId);
        if (stats) {
          stats.misses++;
          stats.hitRate = stats.hits / (stats.hits + stats.misses) * 100;
        }
      }
      activeCalls.delete(callId);
      alertsSent.delete(callId);
      continue;
    }
    
    // Check current price
    const currentPrice = await getPrice(call.contractAddress);
    if (currentPrice <= 0) continue;
    
    call.currentPrice = currentPrice;
    const gainPct = ((currentPrice - call.initialPrice) / call.initialPrice) * 100;
    call.gainPct = gainPct;
    
    // Initialize alerts tracking for this call
    if (!alertsSent.has(callId)) {
      alertsSent.set(callId, new Set());
    }
    const sentThresholds = alertsSent.get(callId)!;
    
    // Check for pump alerts at multiple thresholds (20%, 50%, 100%, 200%, 500%)
    for (const threshold of PUMP_ALERT_THRESHOLDS) {
      if (gainPct >= threshold && !sentThresholds.has(threshold)) {
        sentThresholds.add(threshold);
        
        console.log(`[CallTracker] 🚀 PUMP ALERT! ${call.symbol || call.contractAddress.slice(0, 8)} +${gainPct.toFixed(1)}% (hit ${threshold}% threshold) by ${call.username}`);
        
        // Send pump alerts to all configured channels
        for (const [guildId, channelId] of pnlChannels.entries()) {
          for (const callback of pumpAlertCallbacks) {
            try {
              await callback(call, gainPct, threshold, channelId);
            } catch (error) {
              console.error('[CallTracker] Pump alert callback error:', error);
            }
          }
        }
      }
    }
    
    // Check if first hit 20% threshold (for stats)
    if (gainPct >= HIT_THRESHOLD * 100 && !call.hitTarget) {
      call.hitTarget = true;
      call.hitAt = now;
      
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
      
      // Notify first hit callbacks
      if (!call.notified) {
        call.notified = true;
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
 * Register pump alert callback (for 20%, 50%, 100%+ alerts)
 */
export function onPumpAlert(callback: PumpAlertCallback): void {
  pumpAlertCallbacks.push(callback);
}

/**
 * Set PNL alert channel for a guild
 */
export function setPnlChannel(guildId: string, channelId: string): void {
  pnlChannels.set(guildId, channelId);
  console.log(`[CallTracker] Set PNL channel for guild ${guildId}: ${channelId}`);
}

/**
 * Get PNL alert channel for a guild
 */
export function getPnlChannel(guildId: string): string | undefined {
  return pnlChannels.get(guildId);
}

/**
 * Get all configured PNL channels
 */
export function getAllPnlChannels(): Map<string, string> {
  return new Map(pnlChannels);
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

/**
 * Format pump alert notification
 */
export function formatPumpAlertEmbed(call: Call, gainPct: number, threshold: number): any {
  const emoji = threshold >= 500 ? '🌙' : threshold >= 200 ? '💎' : threshold >= 100 ? '🚀' : threshold >= 50 ? '🔥' : '📈';
  const color = threshold >= 100 ? 0x00FF88 : threshold >= 50 ? 0xFFD700 : 0x3498DB;
  
  return {
    title: `${emoji} +${threshold}% PUMP! ${call.symbol || call.contractAddress.slice(0, 12)}`,
    description: `**Called by:** ${call.username}\n\n` +
      `This token has pumped **+${gainPct.toFixed(1)}%** since the call!`,
    color,
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
        name: '🎯 Current Gain',
        value: `+${gainPct.toFixed(1)}%`,
        inline: true
      },
      {
        name: '⏱️ Time Since Call',
        value: `${Math.round((Date.now() - call.calledAt) / 60000)} min`,
        inline: true
      }
    ],
    footer: { text: `Contract: ${call.contractAddress}` },
    timestamp: new Date().toISOString()
  };
}

/**
 * Get call stats for display
 */
export function getCallStats(): { activeCalls: number; totalCallers: number; pnlChannels: number } {
  return {
    activeCalls: activeCalls.size,
    totalCallers: callerStats.size,
    pnlChannels: pnlChannels.size
  };
}

export const callHitTracker = {
  registerCall,
  checkCalls,
  getLeaderboard,
  getCallerStats,
  getCallsForContract,
  onCallHit,
  onPumpAlert,
  setPnlChannel,
  getPnlChannel,
  getAllPnlChannels,
  formatLeaderboardEmbed,
  formatCallHitEmbed,
  formatPumpAlertEmbed,
  getCallStats,
  startCallTracker,
  stopCallTracker
};

export default callHitTracker;

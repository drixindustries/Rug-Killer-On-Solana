/**
 * PnL Tracker Service - FIFO/LIFO Accounting
 * Based on Grok's 2025 research for accurate Solana trading PnL
 * 
 * Features:
 * - FIFO (First In, First Out) and LIFO (Last In, First Out) accounting
 * - Per-token realized + unrealized PnL
 * - Win rate calculation
 * - IRS wash sale rule detection
 * - Tax report generation
 */

import { db } from '../db.js';
import { trades, smartWallets } from '../../shared/schema.ts';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

// Price fetching
const SOL_MINT = 'So11111111111111111111111111111111111111112';

interface PriceCache {
  [mint: string]: { price: number; timestamp: number };
}

const priceCache: PriceCache = {};
const PRICE_CACHE_TTL = 300000; // 5 minutes (increased from 1 minute to reduce API calls)

async function getPrice(mint: string): Promise<number> {
  const cached = priceCache[mint];
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
    return cached.price;
  }
  
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      signal: AbortSignal.timeout(6000)
    });
    const data = await response.json();
    if (data?.pairs?.[0]?.priceUsd) {
      const price = parseFloat(data.pairs[0].priceUsd);
      priceCache[mint] = { price, timestamp: Date.now() };
      return price;
    }
  } catch (error) {
    console.error(`[PnL] Failed to fetch price for ${mint}:`, error);
  }
  return 0;
}

// Types
export type AccountingMethod = 'FIFO' | 'LIFO';

interface TradeLot {
  amount: number;
  costPerTokenSol: number;
  costBasisUsd: number;
  dateAcquired: string;
  txSignature: string;
}

interface TaxEvent {
  dateSold: string;
  token: string;
  tokenSymbol?: string;
  amountSold: number;
  proceedsUsd: number;
  costBasisUsd: number;
  gainLossUsd: number;
  holdingPeriod: 'short' | 'long';
  washSaleDisallowed: number;
  txSell: string;
  txBuy: string;
}

interface TokenPnL {
  holding: number;
  costSol: number;
  currentPriceUsd: number;
  currentValueUsd: number;
  realizedPnlSol: number;
  unrealizedPnlSol: number;
  totalPnlSol: number;
  totalPnlUsd: number;
  totalPnlPct: number;
}

export interface PnLReport {
  wallet: string;
  walletShort: string;
  method: AccountingMethod;
  totalInvestedSol: number;
  realizedPnlSol: number;
  unrealizedPnlSol: number;
  totalPnlSol: number;
  totalPnlUsd: number;
  roiPct: number;
  winRatePct: number;
  totalTrades: number;
  profitableTrades: number;
  perToken: Record<string, TokenPnL>;
  generatedAt: number;
}

export interface TaxReport extends PnLReport {
  year: number | 'all_time';
  washSaleRule: 'ENFORCED';
  shortTermGainsUsd: number;
  longTermGainsUsd: number;
  totalCapitalGainsUsd: number;
  totalCapitalLossesUsd: number;
  totalDisallowedLossesUsd: number;
  washSaleEvents: number;
  taxEvents: TaxEvent[];
}

// Trade record from database
interface TradeRecord {
  id: number;
  walletAddress: string;
  tokenMint: string;
  tokenSymbol?: string | null;
  side: 'buy' | 'sell';
  amount: string; // Decimal comes as string from db
  totalSol: string | null;
  priceUsd?: string | null;
  txSignature: string | null;
  tradedAt: Date;
}

/**
 * Calculate PnL for a wallet using FIFO or LIFO accounting
 */
export async function calculatePnL(
  walletAddress: string,
  method: AccountingMethod = 'FIFO'
): Promise<PnLReport> {
  // Fetch trades from database
  const tradeRecords = await db
    .select()
    .from(trades)
    .where(eq(trades.walletAddress, walletAddress))
    .orderBy(trades.tradedAt);
  
  if (!tradeRecords || tradeRecords.length === 0) {
    return {
      wallet: walletAddress,
      walletShort: `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`,
      method,
      totalInvestedSol: 0,
      realizedPnlSol: 0,
      unrealizedPnlSol: 0,
      totalPnlSol: 0,
      totalPnlUsd: 0,
      roiPct: 0,
      winRatePct: 0,
      totalTrades: 0,
      profitableTrades: 0,
      perToken: {},
      generatedAt: Date.now()
    };
  }
  
  const solPrice = await getPrice(SOL_MINT);
  
  let totalInvested = 0;
  let realizedPnlSol = 0;
  const stacks: Record<string, TradeLot[]> = {};
  const perToken: Record<string, TokenPnL> = {};
  const realizedPerToken: Record<string, number> = {};
  
  // Process all trades
  for (const trade of tradeRecords) {
    const mint = trade.tokenMint;
    const amount = parseFloat(trade.amount || '0');
    const solAmount = parseFloat(trade.totalSol || '0');
    
    if (!stacks[mint]) stacks[mint] = [];
    if (!realizedPerToken[mint]) realizedPerToken[mint] = 0;
    
    if (trade.side === 'buy') {
      const costPerToken = amount > 0 ? solAmount / amount : 0;
      stacks[mint].push({
        amount: amount,
        costPerTokenSol: costPerToken,
        costBasisUsd: solAmount * solPrice,
        dateAcquired: new Date(trade.tradedAt).toISOString().split('T')[0],
        txSignature: trade.txSignature || ''
      });
      totalInvested += solAmount;
    } else if (trade.side === 'sell') {
      let remaining = amount;
      const soldSol = solAmount;
      
      while (remaining > 0 && stacks[mint].length > 0) {
        // FIFO: pop from front, LIFO: pop from back
        const lot = method === 'LIFO' ? stacks[mint].pop()! : stacks[mint].shift()!;
        const sellFromLot = Math.min(lot.amount, remaining);
        const costOfSold = sellFromLot * lot.costPerTokenSol;
        const revenue = soldSol * (sellFromLot / amount);
        
        realizedPnlSol += revenue - costOfSold;
        realizedPerToken[mint] += revenue - costOfSold;
        
        remaining -= sellFromLot;
        
        // Push back remainder if partial sell
        if (sellFromLot < lot.amount) {
          const remainder: TradeLot = {
            ...lot,
            amount: lot.amount - sellFromLot
          };
          if (method === 'LIFO') {
            stacks[mint].push(remainder);
          } else {
            stacks[mint].unshift(remainder);
          }
        }
      }
    }
  }
  
  // Calculate unrealized PnL for remaining holdings
  let unrealizedPnlSol = 0;
  let profitableTrades = 0;
  
  for (const [mint, lots] of Object.entries(stacks)) {
    if (lots.length === 0) continue;
    
    const totalAmount = lots.reduce((sum, lot) => sum + lot.amount, 0);
    const totalCostSol = lots.reduce((sum, lot) => sum + (lot.amount * lot.costPerTokenSol), 0);
    
    const currentPrice = await getPrice(mint);
    if (currentPrice === 0) continue;
    
    const currentValueSol = (totalAmount * currentPrice) / solPrice;
    const unrealized = currentValueSol - totalCostSol;
    unrealizedPnlSol += unrealized;
    
    const realized = realizedPerToken[mint] || 0;
    const totalPnl = realized + unrealized;
    
    if (totalPnl > 0) profitableTrades++;
    
    perToken[mint] = {
      holding: Math.round(totalAmount * 1000000) / 1000000,
      costSol: Math.round(totalCostSol * 10000) / 10000,
      currentPriceUsd: currentPrice,
      currentValueUsd: Math.round(totalAmount * currentPrice * 100) / 100,
      realizedPnlSol: Math.round(realized * 10000) / 10000,
      unrealizedPnlSol: Math.round(unrealized * 10000) / 10000,
      totalPnlSol: Math.round(totalPnl * 10000) / 10000,
      totalPnlUsd: Math.round(totalPnl * solPrice * 100) / 100,
      totalPnlPct: totalCostSol > 0 ? Math.round((totalPnl / totalCostSol) * 1000) / 10 : 0
    };
  }
  
  const totalPnlSol = realizedPnlSol + unrealizedPnlSol;
  const totalTokens = Object.keys(perToken).length;
  const winRate = totalTokens > 0 ? (profitableTrades / totalTokens) * 100 : 0;
  const roi = totalInvested > 0 ? (totalPnlSol / totalInvested) * 100 : 0;
  
  return {
    wallet: walletAddress,
    walletShort: `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`,
    method,
    totalInvestedSol: Math.round(totalInvested * 10000) / 10000,
    realizedPnlSol: Math.round(realizedPnlSol * 10000) / 10000,
    unrealizedPnlSol: Math.round(unrealizedPnlSol * 10000) / 10000,
    totalPnlSol: Math.round(totalPnlSol * 10000) / 10000,
    totalPnlUsd: Math.round(totalPnlSol * solPrice * 100) / 100,
    roiPct: Math.round(roi * 10) / 10,
    winRatePct: Math.round(winRate * 10) / 10,
    totalTrades: tradeRecords.length,
    profitableTrades,
    perToken: Object.fromEntries(
      Object.entries(perToken).sort((a, b) => b[1].totalPnlSol - a[1].totalPnlSol)
    ),
    generatedAt: Date.now()
  };
}

/**
 * Generate tax report with IRS wash sale rule enforcement
 */
export async function generateTaxReport(
  walletAddress: string,
  year?: number,
  method: AccountingMethod = 'FIFO'
): Promise<TaxReport> {
  const pnl = await calculatePnL(walletAddress, method);
  
  // Fetch trades for tax events
  let tradeRecords = await db
    .select()
    .from(trades)
    .where(eq(trades.walletAddress, walletAddress))
    .orderBy(trades.tradedAt);
  
  if (!tradeRecords) tradeRecords = [];
  
  // Filter by year if specified
  if (year) {
    tradeRecords = tradeRecords.filter(t => {
      const tradeYear = new Date(t.tradedAt).getFullYear();
      return tradeYear === year;
    });
  }
  
  const solPrice = await getPrice(SOL_MINT);
  const taxEvents: TaxEvent[] = [];
  const stacks: Record<string, TradeLot[]> = {};
  const washAdjustedBasis: Record<string, number> = {};
  let totalDisallowedLosses = 0;
  
  // Process trades for tax events
  for (const trade of tradeRecords) {
    const mint = trade.tokenMint;
    const amount = parseFloat(trade.amount || '0');
    const solAmount = parseFloat(trade.totalSol || '0');
    const timestamp = new Date(trade.tradedAt);
    const dateStr = timestamp.toISOString().split('T')[0];
    
    if (!stacks[mint]) stacks[mint] = [];
    if (!washAdjustedBasis[mint]) washAdjustedBasis[mint] = 0;
    
    if (trade.side === 'buy') {
      let costPerToken = amount > 0 ? solAmount / amount : 0;
      // Add wash sale adjustment to cost basis
      if (washAdjustedBasis[mint] > 0 && amount > 0) {
        costPerToken += washAdjustedBasis[mint] / amount;
        washAdjustedBasis[mint] = 0; // Reset after applying
      }
      
      stacks[mint].push({
        amount: amount,
        costPerTokenSol: costPerToken,
        costBasisUsd: solAmount * solPrice,
        dateAcquired: dateStr,
        txSignature: trade.txSignature || ''
      });
    } else if (trade.side === 'sell') {
      let remaining = amount;
      const soldSol = solAmount;
      const proceedsUsd = soldSol * solPrice;
      
      while (remaining > 0 && stacks[mint].length > 0) {
        const lot = method === 'LIFO' ? stacks[mint].pop()! : stacks[mint].shift()!;
        const sellFromLot = Math.min(lot.amount, remaining);
        const costBasisUsd = sellFromLot * lot.costPerTokenSol * solPrice;
        const revenueUsd = proceedsUsd * (sellFromLot / amount);
        let gainLossUsd = revenueUsd - costBasisUsd;
        
        // Calculate holding period
        const acquiredDate = new Date(lot.dateAcquired);
        const daysDiff = Math.floor((timestamp.getTime() - acquiredDate.getTime()) / (1000 * 60 * 60 * 24));
        const holdingPeriod: 'short' | 'long' = daysDiff > 365 ? 'long' : 'short';
        
        // WASH SALE CHECK (30 days before or after)
        let washSaleDisallowed = 0;
        if (gainLossUsd < 0) {
          const windowStart = new Date(timestamp.getTime() - 30 * 24 * 60 * 60 * 1000);
          const windowEnd = new Date(timestamp.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          // Check for buys within 30-day window
          const buysInWindow = tradeRecords.filter(t =>
            t.tokenMint === mint &&
            t.side === 'buy' &&
            new Date(t.tradedAt) >= windowStart &&
            new Date(t.tradedAt) <= windowEnd &&
            new Date(t.tradedAt).getTime() !== timestamp.getTime()
          );
          
          if (buysInWindow.length > 0) {
            // IRS Wash Sale Rule: loss is disallowed
            washSaleDisallowed = Math.abs(gainLossUsd);
            totalDisallowedLosses += washSaleDisallowed;
            washAdjustedBasis[mint] += washSaleDisallowed;
            gainLossUsd = 0; // Loss disappears
          }
        }
        
        taxEvents.push({
          dateSold: dateStr,
          token: mint,
          tokenSymbol: trade.tokenSymbol || undefined,
          amountSold: Math.round(sellFromLot * 1000000) / 1000000,
          proceedsUsd: Math.round(revenueUsd * 100) / 100,
          costBasisUsd: Math.round(costBasisUsd * 100) / 100,
          gainLossUsd: Math.round(gainLossUsd * 100) / 100,
          holdingPeriod,
          washSaleDisallowed: Math.round(washSaleDisallowed * 100) / 100,
          txSell: trade.txSignature || '',
          txBuy: lot.txSignature
        });
        
        remaining -= sellFromLot;
        
        if (sellFromLot < lot.amount) {
          const remainder: TradeLot = { ...lot, amount: lot.amount - sellFromLot };
          if (method === 'LIFO') {
            stacks[mint].push(remainder);
          } else {
            stacks[mint].unshift(remainder);
          }
        }
      }
    }
  }
  
  // Calculate gains/losses
  const shortTermGains = taxEvents
    .filter(e => e.holdingPeriod === 'short' && e.gainLossUsd > 0)
    .reduce((sum, e) => sum + e.gainLossUsd, 0);
  
  const longTermGains = taxEvents
    .filter(e => e.holdingPeriod === 'long' && e.gainLossUsd > 0)
    .reduce((sum, e) => sum + e.gainLossUsd, 0);
  
  const totalCapitalGains = taxEvents
    .filter(e => e.gainLossUsd > 0)
    .reduce((sum, e) => sum + e.gainLossUsd, 0);
  
  const totalCapitalLosses = taxEvents
    .filter(e => e.gainLossUsd < 0)
    .reduce((sum, e) => sum + e.gainLossUsd, 0);
  
  return {
    ...pnl,
    year: year || 'all_time',
    washSaleRule: 'ENFORCED',
    shortTermGainsUsd: Math.round(shortTermGains * 100) / 100,
    longTermGainsUsd: Math.round(longTermGains * 100) / 100,
    totalCapitalGainsUsd: Math.round(totalCapitalGains * 100) / 100,
    totalCapitalLossesUsd: Math.round(totalCapitalLosses * 100) / 100,
    totalDisallowedLossesUsd: Math.round(totalDisallowedLosses * 100) / 100,
    washSaleEvents: taxEvents.filter(e => e.washSaleDisallowed > 0).length,
    taxEvents
  };
}

/**
 * Get leaderboard of top callers by win rate and PnL
 */
export async function getCallerLeaderboard(limit: number = 10): Promise<any[]> {
  const wallets = await db
    .select()
    .from(smartWallets)
    .where(gte(smartWallets.wins, 5)) // Minimum 5 trades
    .orderBy(desc(smartWallets.winRate))
    .limit(limit * 2); // Fetch more to filter
  
  const leaderboard = [];
  
  for (const wallet of wallets.slice(0, limit)) {
    const totalTrades = (wallet.wins || 0) + (wallet.losses || 0);
    if (totalTrades < 5) continue;
    
    leaderboard.push({
      rank: leaderboard.length + 1,
      wallet: wallet.walletAddress,
      walletShort: `${wallet.walletAddress.slice(0, 6)}…${wallet.walletAddress.slice(-4)}`,
      displayName: wallet.displayName || `Wallet ${wallet.walletAddress.slice(0, 8)}`,
      winRate: wallet.winRate || 0,
      wins: wallet.wins || 0,
      losses: wallet.losses || 0,
      totalTrades,
      profitSol: wallet.profitSol ? parseFloat(wallet.profitSol) : 0,
      influenceScore: wallet.influenceScore || 50,
      source: wallet.source || 'unknown'
    });
  }
  
  return leaderboard;
}

/**
 * Format PnL report for Discord embed
 */
export function formatPnLForDiscord(pnl: PnLReport): any {
  const color = pnl.totalPnlSol >= 0 ? 0x00FF88 : 0xFF3366;
  const pnlEmoji = pnl.totalPnlSol >= 0 ? '📈' : '📉';
  
  const fields = [
    {
      name: `${pnlEmoji} Total PnL`,
      value: `**${pnl.totalPnlSol >= 0 ? '+' : ''}${pnl.totalPnlSol.toFixed(4)} SOL**\n($${pnl.totalPnlUsd.toLocaleString()})`,
      inline: true
    },
    {
      name: '💰 ROI',
      value: `**${pnl.roiPct >= 0 ? '+' : ''}${pnl.roiPct.toFixed(1)}%**`,
      inline: true
    },
    {
      name: '🎯 Win Rate',
      value: `**${pnl.winRatePct.toFixed(1)}%**`,
      inline: true
    },
    {
      name: '✅ Realized',
      value: `${pnl.realizedPnlSol >= 0 ? '+' : ''}${pnl.realizedPnlSol.toFixed(4)} SOL`,
      inline: true
    },
    {
      name: '⏳ Unrealized',
      value: `${pnl.unrealizedPnlSol >= 0 ? '+' : ''}${pnl.unrealizedPnlSol.toFixed(4)} SOL`,
      inline: true
    },
    {
      name: '📊 Trades',
      value: `${pnl.totalTrades} total`,
      inline: true
    }
  ];
  
  // Add top tokens
  const topTokens = Object.entries(pnl.perToken).slice(0, 5);
  if (topTokens.length > 0) {
    const tokenList = topTokens.map(([mint, data]) => {
      const emoji = data.totalPnlSol >= 0 ? '🟢' : '🔴';
      return `${emoji} \`${mint.slice(0, 8)}…\` ${data.totalPnlSol >= 0 ? '+' : ''}${data.totalPnlSol.toFixed(3)} SOL`;
    }).join('\n');
    
    fields.push({
      name: '🏆 Top Tokens',
      value: tokenList,
      inline: false
    });
  }
  
  return {
    title: `📊 PnL Report (${pnl.method})`,
    description: `Wallet: \`${pnl.walletShort}\`\nInvested: ${pnl.totalInvestedSol.toFixed(4)} SOL`,
    color,
    fields,
    footer: { text: `Generated at ${new Date(pnl.generatedAt).toLocaleString()}` },
    timestamp: new Date().toISOString()
  };
}

/**
 * Format leaderboard for Discord embed
 */
export function formatLeaderboardForDiscord(leaderboard: any[]): any {
  const description = leaderboard.map((entry, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
    const pnlEmoji = entry.profitSol >= 0 ? '📈' : '📉';
    return `${medal} **${entry.displayName}**\n` +
           `   Win: ${entry.winRate.toFixed(1)}% | ${pnlEmoji} ${entry.profitSol >= 0 ? '+' : ''}${entry.profitSol.toFixed(2)} SOL | ${entry.totalTrades} trades`;
  }).join('\n\n');
  
  return {
    title: '🏆 Caller Leaderboard',
    description: description || 'No callers with enough trades yet',
    color: 0xFFD700,
    footer: { text: 'Minimum 5 trades required to qualify' },
    timestamp: new Date().toISOString()
  };
}

export const pnlTracker = {
  calculatePnL,
  generateTaxReport,
  getCallerLeaderboard,
  formatPnLForDiscord,
  formatLeaderboardForDiscord
};

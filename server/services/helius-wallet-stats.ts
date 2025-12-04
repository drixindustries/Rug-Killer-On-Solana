/**
 * Wallet Performance Tracker with Multi-Provider Support
 * 
 * Primary: Helius Enhanced Transactions API
 * Fallback: Moralis Wallet API
 * 
 * Uses multiple data sources to calculate accurate wallet stats:
 * - Win rate (profitable vs unprofitable trades)
 * - Total profit/loss in SOL
 * - Trade count
 * 
 * Much more accurate than raw RPC parsing since these APIs pre-process
 * transaction data and provide swap detection.
 * 
 * Features:
 * - Redis caching (30 min TTL)
 * - Request deduplication (prevents concurrent duplicate requests)
 * - Rate limiting (sliding window)
 */

import { redisCache } from './redis-cache.js';

export interface WalletStats {
  wins: number;
  losses: number;
  winRate: number; // 0-100
  profitSol: number;
  totalTrades: number;
  lastActiveAt: Date;
  source?: string; // Which API provided the data
}

export class HeliusWalletStatsService {
  private readonly HELIUS_API_KEY: string;
  private readonly MORALIS_API_KEY: string;
  private readonly HELIUS_BASE_URL = 'https://api-mainnet.helius-rpc.com/v0';
  private readonly MORALIS_BASE_URL = 'https://solana-gateway.moralis.io';
  private readonly TIMEOUT_MS = 15000;
  private readonly SOL_PRICE = 200; // Approximate SOL price for USD conversion
  
  // Caching - Increased to reduce API calls significantly
  private readonly CACHE_TTL = Number(process.env.HELIUS_WALLET_STATS_CACHE_TTL) || 14400; // 4 hours default (was 30 min)
  
  // Request deduplication - track in-flight requests
  private inFlightRequests = new Map<string, Promise<WalletStats | null>>();
  
  // Rate limiting - sliding window (reduced to conserve credits)
  private readonly MAX_REQUESTS_PER_MINUTE = Number(process.env.HELIUS_MAX_REQUESTS_PER_MINUTE) || 30; // Reduced from 100 to 30
  private readonly RATE_LIMIT_QUEUE_SIZE = Number(process.env.HELIUS_RATE_LIMIT_QUEUE_SIZE) || 50;
  
  // Circuit breaker - stop calling Helius if we're hitting limits
  private circuitBreakerOpen = false;
  private circuitBreakerOpenUntil = 0;
  private consecutiveFailures = 0;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 consecutive failures
  private readonly CIRCUIT_BREAKER_RESET_MS = 5 * 60 * 1000; // 5 minutes
  private requestTimestamps: number[] = [];
  private requestQueue: Array<{ resolve: (value: WalletStats | null) => void; reject: (error: any) => void; fn: () => Promise<WalletStats | null> }> = [];
  private isProcessingQueue = false;

  constructor(heliusKey?: string, moralisKey?: string) {
    this.HELIUS_API_KEY = heliusKey || process.env.HELIUS_API_KEY || '';
    this.MORALIS_API_KEY = moralisKey || process.env.MORALIS_API_KEY || '';
    
    if (!this.HELIUS_API_KEY && !this.MORALIS_API_KEY) {
      console.warn('[WalletStats] No API keys configured - stats will be unavailable');
    } else {
      const providers = [];
      if (this.HELIUS_API_KEY) providers.push('Helius');
      if (this.MORALIS_API_KEY) providers.push('Moralis');
      console.log(`[WalletStats] Initialized with providers: ${providers.join(', ')}`);
      console.log(`[WalletStats] Cache TTL: ${this.CACHE_TTL}s, Rate limit: ${this.MAX_REQUESTS_PER_MINUTE}/min`);
    }
  }

  /**
   * Calculate wallet performance stats using available APIs
   * Tries Helius first, falls back to Moralis
   * 
   * Features:
   * - Redis caching with 4-hour TTL (reduced API calls by 8x)
   * - Request deduplication
   * - Rate limiting (30/min max)
   * - Circuit breaker (stops calling if hitting limits)
   */
  async getWalletStats(walletAddress: string, limit: number = 200): Promise<WalletStats | null> {
    const cacheKey = `helius:wallet-stats:v1:${walletAddress}`;
    
    // Check cache first (4-hour TTL significantly reduces API calls)
    const cached = await redisCache.get<WalletStats>(cacheKey);
    if (cached) {
      console.log(`[WalletStats] Using cached stats for ${walletAddress.slice(0, 8)}... (cache hit)`);
      return cached;
    }
    
    // Check circuit breaker
    const now = Date.now();
    if (this.circuitBreakerOpen && now < this.circuitBreakerOpenUntil) {
      const remainingMs = this.circuitBreakerOpenUntil - now;
      console.warn(`[WalletStats] Circuit breaker OPEN - skipping Helius call (resets in ${Math.ceil(remainingMs / 1000)}s)`);
      return null; // Don't call API if circuit breaker is open
    }
    
    // Reset circuit breaker if time has passed
    if (this.circuitBreakerOpen && now >= this.circuitBreakerOpenUntil) {
      console.log('[WalletStats] Circuit breaker RESET - attempting Helius calls again');
      this.circuitBreakerOpen = false;
      this.consecutiveFailures = 0;
    }
    
    // Check if request is already in flight (deduplication)
    const inFlight = this.inFlightRequests.get(walletAddress);
    if (inFlight) {
      console.log(`[WalletStats] Deduplicating request for ${walletAddress.slice(0, 8)}...`);
      return inFlight;
    }
    
    // Create new request with deduplication tracking
    const requestPromise = this.fetchWithRateLimit(async () => {
      try {
        // Try Helius first (more detailed transaction data)
        if (this.HELIUS_API_KEY) {
          const heliusStats = await this.getHeliusStats(walletAddress, limit);
          if (heliusStats) {
            const result = { ...heliusStats, source: 'helius' };
            await redisCache.set(cacheKey, result, this.CACHE_TTL);
            return result;
          }
        }

        // Fall back to Moralis
        if (this.MORALIS_API_KEY) {
          console.log('[WalletStats] Helius unavailable, trying Moralis...');
          const moralisStats = await this.getMoralisStats(walletAddress, limit);
          if (moralisStats) {
            const result = { ...moralisStats, source: 'moralis' };
            await redisCache.set(cacheKey, result, this.CACHE_TTL);
            return result;
          }
        }

        console.warn('[WalletStats] All providers failed or unavailable');
        return null;
      } finally {
        // Remove from in-flight tracking
        this.inFlightRequests.delete(walletAddress);
      }
    });
    
    // Track in-flight request
    this.inFlightRequests.set(walletAddress, requestPromise);
    
    return requestPromise;
  }
  
  /**
   * Execute request with rate limiting (sliding window)
   */
  private async fetchWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    // Clean up old timestamps (older than 1 minute)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
    
    // Check if we're under the rate limit
    if (this.requestTimestamps.length < this.MAX_REQUESTS_PER_MINUTE) {
      this.requestTimestamps.push(now);
      return fn();
    }
    
    // Rate limited - queue the request
    console.log(`[WalletStats] Rate limited (${this.requestTimestamps.length}/${this.MAX_REQUESTS_PER_MINUTE}), queuing request...`);
    
    // Check queue size
    if (this.requestQueue.length >= this.RATE_LIMIT_QUEUE_SIZE) {
      throw new Error('[WalletStats] Rate limit queue full - try again later');
    }
    
    return new Promise<T>((resolve, reject) => {
      this.requestQueue.push({ resolve: resolve as any, reject, fn: fn as any });
      this.processQueue();
    });
  }
  
  /**
   * Process queued requests as rate limit allows
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
      
      if (this.requestTimestamps.length < this.MAX_REQUESTS_PER_MINUTE) {
        const request = this.requestQueue.shift();
        if (request) {
          this.requestTimestamps.push(now);
          try {
            const result = await request.fn();
            request.resolve(result);
          } catch (error) {
            request.reject(error);
          }
        }
      } else {
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Get wallet stats from Helius Enhanced Transactions API
   */
  private async getHeliusStats(walletAddress: string, limit: number): Promise<WalletStats | null> {
    try {
      const url = `${this.HELIUS_BASE_URL}/addresses/${walletAddress}/transactions?api-key=${this.HELIUS_API_KEY}&limit=${limit}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[WalletStats] Helius rate limited (429) - opening circuit breaker');
          this.consecutiveFailures++;
          if (this.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
            this.circuitBreakerOpen = true;
            this.circuitBreakerOpenUntil = Date.now() + this.CIRCUIT_BREAKER_RESET_MS;
            console.error(`[WalletStats] Circuit breaker OPENED - too many failures. Will reset in ${this.CIRCUIT_BREAKER_RESET_MS / 1000}s`);
          }
        }
        return null;
      }
      
      // Reset failure counter on success
      this.consecutiveFailures = 0;

      const transactions = await response.json();
      return this.analyzeHeliusTransactions(transactions, walletAddress);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('[WalletStats] Helius request timeout');
      } else {
        console.error('[WalletStats] Helius error:', error.message);
      }
      return null;
    }
  }

  /**
   * Analyze Helius transactions to calculate win rate and profit
   */
  private analyzeHeliusTransactions(transactions: any[], walletAddress: string): WalletStats {
    // Simple analysis - count wins/losses based on SOL balance changes
    let totalTrades = 0;
    let wins = 0;
    let totalProfit = 0;
    let lastActiveAt = new Date(0); // Epoch start

    for (const tx of transactions) {
      if (tx.type === 'SWAP' || tx.type === 'TRANSFER') {
        totalTrades++;
        const nativeChange = tx.nativeTransfers?.find((t: any) => t.toUserAccount === walletAddress)?.amount || 0;
        if (nativeChange > 0) {
          wins++;
          totalProfit += nativeChange / 1e9; // Convert lamports to SOL
        } else if (nativeChange < 0) {
          totalProfit += nativeChange / 1e9;
        }
        
        // Track most recent transaction timestamp
        if (tx.timestamp) {
          const txDate = new Date(tx.timestamp * 1000);
          if (txDate > lastActiveAt) {
            lastActiveAt = txDate;
          }
        }
      }
    }

    const losses = totalTrades - wins;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return {
      wins,
      losses,
      winRate,
      profitSol: totalProfit,
      totalTrades,
      lastActiveAt,
      source: 'helius'
    };
  }

  /**
   * Get wallet stats from Moralis Wallet API
   */
  private async getMoralisStats(walletAddress: string, limit: number): Promise<WalletStats | null> {
    try {
      const url = `${this.MORALIS_BASE_URL}/account/mainnet/${walletAddress}/portfolio`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(url, {
        headers: {
          'X-API-Key': this.MORALIS_API_KEY,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[WalletStats] Moralis rate limited');
        }
        return null;
      }

      const data = await response.json();
      return this.analyzeMoralisPortfolio(data, walletAddress);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('[WalletStats] Moralis request timeout');
      } else {
        console.error('[WalletStats] Moralis error:', error.message);
      }
      return null;
    }
  }

  /**
   * Analyze transactions to calculate win rate and profit
   */
  private analyzeTransactions(transactions: any[], walletAddress: string): WalletStats {
    let wins = 0;
    let losses = 0;
    let totalProfitSol = 0;
    let lastActiveTimestamp = 0;

    // Track token positions to determine wins/losses
    const tokenPositions = new Map<string, { inAmount: number; outAmount: number; inSol: number; outSol: number }>();

    for (const tx of transactions) {
      // Update last active timestamp
      if (tx.timestamp && tx.timestamp > lastActiveTimestamp) {
        lastActiveTimestamp = tx.timestamp;
      }

      // Process SWAP transactions
      if (tx.type === 'SWAP') {
        const transfers = tx.tokenTransfers || [];
        
        // Calculate net token flow for this swap
        for (const transfer of transfers) {
          const mint = transfer.mint;
          if (!mint) continue;

          const isIncoming = transfer.toUserAccount === walletAddress;
          const isOutgoing = transfer.fromUserAccount === walletAddress;
          const amount = transfer.tokenAmount || 0;

          if (isIncoming || isOutgoing) {
            if (!tokenPositions.has(mint)) {
              tokenPositions.set(mint, { inAmount: 0, outAmount: 0, inSol: 0, outSol: 0 });
            }

            const position = tokenPositions.get(mint)!;
            
            if (isIncoming) {
              position.inAmount += amount;
            } else if (isOutgoing) {
              position.outAmount += amount;
            }
          }
        }

        // Check SOL balance changes to estimate profit
        const nativeTransfers = tx.nativeTransfers || [];
        for (const transfer of nativeTransfers) {
          if (transfer.toUserAccount === walletAddress) {
            totalProfitSol += transfer.amount / 1e9; // Convert lamports to SOL
          } else if (transfer.fromUserAccount === walletAddress) {
            totalProfitSol -= transfer.amount / 1e9;
          }
        }
      }

      // Process token transfers to detect completed trades
      if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        for (const transfer of tx.tokenTransfers) {
          const mint = transfer.mint;
          if (!mint) continue;

          // If wallet is selling tokens (outgoing), check if it's profitable
          if (transfer.fromUserAccount === walletAddress) {
            const position = tokenPositions.get(mint);
            if (position && position.inAmount > 0) {
              // Selling tokens we bought earlier
              if (position.outAmount > position.inAmount * 1.05) {
                // Sold more than 5% more than bought = likely win
                wins++;
              } else if (position.outAmount >= position.inAmount * 0.5) {
                // Sold at least half = closed position, likely loss if not counted as win
                losses++;
              }
            }
          }
        }
      }
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return {
      wins,
      losses,
      winRate,
      profitSol: totalProfitSol,
      totalTrades,
      lastActiveAt: lastActiveTimestamp > 0 ? new Date(lastActiveTimestamp * 1000) : new Date(),
    };
  }

  /**
   * Analyze Moralis portfolio data to calculate stats
   */
  private analyzeMoralisPortfolio(data: any, walletAddress: string): WalletStats {
    let wins = 0;
    let losses = 0;
    let totalProfitSol = 0;

    // Moralis provides portfolio data with profit/loss information
    const tokens = data.tokens || [];
    
    for (const token of tokens) {
      // Check if token has realized PNL data
      const realizedPnl = token.realized_pnl_usd || 0;
      
      if (realizedPnl > 0) {
        wins++;
        totalProfitSol += realizedPnl / this.SOL_PRICE; // Convert USD to SOL approximation
      } else if (realizedPnl < 0) {
        losses++;
        totalProfitSol += realizedPnl / this.SOL_PRICE;
      }
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return {
      wins,
      losses,
      winRate,
      profitSol: totalProfitSol,
      totalTrades,
      lastActiveAt: new Date(),
    };
  }

  /**
   * Check if any wallet stats API is configured and available
   */
  isAvailable(): boolean {
    return !!(this.HELIUS_API_KEY || this.MORALIS_API_KEY);
  }
}

// Singleton instance
let heliusStatsService: HeliusWalletStatsService | null = null;

export function getHeliusWalletStatsService(): HeliusWalletStatsService {
  if (!heliusStatsService) {
    heliusStatsService = new HeliusWalletStatsService();
  }
  return heliusStatsService;
}

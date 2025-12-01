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
 */

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
    }
  }

  /**
   * Calculate wallet performance stats using available APIs
   * Tries Helius first, falls back to Moralis
   */
  async getWalletStats(walletAddress: string, limit: number = 200): Promise<WalletStats | null> {
    // Try Helius first (more detailed transaction data)
    if (this.HELIUS_API_KEY) {
      const heliusStats = await this.getHeliusStats(walletAddress, limit);
      if (heliusStats) {
        return { ...heliusStats, source: 'helius' };
      }
    }

    // Fall back to Moralis
    if (this.MORALIS_API_KEY) {
      console.log('[WalletStats] Helius unavailable, trying Moralis...');
      const moralisStats = await this.getMoralisStats(walletAddress, limit);
      if (moralisStats) {
        return { ...moralisStats, source: 'moralis' };
      }
    }

    console.warn('[WalletStats] All providers failed or unavailable');
    return null;
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
          console.warn('[WalletStats] Insufficient Helius credits');
        }
        return null;
      }

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
      }
    }

    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return {
      winRate,
      totalTrades,
      profitLoss: totalProfit,
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

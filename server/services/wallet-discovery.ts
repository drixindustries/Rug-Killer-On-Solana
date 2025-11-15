import { Connection, PublicKey, ParsedTransactionWithMeta, ParsedInstruction } from '@solana/web3.js';
import { db } from '../db';
import { kolWallets } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { rpcBalancer } from './rpc-balancer';

interface WalletPerformance {
  wallet: string;
  wins: number;
  losses: number;
  totalTrades: number;
  winRate: number;
  profitSol: number;
  averageHoldTime: number;
  lastActiveAt: Date;
}

interface TokenTrade {
  mint: string;
  buyPrice: number;
  sellPrice: number | null;
  buyTimestamp: number;
  sellTimestamp: number | null;
  profit: number | null;
  isWin: boolean | null;
}

export class WalletDiscoveryService {
  private connection: Connection;
  private minWinRate = 0.6; // 60% win rate minimum
  private minTrades = 10; // Minimum trades to be considered
  private lookbackDays = 30; // Look back 30 days for analysis

  constructor() {
    this.connection = rpcBalancer.getConnection();
  }

  /**
   * Discover profitable wallets by analyzing token holder patterns
   * Identifies wallets that frequently buy tokens early and sell at profit
   */
  async discoverProfitableWallets(tokenMints: string[]): Promise<string[]> {
    const walletCandidates = new Map<string, Set<string>>();

    console.log(`[Wallet Discovery] Analyzing ${tokenMints.length} successful tokens for profitable wallets...`);

    // Analyze each token's early buyers
    for (const mint of tokenMints) {
      try {
        const earlyBuyers = await this.getEarlyBuyers(mint, 50); // Get first 50 buyers
        
        for (const buyer of earlyBuyers) {
          if (!walletCandidates.has(buyer)) {
            walletCandidates.set(buyer, new Set());
          }
          walletCandidates.get(buyer)!.add(mint);
        }
      } catch (error) {
        console.error(`[Wallet Discovery] Error analyzing token ${mint}:`, error);
      }
    }

    // Filter wallets that appear in multiple successful tokens
    const frequentTraders = Array.from(walletCandidates.entries())
      .filter(([_, tokens]) => tokens.size >= 3) // Appeared in at least 3 tokens
      .map(([wallet]) => wallet);

    console.log(`[Wallet Discovery] Found ${frequentTraders.length} frequent traders across successful tokens`);

    // Analyze performance of each candidate
    const profitableWallets: string[] = [];
    for (const wallet of frequentTraders) {
      try {
        const performance = await this.analyzeWalletPerformance(wallet);
        
        if (
          performance.winRate >= this.minWinRate &&
          performance.totalTrades >= this.minTrades &&
          performance.profitSol > 5 // At least 5 SOL profit
        ) {
          profitableWallets.push(wallet);
          await this.saveDiscoveredWallet(wallet, performance);
        }
      } catch (error) {
        console.error(`[Wallet Discovery] Error analyzing wallet ${wallet}:`, error);
      }
    }

    console.log(`[Wallet Discovery] Discovered ${profitableWallets.length} profitable wallets`);
    return profitableWallets;
  }

  /**
   * Get early buyers of a token (first N transactions)
   */
  private async getEarlyBuyers(mint: string, limit: number = 50): Promise<string[]> {
    try {
      const mintPubkey = new PublicKey(mint);
      const signatures = await this.connection.getSignaturesForAddress(
        mintPubkey,
        { limit: 1000 }
      );

      const buyers = new Set<string>();
      let processed = 0;

      // Process transactions in reverse (oldest first)
      for (const sig of signatures.reverse()) {
        if (buyers.size >= limit) break;

        try {
          const tx = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx?.meta || tx.meta.err) continue;

          // Look for token transfers (buys)
          const accountKeys = tx.transaction.message.accountKeys;
          const instructions = tx.transaction.message.instructions;

          for (const ix of instructions) {
            if ('parsed' in ix && ix.parsed?.type === 'transfer') {
              const destination = ix.parsed.info?.destination;
              if (destination) {
                buyers.add(destination);
              }
            }
          }

          processed++;
        } catch (error) {
          // Skip failed transactions
          continue;
        }
      }

      return Array.from(buyers);
    } catch (error) {
      console.error(`[Wallet Discovery] Error getting early buyers for ${mint}:`, error);
      return [];
    }
  }

  /**
   * Analyze a wallet's trading performance
   */
  async analyzeWalletPerformance(walletAddress: string): Promise<WalletPerformance> {
    const trades = await this.getWalletTrades(walletAddress);
    
    let wins = 0;
    let losses = 0;
    let totalProfit = 0;
    let totalHoldTime = 0;
    let closedTrades = 0;

    for (const trade of trades) {
      if (trade.isWin === true) {
        wins++;
        totalProfit += trade.profit || 0;
      } else if (trade.isWin === false) {
        losses++;
        totalProfit += trade.profit || 0;
      }

      if (trade.sellTimestamp && trade.buyTimestamp) {
        totalHoldTime += trade.sellTimestamp - trade.buyTimestamp;
        closedTrades++;
      }
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;
    const averageHoldTime = closedTrades > 0 ? totalHoldTime / closedTrades : 0;

    return {
      wallet: walletAddress,
      wins,
      losses,
      totalTrades,
      winRate,
      profitSol: totalProfit,
      averageHoldTime: averageHoldTime / 1000, // Convert to seconds
      lastActiveAt: new Date(),
    };
  }

  /**
   * Get all trades for a wallet (simplified version - tracks buys/sells)
   */
  private async getWalletTrades(walletAddress: string): Promise<TokenTrade[]> {
    const trades: TokenTrade[] = [];
    const tokenPositions = new Map<string, TokenTrade>();

    try {
      const walletPubkey = new PublicKey(walletAddress);
      const cutoffTime = Date.now() - (this.lookbackDays * 24 * 60 * 60 * 1000);

      // Get recent signatures
      const signatures = await this.connection.getSignaturesForAddress(
        walletPubkey,
        { limit: 1000 }
      );

      for (const sig of signatures) {
        if ((sig.blockTime || 0) * 1000 < cutoffTime) break;

        try {
          const tx = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx?.meta || tx.meta.err) continue;

          // Parse token transfers
          const preBalances = tx.meta.preTokenBalances || [];
          const postBalances = tx.meta.postTokenBalances || [];

          for (const post of postBalances) {
            const pre = preBalances.find(
              p => p.accountIndex === post.accountIndex
            );

            const preAmount = Number(pre?.uiTokenAmount?.uiAmount || 0);
            const postAmount = Number(post.uiTokenAmount?.uiAmount || 0);
            const delta = postAmount - preAmount;

            if (Math.abs(delta) > 0 && post.mint) {
              const mint = post.mint;

              if (delta > 0) {
                // Buy
                tokenPositions.set(mint, {
                  mint,
                  buyPrice: 0, // Would need price oracle
                  sellPrice: null,
                  buyTimestamp: (sig.blockTime || 0) * 1000,
                  sellTimestamp: null,
                  profit: null,
                  isWin: null,
                });
              } else if (delta < 0 && tokenPositions.has(mint)) {
                // Sell
                const position = tokenPositions.get(mint)!;
                position.sellPrice = 0; // Would need price oracle
                position.sellTimestamp = (sig.blockTime || 0) * 1000;
                
                // Simplified: assume profit if held > 1 hour and < 7 days
                const holdTime = position.sellTimestamp - position.buyTimestamp;
                const isWin = holdTime > 3600000 && holdTime < 7 * 24 * 3600000;
                position.isWin = isWin;
                position.profit = isWin ? 0.1 : -0.05; // Placeholder values
                
                trades.push(position);
                tokenPositions.delete(mint);
              }
            }
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      console.error(`[Wallet Discovery] Error getting trades for ${walletAddress}:`, error);
    }

    return trades;
  }

  /**
   * Save discovered wallet to database
   */
  private async saveDiscoveredWallet(
    wallet: string,
    performance: WalletPerformance
  ): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(kolWallets)
        .where(eq(kolWallets.walletAddress, wallet))
        .limit(1);

      const influenceScore = Math.min(
        100,
        Math.floor(performance.winRate * 100 + performance.profitSol * 2)
      );

      if (existing.length > 0) {
        // Update existing
        await db
          .update(kolWallets)
          .set({
            wins: performance.wins,
            losses: performance.losses,
            profitSol: performance.profitSol.toFixed(2),
            influenceScore,
            source: 'auto-discovered',
            lastActiveAt: performance.lastActiveAt,
            updatedAt: new Date(),
          })
          .where(eq(kolWallets.walletAddress, wallet));

        console.log(`[Wallet Discovery] Updated wallet: ${wallet.substring(0, 8)}... (${performance.winRate * 100}% WR)`);
      } else {
        // Insert new
        await db.insert(kolWallets).values({
          walletAddress: wallet,
          displayName: `Trader ${wallet.substring(0, 6)}`,
          wins: performance.wins,
          losses: performance.losses,
          profitSol: performance.profitSol.toFixed(2),
          influenceScore,
          source: 'auto-discovered',
          lastActiveAt: performance.lastActiveAt,
        });

        console.log(`[Wallet Discovery] Discovered new wallet: ${wallet.substring(0, 8)}... (${performance.winRate * 100}% WR)`);
      }
    } catch (error) {
      console.error(`[Wallet Discovery] Error saving wallet ${wallet}:`, error);
    }
  }

  /**
   * Monitor pump.fun for trending tokens, then discover their early buyers
   */
  async monitorPumpFunForWallets(): Promise<void> {
    console.log('[Wallet Discovery] Starting pump.fun wallet discovery monitor...');
    
    // This would integrate with pump.fun WebSocket to get trending tokens
    // For now, we'll provide the structure
    
    // TODO: Get trending tokens from pump.fun
    // TODO: Filter for tokens with 10x+ gains
    // TODO: Run discoverProfitableWallets on those mints
  }

  /**
   * Batch discover wallets from a list of successful token launches
   */
  async batchDiscoverFromSuccessfulTokens(
    minMarketCap: number = 1000000, // $1M min
    minVolumeChange: number = 10 // 10x volume
  ): Promise<void> {
    console.log('[Wallet Discovery] Starting batch wallet discovery...');
    
    // This would:
    // 1. Query DexScreener for recent high-performing tokens
    // 2. Get their contract addresses
    // 3. Run discovery on those addresses
    
    // For now, providing the structure
    console.log('[Wallet Discovery] Batch discovery not yet implemented - requires DexScreener integration');
  }
}

// Singleton instance
let walletDiscoveryInstance: WalletDiscoveryService | null = null;

export function getWalletDiscoveryService(): WalletDiscoveryService {
  if (!walletDiscoveryInstance) {
    walletDiscoveryInstance = new WalletDiscoveryService();
  }
  return walletDiscoveryInstance;
}

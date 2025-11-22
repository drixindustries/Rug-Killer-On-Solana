/**
 * External Wallet Sources
 * 
 * This service aggregates profitable wallet data from multiple external sources
 * to expand our alpha caller database beyond manually seeded wallets.
 * 
 * Sources:
 * - Solscan API (trending traders)
 * - Community submissions (verified manually)
 * - Auto-discovered wallets (from our own analysis)
 */

import { db } from '../db';
import { kolWallets } from '../../shared/schema';
import { eq } from 'drizzle-orm';

interface ExternalWallet {
  address: string;
  displayName?: string;
  winRate?: number;
  profitSol?: number;
  trades?: number;
  source: string;
}

export class ExternalWalletSourceService {
  /**
   * Fetch trending wallets from Solscan API
   * Note: Solscan doesn't have a public profitable traders API
   * This is a placeholder for when/if they add it
   */
  async fetchSolscanTrendingWallets(): Promise<ExternalWallet[]> {
    console.log('[External Wallets] Solscan trending wallets - Not yet available via API');
    return [];
  }

  /**
   * Parse wallets from community-submitted lists
   * E.g., Twitter threads, Discord shares, etc.
   */
  async importCommunityWallets(wallets: ExternalWallet[]): Promise<number> {
    let imported = 0;

    for (const wallet of wallets) {
      try {
        const existing = await db
          .select()
          .from(kolWallets)
          .where(eq(kolWallets.walletAddress, wallet.address))
          .limit(1);

        if (existing.length > 0) {
          // Update if community data is better
          if (wallet.profitSol && wallet.profitSol > Number(existing[0].profitSol || 0)) {
            await db
              .update(kolWallets)
              .set({
                displayName: wallet.displayName || existing[0].displayName,
                profitSol: wallet.profitSol.toFixed(2),
                wins: wallet.trades ? Math.floor(wallet.trades * (wallet.winRate || 0.5)) : existing[0].wins,
                losses: wallet.trades ? wallet.trades - Math.floor(wallet.trades * (wallet.winRate || 0.5)) : existing[0].losses,
                source: `${existing[0].source},${wallet.source}`,
                updatedAt: new Date(),
              })
              .where(eq(kolWallets.walletAddress, wallet.address));
          }
        } else {
          // Insert new wallet
          await db.insert(kolWallets).values({
            walletAddress: wallet.address,
            displayName: wallet.displayName || `Trader ${wallet.address.substring(0, 6)}`,
            profitSol: wallet.profitSol?.toFixed(2),
            wins: wallet.trades ? Math.floor(wallet.trades * (wallet.winRate || 0.5)) : 0,
            losses: wallet.trades ? wallet.trades - Math.floor(wallet.trades * (wallet.winRate || 0.5)) : 0,
            influenceScore: wallet.winRate ? Math.floor(wallet.winRate * 100) : 50,
            source: wallet.source,
            lastActiveAt: new Date(),
          });
          
          imported++;
        }
      } catch (error) {
        console.error(`[External Wallets] Error importing ${wallet.address}:`, error);
      }
    }

    console.log(`[External Wallets] Imported ${imported} new community wallets`);
    return imported;
  }

  /**
   * Aggregate wallets from all sources
   */
  async aggregateAllSources(): Promise<void> {
    console.log('[External Wallets] Starting wallet aggregation from all sources...');

    // Add more sources here as they become available
    const allWallets: ExternalWallet[] = [];

    await this.importCommunityWallets(allWallets);

    console.log(`[External Wallets] Aggregation complete. Processed ${allWallets.length} wallets.`);
  }

  /**
   * Manually add wallets from known alpha services
   * These could be from ATM.day, Gemnl, Alpha Gardeners users who publicly share addresses
   */
  async importKnownAlphaServiceWallets(): Promise<void> {
    // Note: We can only import wallets that are publicly shared
    // We cannot scrape private data from paid services
    
    const publiclySharedWallets: ExternalWallet[] = [
      // Example: If ATM.day shares successful traders on their Twitter
      // { address: "...", displayName: "ATM Top Trader", source: "atm.day-public" }
      
      // Example: Alpha Gardeners featured wallets
      // { address: "...", displayName: "AG Featured", source: "alphagardeners-featured" }
      
      // For now, this is empty - would be populated from public sources only
    ];

    if (publiclySharedWallets.length > 0) {
      await this.importCommunityWallets(publiclySharedWallets);
    } else {
      console.log('[External Wallets] No publicly shared alpha service wallets available');
      console.log('[External Wallets] To add wallets: monitor Twitter/Discord for shared addresses');
    }
  }
}

/**
 * Manual wallet addition endpoint data
 * This allows admins to manually add profitable wallets they discover
 */
export interface ManualWalletSubmission {
  walletAddress: string;
  displayName?: string;
  twitterHandle?: string;
  notes?: string;
  source: string;
}

export async function addManualWallet(submission: ManualWalletSubmission): Promise<void> {
  const existing = await db
    .select()
    .from(kolWallets)
    .where(eq(kolWallets.walletAddress, submission.walletAddress))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(kolWallets)
      .set({
        displayName: submission.displayName || existing[0].displayName,
        twitterHandle: submission.twitterHandle || existing[0].twitterHandle,
        source: `${existing[0].source},manual`,
        updatedAt: new Date(),
      })
      .where(eq(kolWallets.walletAddress, submission.walletAddress));
    
    console.log(`[Manual Wallet] Updated: ${submission.walletAddress}`);
  } else {
    await db.insert(kolWallets).values({
      walletAddress: submission.walletAddress,
      displayName: submission.displayName || `Trader ${submission.walletAddress.substring(0, 6)}`,
      twitterHandle: submission.twitterHandle,
      source: `manual-${submission.source}`,
      influenceScore: 50,
      lastActiveAt: new Date(),
    });
    
    console.log(`[Manual Wallet] Added: ${submission.walletAddress}`);
  }
}

// Singleton
let externalWalletInstance: ExternalWalletSourceService | null = null;

export function getExternalWalletService(): ExternalWalletSourceService {
  if (!externalWalletInstance) {
    externalWalletInstance = new ExternalWalletSourceService();
  }
  return externalWalletInstance;
}

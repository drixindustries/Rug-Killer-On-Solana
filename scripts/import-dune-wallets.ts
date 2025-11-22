/**
 * Import smart money wallets from Dune Analytics into database
 * Run after: python scripts/fetch-dune-data.py
 */

import { db } from '../server/db';
import { smartWallets } from '../shared/schema';
import fs from 'fs';

interface DuneWallet {
  wallet_address: string;
  total_profit_sol?: number;
  win_rate?: number;
  total_trades?: number;
  avg_hold_time?: number;
  [key: string]: any;
}

async function importDuneWallets() {
  console.log('[Dune Import] Reading dune-smart-wallets.json...');
  
  const data = JSON.parse(fs.readFileSync('dune-smart-wallets.json', 'utf-8')) as DuneWallet[];
  console.log(`[Dune Import] Found ${data.length} wallets`);

  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < data.length; i++) {
    const wallet = data[i];
    try {
      // Calculate influence score from Dune metrics
      const profitScore = Math.min(50, (wallet.total_profit_sol || 0) / 100);
      const winRateScore = Math.min(30, (wallet.win_rate || 0) * 0.3);
      const activityScore = Math.min(20, (wallet.total_trades || 0) / 10);
      const influenceScore = Math.round(profitScore + winRateScore + activityScore);

      await db.insert(smartWallets).values({
        walletAddress: wallet.wallet_address,
        displayName: `.1% ${i + 1}`,
        source: 'dune-analytics',
        profitSol: wallet.total_profit_sol,
        winRate: Math.round((wallet.win_rate || 0) * 100),
        influenceScore: Math.max(60, influenceScore),
        isActive: true,
        notes: `Imported from Dune query 5044809`,
      }).onConflictDoNothing();

      imported++;
    } catch (err) {
      console.warn(`[Dune Import] Failed to import ${wallet.wallet_address}:`, err);
      skipped++;
    }
  }

  console.log(`[Dune Import] ✅ Imported ${imported} wallets, skipped ${skipped}`);
}

importDuneWallets().catch(console.error);

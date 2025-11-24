/**
 * Test script to verify wallet win rate calculation
 * Tests both on-demand calculation and database caching
 */

import { getWalletDiscoveryService } from './server/services/wallet-discovery';
import { db } from './server/db';
import { smartWallets } from './shared/schema';
import { eq } from 'drizzle-orm';

const TEST_WALLETS = [
  'GLjXK7H8YCEoo1pWfRhpUnXhS2MgPLatBLrpfuCMpump', // 90p from your alpha alerts
  'EJvokC7vQPPjMeyFWwG5PsMfZ1ejBmYY52BRjT2egFxk', // top1
  'GnVdeU72xwuvMvPLkESRiZPyBExzPuK5dj4L23y5WdEK', // top2
];

async function testWalletWinRate() {
  console.log('🧪 Testing Wallet Win Rate Calculation\n');

  for (const walletAddress of TEST_WALLETS) {
    console.log(`\n📊 Testing: ${walletAddress.slice(0, 8)}...`);
    
    try {
      // Check if wallet exists in database
      const [existing] = await db
        .select()
        .from(smartWallets)
        .where(eq(smartWallets.walletAddress, walletAddress))
        .limit(1);

      if (existing) {
        console.log(`  ✓ Found in database:`);
        console.log(`    - Display Name: ${existing.displayName}`);
        console.log(`    - Win Rate: ${existing.winRate}%`);
        console.log(`    - W/L: ${existing.wins}/${existing.losses}`);
        console.log(`    - Profit: ${existing.profitSol} SOL`);
        console.log(`    - Last Updated: ${existing.updatedAt}`);
      } else {
        console.log(`  ⚠ Not in database, calculating fresh stats...`);
      }

      // Calculate fresh stats
      console.log(`  🔄 Calculating on-chain performance...`);
      const discoveryService = getWalletDiscoveryService();
      const performance = await discoveryService.analyzeWalletPerformance(walletAddress);

      console.log(`  ✅ Calculated:`);
      console.log(`    - Win Rate: ${Math.round(performance.winRate * 100)}%`);
      console.log(`    - W/L: ${performance.wins}/${performance.losses}`);
      console.log(`    - Total Trades: ${performance.totalTrades}`);
      console.log(`    - Profit: ${performance.profitSol.toFixed(2)} SOL`);
      console.log(`    - Avg Hold Time: ${(performance.averageHoldTime / 3600).toFixed(1)} hours`);

      // Update database
      if (existing) {
        await db.update(smartWallets)
          .set({
            profitSol: performance.profitSol.toFixed(9),
            wins: performance.wins,
            losses: performance.losses,
            winRate: Math.round(performance.winRate * 100),
            lastActiveAt: performance.lastActiveAt,
            updatedAt: new Date(),
          })
          .where(eq(smartWallets.walletAddress, walletAddress));
        console.log(`  💾 Updated database`);
      } else {
        await db.insert(smartWallets).values({
          walletAddress,
          displayName: `Trader ${walletAddress.slice(0, 6)}`,
          profitSol: performance.profitSol.toFixed(9),
          wins: performance.wins,
          losses: performance.losses,
          winRate: Math.round(performance.winRate * 100),
          influenceScore: 50,
          source: 'test-script',
          isActive: true,
          lastActiveAt: performance.lastActiveAt,
        });
        console.log(`  💾 Saved to database`);
      }

    } catch (error) {
      console.error(`  ❌ Error:`, error);
    }
  }

  console.log('\n✅ Test complete!\n');
  process.exit(0);
}

testWalletWinRate().catch(console.error);

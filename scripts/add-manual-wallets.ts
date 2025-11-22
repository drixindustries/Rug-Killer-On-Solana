/**
 * Manually add alpha wallets to the system
 * No external APIs needed - just edit the WALLETS array below
 */

import { storage } from '../server/storage';
import { getAlphaAlertService } from '../server/alpha-alerts';

interface WalletEntry {
  address: string;
  name: string;
  influence?: number;
}

// 🔧 EDIT THIS ARRAY TO ADD YOUR WALLETS
const WALLETS: WalletEntry[] = [
  // Dune Analytics Query 5048731 - Top 5 Alpha Traders
  { address: 'AaLaMjzxEiZt4dizBMVWvcxyVySq94xuEvtg4ieZPFs3', name: '.1', influence: 85 },
  { address: 'GHAkiZiEbhLduiMzTxDKzPvAykYdVASzoDfK6LeQmE3L', name: '.2', influence: 85 },
  { address: 'D2Aa65HwXgv5RStwaTEJGXZz1DhHejvpD7Yr7GZuiXam', name: '.3', influence: 85 },
  { address: 'HA1L7GhQfyoSRsfBi3tCkkCVEqEsBYVqBSQCENCiwPuB', name: '.4', influence: 85 },
  { address: 'Av3nMHJEEeoL2aq6pt7LKbzDgLRTaykYomOD5k8hL9YQ', name: '.5', influence: 85 },
];

async function addManualWallets() {
  console.log(`\n🚀 Adding ${WALLETS.length} manual alpha wallets...\n`);
  
  if (WALLETS.length === 0) {
    console.log('⚠️  No wallets to add. Edit the WALLETS array in this script.');
    console.log('📝 Example:');
    console.log('   { address: "YourWalletAddress", name: "Ax 1", influence: 80 }');
    return;
  }

  // Get the alpha service
  const alphaService = getAlphaAlertService();
  
  let addedCount = 0;
  let errorCount = 0;

  for (const wallet of WALLETS) {
    if (!wallet.address || !wallet.name) {
      console.log(`❌ Skipping invalid entry:`, wallet);
      errorCount++;
      continue;
    }

    try {
      // Add to database
      await storage.upsertSmartWallet({
        walletAddress: wallet.address,
        displayName: wallet.name,
        influenceScore: wallet.influence || 75,
        source: 'manual',
        isActive: true,
        notes: 'Manually added via script'
      });

      // Add to alpha service (in-memory)
      alphaService.addCaller(wallet.address, wallet.name);
      
      console.log(`✅ Added: ${wallet.name} - ${wallet.address.substring(0, 8)}... (influence: ${wallet.influence || 75})`);
      addedCount++;
    } catch (error: any) {
      console.error(`❌ Failed to add ${wallet.name}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully added: ${addedCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  
  // Show final alpha service status
  const status = alphaService.getStatus();
  console.log(`\n📡 Alpha Service Status:`);
  console.log(`   Total Callers: ${status.totalCallers}`);
  console.log(`   Monitored: ${status.monitoredCallers}`);
  console.log(`   Running: ${status.isRunning ? '✅' : '🛑'}`);
  
  console.log(`\n✅ Done! Use /alpha status verbose:True to see all tracked wallets.`);
}

// Run the script
addManualWallets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

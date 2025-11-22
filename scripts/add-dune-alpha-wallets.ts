/**
 * Fetch alpha wallets from Dune Analytics query 5048731 and add them to the system
 * Names them as Ax 1, Ax 2, Ax 3, etc.
 */

import { DuneClient } from "@duneanalytics/client-sdk";
import { storage } from '../server/storage';
import { getAlphaAlertService } from '../server/alpha-alerts';

const apiKey = process.env.DUNE_API_KEY;
if (!apiKey) {
  throw new Error("DUNE_API_KEY environment variable not set");
}

const dune = new DuneClient(apiKey);

async function addDuneAlphaWallets() {
  console.log("Fetching alpha wallets from Dune Analytics query 5048731...");
  
  try {
    const query_result = await dune.getLatestResult({ queryId: 5048731 });
    
    console.log("✅ Query executed successfully");
    const rows = query_result.result?.rows || [];
    console.log(`Rows returned: ${rows.length}`);
    
    if (rows.length === 0) {
      console.log("⚠️ No wallets returned from query");
      return;
    }

    // Get the alpha service
    const alphaService = getAlphaAlertService();
    
    // Add each wallet
    let addedCount = 0;
    for (let i = 0; i < rows.length; i++) {
      const row: any = rows[i];
      
      // Try to extract wallet address from the row
      // Common field names: wallet, address, trader, wallet_address, trader_address
      const walletAddress = row.wallet || row.address || row.trader || 
                           row.wallet_address || row.trader_address ||
                           row.signer || row.owner;
      
      if (!walletAddress) {
        console.log(`⚠️ Row ${i + 1}: No wallet address found`, row);
        continue;
      }

      const name = `Ax ${i + 1}`;
      const influence = row.influence_score || row.win_rate || row.score || 75;
      
      try {
        // Add to database
        await storage.upsertSmartWallet({
          walletAddress: walletAddress,
          displayName: name,
          influenceScore: Math.min(100, Math.max(60, Number(influence))),
          source: 'dune-5048731',
          isActive: true,
          notes: `Imported from Dune Analytics query 5048731`
        });

        // Add to alpha service
        alphaService.addCaller(walletAddress, name);
        
        console.log(`✅ Added: ${name} - ${walletAddress.substring(0, 8)}... (influence: ${influence})`);
        addedCount++;
      } catch (error: any) {
        console.error(`❌ Failed to add ${name}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully added ${addedCount} / ${rows.length} wallets`);
    
    // Show final status
    const status = alphaService.getStatus();
    console.log(`\n📊 Alpha Service Status:`);
    console.log(`   Total Callers: ${status.totalCallers}`);
    console.log(`   Monitored: ${status.monitoredCallers}`);
    console.log(`   Running: ${status.isRunning ? '✅' : '🛑'}`);

  } catch (error: any) {
    console.error("❌ Error fetching from Dune:", error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addDuneAlphaWallets()
    .then(() => {
      console.log("\n✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Script failed:", error);
      process.exit(1);
    });
}

export { addDuneAlphaWallets };

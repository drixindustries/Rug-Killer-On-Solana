/**
 * Seeds the database with smart money wallets from a Dune Analytics query.
 * Fetches a CSV from a specific Dune execution and upserts the wallets.
 */

import 'dotenv/config';
import Papa from 'papaparse';
import { db } from './db';
import { smartWallets } from '../shared/schema';
import { eq } from 'drizzle-orm';

const DUNE_EXECUTION_URL = "https://api.dune.com/api/v1/execution/01K9D93Z0N966SJP2MT1FJTF6A/results/csv";

async function seedDuneWallets() {
  const apiKey = process.env.DUNE_API_KEY;
  if (!apiKey) {
    console.error("❌ DUNE_API_KEY environment variable is not set.");
    process.exit(1);
  }

  console.log("🌱 Starting to seed smart money wallets from Dune Analytics...");
  console.log(`Fetching from: ${DUNE_EXECUTION_URL}`);

  try {
    const response = await fetch(DUNE_EXECUTION_URL, {
      headers: {
        'X-DUNE-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from Dune API: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    const parsed = Papa.parse(csvText, { header: true });

    if (parsed.errors.length > 0) {
      console.error("❌ Errors parsing CSV:", parsed.errors);
      throw new Error("Failed to parse CSV data from Dune.");
    }

    const wallets = parsed.data as Array<{ wallet_address: string; profile_name: string; total_usd_volume: string }>;
    console.log(`Found ${wallets.length} wallets in the Dune query result.`);

    let upsertedCount = 0;
    let skippedCount = 0;

    for (const wallet of wallets) {
      if (!wallet.wallet_address) {
        skippedCount++;
        continue;
      }

      const influence = Math.min(95, 50 + Math.log10(parseFloat(wallet.total_usd_volume || '1')) * 5);

      await db
        .insert(smartWallets)
        .values({
          walletAddress: wallet.wallet_address,
          displayName: wallet.profile_name || `Dune Trader ${wallet.wallet_address.substring(0, 6)}`,
          source: 'dune',
          influenceScore: Math.round(influence),
          isActive: true,
          notes: `Imported from Dune query. Total volume: $${parseFloat(wallet.total_usd_volume || '0').toLocaleString()}`,
        })
        .onConflictDoUpdate({
          target: smartWallets.walletAddress,
          set: {
            displayName: wallet.profile_name || `Dune Trader ${wallet.wallet_address.substring(0, 6)}`,
            source: 'dune',
            influenceScore: Math.round(influence),
            isActive: true,
            notes: `Updated from Dune query. Total volume: $${parseFloat(wallet.total_usd_volume || '0').toLocaleString()}`,
            updatedAt: new Date(),
          },
        });
      
      upsertedCount++;
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   - ${upsertedCount} wallets upserted into the database.`);
    console.log(`   - ${skippedCount} rows skipped due to missing addresses.`);

  } catch (error) {
    console.error("❌ An error occurred during the seeding process:", error);
    process.exit(1);
  }
}

seedDuneWallets();

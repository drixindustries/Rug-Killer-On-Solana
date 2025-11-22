/**
 * Fetch Solana smart money data from Dune Analytics
 * Query: https://dune.com/queries/5044809
 */

import { DuneClient } from "@duneanalytics/client-sdk";
import fs from 'fs';

const apiKey = process.env.DUNE_API_KEY;
if (!apiKey) {
  throw new Error("DUNE_API_KEY environment variable not set");
}

const dune = new DuneClient(apiKey);

async function fetchDuneData() {
  console.log("Fetching smart money data from Dune Analytics...");
  
  const query_result = await dune.getLatestResult({ queryId: 5044809 });
  
  console.log("✅ Query executed successfully");
  console.log(`Rows returned: ${query_result.result?.rows?.length || 0}`);
  
  if (query_result.result?.rows) {
    console.log("\nSample data:");
    query_result.result.rows.slice(0, 5).forEach((row, i) => {
      console.log(`${i + 1}.`, row);
    });

    // Export to JSON for integration
    const outputPath = "dune-smart-wallets.json";
    fs.writeFileSync(outputPath, JSON.stringify(query_result.result.rows, null, 2));
    console.log(`\n💾 Saved to ${outputPath}`);
  }
}

fetchDuneData().catch(console.error);

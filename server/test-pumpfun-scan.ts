import { tokenAnalyzer } from "./solana-analyzer.ts";

// Test pump.fun tokens
const PUMP_FUN_TOKENS = [
  "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump", // Example pump.fun token
  "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump", // Another example
];

async function scanPumpFunTokens() {
  console.log("🔍 Testing pump.fun token scanning with DexScreener...\n");

  for (const token of PUMP_FUN_TOKENS) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Token: ${token}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      const result = await tokenAnalyzer.analyzeToken(token);
      
      console.log("✅ Scan successful!\n");

      console.log("🎯 Token Info:");
      console.log(`  Name: ${result.metadata?.name || 'Unknown'}`);
      console.log(`  Symbol: ${result.metadata?.symbol || 'Unknown'}`);
      console.log(`  Supply: ${result.metadata?.supply?.toLocaleString() || 'Unknown'}`);

      console.log("\n📊 DexScreener Data:");
      if (result.dexscreenerData?.pairs?.[0]) {
        const pair = result.dexscreenerData.pairs[0];
        console.log(`  Price: $${pair.priceUsd}`);
        console.log(`  24h Volume: $${pair.volume.h24.toLocaleString()}`);
        console.log(`  Liquidity: $${pair.liquidity?.usd?.toLocaleString() || 'N/A'}`);
        console.log(`  Market Cap: $${pair.marketCap?.toLocaleString() || 'N/A'}`);
        console.log(`  DEX: ${pair.dexId}`);
        console.log(`  5m Buys/Sells: ${pair.txns.m5.buys}/${pair.txns.m5.sells}`);
        console.log(`  1h Buys/Sells: ${pair.txns.h1.buys}/${pair.txns.h1.sells}`);
        console.log(`  Price Change 1h: ${pair.priceChange.h1}%`);
        console.log(`  Price Change 24h: ${pair.priceChange.h24}%`);
      } else {
        console.log("  ⚠️  No DexScreener data found (token might not have trading pairs yet)");
      }

      console.log("\n🚨 Risk Assessment:");
      console.log(`  Risk Level: ${result.riskLevel}`);
      console.log(`  Risk Score: ${result.riskScore}/100`);
      if (result.redFlags && result.redFlags.length > 0) {
        console.log(`  Red Flags: ${result.redFlags.map(f => f.type).join(', ')}`);
      }

      console.log("\n⏱️  Performance:");
      console.log(`  Analysis completed`);

    } catch (error: any) {
      console.error("❌ Scan failed:", error.message);
      console.error("   This might be an invalid token address or the token doesn't exist");
    }

    // Wait a bit between scans
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ Pump.fun scanning test complete!");
  console.log(`${"=".repeat(60)}\n`);
}

scanPumpFunTokens();

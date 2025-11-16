import { tokenAnalyzer } from "./solana-analyzer.ts";

// Test token scan with DexScreener
const TEST_TOKEN = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"; // Jupiter token

async function testScan() {
  console.log("🔍 Testing token scan with DexScreener integration...\n");
  console.log(`Token: ${TEST_TOKEN}\n`);

  try {
    const result = await tokenAnalyzer.analyzeToken(TEST_TOKEN);
    
    console.log("✅ Scan successful!\n");
    console.log("📊 DexScreener Data:");
    if (result.dexScreenerData?.pairs?.[0]) {
      const pair = result.dexScreenerData.pairs[0];
      console.log(`  Price: $${pair.priceUsd}`);
      console.log(`  24h Volume: $${pair.volume.h24.toLocaleString()}`);
      console.log(`  Liquidity: $${pair.liquidity?.usd?.toLocaleString() || 'N/A'}`);
      console.log(`  Market Cap: $${pair.marketCap?.toLocaleString() || 'N/A'}`);
      console.log(`  DEX: ${pair.dexId}`);
      console.log(`  Pair: ${pair.pairAddress.substring(0, 8)}...`);
    } else {
      console.log("  No DexScreener data found");
    }

    console.log("\n📈 Market Data:");
    console.log(`  Price: $${result.marketData?.price || 'N/A'}`);
    console.log(`  Volume 24h: $${result.marketData?.volume24h?.toLocaleString() || 'N/A'}`);
    console.log(`  Liquidity: $${result.marketData?.liquidity?.toLocaleString() || 'N/A'}`);

    console.log("\n🎯 Token Info:");
    console.log(`  Name: ${result.metadata?.name}`);
    console.log(`  Symbol: ${result.metadata?.symbol}`);

  } catch (error: any) {
    console.error("❌ Scan failed:", error.message);
  }
}

testScan();

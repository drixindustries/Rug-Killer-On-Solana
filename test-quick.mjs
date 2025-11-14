// Quick test of blockchain integration
import fetch from 'node-fetch';

const TEST_TOKENS = {
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  POPCAT: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
};

console.log('🧪 Testing DexScreener API directly...\n');

async function testDexScreener(name, address) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name} (${address.slice(0, 8)}...)`);
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    const data = await response.json();
    
    if (!data.pairs || data.pairs.length === 0) {
      console.log('❌ No pairs found');
      return;
    }
    
    const solanaPairs = data.pairs.filter(p => p.chainId === 'solana');
    console.log(`✅ Found ${solanaPairs.length} Solana pairs`);
    
    const mainPair = solanaPairs[0];
    if (mainPair) {
      console.log(`\n📊 Main Pair Data:`);
      console.log(`   Pair: ${mainPair.pairAddress?.slice(0, 8)}...`);
      console.log(`   DEX: ${mainPair.dexId}`);
      console.log(`   Price: $${mainPair.priceUsd || 'N/A'}`);
      console.log(`   Liquidity: $${mainPair.liquidity?.usd?.toLocaleString() || 'N/A'}`);
      console.log(`   24h Volume: $${mainPair.volume?.h24?.toLocaleString() || 'N/A'}`);
      console.log(`   Market Cap: $${mainPair.marketCap?.toLocaleString() || 'N/A'}`);
      console.log(`   FDV: $${mainPair.fdv?.toLocaleString() || 'N/A'}`);
      console.log(`   24h Txns: ${mainPair.txns?.h24?.buys || 0} buys, ${mainPair.txns?.h24?.sells || 0} sells`);
      
      // Check if data looks complete
      const hasPrice = !!mainPair.priceUsd;
      const hasLiquidity = !!mainPair.liquidity?.usd;
      const hasVolume = !!mainPair.volume?.h24;
      const hasTxns = !!(mainPair.txns?.h24);
      
      console.log(`\n✅ Data Completeness:`);
      console.log(`   ${hasPrice ? '✅' : '❌'} Price`);
      console.log(`   ${hasLiquidity ? '✅' : '❌'} Liquidity`);
      console.log(`   ${hasVolume ? '✅' : '❌'} Volume`);
      console.log(`   ${hasTxns ? '✅' : '❌'} Transactions`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function testRugcheck(name, address) {
  console.log(`\n🔍 Testing Rugcheck API for ${name}...`);
  
  try {
    const response = await fetch(`https://api.rugcheck.xyz/v1/tokens/${address}/report`);
    if (!response.ok) {
      console.log(`❌ Rugcheck returned ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ Rugcheck data received`);
    console.log(`   Score: ${data.score || 'N/A'}/10`);
    console.log(`   Markets: ${data.markets?.length || 0}`);
    console.log(`   Top Holders: ${data.topHolders?.length || 0}`);
    
    if (data.markets && data.markets.length > 0) {
      const market = data.markets[0];
      console.log(`\n   Market Data:`);
      console.log(`      Type: ${market.marketType || 'N/A'}`);
      console.log(`      Liquidity: $${market.liquidity?.toLocaleString() || 'N/A'}`);
      if (market.lp) {
        console.log(`      LP Burned: ${market.lp.lpBurnPct || 0}%`);
        console.log(`      LP Locked: ${market.lp.lpLockedPct || 0}%`);
      }
    }
    
    if (data.topHolders && data.topHolders.length > 0) {
      console.log(`\n   Top 3 Holders:`);
      data.topHolders.slice(0, 3).forEach((h, i) => {
        console.log(`      ${i + 1}. ${h.address?.slice(0, 8)}... - ${h.pct?.toFixed(2)}%`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Run tests
async function main() {
  console.log('🚀 Blockchain Integration Test\n');
  console.log('Testing data accuracy for:');
  console.log('  ✓ DexScreener API (price, liquidity, volume)');
  console.log('  ✓ Rugcheck API (holders, LP status)');
  console.log('  ✓ Data completeness and consistency\n');
  
  for (const [name, address] of Object.entries(TEST_TOKENS)) {
    await testDexScreener(name, address);
    await testRugcheck(name, address);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit friendly
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test Complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);

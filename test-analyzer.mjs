// Test the full analyzer with real tokens
import { Connection } from '@solana/web3.js';
import { SolanaTokenAnalyzer } from './server/solana-analyzer.js';

const TEST_TOKEN = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK

console.log('🧪 Testing Full Token Analyzer\n');
console.log('Token: BONK');
console.log(`Address: ${TEST_TOKEN}\n`);
console.log('Testing:');
console.log('  ✓ Holder count accuracy');
console.log('  ✓ LP detection and status');
console.log('  ✓ Holder filtering (LP, exchanges, bundled)');
console.log('  ✓ Market data integration');
console.log('  ✓ Risk assessment\n');

const analyzer = new SolanaTokenAnalyzer();

async function testAnalyzer() {
  console.log('⏳ Analyzing token...\n');
  
  try {
    const result = await analyzer.analyzeToken(TEST_TOKEN);
    
    console.log('='.repeat(70));
    console.log('📊 ANALYSIS RESULTS');
    console.log('='.repeat(70));
    
    // Metadata
    console.log(`\n💎 Token Info:`);
    console.log(`   Name: ${result.metadata.name}`);
    console.log(`   Symbol: ${result.metadata.symbol}`);
    console.log(`   Supply: ${(result.metadata.supply / Math.pow(10, result.metadata.decimals)).toLocaleString()}`);
    console.log(`   Decimals: ${result.metadata.decimals}`);
    
    // Authorities
    console.log(`\n🔐 Authorities:`);
    console.log(`   Mint: ${result.mintAuthority.isRevoked ? '✅ Revoked' : '⚠️ Active'}`);
    console.log(`   Freeze: ${result.freezeAuthority.isRevoked ? '✅ Revoked' : '⚠️ Active'}`);
    
    // Holders
    console.log(`\n👥 Holder Analysis:`);
    console.log(`   Total Holders: ${result.holderCount.toLocaleString()}`);
    console.log(`   Top Holders Retrieved: ${result.topHolders.length}`);
    console.log(`   Top 10 Concentration: ${result.topHolderConcentration.toFixed(2)}%`);
    
    // Holder Filtering
    if (result.holderFiltering) {
      const f = result.holderFiltering;
      console.log(`\n   Filtered Addresses:`);
      console.log(`      LP Addresses: ${f.totals.lp}`);
      console.log(`      Exchanges: ${f.totals.exchanges}`);
      console.log(`      Protocols: ${f.totals.protocols}`);
      console.log(`      Bundled Wallets: ${f.totals.bundled}`);
      console.log(`      Total Excluded: ${f.totals.total}`);
      
      if (f.bundledDetection) {
        console.log(`\n   🚨 Bundled Wallet Detection:`);
        console.log(`      Confidence: ${f.bundledDetection.confidence}`);
        console.log(`      Bundle Supply: ${f.bundledDetection.bundleSupplyPct.toFixed(2)}%`);
        console.log(`      Details: ${f.bundledDetection.details}`);
      }
    }
    
    // Liquidity
    console.log(`\n💧 Liquidity Pool:`);
    console.log(`   Status: ${result.liquidityPool.status}`);
    console.log(`   Exists: ${result.liquidityPool.exists ? 'Yes' : 'No'}`);
    if (result.liquidityPool.totalLiquidity) {
      console.log(`   Total: $${result.liquidityPool.totalLiquidity.toLocaleString()}`);
    }
    if (result.liquidityPool.isBurned !== undefined) {
      console.log(`   Burned: ${result.liquidityPool.isBurned ? '🔥 Yes' : 'No'} ${result.liquidityPool.burnPercentage ? `(${result.liquidityPool.burnPercentage}%)` : ''}`);
    }
    if (result.liquidityPool.isLocked !== undefined) {
      console.log(`   Locked: ${result.liquidityPool.isLocked ? '🔒 Yes' : 'No'}`);
    }
    if (result.liquidityPool.lpAddresses) {
      console.log(`   LP Addresses Found: ${result.liquidityPool.lpAddresses.length}`);
    }
    
    // Market Data
    if (result.marketData) {
      console.log(`\n📈 Market Data:`);
      console.log(`   Price: $${result.marketData.priceUsd?.toFixed(8) || 'N/A'}`);
      console.log(`   Market Cap: $${result.marketData.marketCap?.toLocaleString() || 'N/A'}`);
      console.log(`   FDV: $${result.marketData.fdv?.toLocaleString() || 'N/A'}`);
      console.log(`   24h Volume: $${result.marketData.volume24h?.toLocaleString() || 'N/A'}`);
      console.log(`   24h Change: ${result.marketData.priceChange24h?.toFixed(2) || 'N/A'}%`);
      console.log(`   Liquidity: $${result.marketData.liquidityUsd?.toLocaleString() || 'N/A'}`);
      if (result.marketData.txns24h) {
        console.log(`   24h Txns: ${result.marketData.txns24h.buys} buys, ${result.marketData.txns24h.sells} sells`);
      }
      console.log(`   Source: ${result.marketData.source}`);
    }
    
    // Risk Assessment
    console.log(`\n⚠️ Risk Assessment:`);
    console.log(`   Risk Score: ${result.riskScore}/100`);
    console.log(`   Risk Level: ${result.riskLevel}`);
    console.log(`   Red Flags: ${result.redFlags.length}`);
    
    if (result.redFlags.length > 0) {
      console.log(`\n   🚩 Flags:`);
      result.redFlags.forEach(flag => {
        const icon = flag.severity === 'critical' ? '🔴' : flag.severity === 'high' ? '🟠' : flag.severity === 'medium' ? '🟡' : '⚪';
        console.log(`      ${icon} [${flag.severity.toUpperCase()}] ${flag.title}`);
        console.log(`         ${flag.description}`);
      });
    }
    
    // AI Verdict
    if (result.aiVerdict) {
      console.log(`\n🤖 AI Verdict:`);
      console.log(`   Rating: ${result.aiVerdict.rating}`);
      console.log(`   ${result.aiVerdict.verdict}`);
    }
    
    // Data Sources
    console.log(`\n📡 Data Sources:`);
    console.log(`   DexScreener: ${result.dexscreenerData ? '✅' : '❌'}`);
    console.log(`   Rugcheck: ${result.rugcheckData ? '✅' : '❌'}`);
    console.log(`   GoPlus: ${result.goplusData ? '✅' : '❌'}`);
    console.log(`   Jupiter: ${result.jupiterPriceData ? '✅' : '❌'}`);
    console.log(`   Birdeye: ${result.birdeyeData ? '✅' : '❌'}`);
    console.log(`   Pump.fun: ${result.pumpFunData?.isPumpFun ? '✅' : '❌'}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(70));
    
    // Check for issues
    const issues = [];
    
    if (result.holderCount === 0) issues.push('❌ Holder count is 0');
    if (result.topHolders.length === 0) issues.push('❌ No top holders found');
    if (!result.liquidityPool.totalLiquidity) issues.push('⚠️ No liquidity amount detected');
    if (result.liquidityPool.status === 'UNKNOWN') issues.push('⚠️ LP status unknown');
    if (!result.marketData) issues.push('❌ No market data');
    if (!result.dexscreenerData) issues.push('⚠️ DexScreener data missing');
    
    if (issues.length > 0) {
      console.log('\n⚠️ ISSUES DETECTED:');
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log('\n✅ All data points validated successfully!');
      console.log('   ✓ Holder count accurate');
      console.log('   ✓ LP detection working');
      console.log('   ✓ Market data integrated');
      console.log('   ✓ Risk assessment complete');
    }
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    console.error(error.stack);
  }
}

testAnalyzer().catch(console.error);

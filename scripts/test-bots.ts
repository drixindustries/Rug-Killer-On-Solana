/**
 * Test script for Telegram and Discord bots
 * Tests scanning pump.fun tokens to ensure no errors
 */
import { tokenAnalyzer } from '../server/solana-analyzer';

// Recent pump.fun token addresses - using well-known tokens for testing
// These are real tokens that should work with the analyzer
const PUMP_FUN_TOKENS = [
  'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC', // AI16Z - popular pump.fun token
  'Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump', // CHILLGUY - recent pump.fun success
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK - well-established token
];

async function testTokenAnalysis(address: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 Testing Token: ${address}`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    const startTime = Date.now();
    const analysis = await tokenAnalyzer.analyzeToken(address);
    const duration = Date.now() - startTime;
    
    console.log('✅ Analysis completed successfully');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`\n📊 Results:`);
    console.log(`   Token: ${analysis.metadata.name} (${analysis.metadata.symbol})`);
    console.log(`   Risk Score: ${analysis.riskScore}/100 (${analysis.riskLevel})`);
    console.log(`   Holders: ${analysis.holderCount}`);
    console.log(`   Top 10 Concentration: ${analysis.topHolderConcentration.toFixed(2)}%`);
    console.log(`   Mint Authority: ${analysis.mintAuthority.hasAuthority ? '❌ Active' : '✅ Revoked'}`);
    console.log(`   Freeze Authority: ${analysis.freezeAuthority.hasAuthority ? '❌ Active' : '✅ Revoked'}`);
    
    if (analysis.pumpFunData?.isPumpFun) {
      console.log(`\n🎯 PUMP.FUN Detected:`);
      console.log(`   Dev Bought: ${analysis.pumpFunData.devBought.toFixed(2)}%`);
      console.log(`   Bonding Curve: ${analysis.pumpFunData.bondingCurve.toFixed(2)}%`);
      console.log(`   King of the Hill: ${analysis.pumpFunData.isKingOfTheHill ? 'Yes' : 'No'}`);
    }
    
    if (analysis.quillcheckData) {
      console.log(`\n🍯 Honeypot Check:`);
      console.log(`   Is Honeypot: ${analysis.quillcheckData.isHoneypot ? '🚨 YES' : '✅ No'}`);
      console.log(`   Can Sell: ${analysis.quillcheckData.canSell ? '✅ Yes' : '❌ No'}`);
      console.log(`   Buy Tax: ${analysis.quillcheckData.buyTax}%`);
      console.log(`   Sell Tax: ${analysis.quillcheckData.sellTax}%`);
    }
    
    if (analysis.advancedBundleData && analysis.advancedBundleData.bundleScore >= 35) {
      console.log(`\n⚠️  Bundle Detection:`);
      console.log(`   Bundle Score: ${analysis.advancedBundleData.bundleScore}/100`);
      console.log(`   Bundled Supply: ${analysis.advancedBundleData.bundledSupplyPercent.toFixed(1)}%`);
      console.log(`   Suspicious Wallets: ${analysis.advancedBundleData.suspiciousWallets.length}`);
    }
    
    if (analysis.aiVerdict) {
      console.log(`\n🤖 AI Verdict:`);
      console.log(`   ${analysis.aiVerdict.rating} - ${analysis.aiVerdict.verdict}`);
    }
    
    if (analysis.dexscreenerData?.pairs?.[0]) {
      const pair = analysis.dexscreenerData.pairs[0];
      console.log(`\n💰 Price Data:`);
      console.log(`   Price: $${parseFloat(pair.priceUsd).toFixed(8)}`);
      console.log(`   24h Volume: $${formatNumber(pair.volume.h24)}`);
      console.log(`   24h Change: ${pair.priceChange.h24.toFixed(2)}%`);
      console.log(`   Market Cap: $${formatNumber(pair.marketCap || 0)}`);
    }
    
    console.log('\n✅ No errors detected');
    return true;
  } catch (error: any) {
    console.error('❌ Error occurred:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    return false;
  }
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}

async function main() {
  console.log('\n🤖 Starting Bot Token Analysis Test');
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log(`\nTesting ${PUMP_FUN_TOKENS.length} token(s)...\n`);
  
  const results = [];
  
  for (const address of PUMP_FUN_TOKENS) {
    const success = await testTokenAnalysis(address);
    results.push({ address, success });
    
    // Add delay between requests to avoid rate limiting
    if (PUMP_FUN_TOKENS.indexOf(address) < PUMP_FUN_TOKENS.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 Test Summary');
  console.log(`${'='.repeat(80)}`);
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`\n✅ Successful: ${successCount}/${results.length}`);
  console.log(`❌ Failed: ${failCount}/${results.length}`);
  
  if (failCount > 0) {
    console.log('\n❌ Failed tokens:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.address}`);
    });
  }
  
  console.log('\n✅ Test complete!\n');
  
  // Exit with appropriate code
  process.exit(failCount > 0 ? 1 : 0);
}

main();

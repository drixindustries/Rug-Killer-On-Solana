/**
 * Bot Command Testing Script
 * Tests all bot commands with a real pump.fun token to verify RPC integration
 */

import { tokenAnalyzer } from './server/solana-analyzer.ts';
import { rpcBalancer } from './server/services/rpc-balancer.ts';

// Example pump.fun token (replace with current active token)
const TEST_TOKEN = 'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump';

console.log('🧪 Testing Bot Commands with RPC Integration\n');
console.log('=' .repeat(60));

// Test 1: RPC Health Check
async function testRpcHealth() {
  console.log('\n📡 Test 1: RPC Health Check');
  console.log('-'.repeat(60));
  
  const stats = rpcBalancer.getHealthStats();
  console.log('Available RPC Providers:');
  stats.forEach(provider => {
    console.log(`  - ${provider.name}: Score ${provider.score}/100, Weight ${provider.weight}`);
  });
  
  const connection = rpcBalancer.getConnection();
  try {
    const slot = await connection.getSlot();
    console.log(`✅ RPC Connection Working - Current Slot: ${slot}`);
    return true;
  } catch (error) {
    console.log(`❌ RPC Connection Failed: ${error.message}`);
    return false;
  }
}

// Test 2: /execute - Full Token Analysis
async function testExecuteCommand() {
  console.log('\n🔍 Test 2: /execute Command - Full Analysis');
  console.log('-'.repeat(60));
  console.log(`Analyzing token: ${TEST_TOKEN}\n`);
  
  try {
    const startTime = Date.now();
    const analysis = await tokenAnalyzer.analyzeToken(TEST_TOKEN);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Analysis Complete in ${duration}ms`);
    console.log(`Token: ${analysis.metadata.name} (${analysis.metadata.symbol})`);
    console.log(`Risk Score: ${analysis.riskScore}/100 (${analysis.riskLevel})`);
    console.log(`Holders: ${analysis.holderCount}`);
    console.log(`Top 10 Concentration: ${analysis.topHolderConcentration.toFixed(2)}%`);
    
    if (analysis.pumpFunData?.isPumpFun) {
      console.log(`🎯 Pump.fun Token Detected!`);
      console.log(`  - Dev Bought: ${analysis.pumpFunData.devBought?.toFixed(2)}%`);
      console.log(`  - Bonding Curve: ${analysis.pumpFunData.bondingCurve?.toFixed(2)}%`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Execute Command Failed: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

// Test 3: /first20 - Top Holders
async function testFirst20Command() {
  console.log('\n👥 Test 3: /first20 Command - Top Holders');
  console.log('-'.repeat(60));
  
  try {
    const analysis = await tokenAnalyzer.analyzeToken(TEST_TOKEN);
    const top20 = analysis.topHolders.slice(0, 20);
    
    console.log(`✅ Retrieved ${top20.length} top holders`);
    console.log(`Top 3 Holders:`);
    top20.slice(0, 3).forEach((holder, i) => {
      console.log(`  ${i + 1}. ${holder.address.substring(0, 8)}... - ${holder.percentage.toFixed(2)}% (${holder.balance.toLocaleString()} tokens)`);
    });
    
    return true;
  } catch (error) {
    console.log(`❌ First20 Command Failed: ${error.message}`);
    return false;
  }
}

// Test 4: Market Data (DexScreener integration)
async function testMarketData() {
  console.log('\n💰 Test 4: Market Data - DexScreener Integration');
  console.log('-'.repeat(60));
  
  try {
    const analysis = await tokenAnalyzer.analyzeToken(TEST_TOKEN);
    
    if (analysis.dexscreenerData?.pairs?.[0]) {
      const pair = analysis.dexscreenerData.pairs[0];
      console.log(`✅ Market Data Retrieved`);
      console.log(`Price: $${pair.priceUsd}`);
      console.log(`Market Cap: $${pair.marketCap?.toLocaleString() || 'N/A'}`);
      console.log(`24h Volume: $${pair.volume?.h24?.toLocaleString() || 'N/A'}`);
      console.log(`24h Change: ${pair.priceChange?.h24?.toFixed(2) || 'N/A'}%`);
      return true;
    } else {
      console.log(`⚠️ No DexScreener data available (token may not be trading yet)`);
      return true; // Not a failure, just no data
    }
  } catch (error) {
    console.log(`❌ Market Data Failed: ${error.message}`);
    return false;
  }
}

// Test 5: Security Checks
async function testSecurityChecks() {
  console.log('\n🔐 Test 5: Security Checks');
  console.log('-'.repeat(60));
  
  try {
    const analysis = await tokenAnalyzer.analyzeToken(TEST_TOKEN);
    
    console.log(`Mint Authority: ${analysis.mintAuthority?.hasAuthority ? '❌ Active' : '✅ Revoked'}`);
    console.log(`Freeze Authority: ${analysis.freezeAuthority?.hasAuthority ? '❌ Active' : '✅ Revoked'}`);
    
    if (analysis.liquidityPool) {
      const burnPct = analysis.liquidityPool.burnPercentage ?? 0;
      console.log(`LP Burn: ${burnPct.toFixed(2)}% ${burnPct > 95 ? '✅' : '⚠️'}`);
    }
    
    console.log(`✅ Security checks completed`);
    return true;
  } catch (error) {
    console.log(`❌ Security Checks Failed: ${error.message}`);
    return false;
  }
}

// Test 6: Advanced Detection Features
async function testAdvancedDetection() {
  console.log('\n🚨 Test 6: Advanced Detection Features');
  console.log('-'.repeat(60));
  
  try {
    const analysis = await tokenAnalyzer.analyzeToken(TEST_TOKEN);
    
    let detections = 0;
    
    if (analysis.advancedBundleData && analysis.advancedBundleData.bundleScore >= 35) {
      console.log(`⚠️ Bundle Detected - Score: ${analysis.advancedBundleData.bundleScore}/100`);
      detections++;
    }
    
    if (analysis.whaleDetection && analysis.whaleDetection.whaleCount > 0) {
      console.log(`🐋 Whales Detected: ${analysis.whaleDetection.whaleCount} whales holding ${analysis.whaleDetection.totalWhaleSupplyPercent.toFixed(2)}%`);
      detections++;
    }
    
    if (analysis.agedWalletData && analysis.agedWalletData.riskScore >= 35) {
      console.log(`⏰ Aged Wallets Detected - Risk: ${analysis.agedWalletData.riskScore}/100`);
      detections++;
    }
    
    if (analysis.fundingAnalysis?.suspiciousFunding) {
      console.log(`💰 Suspicious Funding: ${analysis.fundingAnalysis.totalSuspiciousPercentage.toFixed(2)}%`);
      detections++;
    }
    
    if (detections === 0) {
      console.log(`✅ No advanced threats detected`);
    } else {
      console.log(`✅ Detected ${detections} potential risk factors`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Advanced Detection Failed: ${error.message}`);
    return false;
  }
}

// Test 7: Performance Benchmarks
async function testPerformance() {
  console.log('\n⚡ Test 7: Performance Benchmarks');
  console.log('-'.repeat(60));
  
  const iterations = 3;
  const timings = [];
  
  for (let i = 0; i < iterations; i++) {
    try {
      const start = Date.now();
      await tokenAnalyzer.analyzeToken(TEST_TOKEN);
      const duration = Date.now() - start;
      timings.push(duration);
      console.log(`Run ${i + 1}: ${duration}ms`);
    } catch (error) {
      console.log(`Run ${i + 1}: Failed - ${error.message}`);
    }
  }
  
  if (timings.length > 0) {
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const min = Math.min(...timings);
    const max = Math.max(...timings);
    
    console.log(`\nPerformance Stats:`);
    console.log(`  Average: ${avg.toFixed(0)}ms`);
    console.log(`  Min: ${min}ms`);
    console.log(`  Max: ${max}ms`);
    console.log(`✅ Performance test completed`);
    return true;
  }
  
  return false;
}

// Run all tests
async function runAllTests() {
  console.log(`\n🎯 Test Token: ${TEST_TOKEN}`);
  console.log(`🔗 https://pump.fun/${TEST_TOKEN}\n`);
  
  const tests = [
    { name: 'RPC Health Check', fn: testRpcHealth },
    { name: '/execute Command', fn: testExecuteCommand },
    { name: '/first20 Command', fn: testFirst20Command },
    { name: 'Market Data', fn: testMarketData },
    { name: 'Security Checks', fn: testSecurityChecks },
    { name: 'Advanced Detection', fn: testAdvancedDetection },
    { name: 'Performance Benchmarks', fn: testPerformance },
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      console.error(`\n❌ Test "${test.name}" threw unexpected error:`, error);
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach((result, i) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${i + 1}. ${status} - ${result.name}`);
  });
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log(`Final Score: ${passed}/${total} tests passed (${percentage}%)`);
  console.log('='.repeat(60));
  
  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED! Ankr RPC integration is working perfectly! 🎉\n');
  } else {
    console.log(`\n⚠️ ${total - passed} test(s) failed. Check logs above for details.\n`);
  }
}

// Execute tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

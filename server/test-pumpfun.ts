import { checkPumpFun } from './services/pumpfun-api';

async function testPumpFun() {
  console.log('🧪 Testing Pump.fun API...\n');
  
  // Test with a known pump.fun token (replace with actual current tokens)
  const testTokens = [
    'So11111111111111111111111111111111111111112', // SOL (should NOT be pump.fun)
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC (should NOT be pump.fun)
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK (might be pump.fun originally)
  ];
  
  for (const token of testTokens) {
    try {
      console.log(`\n⏳ Testing token: ${token}`);
      console.log('=' + '='.repeat(50));
      
      const result = await checkPumpFun(token);
      
      console.log('📊 Results:');
      console.log(`   Is Pump.fun: ${result.isPumpFun ? '✅ YES' : '❌ NO'}`);
      console.log(`   Dev Bought: ${result.devBought}%`);
      console.log(`   Bonding Curve: ${result.bondingCurve}%`);
      console.log(`   Mayhem Mode: ${result.mayhemMode ? '🔥 ACTIVE' : '⭕ INACTIVE'}`);
      
      if (result.king) {
        console.log(`   King: ${result.king.address} (${result.king.percentage}%)`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing token ${token}:`, error);
    }
  }
  
  console.log('\n✅ Pump.fun API test completed!');
}

// Run the test
testPumpFun().catch(console.error);
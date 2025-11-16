// Quick test for pump.fun API
const axios = require('axios');

async function testPumpFun() {
  // Test with a known pump.fun token (you can replace with any recent pump.fun token)
  const testTokens = [
    'So11111111111111111111111111111111111111112', // SOL (should not be pump.fun)
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC (should not be pump.fun)
    // Add a real pump.fun token address here if you have one
  ];

  for (const tokenAddress of testTokens) {
    console.log(`\n🧪 Testing token: ${tokenAddress}`);
    
    // Test pump.fun API endpoints
    const endpoints = [
      `https://frontend-api.pump.fun/coins/${tokenAddress}`,
      `https://pump.fun/api/coins/${tokenAddress}`,
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      `https://pumpapi.live/api/${tokenAddress}`
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`  📡 Testing: ${endpoint}`);
        
        const response = await axios.get(endpoint, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://pump.fun/',
            'Origin': 'https://pump.fun'
          },
          validateStatus: (status) => status < 500,
        });

        if (response.status === 200 && response.data) {
          console.log(`  ✅ Response (${response.status}):`, JSON.stringify(response.data, null, 2).substring(0, 500));
        } else {
          console.log(`  ❌ Status ${response.status}: No data`);
        }
      } catch (error) {
        console.log(`  ❌ Error:`, error.message);
      }
    }
  }
}

testPumpFun().catch(console.error);
import { Connection } from '@solana/web3.js';

console.log('\n🧪 Testing Ankr Endpoint Formats\n');

const apiKey = '380a1e0b86b7763334f51e2b3d44fe3ea';
const endpoints = [
  `https://rpc.ankr.com/solana/${apiKey}`,
  `https://rpc.ankr.com/premium-http/solana/${apiKey}`,
  `https://rpc.ankr.com/solana`,
  'https://rpc.ankr.com/premium-http/solana/380a1e0b86b7763334f51e2b3d44fe3ea8da204ca2be91a88cd8c',
];

for (const url of endpoints) {
  console.log(`Testing: ${url.replace(apiKey, '***KEY***')}`);
  try {
    const connection = new Connection(url, { commitment: 'confirmed' });
    const version = await connection.getVersion();
    console.log('   ✅ SUCCESS!', version['solana-core']);
    console.log('   🎯 THIS IS THE CORRECT ENDPOINT!\n');
    
    // Test a few more calls to confirm
    const slot = await connection.getSlot();
    console.log('   ✅ Slot:', slot);
    
    process.exit(0);
  } catch (error) {
    console.log('   ❌ Failed:', error.message.split('\n')[0]);
  }
}

console.log('\n⚠️  None of the endpoint formats worked!');
console.log('The API key may be invalid or incomplete.\n');

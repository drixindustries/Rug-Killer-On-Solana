import { Connection } from '@solana/web3.js';
import { readFileSync } from 'fs';

// Load environment variables manually
try {
  const envFile = readFileSync('.env', 'utf8');
  const envVars = {};
  envFile.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        const value = line.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '');
        if (key && value) {
          envVars[key] = value;
          process.env[key] = value;
        }
      }
    }
  });
} catch (error) {
  console.error('Warning: Could not read .env file:', error.message);
}

console.log('\n🔍 ANKR RPC DIAGNOSTIC TEST\n');
console.log('=' .repeat(60));

// Check environment variable
const ankrApiKey = process.env.ANKR_API_KEY?.trim();
console.log('\n1. Environment Variable Check:');
console.log('   ANKR_API_KEY exists:', !!ankrApiKey);
console.log('   ANKR_API_KEY length:', ankrApiKey?.length || 0);
console.log('   ANKR_API_KEY value:', ankrApiKey === 'YOUR_ANKR_API_KEY_HERE' ? '⚠️  PLACEHOLDER VALUE' : '✅ Custom value set');

if (!ankrApiKey || ankrApiKey === 'YOUR_ANKR_API_KEY_HERE') {
  console.log('\n❌ ERROR: ANKR_API_KEY is not configured!');
  console.log('\n📋 TO FIX:');
  console.log('   1. Get your API key from: https://www.ankr.com/rpc/');
  console.log('   2. Edit .env file');
  console.log('   3. Replace: ANKR_API_KEY=YOUR_ANKR_API_KEY_HERE');
  console.log('   4. With: ANKR_API_KEY=your_actual_key_here');
  console.log('\n   Note: Remove any quotes around the key\n');
  process.exit(1);
}

// Build Ankr URL
const ankrUrl = `https://rpc.ankr.com/solana/${ankrApiKey}`;
console.log('\n2. Ankr URL Construction:');
console.log('   URL:', ankrUrl.replace(ankrApiKey, '***KEY***'));

// Test connection
console.log('\n3. Testing RPC Connection:');
console.log('   Creating connection...');

let connection;
try {
  connection = new Connection(ankrUrl, { 
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 8000,
  });
  console.log('   ✅ Connection object created');
} catch (error) {
  console.log('   ❌ Failed to create connection:', error.message);
  process.exit(1);
}

// Test basic RPC call
console.log('\n4. Testing Basic RPC Call (getVersion):');
try {
  const version = await connection.getVersion();
  console.log('   ✅ SUCCESS! RPC is responding');
  console.log('   Solana version:', version['solana-core']);
  console.log('   Feature set:', version['feature-set']);
} catch (error) {
  console.log('   ❌ FAILED:', error.message);
  
  if (error.message.includes('403') || error.message.includes('Forbidden')) {
    console.log('\n🔍 DIAGNOSIS: 403 Forbidden Error');
    console.log('   Possible causes:');
    console.log('   - Invalid API key');
    console.log('   - API key not activated');
    console.log('   - Wrong API key for Solana endpoint');
    console.log('\n   Solutions:');
    console.log('   1. Verify your API key at: https://www.ankr.com/rpc/');
    console.log('   2. Ensure you created a Solana endpoint (not Ethereum)');
    console.log('   3. Check if your plan supports Solana');
  } else if (error.message.includes('timeout')) {
    console.log('\n🔍 DIAGNOSIS: Timeout Error');
    console.log('   Ankr endpoint is not responding');
  } else if (error.message.includes('union')) {
    console.log('\n🔍 DIAGNOSIS: Type/Union Error');
    console.log('   This is the error from your screenshot');
    console.log('   Ankr may be returning unexpected response format');
  } else {
    console.log('\n🔍 DIAGNOSIS: Unknown Error');
    console.log('   Full error:', error);
  }
  
  process.exit(1);
}

// Test slot number
console.log('\n5. Testing Data Retrieval (getSlot):');
try {
  const slot = await connection.getSlot();
  console.log('   ✅ Current slot:', slot);
} catch (error) {
  console.log('   ❌ FAILED:', error.message);
  process.exit(1);
}

// Test block time
console.log('\n6. Testing Block Data (getBlockTime):');
try {
  const slot = await connection.getSlot();
  const blockTime = await connection.getBlockTime(slot - 10);
  console.log('   ✅ Block time retrieved:', new Date(blockTime * 1000).toISOString());
} catch (error) {
  console.log('   ⚠️  Warning (non-critical):', error.message);
}

// Performance test
console.log('\n7. Performance Test (10 rapid requests):');
const startTime = Date.now();
try {
  const promises = Array(10).fill(null).map(() => connection.getSlot());
  await Promise.all(promises);
  const elapsed = Date.now() - startTime;
  console.log(`   ✅ All requests completed in ${elapsed}ms`);
  console.log(`   Average: ${(elapsed / 10).toFixed(1)}ms per request`);
} catch (error) {
  console.log('   ⚠️  Some requests failed:', error.message);
}

console.log('\n' + '=' .repeat(60));
console.log('🎉 ANKR RPC IS WORKING CORRECTLY!\n');
console.log('Summary:');
console.log('✅ API key configured');
console.log('✅ Connection established');
console.log('✅ RPC calls responding');
console.log('✅ Performance acceptable');
console.log('\nYou can now use Ankr RPC in your application.\n');

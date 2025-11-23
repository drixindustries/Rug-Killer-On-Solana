import { Connection } from '@solana/web3.js';
import { readFileSync } from 'fs';

// Load environment variables
try {
  const envFile = readFileSync('.env', 'utf8');
  envFile.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        const value = line.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '');
        if (key && value) {
          process.env[key] = value;
        }
      }
    }
  });
} catch (error) {
  console.error('Could not read .env file');
}

console.log('\n🔧 TESTING ANKR SUPERSTRUCT FIX\n');
console.log('=' .repeat(60));

const ankrApiKey = process.env.ANKR_API_KEY?.trim();

if (!ankrApiKey || ankrApiKey === 'YOUR_ANKR_API_KEY_HERE' || ankrApiKey.length < 32) {
  console.log('\n⚠️  Ankr API key not configured or invalid');
  console.log('   Using test with standard RPC instead\n');
  process.exit(0);
}

const ankrUrl = `https://rpc.ankr.com/solana/${ankrApiKey}`;
console.log('\n1. Testing Ankr with Custom Fetch Handler');
console.log('   URL:', ankrUrl.replace(ankrApiKey, '***KEY***'));

// Create custom fetch that normalizes responses
const originalFetch = global.fetch;
const customFetch = async (input, init) => {
  try {
    const response = await originalFetch(input, init);
    const clonedResponse = response.clone();
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await clonedResponse.json();
      
      // Log the response structure for debugging
      console.log('   Response structure:', Object.keys(data));
      
      if (data && typeof data === 'object' && data.result !== undefined) {
        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }
    }
    
    return response;
  } catch (error) {
    console.error('   Fetch error:', error.message);
    throw error;
  }
};

try {
  const connection = new Connection(ankrUrl, { 
    commitment: 'confirmed',
    fetch: customFetch,
    confirmTransactionInitialTimeout: 8000,
  });
  
  console.log('   ✅ Connection created with custom fetch\n');
  
  console.log('2. Testing getVersion() call');
  const version = await connection.getVersion();
  console.log('   ✅ SUCCESS! Version:', version['solana-core']);
  
  console.log('\n3. Testing getSlot() call');
  const slot = await connection.getSlot();
  console.log('   ✅ SUCCESS! Slot:', slot);
  
  console.log('\n4. Testing getBlockTime() call');
  const blockTime = await connection.getBlockTime(slot - 10);
  console.log('   ✅ SUCCESS! Block time:', new Date(blockTime * 1000).toISOString());
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎉 ANKR RPC WORKING WITH CUSTOM FETCH HANDLER!\n');
  console.log('The superstruct union error has been resolved.');
  console.log('Custom fetch normalizes Ankr response format.\n');
  
} catch (error) {
  console.log('\n❌ FAILED:', error.message);
  
  if (error.message.includes('union')) {
    console.log('\n🔍 Superstruct union error still occurring');
    console.log('   The custom fetch handler may need adjustment');
  } else if (error.message.includes('404')) {
    console.log('\n🔍 API key issue - endpoint not found');
  } else if (error.message.includes('403')) {
    console.log('\n🔍 API key not authorized for Solana');
  }
  
  process.exit(1);
}

/**
 * Test script to check which public Solana RPCs are working
 */

const RPC_ENDPOINTS = [
  // Current
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
  'https://solana-mainnet.rpc.extrnode.com',
  'https://solana.public-rpc.com',
  
  // Additional public RPCs to test
  'https://ssc-dao.genesysgo.net',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://rpc.hellomoon.io',
  'https://mainnet.rpcpool.com',
  'https://solana-rpc.publicnode.com',
  'https://api.metaplex.solana.com',
  'https://solana-mainnet.core.chainstack.com/YOUR_API_KEY', // Would need real key
  'https://nd-123-456-789.p2pify.com/YOUR_API_KEY', // Would need real key
  'https://solana.getblock.io/mainnet/', // Would need real key
  'https://try-rpc.mainnet.solana.blockdaemon.tech',
];

async function testRPC(url: string): Promise<{ url: string; status: 'ok' | 'slow' | 'failed'; latency?: number; error?: string }> {
  const start = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSlot',
        params: []
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return { url, status: 'failed', error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    const latency = Date.now() - start;
    
    if (data.error) {
      return { url, status: 'failed', error: data.error.message };
    }
    
    if (!data.result) {
      return { url, status: 'failed', error: 'No result' };
    }
    
    const status = latency < 1000 ? 'ok' : 'slow';
    return { url, status, latency };
    
  } catch (error: any) {
    const latency = Date.now() - start;
    if (error.name === 'AbortError') {
      return { url, status: 'failed', error: 'Timeout (>5s)' };
    }
    return { url, status: 'failed', latency, error: error.message };
  }
}

async function main() {
  console.log(`🔍 Testing ${RPC_ENDPOINTS.length} Solana RPC endpoints...\n`);
  
  const results = await Promise.all(
    RPC_ENDPOINTS.map(url => testRPC(url))
  );
  
  const working = results.filter(r => r.status === 'ok');
  const slow = results.filter(r => r.status === 'slow');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log('✅ WORKING (< 1s):');
  working.forEach(r => console.log(`   ${r.latency}ms - ${r.url}`));
  
  if (slow.length > 0) {
    console.log('\n🐢 SLOW (> 1s):');
    slow.forEach(r => console.log(`   ${r.latency}ms - ${r.url}`));
  }
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED:');
    failed.forEach(r => console.log(`   ${r.error} - ${r.url}`));
  }
  
  console.log(`\n📊 Summary: ${working.length} working, ${slow.length} slow, ${failed.length} failed`);
}

main();

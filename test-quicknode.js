/**
 * Test QuickNode RPC directly
 */

const QUICKNODE_URL = process.env.QUICKNODE_RPC_URL || 'https://blissful-aged-bird.solana-mainnet.quiknode.pro/e317fee023f3c6e3b484eafa8bc06ddeb11988cb/';

async function testQuickNode() {
  console.log('🧪 Testing QuickNode RPC...');
  console.log('URL:', QUICKNODE_URL);
  
  try {
    const response = await fetch(QUICKNODE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSlot'
      })
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', data);
    
    if (data.result) {
      console.log('✅ QuickNode is working! Current slot:', data.result);
    } else {
      console.log('❌ QuickNode returned error:', data.error);
    }
  } catch (error) {
    console.error('❌ Fetch failed:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
}

testQuickNode();

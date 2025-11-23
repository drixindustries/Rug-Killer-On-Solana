/**
 * Simple Test for Alpha Alerts Discord Integration
 * Uses the existing debug endpoint to trigger a test alert
 */

const RAILWAY_URL = 'https://rugkilleralphabot.fun';
const DEBUG_TOKEN = 'test-alpha-2025'; // From Railway DEBUG_ENDPOINTS_TOKEN

async function testAlphaAlert() {
  console.log('🧪 Testing Alpha Alerts Discord Integration\n');

  // Test 1: Startup/Connection Test
  console.log('Step 1: Testing direct Discord delivery...');
  try {
    const startupResponse = await fetch(`${RAILWAY_URL}/api/debug/alpha/test-startup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-debug-token': DEBUG_TOKEN
      }
    });

    if (startupResponse.ok) {
      console.log('✅ Startup test sent successfully\n');
      console.log('📬 Check Discord for: "🧪 ALPHA ALERTS TEST" message\n');
    } else {
      const error = await startupResponse.text();
      console.log('⚠️  Startup test response:', startupResponse.status, error);
    }
  } catch (error) {
    console.error('❌ Error sending startup test:', error);
  }

  // Wait 3 seconds
  console.log('⏳ Waiting 3 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 2: Simulated Buy Alert
  console.log('Step 2: Simulating a buy alert...');
  const testToken = 'BtQQxvS6RNm5e1R6YM9KHpgppump7UJN8RLVs3pump';
  const testWallet = 'Test Alpha Whale';

  try {
    const alertResponse = await fetch(`${RAILWAY_URL}/api/debug/alpha/test-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-debug-token': DEBUG_TOKEN
      },
      body: JSON.stringify({
        mint: testToken,
        source: testWallet
      })
    });

    if (alertResponse.ok) {
      const result = await alertResponse.json();
      console.log('✅ Buy alert triggered successfully\n');
      console.log('📦 Alert Details:');
      console.log(`  - Token: ${result.mint}`);
      console.log(`  - Wallet: ${result.source}`);
      console.log('\n📬 Check Discord for the buy alert!\n');
    } else {
      const error = await alertResponse.text();
      console.log('⚠️  Alert response:', alertResponse.status, error);
    }
  } catch (error) {
    console.error('❌ Error sending alert:', error);
  }

  // Test 3: Check Health Endpoint
  console.log('Step 3: Checking alpha alerts health...');
  try {
    const healthResponse = await fetch(`${RAILWAY_URL}/api/alpha/health`);
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Health check successful\n');
      console.log('📊 System Status:');
      console.log(`  - Enabled: ${health.enabled}`);
      console.log(`  - Active Wallets: ${health.activeCalls || 0}`);
      console.log(`  - Webhook Provider: ${health.webhookProvider || 'None'}`);
      console.log(`  - Direct Send: ${health.directSend}`);
      console.log(`  - Discord Configured: ${health.discordConfigured}`);
    } else {
      console.log('⚠️  Health endpoint returned:', healthResponse.status);
    }
  } catch (error) {
    console.error('❌ Error checking health:', error);
  }

  console.log('\n🎉 Test Complete!\n');
  console.log('Expected Discord Messages:');
  console.log('  1. "🧪 ALPHA ALERTS TEST" - Startup test');
  console.log(`  2. "🎯 Alpha Buy Alert" - Buy alert for ${testWallet}`);
  console.log('\nIf you see both messages, the system is working correctly! ✅');
}

testAlphaAlert().catch(console.error);

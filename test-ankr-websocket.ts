// Load environment variables from .env file
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { ankrWebSocket } from './server/services/ankr-websocket.ts';

console.log('🧪 Testing Ankr WebSocket Service\n');
console.log(`📝 ANKR_API_KEY configured: ${!!process.env.ANKR_API_KEY}\n`);

// Test configuration
const TEST_WALLET = 'GJRYBFb6Fe3HhUpp9pBJLkCk89LVkZZPkWMikwPoCYaV'; // Example alpha wallet
const TEST_TIMEOUT = 30000; // 30 seconds

async function testAnkrWebSocket() {
  console.log('📡 Step 1: Connecting to Ankr WebSocket...');
  
  try {
    // Set up event listeners
    ankrWebSocket.on('connected', () => {
      console.log('✅ Connected to Ankr WebSocket\n');
    });

    ankrWebSocket.on('token_created', (event) => {
      console.log('🚀 NEW TOKEN DETECTED via Ankr:');
      console.log(`   Mint: ${event.mint}`);
      console.log(`   Signature: ${event.signature}`);
      console.log(`   Timestamp: ${new Date(event.timestamp).toISOString()}\n`);
    });

    ankrWebSocket.on('alpha_wallet_trade', (event) => {
      console.log('💎 ALPHA WALLET ACTIVITY:');
      console.log(`   Wallet: ${event.wallet.slice(0, 8)}...`);
      console.log(`   Token: ${event.mint}`);
      console.log(`   Type: ${event.type}`);
      console.log(`   Signature: ${event.signature}\n`);
    });

    ankrWebSocket.on('wallet_activity', (event) => {
      console.log('📊 Wallet Activity Detected:');
      console.log(`   Wallet: ${event.wallet.slice(0, 8)}...`);
      console.log(`   Token: ${event.mint}`);
      console.log(`   Signature: ${event.signature}\n`);
    });

    ankrWebSocket.on('token_analyzed', (event) => {
      console.log('🔍 Token Analysis Complete:');
      console.log(`   Mint: ${event.mint}`);
      console.log(`   Risk Level: ${event.analysis.riskLevel}`);
      console.log(`   Risk Score: ${event.analysis.riskScore}/100\n`);
    });

    ankrWebSocket.on('scan_error', (event) => {
      console.error('❌ Scan Error:', event.error);
    });

    // Connect to WebSocket
    await ankrWebSocket.connect();

    // Check status
    const status = ankrWebSocket.getStatus();
    console.log('📊 Service Status:');
    console.log(`   Connected: ${status.isConnected}`);
    console.log(`   Enabled: ${status.enabled}`);
    console.log(`   Active Subscriptions: ${status.activeSubscriptions}`);
    console.log(`   Monitored Wallets: ${status.monitoredWallets}\n`);

    if (!status.isConnected) {
      console.error('❌ Failed to connect to Ankr WebSocket');
      process.exit(1);
    }

    // Step 2: Subscribe to test wallet
    console.log(`📡 Step 2: Subscribing to test wallet: ${TEST_WALLET.slice(0, 8)}...`);
    await ankrWebSocket.subscribeToWallet(TEST_WALLET);
    
    const updatedStatus = ankrWebSocket.getStatus();
    console.log(`✅ Now monitoring ${updatedStatus.monitoredWallets} wallet(s)\n`);

    // Step 3: Monitor for events
    console.log('👀 Step 3: Monitoring for events...');
    console.log('   - Listening for new token launches on Pump.fun');
    console.log('   - Listening for alpha wallet activity');
    console.log(`   - Will run for ${TEST_TIMEOUT / 1000} seconds\n`);

    console.log('💡 Tip: To trigger events:');
    console.log('   1. Create a new token on pump.fun');
    console.log('   2. Or wait for the test wallet to make a trade\n');

    console.log('⏳ Listening...\n');

    // Keep alive for test duration
    await new Promise((resolve) => {
      setTimeout(() => {
        console.log('\n⏰ Test timeout reached');
        resolve(null);
      }, TEST_TIMEOUT);
    });

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await ankrWebSocket.disconnect();
    console.log('✅ Test complete');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
testAnkrWebSocket().catch(console.error);

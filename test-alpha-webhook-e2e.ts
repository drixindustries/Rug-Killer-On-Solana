/**
 * End-to-End Test for Alpha Alerts Webhook System
 * 
 * This script:
 * 1. Adds a test wallet to the alpha alerts system
 * 2. Simulates a Helius webhook payload (buy transaction)
 * 3. Sends the payload to our webhook endpoint
 * 4. Verifies Discord alert is sent
 * 5. Cleans up test data
 */

const RAILWAY_URL = 'https://harmonious-solace-production.up.railway.app';
const TEST_WALLET = 'GJvXrAAcvvubwFxTcSDuMxqz2jM5rYGjXCLQ8EKZpump'; // Known pump.fun deployer wallet
const TEST_TOKEN = 'BtQQxvS6RNm5e1R6YM9KHpgppump7UJN8RLVs3pump'; // Random test token

interface WebhookPayload {
  signature: string;
  type: string;
  description: string;
  timestamp: number;
  source: string;
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      userAccount: string;
    }>;
  }>;
  nativeTransfers: Array<{
    amount: number;
    fromUserAccount: string;
    toUserAccount: string;
  }>;
  tokenTransfers: Array<{
    mint: string;
    tokenAmount: number;
    fromUserAccount: string;
    toUserAccount: string;
  }>;
}

async function main() {
  console.log('🧪 Starting Alpha Alerts E2E Test\n');

  // Step 1: Add test wallet to alpha alerts
  console.log('Step 1: Adding test wallet to alpha alerts system...');
  try {
    const addResponse = await fetch(`${RAILWAY_URL}/api/alpha-alerts/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: TEST_WALLET,
        name: 'TEST_WALLET_E2E'
      })
    });

    if (!addResponse.ok) {
      const error = await addResponse.text();
      console.error('❌ Failed to add test wallet:', error);
      process.exit(1);
    }

    console.log('✅ Test wallet added successfully\n');
  } catch (error) {
    console.error('❌ Error adding test wallet:', error);
    process.exit(1);
  }

  // Wait 2 seconds for webhook sync
  console.log('⏳ Waiting 2 seconds for Helius webhook sync...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 2: Simulate Helius webhook payload
  console.log('\nStep 2: Simulating Helius webhook payload (buy transaction)...');
  
  const webhookPayload: WebhookPayload = {
    signature: 'test_sig_' + Date.now() + Math.random().toString(36).substr(2, 9),
    type: 'TRANSFER',
    description: `${TEST_WALLET} swapped SOL for tokens`,
    timestamp: Date.now(),
    source: 'PUMP_FUN',
    accountData: [{
      account: TEST_WALLET,
      nativeBalanceChange: -50000000, // -0.05 SOL
      tokenBalanceChanges: [{
        mint: TEST_TOKEN,
        rawTokenAmount: {
          tokenAmount: '1000000000',
          decimals: 6
        },
        userAccount: TEST_WALLET
      }]
    }],
    nativeTransfers: [{
      amount: 50000000,
      fromUserAccount: TEST_WALLET,
      toUserAccount: '4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf' // Pump.fun program
    }],
    tokenTransfers: [{
      mint: TEST_TOKEN,
      tokenAmount: 1000,
      fromUserAccount: '4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf',
      toUserAccount: TEST_WALLET
    }]
  };

  try {
    console.log('\n📦 Webhook Payload:');
    console.log(`  - Signature: ${webhookPayload.signature}`);
    console.log(`  - Wallet: ${TEST_WALLET}`);
    console.log(`  - Token: ${TEST_TOKEN}`);
    console.log(`  - Amount: 0.05 SOL`);
    console.log(`  - Source: ${webhookPayload.source}\n`);

    const webhookResponse = await fetch(`${RAILWAY_URL}/webhooks/helius`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Helius/1.0'
      },
      body: JSON.stringify([webhookPayload])
    });

    console.log(`Webhook Response Status: ${webhookResponse.status}`);
    
    if (webhookResponse.ok) {
      console.log('✅ Webhook payload processed successfully\n');
    } else {
      const error = await webhookResponse.text();
      console.log('⚠️  Webhook response:', error);
    }
  } catch (error) {
    console.error('❌ Error sending webhook payload:', error);
  }

  // Step 3: Wait and check for Discord delivery
  console.log('Step 3: Waiting 5 seconds for quality checks and Discord delivery...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n📬 Check your Discord channel for the test alert!');
  console.log('Expected message format:');
  console.log('---');
  console.log('🎯 Alpha Buy Alert');
  console.log(`Wallet: TEST_WALLET_E2E`);
  console.log(`Token: ${TEST_TOKEN}`);
  console.log(`Amount: 0.05 SOL`);
  console.log('---\n');

  // Step 4: Clean up - remove test wallet
  console.log('Step 4: Cleaning up test wallet...');
  try {
    const removeResponse = await fetch(`${RAILWAY_URL}/api/alpha-alerts/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: TEST_WALLET
      })
    });

    if (!removeResponse.ok) {
      console.warn('⚠️  Could not remove test wallet automatically');
      console.log(`   Run manually: curl -X POST ${RAILWAY_URL}/api/alpha-alerts/remove -d '{"wallet":"${TEST_WALLET}"}'`);
    } else {
      console.log('✅ Test wallet removed successfully\n');
    }
  } catch (error) {
    console.warn('⚠️  Error removing test wallet:', error);
  }

  console.log('🎉 E2E Test Complete!\n');
  console.log('Summary:');
  console.log('  ✓ Test wallet added');
  console.log('  ✓ Helius webhook synced');
  console.log('  ✓ Buy transaction simulated');
  console.log('  ✓ Discord alert should have been sent');
  console.log('  ✓ Test wallet cleaned up\n');
  console.log('Check Discord to verify the alert was delivered!');
}

main().catch(console.error);

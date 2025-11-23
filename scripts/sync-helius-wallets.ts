/**
 * Sync Smart Wallets to Helius Webhook
 * 
 * Automatically updates Helius webhook with all active smart wallets
 * Run this after adding wallets via alpha_add command
 */

import { db } from '../server/db';
import { smartWallets } from '../shared/schema';
import { eq } from 'drizzle-orm';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY?.trim();
const HELIUS_WEBHOOK_ID = process.env.HELIUS_WEBHOOK_ID?.trim();

if (!HELIUS_API_KEY || !HELIUS_WEBHOOK_ID) {
  console.error('❌ Missing HELIUS_API_KEY or HELIUS_WEBHOOK_ID');
  process.exit(1);
}

async function syncWalletsToHelius() {
  console.log('🔄 Syncing smart wallets to Helius webhook...');
  
  try {
    // Get all active smart wallets from database
    const wallets = await db
      .select({ walletAddress: smartWallets.walletAddress })
      .from(smartWallets)
      .where(eq(smartWallets.isActive, true));
    
    const addresses = wallets.map((w: any) => w.walletAddress);
    console.log(`📊 Found ${addresses.length} active wallets in database`);
    
    if (addresses.length === 0) {
      console.log('⚠️ No wallets to sync');
      return;
    }

    // Get current webhook configuration
    const getUrl = `https://api.helius.xyz/v0/webhooks/${HELIUS_WEBHOOK_ID}?api-key=${HELIUS_API_KEY}`;
    const currentWebhook = await fetch(getUrl);
    
    if (!currentWebhook.ok) {
      throw new Error(`Failed to get webhook: ${currentWebhook.status} ${await currentWebhook.text()}`);
    }
    
    const webhookData = await currentWebhook.json();
    console.log(`📡 Current webhook has ${webhookData.accountAddresses?.length || 0} addresses`);

    // Update webhook with new addresses (replaces existing)
    const updateUrl = `https://api.helius.xyz/v0/webhooks/${HELIUS_WEBHOOK_ID}?api-key=${HELIUS_API_KEY}`;
    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookURL: webhookData.webhookURL,
        transactionTypes: webhookData.transactionTypes,
        accountAddresses: addresses, // Replace with database wallets
        webhookType: webhookData.webhookType,
        txnStatus: webhookData.txnStatus || 'all',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update webhook: ${response.status} ${error}`);
    }

    const result = await response.json();
    console.log('✅ Webhook updated successfully!');
    console.log(`📊 Monitoring ${result.accountAddresses?.length || addresses.length} wallet addresses`);
    console.log('\n📋 Synced Wallets:');
    addresses.forEach((addr: string, i: number) => {
      console.log(`   ${i + 1}. ${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`);
    });

  } catch (error: any) {
    console.error('❌ Sync failed:', error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncWalletsToHelius()
    .then(() => {
      console.log('\n✅ Sync completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Sync failed:', error);
      process.exit(1);
    });
}

export { syncWalletsToHelius };

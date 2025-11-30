/**
 * Smart Money Wallet Test Script
 * 
 * Tests the smart money alert system by:
 * 1. Simulating a smart money event using the relay service
 * 2. Testing direct Discord/Telegram message delivery
 * 3. Verifying the database connection for wallet data
 */

import 'dotenv/config';
import { smartMoneyRelay, getDirective, type SmartMoneyEvent, type SmartMoneyWallet } from './server/services/smart-money-relay.js';
import { db } from './server/db.js';
import { smartWallets } from './shared/schema.js';
import { eq } from 'drizzle-orm';

// Test data - simulating "KOL Sniper" from our top 100 list
const TEST_WALLET: SmartMoneyWallet = {
  address: '4aKx7fV9r4e8pL2mX9kL2mZv9pL2mX9kL2mZv9pL2mX',
  winrate: 82,
  profit: 4_200_000,
  directive: getDirective(82, 4_200_000)
};

// Simulated token
const TEST_TOKEN = 'BtQQxvS6RNm5e1R6YM9KHpgppump7UJN8RLVs3pump';

console.log('🧪 Smart Money Wallet Test Script');
console.log('═'.repeat(60));

async function testDatabaseConnection() {
  console.log('\n📊 Step 1: Testing Database Connection...');
  
  try {
    // Try to query the smart wallets table
    const wallets = await db
      .select()
      .from(smartWallets)
      .where(eq(smartWallets.isActive, true))
      .limit(5);
    
    console.log(`✅ Database connected: Found ${wallets.length} active smart wallets`);
    
    if (wallets.length > 0) {
      console.log('\n📋 Sample Wallets:');
      wallets.forEach((w, i) => {
        console.log(`   ${i + 1}. ${w.displayName || 'Unknown'} (${w.walletAddress.slice(0, 8)}...)`);
        console.log(`      Win Rate: ${w.winRate}% | Influence: ${w.influenceScore}/100`);
      });
    } else {
      console.log('⚠️  No wallets found. Run: npm run seed:smart-wallets');
    }
    
    return true;
  } catch (error: any) {
    console.log('❌ Database connection failed:', error?.message);
    console.log('⚠️  Tests will continue with mock data...');
    return false;
  }
}

async function testSmartMoneyRelay() {
  console.log('\n🔔 Step 2: Testing Smart Money Relay Service...');
  
  // Create a test event
  const testEvent: SmartMoneyEvent = {
    tokenMint: TEST_TOKEN,
    symbol: 'TEST',
    ageMinutes: 5,
    walletCount: 1,
    eliteWallets: [TEST_WALLET],
    allSample: [TEST_WALLET.address.slice(0, 8) + '...'],
    analysis: {
      riskScore: 45,
      holderCount: 250,
      topConcentration: 35,
      agedWalletRisk: 0,
      suspiciousFundingPct: 0,
      bundled: false
    },
    timestamp: Date.now()
  };
  
  console.log(`\n📦 Mock Smart Money Event:`);
  console.log(`   Token: ${testEvent.tokenMint}`);
  console.log(`   Wallet: ${TEST_WALLET.address.slice(0, 12)}...`);
  console.log(`   Win Rate: ${TEST_WALLET.winrate}%`);
  console.log(`   Profit: $${(TEST_WALLET.profit / 1_000_000).toFixed(1)}M`);
  console.log(`   Directive: ${TEST_WALLET.directive}`);
  
  // Listen for the event
  let eventReceived = false;
  smartMoneyRelay.onEvent((event) => {
    eventReceived = true;
    console.log(`\n✅ Smart Money Relay received event!`);
    console.log(`   Elite Wallets: ${event.eliteWallets.length}`);
    console.log(`   Token: ${event.tokenMint.slice(0, 12)}...`);
  });
  
  // Publish the event
  console.log('\n📤 Publishing test event to relay...');
  smartMoneyRelay.publish(testEvent);
  
  // Wait a moment for event processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (eventReceived) {
    console.log('✅ Relay service is working!');
  } else {
    console.log('⚠️  No listeners detected (this is normal if bots are not running)');
  }
  
  // Show relay stats
  const stats = smartMoneyRelay.getStats();
  console.log(`\n📊 Relay Stats:`);
  console.log(`   Total Events: ${stats.eventCount}`);
  console.log(`   Listeners: ${stats.listenerCount}`);
}

async function testDirectDiscordAlert() {
  console.log('\n💬 Step 3: Testing Discord Direct Alert...');
  
  const DISCORD_WEBHOOK = process.env.DISCORD_ALPHA_WEBHOOK;
  
  if (!DISCORD_WEBHOOK) {
    console.log('⚠️  DISCORD_ALPHA_WEBHOOK not configured');
    console.log('   Set in .env: DISCORD_ALPHA_WEBHOOK=your_webhook_url');
    return;
  }
  
  const embed = {
    title: '🧪 SMART MONEY TEST ALERT',
    description: `This is a test of the smart money wallet alert system.`,
    color: 0x00ff00, // Green
    fields: [
      {
        name: '👤 Wallet',
        value: `**KOL Sniper** (Test Wallet)\n\`${TEST_WALLET.address.slice(0, 12)}...\``,
        inline: false
      },
      {
        name: '📊 Performance',
        value: `Win Rate: **${TEST_WALLET.winrate}%**\nProfit: **$${(TEST_WALLET.profit / 1_000_000).toFixed(1)}M**\nInfluence: **95/100**`,
        inline: true
      },
      {
        name: '🪙 Token Activity',
        value: `Token: \`${TEST_TOKEN.slice(0, 12)}...\`\nAction: **BUY**\nAge: **5 minutes**`,
        inline: true
      },
      {
        name: '🎯 Directive',
        value: `🚨 **${TEST_WALLET.directive}**`,
        inline: false
      },
      {
        name: '📝 Notes',
        value: 'KOL sniper; early Pump.fun entrant. This wallet has historically identified winning memecoins with 82% accuracy.',
        inline: false
      }
    ],
    footer: {
      text: `🧪 Test Alert • ${new Date().toLocaleString()}`
    },
    timestamp: new Date().toISOString()
  };
  
  try {
    const response = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '🧠 **SMART MONEY ALERT** - Test Mode',
        embeds: [embed]
      })
    });
    
    if (response.ok) {
      console.log('✅ Discord test alert sent successfully!');
      console.log('📬 Check your Discord channel for the alert');
    } else {
      const error = await response.text();
      console.log(`❌ Discord webhook failed: ${response.status}`);
      console.log(`   Error: ${error}`);
    }
  } catch (error: any) {
    console.log(`❌ Discord request failed: ${error?.message}`);
  }
}

async function testDirectTelegramAlert() {
  console.log('\n📱 Step 4: Testing Telegram Direct Alert...');
  
  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT = process.env.TELEGRAM_ALPHA_CHAT_ID;
  
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) {
    console.log('⚠️  Telegram not configured');
    console.log('   Set in .env:');
    console.log('   - TELEGRAM_BOT_TOKEN=your_bot_token');
    console.log('   - TELEGRAM_ALPHA_CHAT_ID=your_chat_id');
    return;
  }
  
  const message = `
🧪 *SMART MONEY TEST ALERT*

🧠 *Smart Money Activity Detected*

👤 *Wallet:* KOL Sniper (Test)
\`${TEST_WALLET.address.slice(0, 12)}...\`

📊 *Performance:*
• Win Rate: *${TEST_WALLET.winrate}%*
• Profit: *$${(TEST_WALLET.profit / 1_000_000).toFixed(1)}M*
• Influence: *95/100*

🪙 *Token Activity:*
• Token: \`${TEST_TOKEN.slice(0, 12)}...\`
• Action: *BUY*
• Age: *5 minutes*

🎯 *Directive:* 🚨 *${TEST_WALLET.directive}*

📝 *Notes:*
KOL sniper; early Pump.fun entrant. This wallet has historically identified winning memecoins with 82% accuracy.

⏰ ${new Date().toLocaleString()}
`.trim();
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });
    
    if (response.ok) {
      console.log('✅ Telegram test alert sent successfully!');
      console.log('📬 Check your Telegram channel for the alert');
    } else {
      const error = await response.text();
      console.log(`❌ Telegram API failed: ${response.status}`);
      console.log(`   Error: ${error}`);
    }
  } catch (error: any) {
    console.log(`❌ Telegram request failed: ${error?.message}`);
  }
}

async function testSystemHealth() {
  console.log('\n🏥 Step 5: Checking System Health...');
  
  console.log('\n📋 Environment Configuration:');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`   DISCORD_ALPHA_WEBHOOK: ${process.env.DISCORD_ALPHA_WEBHOOK ? '✅ Set' : '❌ Not set'}`);
  console.log(`   TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`   TELEGRAM_ALPHA_CHAT_ID: ${process.env.TELEGRAM_ALPHA_CHAT_ID ? '✅ Set' : '❌ Not set'}`);
  
  console.log('\n📊 Smart Money Configuration:');
  console.log(`   Test Wallet: KOL Sniper`);
  console.log(`   Address: ${TEST_WALLET.address.slice(0, 20)}...`);
  console.log(`   Win Rate: ${TEST_WALLET.winrate}%`);
  console.log(`   Profit: $${(TEST_WALLET.profit / 1_000_000).toFixed(1)}M`);
  console.log(`   Directive: ${TEST_WALLET.directive}`);
}

async function runAllTests() {
  try {
    // Step 1: Database
    const dbConnected = await testDatabaseConnection();
    
    // Step 2: Relay Service
    await testSmartMoneyRelay();
    
    // Step 3: Discord
    await testDirectDiscordAlert();
    
    // Step 4: Telegram
    await testDirectTelegramAlert();
    
    // Step 5: Health Check
    await testSystemHealth();
    
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 Test Complete!');
    console.log('═'.repeat(60));
    
    console.log('\n📌 Next Steps:');
    if (!dbConnected) {
      console.log('   1. ❌ Run: npm run seed:smart-wallets');
    } else {
      console.log('   1. ✅ Database has smart wallets');
    }
    console.log('   2. ✅ Check Discord/Telegram for test alerts');
    console.log('   3. ✅ Start your bot server to enable live monitoring');
    
    console.log('\n💡 Expected Messages:');
    console.log('   Discord: "🧪 SMART MONEY TEST ALERT" embed with KOL Sniper details');
    console.log('   Telegram: "🧪 SMART MONEY TEST ALERT" with wallet performance');
    
    console.log('\n🚀 If you see the test alerts, the system is ready!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error?.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

// Run the tests
runAllTests();

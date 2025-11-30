/**
 * Diagnostic script to check alpha/smart money alert configuration
 * Run with: tsx test-alert-config.ts
 */

import { storage } from './server/storage.js';
import { getAlphaAlertService } from './server/alpha-alerts.js';

async function checkConfiguration() {
  console.log('\n🔍 CHECKING ALERT CONFIGURATION\n');
  console.log('=' .repeat(60));
  
  // 1. Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log(`  ALPHA_ALERTS_DIRECT_SEND: ${process.env.ALPHA_ALERTS_DIRECT_SEND || 'not set'}`);
  console.log(`  ALPHA_ALERTS_BOT_RELAY: ${process.env.ALPHA_ALERTS_BOT_RELAY || 'not set'}`);
  console.log(`  ALPHA_DISCORD_WEBHOOK: ${process.env.ALPHA_DISCORD_WEBHOOK ? 'SET' : 'not set'}`);
  console.log(`  ALPHA_TELEGRAM_CHAT_ID: ${process.env.ALPHA_TELEGRAM_CHAT_ID || 'not set'}`);
  console.log(`  DISCORD_BOT_TOKEN: ${process.env.DISCORD_BOT_TOKEN ? 'SET' : 'not set'}`);
  console.log(`  DISCORD_CLIENT_ID: ${process.env.DISCORD_CLIENT_ID || 'not set'}`);
  
  // 2. Check alpha alert service status
  console.log('\n🔔 Alpha Alert Service:');
  const alphaService = getAlphaAlertService();
  const status = alphaService.getStatus(true);
  console.log(`  Running: ${status.isRunning ? '✅ YES' : '❌ NO'}`);
  console.log(`  Monitored Callers: ${status.monitoredCallers} / ${status.totalCallers}`);
  console.log(`  Active Listeners: ${status.activeListeners}`);
  console.log(`  Active WebSockets: ${status.activeWebSockets}`);
  
  if (status.callers && status.callers.length > 0) {
    console.log('\n  📱 Configured Wallets:');
    for (const caller of status.callers) {
      const short = `${caller.wallet.slice(0, 6)}...${caller.wallet.slice(-4)}`;
      console.log(`    • ${caller.name} (${short}) - ${caller.enabled ? '✅' : '❌'}`);
    }
  } else {
    console.log('  ⚠️  No wallets configured for monitoring');
  }
  
  // 3. Check alpha targets (Discord/Telegram channels)
  console.log('\n📢 Alpha Alert Targets:');
  try {
    const alphaTargets = await storage.getAlphaTargets();
    console.log(`  Total targets: ${alphaTargets.length}`);
    
    if (alphaTargets.length === 0) {
      console.log('  ❌ NO CHANNELS CONFIGURED');
      console.log('  💡 Use /alpha setchannel in Discord to configure');
    } else {
      for (const target of alphaTargets) {
        console.log(`  • ${target.platform}: Guild ${target.groupId} → Channel ${target.channelId}`);
      }
    }
  } catch (error: any) {
    console.error(`  ❌ Error fetching targets: ${error.message}`);
  }
  
  // 4. Check smart money targets
  console.log('\n🧠 Smart Money Targets:');
  try {
    const smartTargets = await storage.getSmartTargets();
    console.log(`  Total targets: ${smartTargets.length}`);
    
    if (smartTargets.length === 0) {
      console.log('  ❌ NO CHANNELS CONFIGURED');
      console.log('  💡 Use /smart setchannel in Discord to configure');
    } else {
      for (const target of smartTargets) {
        console.log(`  • ${target.platform}: Guild ${target.groupId} → Channel ${target.channelId}`);
      }
    }
  } catch (error: any) {
    console.error(`  ❌ Error fetching targets: ${error.message}`);
  }
  
  // 5. Determine alert routing
  console.log('\n🔀 Alert Routing:');
  const relayEnv = (process.env.ALPHA_ALERTS_BOT_RELAY || '').toLowerCase();
  const direct = process.env.ALPHA_ALERTS_DIRECT_SEND === 'true';
  const hasDirectTargets = Boolean(process.env.ALPHA_DISCORD_WEBHOOK || process.env.ALPHA_TELEGRAM_CHAT_ID);
  const botRelay = relayEnv === 'true' ? true : (relayEnv === 'false' ? false : !(direct && hasDirectTargets));
  
  console.log(`  Direct Send: ${direct ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`  Bot Relay: ${botRelay ? '✅ Enabled' : '❌ Disabled'}`);
  
  if (direct && hasDirectTargets) {
    console.log('  📡 Alerts will be sent via direct webhooks/API');
  } else if (botRelay) {
    console.log('  📡 Alerts will be sent via bot relay');
  } else {
    console.log('  ⚠️  No routing configured');
  }
  
  // 6. Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY:');
  
  const issues: string[] = [];
  
  if (!status.isRunning) {
    issues.push('Alpha alert service is NOT RUNNING');
  }
  
  if (status.totalCallers === 0) {
    issues.push('No wallets configured for monitoring');
  }
  
  const alphaTargets = await storage.getAlphaTargets();
  if (alphaTargets.length === 0 && !hasDirectTargets) {
    issues.push('No alert destinations configured (neither bot channels nor webhooks)');
  }
  
  if (!botRelay && !direct) {
    issues.push('Alert relay is disabled');
  }
  
  if (issues.length === 0) {
    console.log('✅ Configuration looks good!');
  } else {
    console.log('❌ Issues found:');
    for (const issue of issues) {
      console.log(`  • ${issue}`);
    }
  }
  
  console.log('\n💡 Recommendations:');
  if (!status.isRunning) {
    console.log('  1. Start the alpha alert service with /alpha start');
  }
  if (alphaTargets.length === 0 && !hasDirectTargets) {
    console.log('  2. Configure a Discord channel with /alpha setchannel');
  }
  if (status.totalCallers === 0) {
    console.log('  3. Add wallets to monitor with /alpha add or load from DB with /alpha reload');
  }
  
  console.log('\n');
}

checkConfiguration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

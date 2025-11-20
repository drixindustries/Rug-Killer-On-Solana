/**
 * Direct Alpha Alerts Test
 * Tests the alpha alerts service directly without HTTP endpoints
 */

import { getAlphaAlertService } from './server/alpha-alerts.ts';

async function main() {
  console.log('🧪 Direct Alpha Alerts Test\n');
  
  try {
    // Get the alpha alert service instance
    const alphaService = getAlphaAlertService();
    
    console.log('✅ Alpha service instance obtained');
    
    // Check if service is running
    const status = alphaService.getStatus();
    console.log('\n📊 Service Status:');
    console.log(`  Running: ${status.isRunning}`);
    console.log(`  Monitored callers: ${status.monitoredCallers}`);
    console.log(`  Total callers: ${status.totalCallers}`);
    console.log(`  Active listeners: ${status.activeListeners}`);
    if ('message' in status && status.message) {
      console.log(`  Message: ${status.message}`);
    }
    
    if (!status.isRunning) {
      console.log('\n🚀 Starting alpha alerts service...');
      await alphaService.start();
      console.log('✅ Service started');
      
      // Wait a moment for initialization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newStatus = alphaService.getStatus();
      console.log('\n📊 Updated Status:');
      console.log(`  Running: ${newStatus.isRunning}`);
      console.log(`  Monitored callers: ${newStatus.monitoredCallers}`);
    }
    
    // Test alert trigger
    console.log('\n🔔 Triggering test alert...');
    await alphaService.triggerTestAlert(
      'So11111111111111111111111111111111111111112',
      'Direct Test - SOL Token'
    );
    console.log('✅ Test alert triggered successfully');
    
    console.log('\n✅ All tests passed!');
    console.log('\nNote: Since no Discord/Telegram bots are configured,');
    console.log('the alert was processed but not delivered to any channel.');
    console.log('Check server logs for [ALPHA ALERT] messages.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
  
  // Don't exit immediately - let any async operations complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  process.exit(0);
}

main();

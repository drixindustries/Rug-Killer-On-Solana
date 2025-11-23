/**
 * Quick script to test alpha alert sending
 */

import { getAlphaAlertService } from './server/alpha-alerts.ts';

async function main() {
  console.log('🧪 Testing Alpha Alert...');
  
  const alpha = getAlphaAlertService();
  
  // Send test alert with mock wallet data
  await alpha.triggerTestAlert(
    'So11111111111111111111111111111111111111112', 
    'Test Trader (Demo)'
  );
  
  console.log('✅ Test alert sent! Check your Discord/Telegram channel.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

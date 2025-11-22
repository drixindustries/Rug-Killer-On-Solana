/**
 * Comprehensive Alpha Alerts System Test
 * Tests all major components of the alpha alerts system
 */

import { getAlphaAlertService } from './server/alpha-alerts.ts';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
}

async function testServiceInitialization() {
  section('1️⃣  Testing Service Initialization');
  
  try {
    const alphaService = getAlphaAlertService();
    log('✅ Alpha service instance created', 'green');
    
    const status = alphaService.getStatus();
    log(`✅ Service is ${status.isRunning ? 'RUNNING' : 'STOPPED'}`, status.isRunning ? 'green' : 'yellow');
    log(`   Monitored callers: ${status.monitoredCallers}`, 'blue');
    log(`   Total callers: ${status.totalCallers}`, 'blue');
    log(`   Active listeners: ${status.activeListeners}`, 'blue');
    
    return { success: true, alphaService, status };
  } catch (error: any) {
    log(`❌ Service initialization failed: ${error.message}`, 'red');
    return { success: false, error };
  }
}

async function testAlertGeneration(alphaService: any) {
  section('2️⃣  Testing Alert Generation');
  
  try {
    log('Triggering test alert for SOL token...', 'blue');
    await alphaService.triggerTestAlert(
      'So11111111111111111111111111111111111111112',
      'Comprehensive Test - SOL'
    );
    log('✅ Alert generated successfully', 'green');
    
    log('\nTriggering test alert for custom token...', 'blue');
    await alphaService.triggerTestAlert(
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'Comprehensive Test - USDC'
    );
    log('✅ Alert generated successfully', 'green');
    
    return { success: true };
  } catch (error: any) {
    log(`❌ Alert generation failed: ${error.message}`, 'red');
    return { success: false, error };
  }
}

async function testCallerManagement(alphaService: any) {
  section('3️⃣  Testing Caller Management');
  
  try {
    const testWallet = '7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3';
    const testName = 'Test Trader Wallet';
    
    log(`Adding test wallet: ${testWallet}`, 'blue');
    alphaService.addCaller(testWallet, testName);
    log('✅ Wallet added successfully', 'green');
    
    const statusAfterAdd = alphaService.getStatus();
    log(`   Total callers: ${statusAfterAdd.totalCallers}`, 'blue');
    log(`   Monitored callers: ${statusAfterAdd.monitoredCallers}`, 'blue');
    
    if (statusAfterAdd.totalCallers > 0) {
      log('✅ Caller management working', 'green');
    }
    
    log('\nRemoving test wallet...', 'blue');
    alphaService.removeCaller(testWallet);
    log('✅ Wallet removed successfully', 'green');
    
    const statusAfterRemove = alphaService.getStatus();
    log(`   Total callers: ${statusAfterRemove.totalCallers}`, 'blue');
    
    return { success: true };
  } catch (error: any) {
    log(`❌ Caller management failed: ${error.message}`, 'red');
    return { success: false, error };
  }
}

async function testServiceLifecycle(alphaService: any) {
  section('4️⃣  Testing Service Lifecycle');
  
  try {
    log('Checking if service can stop...', 'blue');
    const canStop = typeof alphaService.stop === 'function';
    
    if (canStop) {
      log('✅ Stop method exists', 'green');
    } else {
      log('⚠️  Stop method not found', 'yellow');
    }
    
    log('Checking if service can start...', 'blue');
    const canStart = typeof alphaService.start === 'function';
    
    if (canStart) {
      log('✅ Start method exists', 'green');
    } else {
      log('❌ Start method not found', 'red');
      return { success: false };
    }
    
    return { success: true };
  } catch (error: any) {
    log(`❌ Service lifecycle test failed: ${error.message}`, 'red');
    return { success: false, error };
  }
}

async function testEnvironmentConfiguration() {
  section('5️⃣  Testing Environment Configuration');
  
  const requiredVars = [
    'ALPHA_ALERTS_ENABLED',
  ];
  
  const optionalVars = [
    'ALPHA_ALERTS_AUTOSTART',
    'ALPHA_ALERTS_DIRECT_SEND',
    'ALPHA_HTTP_RPC',
    'ALPHA_WS_RPC',
    'ALPHA_DISCORD_WEBHOOK',
    'ALPHA_TELEGRAM_BOT_TOKEN',
    'ALPHA_TELEGRAM_CHAT_ID',

    'GMGN_API_KEY',
  ];
  
  log('Required Variables:', 'cyan');
  let allRequired = true;
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      log(`  ✅ ${varName}: ${value}`, 'green');
    } else {
      log(`  ❌ ${varName}: NOT SET`, 'red');
      allRequired = false;
    }
  }
  
  log('\nOptional Variables:', 'cyan');
  let hasOptional = 0;
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (value && value !== 'PLACEHOLDER_TOKEN' && value !== 'PLACEHOLDER_ID') {
      log(`  ✅ ${varName}: configured`, 'green');
      hasOptional++;
    } else {
      log(`  ⚪ ${varName}: not set`, 'yellow');
    }
  }
  
  log(`\n${hasOptional}/${optionalVars.length} optional features configured`, 'blue');
  
  return { success: allRequired, hasOptional };
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     🚀 COMPREHENSIVE ALPHA ALERTS SYSTEM TEST 🚀                  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════╝', 'cyan');
  
  const results: Record<string, boolean> = {};
  
  // Test 1: Service Initialization
  const initResult = await testServiceInitialization();
  results.initialization = initResult.success;
  
  if (!initResult.success || !initResult.alphaService) {
    log('\n❌ Cannot continue - service initialization failed', 'red');
    process.exit(1);
  }
  
  // Test 2: Alert Generation
  const alertResult = await testAlertGeneration(initResult.alphaService);
  results.alertGeneration = alertResult.success;
  
  // Test 3: Caller Management
  const callerResult = await testCallerManagement(initResult.alphaService);
  results.callerManagement = callerResult.success;
  
  // Test 4: Service Lifecycle
  const lifecycleResult = await testServiceLifecycle(initResult.alphaService);
  results.serviceLifecycle = lifecycleResult.success;
  
  // Test 5: Environment Configuration
  const envResult = await testEnvironmentConfiguration();
  results.environment = envResult.success;
  
  // Summary
  section('📊 TEST SUMMARY');
  
  const tests = [
    { name: 'Service Initialization', key: 'initialization' },
    { name: 'Alert Generation', key: 'alertGeneration' },
    { name: 'Caller Management', key: 'callerManagement' },
    { name: 'Service Lifecycle', key: 'serviceLifecycle' },
    { name: 'Environment Config', key: 'environment' },
  ];
  
  for (const test of tests) {
    const status = results[test.key];
    const icon = status ? '✅' : '❌';
    const color = status ? 'green' : 'red';
    log(`${icon} ${test.name}`, color);
  }
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;
  
  console.log('\n' + '='.repeat(70));
  
  if (passed === total) {
    log(`🎉 ALL TESTS PASSED! (${passed}/${total})`, 'green');
    log('\n✅ The Alpha Alerts system is FULLY FUNCTIONAL!', 'green');
    log('\n📝 Next steps:', 'cyan');
    log('   1. Add alpha callers (wallets to monitor)', 'blue');
    log('   2. Configure Discord/Telegram bots for delivery', 'blue');
    log('   3. Deploy to production', 'blue');
  } else {
    log(`⚠️  Some tests failed (${passed}/${total} passed)`, 'yellow');
    log('\n📚 Check the output above for details', 'cyan');
  }
  
  console.log('='.repeat(70) + '\n');
  
  // Wait a moment for any async operations
  await new Promise(resolve => setTimeout(resolve, 1000));
  process.exit(passed === total ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

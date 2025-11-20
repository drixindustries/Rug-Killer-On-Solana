#!/usr/bin/env node
/**
 * Alpha Alerts Testing Script
 * 
 * This script tests the alpha alerts system end-to-end:
 * 1. Health check endpoint
 * 2. Startup test (direct send to Discord/Telegram)
 * 3. Test alert trigger
 * 4. RPC connectivity
 */

// Node.js built-in fetch (Node 18+)
const BASE_URL = process.env.APP_URL || 'http://localhost:5000';
const DEBUG_TOKEN = process.env.DEBUG_ENDPOINTS_TOKEN;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testHealthEndpoint() {
  section('1️⃣  Testing Health Endpoint');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    
    if (response.ok) {
      log('✅ Health check passed', 'green');
      console.log('Response:', JSON.stringify(data, null, 2));
      
      // Check if alpha alerts are enabled
      if (data.alphaAlerts) {
        log(`   Alpha Alerts: ${data.alphaAlerts.enabled ? '✅ Enabled' : '❌ Disabled'}`, 
            data.alphaAlerts.enabled ? 'green' : 'yellow');
        if (data.alphaAlerts.running !== undefined) {
          log(`   Running: ${data.alphaAlerts.running ? '✅ Yes' : '❌ No'}`, 
              data.alphaAlerts.running ? 'green' : 'yellow');
        }
        if (data.alphaAlerts.walletCount !== undefined) {
          log(`   Monitoring ${data.alphaAlerts.walletCount} wallets`, 'blue');
        }
      }
      return true;
    } else {
      log('❌ Health check failed', 'red');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    log('❌ Health check error', 'red');
    console.error('Error:', error.message);
    return false;
  }
}

async function testStartupMessage() {
  section('2️⃣  Testing Startup Message (Direct Send)');
  
  if (!DEBUG_TOKEN) {
    log('⚠️  DEBUG_ENDPOINTS_TOKEN not set, skipping test', 'yellow');
    log('   Set DEBUG_ENDPOINTS_TOKEN in .env to run this test', 'yellow');
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/debug/alpha/test-startup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Token': DEBUG_TOKEN
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.ok) {
      log('✅ Startup test message sent', 'green');
      console.log('Response:', JSON.stringify(data, null, 2));
      log('\n📱 Check your Discord/Telegram for the test message!', 'cyan');
      return true;
    } else {
      log('❌ Startup test failed', 'red');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    log('❌ Startup test error', 'red');
    console.error('Error:', error.message);
    return false;
  }
}

async function testAlertTrigger() {
  section('3️⃣  Testing Alert Trigger');
  
  if (!DEBUG_TOKEN) {
    log('⚠️  DEBUG_ENDPOINTS_TOKEN not set, skipping test', 'yellow');
    return false;
  }

  try {
    // Use SOL token as test mint
    const testMint = 'So11111111111111111111111111111111111111112';
    const testSource = 'Test Alpha Caller';
    
    log(`Testing with mint: ${testMint}`, 'blue');
    log(`Source: ${testSource}`, 'blue');
    
    const response = await fetch(`${BASE_URL}/api/debug/alpha/test-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Token': DEBUG_TOKEN
      },
      body: JSON.stringify({
        mint: testMint,
        source: testSource
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.ok) {
      log('✅ Test alert triggered successfully', 'green');
      console.log('Response:', JSON.stringify(data, null, 2));
      log('\n📱 Check your Discord/Telegram for the alert!', 'cyan');
      return true;
    } else {
      log('❌ Test alert failed', 'red');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    log('❌ Test alert error', 'red');
    console.error('Error:', error.message);
    return false;
  }
}

async function testRpcConnectivity() {
  section('4️⃣  Testing RPC Connectivity');
  
  if (!DEBUG_TOKEN) {
    log('⚠️  DEBUG_ENDPOINTS_TOKEN not set, skipping test', 'yellow');
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/debug/ping-rpc?count=3`, {
      headers: {
        'X-Debug-Token': DEBUG_TOKEN
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      log('✅ RPC connectivity test passed', 'green');
      console.log('Response:', JSON.stringify(data, null, 2));
      
      if (data.results && data.results.length > 0) {
        const avgLatency = data.results.reduce((sum, r) => sum + r.latencyMs, 0) / data.results.length;
        log(`   Average latency: ${avgLatency.toFixed(2)}ms`, 'blue');
      }
      return true;
    } else {
      log('❌ RPC connectivity test failed', 'red');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    log('❌ RPC connectivity test error', 'red');
    console.error('Error:', error.message);
    return false;
  }
}

async function checkEnvironmentVariables() {
  section('🔍 Environment Variables Check');
  
  const requiredVars = [
    'ALPHA_ALERTS_ENABLED',
    'ALPHA_ALERTS_DIRECT_SEND',
    'ALPHA_DISCORD_WEBHOOK',
    'ALPHA_TELEGRAM_BOT_TOKEN',
    'ALPHA_TELEGRAM_CHAT_ID'
  ];
  
  const optionalVars = [
    'ALPHA_ALERTS_AUTOSTART',
    'ALPHA_HTTP_RPC',
    'ALPHA_WS_RPC',
    'HELIUS_API_KEY',
    'QUICKNODE_RPC_URL',
    'NANSEN_API_KEY',
    'GMGN_API_KEY'
  ];
  
  log('Required Variables:', 'cyan');
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      log(`  ✅ ${varName}: ${value.substring(0, 20)}...`, 'green');
    } else {
      log(`  ❌ ${varName}: NOT SET`, 'red');
    }
  }
  
  log('\nOptional Variables:', 'cyan');
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (value) {
      log(`  ✅ ${varName}: ${value.substring(0, 20)}...`, 'green');
    } else {
      log(`  ⚪ ${varName}: not set`, 'yellow');
    }
  }
}

async function main() {
  log('\n🚀 Alpha Alerts Testing Suite', 'cyan');
  log(`📡 Testing against: ${BASE_URL}`, 'blue');
  
  // Check environment
  await checkEnvironmentVariables();
  
  // Run tests
  const results = {
    health: await testHealthEndpoint(),
    startup: await testStartupMessage(),
    alert: await testAlertTrigger(),
    rpc: await testRpcConnectivity()
  };
  
  // Summary
  section('📊 Test Summary');
  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.values(results).length;
  
  console.log(`Health Endpoint:     ${results.health ? '✅' : '❌'}`);
  console.log(`Startup Message:     ${results.startup ? '✅' : results.startup === false ? '❌' : '⚠️  Skipped'}`);
  console.log(`Alert Trigger:       ${results.alert ? '✅' : results.alert === false ? '❌' : '⚠️  Skipped'}`);
  console.log(`RPC Connectivity:    ${results.rpc ? '✅' : results.rpc === false ? '❌' : '⚠️  Skipped'}`);
  
  console.log('\n' + '='.repeat(60));
  if (passed === total) {
    log(`🎉 All tests passed! (${passed}/${total})`, 'green');
  } else {
    log(`⚠️  Some tests failed or were skipped (${passed}/${total} passed)`, 'yellow');
  }
  
  // Additional guidance
  if (!DEBUG_TOKEN) {
    log('\n💡 Tip: Set DEBUG_ENDPOINTS_TOKEN to run all tests', 'cyan');
  }
  
  if (!results.startup || !results.alert) {
    log('\n📚 For troubleshooting help, see ALPHA_ALERTS_TROUBLESHOOTING.md', 'cyan');
  }
}

// Run the tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

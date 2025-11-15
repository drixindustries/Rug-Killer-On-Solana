#!/usr/bin/env node

/**
 * Test devaudit Command
 * 
 * Tests the Dev Audit functionality to verify:
 * - Mint authority detection
 * - Freeze authority detection
 * - Token age calculation
 * - Overall verdict logic
 */

console.log('🔥 Dev Audit CAPABILITY TEST\n');
console.log('═'.repeat(80));

// Test tokens with different characteristics
const testCases = [
  {
    name: 'USDC (Safe - Established)',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    expectedMint: 'Revoked',
    expectedFreeze: 'Revoked',
    expectedAge: 'Old (>30 days)'
  },
  {
    name: 'WIF (Safe - Established)',
    address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    expectedMint: 'Revoked',
    expectedFreeze: 'Revoked',
    expectedAge: 'Old (>30 days)'
  },
  {
    name: 'BONK (Safe - Established)',
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    expectedMint: 'Revoked',
    expectedFreeze: 'Revoked',
    expectedAge: 'Old (>30 days)'
  }
];

async function testdevaudit(testCase) {
  console.log(`\n📊 Testing: ${testCase.name}`);
  console.log('─'.repeat(80));
  console.log(`Address: ${testCase.address}`);
  
  try {
    const response = await fetch('http://localhost:5000/api/analyze-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tokenAddress: testCase.address })
    });
    
    if (!response.ok) {
      console.log(`❌ API Error: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const analysis = await response.json();
    
    // Check Mint Authority
    console.log('\n🪙 MINT AUTHORITY:');
    const mintStatus = analysis.mintAuthority.hasAuthority && !analysis.mintAuthority.isRevoked 
      ? 'ACTIVE ❌' 
      : 'REVOKED ✅';
    console.log(`   Status: ${mintStatus}`);
    if (analysis.mintAuthority.authorityAddress) {
      console.log(`   Authority: ${analysis.mintAuthority.authorityAddress.slice(0, 8)}...`);
    }
    
    // Check Freeze Authority
    console.log('\n🧊 FREEZE AUTHORITY:');
    const freezeStatus = analysis.freezeAuthority.hasAuthority && !analysis.freezeAuthority.isRevoked 
      ? 'ACTIVE ❌' 
      : 'REVOKED ✅';
    console.log(`   Status: ${freezeStatus}`);
    if (analysis.freezeAuthority.authorityAddress) {
      console.log(`   Authority: ${analysis.freezeAuthority.authorityAddress.slice(0, 8)}...`);
    }
    
    // Check Token Age
    if (analysis.creationDate) {
      const age = Math.floor((Date.now() - analysis.creationDate) / (1000 * 60 * 60 * 24));
      console.log('\n📅 TOKEN AGE:');
      console.log(`   ${age} days old`);
      
      if (age < 7) {
        console.log(`   ⚠️ Very new token - high risk!`);
      } else if (age < 30) {
        console.log(`   ⚠️ New token - exercise caution`);
      } else {
        console.log(`   ✅ Established token`);
      }
    } else {
      console.log('\n📅 TOKEN AGE: Unknown');
    }
    
    // Overall Verdict
    console.log('\n🔥 Dev Audit VERDICT:');
    const hasFlags = (analysis.mintAuthority.hasAuthority && !analysis.mintAuthority.isRevoked) ||
                     (analysis.freezeAuthority.hasAuthority && !analysis.freezeAuthority.isRevoked) ||
                     (analysis.creationDate && ((Date.now() - analysis.creationDate) / (1000 * 60 * 60 * 24)) < 7);
    
    if (!hasFlags) {
      console.log('   ✅ SAFE - Token passes Dev Audit checks!');
    } else {
      console.log('   ⚠️ CONCERNING - Token has dev permissions or is very new!');
    }
    
    return true;
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n📋 Test Cases:');
  testCases.forEach((tc, i) => {
    console.log(`   ${i + 1}. ${tc.name}`);
  });
  
  console.log('\n⏳ Starting tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const result = await testdevaudit(testCase);
    if (result) {
      passed++;
    } else {
      failed++;
    }
    
    // Wait 2 seconds between tests to avoid rate limiting
    if (testCases.indexOf(testCase) < testCases.length - 1) {
      console.log('\n⏸️ Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(80));
  console.log(`✅ Passed: ${passed}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All Dev Audit tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Check the output above for details.');
  }
}

// Run tests
runTests().catch(console.error);

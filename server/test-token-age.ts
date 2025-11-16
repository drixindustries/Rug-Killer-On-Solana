#!/usr/bin/env node

/**
 * Test Token Age Functionality
 * Tests the new getTokenCreationDate method
 */

import { SolanaTokenAnalyzer } from './solana-analyzer';

const TEST_TOKENS = {
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
};

async function testTokenAge() {
  console.log('🕒 Testing Token Age Functionality\n');
  console.log('═'.repeat(60));

  const analyzer = new SolanaTokenAnalyzer();

  for (const [name, address] of Object.entries(TEST_TOKENS)) {
    console.log(`\n📊 Testing ${name} (${address})`);
    console.log('-'.repeat(50));
    
    try {
      const analysis = await analyzer.analyzeToken(address);
      
      if (analysis.creationDate) {
        const ageMs = Date.now() - analysis.creationDate;
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        const ageHours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        console.log(`✅ Creation Date: ${new Date(analysis.creationDate).toLocaleString()}`);
        console.log(`📅 Age: ${ageDays} days, ${ageHours} hours`);
        
        // Test age categorization
        if (ageDays < 1) {
          console.log(`🚨 Very New Token - High Risk (< 1 day)`);
        } else if (ageDays < 7) {
          console.log(`⚠️ New Token (< 1 week)`);
        } else if (ageDays < 30) {
          console.log(`📊 Recent Token (< 1 month)`);
        } else {
          console.log(`🟢 Established Token (> 1 month)`);
        }
      } else {
        console.log(`❌ Failed to get creation date`);
      }
    } catch (error) {
      console.error(`❌ Error analyzing ${name}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log('\n✅ Token age test complete!');
}

testTokenAge().catch(console.error);
#!/usr/bin/env node

/**
 * Test Optimized Token Age (30-day focus)
 * Tests the new optimized approach that treats >30 day tokens as "Established"
 */

import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

async function testOptimizedTokenAge(mintAddress: string): Promise<number | undefined> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    
    // Only fetch enough signatures to cover ~30 days for new tokens
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    let allSignatures: any[] = [];
    let before: string | undefined;
    const batchSize = 1000;
    
    // Fetch signatures in batches, but stop if we go back more than 30 days
    for (let batch = 0; batch < 2; batch++) { // Max 2 batches (2000 signatures)
      console.log(`📊 Fetching batch ${batch + 1}...`);
      const signatures = await connection.getSignaturesForAddress(
        mintPubkey, 
        { limit: batchSize, before }, 
        'confirmed'
      );
      
      if (signatures.length === 0) break;
      
      // Check if we've gone back more than 30 days
      const oldestInBatch = signatures[signatures.length - 1];
      const oldestTime = (oldestInBatch.blockTime || 0) * 1000;
      
      allSignatures.push(...signatures);
      console.log(`   Found ${signatures.length} signatures, oldest: ${new Date(oldestTime).toLocaleDateString()}`);
      
      // If oldest transaction in this batch is older than 30 days, 
      // mark as established token and return undefined
      if (oldestTime < thirtyDaysAgo) {
        console.log(`✅ Token is older than 30 days - treating as ESTABLISHED`);
        return undefined; // Frontend will show "Established" for undefined dates
      }
      
      // If we got fewer than the batch size, we've reached the end
      if (signatures.length < batchSize) break;
      
      // Set 'before' to the last signature for pagination
      before = signatures[signatures.length - 1].signature;
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (allSignatures.length === 0) {
      return undefined;
    }
    
    // The oldest signature is at the end of the array (most recent first)
    const oldestSignature = allSignatures[allSignatures.length - 1];
    const creationTime = oldestSignature.blockTime;
    
    if (!creationTime) {
      return undefined;
    }
    
    // Convert to milliseconds
    return creationTime * 1000;
  } catch (error) {
    console.error("❌ Error fetching token creation date:", error);
    return undefined;
  }
}

async function testTokens() {
  console.log('🕒 Testing Optimized Token Age (30-day focus)\n');
  console.log('═'.repeat(60));

  const testTokens = {
    'USDC (Should be Established)': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'BONK (Should be Established)': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
  };

  for (const [name, address] of Object.entries(testTokens)) {
    console.log(`\n📊 Testing ${name}`);
    console.log('-'.repeat(50));
    
    const creationDate = await testOptimizedTokenAge(address);
    
    if (creationDate) {
      const ageMs = Date.now() - creationDate;
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      
      console.log(`✅ Creation Date: ${new Date(creationDate).toLocaleString()}`);
      console.log(`📅 Age: ${ageDays} days`);
      
      if (ageDays < 1) {
        console.log(`🚨 UI will show: "Very New - High Risk"`);
      } else if (ageDays < 7) {
        console.log(`⚠️ UI will show: "New Token"`);
      } else if (ageDays < 30) {
        console.log(`📊 UI will show: "Recent"`);
      } else {
        console.log(`🟢 UI will show: "Established"`);
      }
    } else {
      console.log(`✅ Token age: ESTABLISHED (>30 days or no creation date found)`);
      console.log(`🟢 UI will show: "Established" badge`);
    }
    
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n✅ Optimized token age test complete!');
  console.log('\n🎯 Key benefits of this approach:');
  console.log('• Faster analysis for established tokens (>30 days)');
  console.log('• Focuses resources on identifying risky new tokens');
  console.log('• Treats tokens >30 days as "Established" (generally safe)');
  console.log('• Reduces RPC calls for mature tokens');
}

testTokens().catch(console.error);
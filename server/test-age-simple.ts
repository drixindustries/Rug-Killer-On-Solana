#!/usr/bin/env node

/**
 * Simple Token Age Test
 * Tests just the token creation date functionality without full server
 */

import { Connection, PublicKey } from "@solana/web3.js";

// Use public RPC for testing
const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

async function getTokenCreationDate(mintAddress: string): Promise<number | undefined> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    
    // Get all signatures for the token mint account to find the oldest (creation)
    console.log(`🔍 Fetching signatures for ${mintAddress}...`);
    const signatures = await connection.getSignaturesForAddress(
      mintPubkey, 
      { limit: 1000 }, 
      'confirmed'
    );
    
    if (signatures.length === 0) {
      console.log(`❌ No signatures found for token`);
      return undefined;
    }
    
    console.log(`📊 Found ${signatures.length} signatures`);
    
    // The oldest signature is at the end of the array (most recent first)
    const oldestSignature = signatures[signatures.length - 1];
    const creationTime = oldestSignature.blockTime;
    
    if (!creationTime) {
      console.log(`❌ No timestamp found in oldest signature`);
      return undefined;
    }
    
    // Convert to milliseconds
    return creationTime * 1000;
  } catch (error) {
    console.error("❌ Error fetching token creation date:", error);
    return undefined;
  }
}

async function testTokenAge() {
  console.log('🕒 Simple Token Age Test\n');
  console.log('═'.repeat(50));

  const testTokens = {
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Should be very old
    'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' // Less active, should show real age
  };

  for (const [name, address] of Object.entries(testTokens)) {
    console.log(`\n📊 Testing ${name}`);
    console.log('-'.repeat(30));
    
    const creationDate = await getTokenCreationDate(address);
    
    if (creationDate) {
      const ageMs = Date.now() - creationDate;
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      
      console.log(`✅ Creation Date: ${new Date(creationDate).toLocaleString()}`);
      console.log(`📅 Age: ${ageDays} days`);
      
      // Test risk categorization
      if (ageDays < 1) {
        console.log(`🚨 Risk Level: VERY HIGH (Very New - < 1 day)`);
      } else if (ageDays < 7) {
        console.log(`⚠️ Risk Level: HIGH (New Token - < 1 week)`);
      } else if (ageDays < 30) {
        console.log(`📊 Risk Level: MEDIUM (Recent - < 1 month)`);
      } else {
        console.log(`🟢 Risk Level: LOW (Established - > 1 month)`);
      }
    } else {
      console.log(`❌ Failed to get creation date for ${name}`);
    }
    
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ Token age test complete!');
}

testTokenAge().catch(console.error);
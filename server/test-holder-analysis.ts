/**
 * Test script for holder analysis service
 * Usage: npx tsx server/test-holder-analysis.ts <TOKEN_ADDRESS>
 */

import { holderAnalysis } from './services/holder-analysis';

const tokenAddress = process.argv[2] || 'HzAVWr6MXusuo9eWViULz9yRYf4pcHsufrtCfEQpump';

async function testHolderAnalysis() {
  console.log(`\n🔍 Testing Holder Analysis for: ${tokenAddress}\n`);

  try {
    const result = await holderAnalysis.analyzeHolders(tokenAddress);

    console.log('📊 Holder Analysis Results:');
    console.log(`   Token: ${result.tokenAddress}`);
    console.log(`   Total Holders: ${result.holderCount}`);
    console.log(`   Top 10 Concentration: ${result.topHolderConcentration.toFixed(2)}%`);
    console.log(`   Exchange Holders: ${result.exchangeHolderCount}`);
    console.log(`   Exchange Supply: ${result.exchangeSupplyPercent.toFixed(2)}%`);
    console.log(`   LP Supply: ${result.lpSupplyPercent.toFixed(2)}%`);
    console.log(`   Data Source: ${result.source}`);
    console.log(`   Cached At: ${new Date(result.cachedAt).toISOString()}`);

    console.log('\n👥 Top 20 Holders:');
    result.top20Holders.forEach((holder, index) => {
      const flags = [];
      if (holder.isExchange) flags.push('EXCHANGE');
      if (holder.isLP) flags.push('LP');
      if (holder.isCreator) flags.push('CREATOR');
      if (holder.isBundled) flags.push('BUNDLED');
      if (holder.isSniper) flags.push('SNIPER');
      if (holder.isInsider) flags.push('INSIDER');
      
      const flagsStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
      const labelStr = holder.label ? ` - ${holder.label}` : '';
      
      console.log(
        `   ${(index + 1).toString().padStart(2, ' ')}. ${holder.address.slice(0, 8)}...${holder.address.slice(-8)} ` +
        `${holder.percentage.toFixed(2).padStart(6, ' ')}%${labelStr}${flagsStr}`
      );
    });

    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testHolderAnalysis();

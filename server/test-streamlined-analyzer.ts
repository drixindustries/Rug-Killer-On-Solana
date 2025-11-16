#!/usr/bin/env node

/**
 * Test Streamlined Analyzer (Birdeye + GMGN Only)
 * Verifies the simplified analysis with only core APIs
 */

import { SolanaTokenAnalyzer } from './solana-analyzer';

const TEST_TOKENS = {
  'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
};

async function testStreamlinedAnalyzer() {
  console.log('🔬 Testing Streamlined Token Analyzer');
  console.log('📊 Using: Birdeye + GMGN only\n');
  console.log('═'.repeat(60));

  const analyzer = new SolanaTokenAnalyzer();

  for (const [name, address] of Object.entries(TEST_TOKENS)) {
    console.log(`\n🧪 Testing ${name} (${address.slice(0, 8)}...)`);
    console.log('-'.repeat(50));
    
    try {
      const startTime = Date.now();
      const analysis = await analyzer.analyzeToken(address);
      const duration = Date.now() - startTime;
      
      console.log(`✅ Analysis completed in ${duration}ms`);
      console.log(`📊 Risk Score: ${analysis.riskScore}/100 (${analysis.riskLevel})`);
      console.log(`🔍 Red Flags: ${analysis.redFlags.length}`);
      console.log(`👥 Holders: ${analysis.holderCount}`);
      console.log(`📈 Token Age: ${analysis.creationDate ? getTimeAgo(analysis.creationDate) : 'Established'}`);
      
      // Check data sources
      console.log('\n📡 Data Sources:');
      console.log(`   • Birdeye: ${analysis.birdeyeData ? '✅' : '❌'}`);
      console.log(`   • GMGN: ${analysis.gmgnData ? '✅' : '❌'}`);
      console.log(`   • On-chain: ✅ (${analysis.topHolders.length} holders)`);
      
      // Check metadata
      console.log('\n📋 Metadata:');
      console.log(`   • Name: ${analysis.metadata?.name || 'Unknown'}`);
      console.log(`   • Symbol: ${analysis.metadata?.symbol || 'Unknown'}`);
      console.log(`   • Supply: ${analysis.metadata?.supply || 0}`);
      
      // Check market data
      if (analysis.marketData) {
        console.log('\n💰 Market Data:');
        console.log(`   • Price: $${analysis.marketData.price || 0}`);
        console.log(`   • Market Cap: $${formatNumber(analysis.marketData.marketCap || 0)}`);
        console.log(`   • Volume 24h: $${formatNumber(analysis.marketData.volume24h || 0)}`);
      }
      
      // Authority status
      console.log('\n🔐 Authority Status:');
      console.log(`   • Mint Authority: ${analysis.mintAuthority.isRevoked ? 'Revoked ✅' : 'Active ⚠️'}`);
      console.log(`   • Freeze Authority: ${analysis.freezeAuthority.isRevoked ? 'Revoked ✅' : 'Active ⚠️'}`);
      
    } catch (error) {
      console.error(`❌ Error analyzing ${name}:`, error instanceof Error ? error.message : error);
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n✅ Streamlined analyzer test complete!');
  console.log('\n🎯 Benefits of streamlined approach:');
  console.log('• Faster analysis (fewer API calls)');
  console.log('• Reduced external dependencies');
  console.log('• Focus on core data: Birdeye (market) + GMGN (intelligence)');
  console.log('• More reliable (fewer points of failure)');
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

testStreamlinedAnalyzer().catch(console.error);
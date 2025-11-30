/**
 * Test suite for GitHub Repository Grading System
 * 
 * Run with: tsx test-github-grading.ts
 */

import { githubAnalyzer } from './server/services/github-repo-analyzer';

async function testRepositories() {
  console.log('🧪 Testing GitHub Repository Grading System\n');
  console.log('=' .repeat(60) + '\n');
  
  const testRepos = [
    // High quality repos (should score well)
    {
      url: 'https://github.com/solana-labs/solana',
      expectedGrade: ['A+', 'A'],
      description: 'Solana Labs - Main Solana repo'
    },
    {
      url: 'https://github.com/coral-xyz/anchor',
      expectedGrade: ['A+', 'A'],
      description: 'Coral - Anchor framework'
    },
    {
      url: 'https://github.com/project-serum/serum-dex',
      expectedGrade: ['A', 'B', 'C'],
      description: 'Serum DEX (may be less active)'
    },
    
    // Medium quality repos
    {
      url: 'metaplex-foundation/metaplex',
      expectedGrade: ['A', 'B'],
      description: 'Metaplex - NFT standard'
    },
    
    // Test invalid URLs
    {
      url: 'https://github.com/nonexistent/fakerepo12345',
      expectedGrade: ['N/A'],
      description: 'Non-existent repo (should return N/A)'
    }
  ];
  
  for (const test of testRepos) {
    console.log(`Testing: ${test.description}`);
    console.log(`URL: ${test.url}`);
    console.log('-'.repeat(60));
    
    try {
      const result = await githubAnalyzer.gradeRepository(test.url);
      
      if (!result.found) {
        console.log(`❌ Repository not found`);
        console.log(`Error: ${result.error || 'Unknown error'}\n`);
        continue;
      }
      
      // Display results
      console.log(`✅ Grade: ${result.grade}`);
      console.log(`📊 Confidence Score: ${result.confidenceScore}/100`);
      console.log(`\nMetrics:`);
      console.log(`  - Stars: ${result.metrics!.stars.toLocaleString()}`);
      console.log(`  - Forks: ${result.metrics!.forks.toLocaleString()}`);
      console.log(`  - Contributors: ${result.metrics!.contributors}`);
      console.log(`  - Commits: ${result.metrics!.commits.toLocaleString()}`);
      console.log(`  - Language: ${result.metrics!.language || 'Mixed'}`);
      console.log(`  - Solana Project: ${result.metrics!.isSolanaProject ? 'Yes' : 'No'}`);
      console.log(`  - Last Update: ${result.metrics!.lastCommitDate?.toLocaleDateString() || 'Unknown'}`);
      
      console.log(`\nScore Breakdown:`);
      console.log(`  🔒 Security: ${result.securityScore}/30`);
      console.log(`  ⚡ Activity: ${result.activityScore}/25`);
      console.log(`  🌟 Popularity: ${result.popularityScore}/20`);
      console.log(`  💚 Health: ${result.healthScore}/15`);
      if (result.solanaScore > 0) {
        console.log(`  🚀 Solana Bonus: ${result.solanaScore}/10`);
      }
      
      if (result.strengths.length > 0) {
        console.log(`\nStrengths:`);
        result.strengths.forEach(s => console.log(`  ${s}`));
      }
      
      if (result.risks.length > 0) {
        console.log(`\nRisks:`);
        result.risks.forEach(r => console.log(`  ${r}`));
      }
      
      console.log(`\nRecommendation:`);
      console.log(`  ${result.recommendation}`);
      
      // Validate expected grade
      const isExpectedGrade = test.expectedGrade.includes(result.grade);
      if (!isExpectedGrade && result.found) {
        console.log(`\n⚠️  Warning: Expected grade ${test.expectedGrade.join(' or ')}, got ${result.grade}`);
      }
      
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Rate limit protection - wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function testAPIFormats() {
  console.log('🧪 Testing URL Format Parsing\n');
  console.log('=' .repeat(60) + '\n');
  
  const formats = [
    'https://github.com/solana-labs/solana',
    'github.com/solana-labs/solana',
    'solana-labs/solana',
    'https://www.github.com/solana-labs/solana',
  ];
  
  for (const format of formats) {
    console.log(`Testing format: ${format}`);
    try {
      const result = await githubAnalyzer.gradeRepository(format);
      if (result.found) {
        console.log(`✅ Parsed successfully: ${result.metrics!.owner}/${result.metrics!.repo}`);
      } else {
        console.log(`❌ Failed to parse: ${result.error}`);
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('='.repeat(60) + '\n');
}

async function testScoring() {
  console.log('🧪 Testing Scoring Logic\n');
  console.log('=' .repeat(60) + '\n');
  
  // Test with a known high-quality repo
  const result = await githubAnalyzer.gradeRepository('solana-labs/solana');
  
  console.log('Scoring Validation:');
  console.log(`- Security score should be 20-30: ${result.securityScore} ${result.securityScore >= 20 && result.securityScore <= 30 ? '✅' : '❌'}`);
  console.log(`- Activity score should be 15-25: ${result.activityScore} ${result.activityScore >= 15 && result.activityScore <= 25 ? '✅' : '❌'}`);
  console.log(`- Popularity score should be 10-20: ${result.popularityScore} ${result.popularityScore >= 10 && result.popularityScore <= 20 ? '✅' : '❌'}`);
  console.log(`- Health score should be 10-15: ${result.healthScore} ${result.healthScore >= 10 && result.healthScore <= 15 ? '✅' : '❌'}`);
  console.log(`- Total should be 0-100: ${result.confidenceScore} ${result.confidenceScore >= 0 && result.confidenceScore <= 100 ? '✅' : '❌'}`);
  
  if (result.metrics!.isSolanaProject) {
    console.log(`- Solana bonus should be 0-10: ${result.solanaScore} ${result.solanaScore >= 0 && result.solanaScore <= 10 ? '✅' : '❌'}`);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// Main test runner
async function main() {
  console.clear();
  console.log('🚀 GitHub Repository Grading System - Test Suite\n');
  
  // Check for GitHub token
  if (process.env.GITHUB_TOKEN) {
    console.log('✅ GitHub token detected (higher rate limits)\n');
  } else {
    console.log('⚠️  No GitHub token - limited to 60 requests/hour');
    console.log('   Set GITHUB_TOKEN in .env for 5000 requests/hour\n');
  }
  
  try {
    // Run all tests
    await testAPIFormats();
    await testScoring();
    await testRepositories();
    
    console.log('✅ All tests completed!\n');
    console.log('Note: Scores may vary slightly based on real-time GitHub data.');
    
  } catch (error: any) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);

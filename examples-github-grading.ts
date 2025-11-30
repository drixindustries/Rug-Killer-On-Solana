/**
 * Example Usage: GitHub Repository Grading API
 * 
 * This file demonstrates how to use the GitHub repository grading
 * system from various contexts (API, programmatic, etc.)
 */

// ============================================================================
// Example 1: Direct Service Usage (Internal)
// ============================================================================

import { githubAnalyzer } from './server/services/github-repo-analyzer';

async function example1_directUsage() {
  console.log('Example 1: Direct Service Usage\n');
  
  const result = await githubAnalyzer.gradeRepository('solana-labs/solana');
  
  console.log(`Grade: ${result.grade}`);
  console.log(`Confidence: ${result.confidenceScore}%`);
  console.log(`Recommendation: ${result.recommendation}`);
}

// ============================================================================
// Example 2: API Request (External)
// ============================================================================

async function example2_apiRequest() {
  console.log('Example 2: API Request\n');
  
  const response = await fetch('http://localhost:5000/api/grade-repo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      githubUrl: 'https://github.com/coral-xyz/anchor'
    })
  });
  
  const result = await response.json();
  
  console.log(`Repository: ${result.metrics?.owner}/${result.metrics?.repo}`);
  console.log(`Grade: ${result.grade} (${result.confidenceScore}%)`);
  console.log(`Stars: ${result.metrics?.stars.toLocaleString()}`);
  console.log(`\nStrengths:`);
  result.strengths?.forEach((s: string) => console.log(`  ${s}`));
}

// ============================================================================
// Example 3: Batch Analysis
// ============================================================================

async function example3_batchAnalysis() {
  console.log('Example 3: Batch Analysis\n');
  
  const repos = [
    'solana-labs/solana',
    'coral-xyz/anchor',
    'metaplex-foundation/metaplex',
  ];
  
  const results = [];
  
  for (const repo of repos) {
    const result = await githubAnalyzer.gradeRepository(repo);
    results.push({
      repo,
      grade: result.grade,
      score: result.confidenceScore,
      solana: result.metrics?.isSolanaProject
    });
    
    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Sort by score
  results.sort((a, b) => b.score - a.score);
  
  console.log('Ranking:');
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.repo} - ${r.grade} (${r.score}%) ${r.solana ? '🚀' : ''}`);
  });
}

// ============================================================================
// Example 4: Custom Scoring Logic
// ============================================================================

async function example4_customScoring() {
  console.log('Example 4: Custom Scoring Logic\n');
  
  const result = await githubAnalyzer.gradeRepository('solana-labs/solana');
  
  // Custom weighted score (emphasize security)
  const customScore = 
    (result.securityScore * 2) +  // 2x weight on security
    (result.activityScore * 1.5) + // 1.5x weight on activity
    result.popularityScore +
    result.healthScore +
    result.solanaScore;
  
  const maxCustomScore = (30 * 2) + (25 * 1.5) + 20 + 15 + 10; // 142.5
  const normalizedScore = Math.round((customScore / maxCustomScore) * 100);
  
  console.log(`Standard Score: ${result.confidenceScore}%`);
  console.log(`Custom Score: ${normalizedScore}%`);
  console.log(`(Emphasizing security and activity)`);
}

// ============================================================================
// Example 5: Risk Assessment
// ============================================================================

async function example5_riskAssessment() {
  console.log('Example 5: Risk Assessment\n');
  
  const result = await githubAnalyzer.gradeRepository('solana-labs/solana');
  
  // Classify risk level
  let riskLevel = 'UNKNOWN';
  if (result.confidenceScore >= 80) riskLevel = 'LOW';
  else if (result.confidenceScore >= 60) riskLevel = 'MEDIUM';
  else if (result.confidenceScore >= 40) riskLevel = 'HIGH';
  else riskLevel = 'CRITICAL';
  
  console.log(`Risk Level: ${riskLevel}`);
  console.log(`\nCritical Issues (${result.risks?.length || 0}):`);
  result.risks?.forEach(r => {
    if (r.includes('archived') || r.includes('license') || r.includes('year')) {
      console.log(`  🔴 ${r}`);
    }
  });
  
  // Investment recommendation
  const investmentSafe = result.confidenceScore >= 70 && result.risks!.length < 3;
  console.log(`\nInvestment Recommendation: ${investmentSafe ? '✅ PROCEED' : '⚠️ CAUTION'}`);
}

// ============================================================================
// Example 6: Solana Project Validator
// ============================================================================

async function example6_solanaValidator() {
  console.log('Example 6: Solana Project Validator\n');
  
  const result = await githubAnalyzer.gradeRepository('coral-xyz/anchor');
  
  if (!result.found) {
    console.log('Repository not found');
    return;
  }
  
  const metrics = result.metrics!;
  
  // Solana-specific checks
  const checks = {
    'Is Rust Project': metrics.language === 'Rust',
    'Has Cargo.toml': metrics.hasCargoToml,
    'Has Anchor': metrics.hasAnchor,
    'Recognized as Solana': metrics.isSolanaProject,
    'Recently Active': metrics.lastCommitDate ? 
      (Date.now() - metrics.lastCommitDate.getTime()) < (30 * 24 * 60 * 60 * 1000) : false,
    'Community Support': metrics.stars > 100,
  };
  
  console.log('Solana Project Validation:');
  Object.entries(checks).forEach(([check, passes]) => {
    console.log(`  ${passes ? '✅' : '❌'} ${check}`);
  });
  
  const allPass = Object.values(checks).every(v => v);
  console.log(`\nVerdict: ${allPass ? '✅ Valid Solana Project' : '⚠️ Incomplete Setup'}`);
}

// ============================================================================
// Example 7: Compare Two Repositories
// ============================================================================

async function example7_comparison() {
  console.log('Example 7: Repository Comparison\n');
  
  const repo1 = await githubAnalyzer.gradeRepository('solana-labs/solana');
  const repo2 = await githubAnalyzer.gradeRepository('coral-xyz/anchor');
  
  console.log('Comparison:');
  console.log(`\n${repo1.metrics!.repo} vs ${repo2.metrics!.repo}`);
  console.log('-'.repeat(50));
  
  const metrics = [
    { label: 'Grade', v1: repo1.grade, v2: repo2.grade },
    { label: 'Score', v1: `${repo1.confidenceScore}%`, v2: `${repo2.confidenceScore}%` },
    { label: 'Stars', v1: repo1.metrics!.stars.toLocaleString(), v2: repo2.metrics!.stars.toLocaleString() },
    { label: 'Contributors', v1: repo1.metrics!.contributors, v2: repo2.metrics!.contributors },
    { label: 'Commits', v1: repo1.metrics!.commits.toLocaleString(), v2: repo2.metrics!.commits.toLocaleString() },
  ];
  
  metrics.forEach(m => {
    console.log(`${m.label.padEnd(15)}: ${String(m.v1).padEnd(10)} | ${m.v2}`);
  });
  
  const winner = repo1.confidenceScore > repo2.confidenceScore ? 
    repo1.metrics!.repo : repo2.metrics!.repo;
  console.log(`\n🏆 Higher Score: ${winner}`);
}

// ============================================================================
// Example 8: Integration with Token Analysis
// ============================================================================

async function example8_tokenIntegration() {
  console.log('Example 8: Token + Repo Analysis Integration\n');
  
  // Simulated token data
  const token = {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    githubRepo: 'https://github.com/solana-labs/solana-program-library'
  };
  
  console.log(`Analyzing token: ${token.symbol}`);
  console.log(`Token address: ${token.address}`);
  console.log(`Claimed GitHub: ${token.githubRepo}\n`);
  
  // Grade the repository
  const repoGrade = await githubAnalyzer.gradeRepository(token.githubRepo);
  
  // Combined trust score
  const repoTrustScore = repoGrade.confidenceScore;
  
  console.log(`Repository Grade: ${repoGrade.grade}`);
  console.log(`Repository Trust: ${repoTrustScore}%`);
  
  // Overall assessment
  if (repoGrade.confidenceScore >= 80) {
    console.log(`\n✅ HIGH CONFIDENCE: Token has legitimate, high-quality codebase`);
  } else if (repoGrade.confidenceScore >= 60) {
    console.log(`\n⚠️ MODERATE: Verify token contract matches repository`);
  } else {
    console.log(`\n🔴 LOW CONFIDENCE: Exercise caution with this token`);
  }
}

// ============================================================================
// Main Runner
// ============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('GitHub Repository Grading - Usage Examples');
  console.log('='.repeat(70));
  console.log('\n');
  
  // Run examples (comment out as needed)
  try {
    await example1_directUsage();
    console.log('\n' + '='.repeat(70) + '\n');
    
    // Uncomment to run other examples:
    // await example2_apiRequest();
    // await example3_batchAnalysis();
    // await example4_customScoring();
    // await example5_riskAssessment();
    // await example6_solanaValidator();
    // await example7_comparison();
    // await example8_tokenIntegration();
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for use in other modules
export {
  example1_directUsage,
  example2_apiRequest,
  example3_batchAnalysis,
  example4_customScoring,
  example5_riskAssessment,
  example6_solanaValidator,
  example7_comparison,
  example8_tokenIntegration,
};

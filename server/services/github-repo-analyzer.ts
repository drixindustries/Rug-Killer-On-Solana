/**
 * GitHub Repository Analyzer
 * 
 * Grades GitHub repositories on a 0-100% confidence scale based on:
 * - Security vulnerabilities (if analyzable)
 * - Repository activity and health metrics
 * - Solana-specific static analysis (if applicable)
 * - Code quality indicators
 * 
 * Integration points:
 * - GitHub API for repo metadata
 * - Optional: osv-scanner for dependency vulnerabilities
 * - Optional: Solana Static Analyzer for Rust/Solana projects
 */

import axios from 'axios';

export interface GitHubRepoMetrics {
  owner: string;
  repo: string;
  url: string;
  
  // Basic info
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  language: string | null;
  languages: Record<string, number>;
  
  // Activity metrics
  commits: number;
  contributors: number;
  lastCommitDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Health indicators
  hasLicense: boolean;
  hasReadme: boolean;
  hasSecurityPolicy: boolean;
  isArchived: boolean;
  isFork: boolean;
  
  // Solana-specific
  isSolanaProject: boolean;
  hasAnchor: boolean;
  hasCargoToml: boolean;
}

export interface SecurityFindings {
  vulnerabilityCount: number;
  criticalVulns: number;
  highVulns: number;
  mediumVulns: number;
  lowVulns: number;
  details: string[];
}

export interface RepoGradeResult {
  githubUrl: string;
  found: boolean;
  
  // Core grade
  confidenceScore: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A';
  
  // Component scores
  securityScore: number; // 0-30
  activityScore: number; // 0-25
  popularityScore: number; // 0-20
  healthScore: number; // 0-15
  solanaScore: number; // 0-10 (bonus for Solana projects)
  
  // Metrics
  metrics?: GitHubRepoMetrics;
  security?: SecurityFindings;
  
  // Summary
  risks: string[];
  strengths: string[];
  recommendation: string;
  
  // Meta
  analyzedAt: Date;
  error?: string;
}

export interface UserProfileGradeResult {
  username: string;
  profileUrl: string;
  totalRepos: number;
  analyzedRepos: number;
  failedRepos: number;
  averageScore: number;
  topRepos: Array<{
    name: string;
    url: string;
    score: number;
    grade: string;
  }>;
  reposByGrade: {
    'A+': number;
    'A': number;
    'B': number;
    'C': number;
    'D': number;
    'F': number;
  };
  analyzedAt: Date;
  error?: string;
}

export class GitHubRepoAnalyzer {
  private githubToken?: string;
  private apiBase = 'https://api.github.com';
  
  constructor(githubToken?: string) {
    this.githubToken = githubToken || process.env.GITHUB_TOKEN;
  }
  
  /**
   * Main entry point: Grade a GitHub repository
   */
  async gradeRepository(githubUrl: string): Promise<RepoGradeResult> {
    const result: RepoGradeResult = {
      githubUrl,
      found: false,
      confidenceScore: 0,
      grade: 'N/A',
      securityScore: 0,
      activityScore: 0,
      popularityScore: 0,
      healthScore: 0,
      solanaScore: 0,
      risks: [],
      strengths: [],
      recommendation: '',
      analyzedAt: new Date(),
    };
    
    try {
      // Parse GitHub URL
      const { owner, repo } = this.parseGitHubUrl(githubUrl);
      if (!owner || !repo) {
        result.error = 'Invalid GitHub URL format. Expected: github.com/owner/repo';
        return result;
      }
      
      // Check if GitHub token is configured
      if (!this.githubToken) {
        console.warn('[GitHub Analyzer] No GITHUB_TOKEN configured - API rate limits will be very restrictive');
      }
      
      // Fetch repository metrics
      try {
        const metrics = await this.fetchRepoMetrics(owner, repo);
        result.metrics = metrics;
        result.found = true;
        
        // Calculate component scores
        result.securityScore = this.calculateSecurityScore(metrics);
        result.activityScore = this.calculateActivityScore(metrics);
        result.popularityScore = this.calculatePopularityScore(metrics);
        result.healthScore = this.calculateHealthScore(metrics);
        result.solanaScore = this.calculateSolanaScore(metrics);
        
        // Total confidence score
        result.confidenceScore = Math.min(100, Math.round(
          result.securityScore +
          result.activityScore +
          result.popularityScore +
          result.healthScore +
          result.solanaScore
        ));
        
        // Assign letter grade
        result.grade = this.assignGrade(result.confidenceScore);
        
        // Generate risks and strengths
        result.risks = this.identifyRisks(metrics, result);
        result.strengths = this.identifyStrengths(metrics, result);
        result.recommendation = this.generateRecommendation(result);
        
        return result;
      } catch (fetchError: any) {
        // Handle specific GitHub API errors
        if (fetchError.response?.status === 404) {
          result.error = `Repository not found: ${owner}/${repo}. Please check the URL and try again.`;
        } else if (fetchError.response?.status === 403) {
          if (fetchError.response?.data?.message?.includes('rate limit')) {
            result.error = 'GitHub API rate limit exceeded. Please try again later or configure a GITHUB_TOKEN.';
          } else {
            result.error = 'Access forbidden. The repository may be private or require authentication.';
          }
        } else if (fetchError.response?.status === 401) {
          result.error = 'GitHub authentication failed. Please check GITHUB_TOKEN configuration.';
        } else if (fetchError.code === 'ENOTFOUND' || fetchError.code === 'ECONNREFUSED') {
          result.error = 'Could not connect to GitHub API. Please check your internet connection.';
        } else {
          result.error = fetchError.message || 'Failed to fetch repository data';
        }
        
        console.error(`[GitHub Analyzer] Error fetching ${owner}/${repo}:`, {
          status: fetchError.response?.status,
          message: fetchError.message,
          code: fetchError.code,
        });
        
        return result;
      }
      
    } catch (error: any) {
      result.error = error.message || 'Analysis failed';
      console.error('[GitHub Analyzer] Unexpected error:', error);
      return result;
    }
  }
  
  /**
   * Detect if URL is a GitHub user profile (not a single repo)
   */
  isUserProfileUrl(url: string): boolean {
    // Match patterns like:
    // - https://github.com/username
    // - https://github.com/username?tab=repositories
    // - github.com/username
    // - username (just the username)
    
    // Check if it's just a username (no slashes, no github.com)
    if (url.match(/^[^\/\s]+$/) && !url.includes('.')) {
      return true;
    }
    
    // Check if it's github.com/username (with optional query params, but no second path segment)
    const profileMatch = url.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/\s?]+)(?:\?.*)?$/);
    if (profileMatch) {
      const pathAfterUsername = url.match(/github\.com\/[^\/\s?]+\/([^\/\s?]+)/);
      // If there's a second path segment, it's a repo, not a profile
      return !pathAfterUsername;
    }
    
    return false;
  }

  /**
   * Extract username from profile URL
   */
  private parseProfileUrl(url: string): string | null {
    // Match: github.com/username or just username
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/\s?]+)/);
    if (match) {
      return match[1];
    }
    // If it's just a username without github.com
    if (url.match(/^[^\/\s]+$/)) {
      return url;
    }
    return null;
  }

  /**
   * Fetch all repositories for a GitHub user
   */
  private async fetchUserRepositories(username: string): Promise<Array<{ owner: string; repo: string; url: string }>> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Rug-Killer-Solana-Bot'
    };
    
    if (this.githubToken) {
      headers['Authorization'] = `token ${this.githubToken}`;
    }

    const repos: Array<{ owner: string; repo: string; url: string }> = [];
    let page = 1;
    const perPage = 100; // Max allowed by GitHub API

    try {
      while (true) {
        const response = await axios.get(
          `${this.apiBase}/users/${username}/repos?per_page=${perPage}&page=${page}&sort=updated&direction=desc`,
          { headers }
        );

        if (response.data.length === 0) {
          break;
        }

        for (const repo of response.data) {
          // Skip forks unless they want to include them
          // For now, we'll include all repos
          repos.push({
            owner: repo.owner.login,
            repo: repo.name,
            url: repo.html_url
          });
        }

        // If we got less than perPage, we're done
        if (response.data.length < perPage) {
          break;
        }

        page++;
        
        // Safety limit: don't fetch more than 100 repos
        if (repos.length >= 100) {
          break;
        }
      }

      return repos;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`User '${username}' not found on GitHub`);
      } else if (error.response?.status === 403) {
        throw new Error('GitHub API rate limit exceeded or access forbidden');
      }
      throw error;
    }
  }

  /**
   * Grade all repositories for a GitHub user
   */
  async gradeUserProfile(profileUrl: string): Promise<UserProfileGradeResult> {
    const username = this.parseProfileUrl(profileUrl);
    if (!username) {
      throw new Error('Invalid GitHub profile URL');
    }

    try {
      // Fetch all repositories
      const repos = await this.fetchUserRepositories(username);
      
      if (repos.length === 0) {
        return {
          username,
          profileUrl: `https://github.com/${username}`,
          totalRepos: 0,
          analyzedRepos: 0,
          failedRepos: 0,
          averageScore: 0,
          topRepos: [],
          reposByGrade: { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 },
          analyzedAt: new Date(),
          error: 'No repositories found for this user'
        };
      }

      // Grade all repositories in parallel (with concurrency limit)
      const CONCURRENCY_LIMIT = 5; // Don't overwhelm GitHub API
      const results: RepoGradeResult[] = [];
      const errors: Array<{ repo: string; error: string }> = [];

      for (let i = 0; i < repos.length; i += CONCURRENCY_LIMIT) {
        const batch = repos.slice(i, i + CONCURRENCY_LIMIT);
        const batchResults = await Promise.allSettled(
          batch.map(repo => this.gradeRepository(repo.url))
        );

        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          if (result.status === 'fulfilled' && result.value.found) {
            results.push(result.value);
          } else {
            const repo = batch[j];
            errors.push({
              repo: repo.repo,
              error: result.status === 'rejected' 
                ? result.reason?.message || 'Unknown error'
                : result.value.error || 'Repository not found'
            });
          }
        }

        // Small delay between batches to respect rate limits
        if (i + CONCURRENCY_LIMIT < repos.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Calculate summary statistics
      const scores = results.map(r => r.confidenceScore).filter(s => s > 0);
      const averageScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      // Sort by score and get top 10
      const topRepos = results
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, 10)
        .map(r => ({
          name: r.metrics ? `${r.metrics.owner}/${r.metrics.repo}` : r.githubUrl,
          url: r.metrics?.url || r.githubUrl,
          score: r.confidenceScore,
          grade: r.grade
        }));

      // Count by grade
      const reposByGrade = {
        'A+': results.filter(r => r.grade === 'A+').length,
        'A': results.filter(r => r.grade === 'A').length,
        'B': results.filter(r => r.grade === 'B').length,
        'C': results.filter(r => r.grade === 'C').length,
        'D': results.filter(r => r.grade === 'D').length,
        'F': results.filter(r => r.grade === 'F').length,
      };

      return {
        username,
        profileUrl: `https://github.com/${username}`,
        totalRepos: repos.length,
        analyzedRepos: results.length,
        failedRepos: errors.length,
        averageScore,
        topRepos,
        reposByGrade,
        analyzedAt: new Date()
      };
    } catch (error: any) {
      return {
        username,
        profileUrl: `https://github.com/${username}`,
        totalRepos: 0,
        analyzedRepos: 0,
        failedRepos: 0,
        averageScore: 0,
        topRepos: [],
        reposByGrade: { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 },
        analyzedAt: new Date(),
        error: error.message || 'Failed to analyze user profile'
      };
    }
  }

  /**
   * Parse GitHub URL to extract owner and repo
   */
  private parseGitHubUrl(url: string): { owner: string; repo: string } {
    // Handle various formats:
    // - https://github.com/owner/repo
    // - github.com/owner/repo
    // - owner/repo
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/\s]+)/);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
    
    // Try simple owner/repo format
    const simple = url.match(/^([^\/]+)\/([^\/\s]+)$/);
    if (simple) {
      return { owner: simple[1], repo: simple[2] };
    }
    
    return { owner: '', repo: '' };
  }
  
  /**
   * Fetch comprehensive repository metrics from GitHub API
   */
  private async fetchRepoMetrics(owner: string, repo: string): Promise<GitHubRepoMetrics> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Rug-Killer-Solana-Bot'
    };
    
    if (this.githubToken) {
      headers['Authorization'] = `token ${this.githubToken}`;
    } else {
      console.warn(`[GitHub Analyzer] Fetching ${owner}/${repo} without authentication - rate limits apply`);
    }
    
    try {
      // Fetch main repo data
      const repoResponse = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}`,
        { headers }
      );
      const repoData = repoResponse.data;
    
    // Fetch languages
    let languages: Record<string, number> = {};
    try {
      const langResponse = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/languages`,
        { headers }
      );
      languages = langResponse.data;
    } catch (e) {
      console.warn('Could not fetch languages:', e);
    }
    
    // Fetch contributors count
    let contributorsCount = 0;
    try {
      const contribResponse = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/contributors?per_page=1`,
        { headers }
      );
      const linkHeader = contribResponse.headers['link'];
      if (linkHeader) {
        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
        contributorsCount = match ? parseInt(match[1], 10) : contribResponse.data.length;
      } else {
        contributorsCount = contribResponse.data.length;
      }
    } catch (e) {
      console.warn('Could not fetch contributors:', e);
    }
    
    // Fetch commits count
    let commitsCount = 0;
    try {
      const commitsResponse = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/commits?per_page=1`,
        { headers }
      );
      const linkHeader = commitsResponse.headers['link'];
      if (linkHeader) {
        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
        commitsCount = match ? parseInt(match[1], 10) : commitsResponse.data.length;
      } else {
        commitsCount = commitsResponse.data.length;
      }
    } catch (e) {
      console.warn('Could not fetch commits:', e);
    }
    
    // Check for security policy
    let hasSecurityPolicy = false;
    try {
      await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/contents/SECURITY.md`,
        { headers }
      );
      hasSecurityPolicy = true;
    } catch (e) {
      // File doesn't exist
    }
    
    // Check for Solana-specific files
    let hasAnchor = false;
    let hasCargoToml = false;
    try {
      const contents = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/contents/`,
        { headers }
      );
      const files = contents.data.map((f: any) => f.name.toLowerCase());
      hasAnchor = files.includes('anchor.toml');
      hasCargoToml = files.includes('cargo.toml');
    } catch (e) {
      console.warn('Could not fetch root contents:', e);
    }
    
    // Determine if Solana project
    const isSolanaProject = 
      repoData.language === 'Rust' &&
      (hasAnchor || 
       hasCargoToml || 
       repoData.description?.toLowerCase().includes('solana') ||
       repoData.name.toLowerCase().includes('solana') ||
       Object.keys(languages).includes('Rust'));
    
    // Get last commit date
    let lastCommitDate: Date | null = null;
    try {
      const commitsResponse = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/commits?per_page=1`,
        { headers }
      );
      if (commitsResponse.data.length > 0) {
        lastCommitDate = new Date(commitsResponse.data[0].commit.committer.date);
      }
    } catch (e) {
      console.warn('Could not fetch last commit:', e);
    }
    
      return {
        owner,
        repo,
        url: repoData.html_url,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        watchers: repoData.watchers_count,
        openIssues: repoData.open_issues_count,
        language: repoData.language,
        languages,
        commits: commitsCount,
        contributors: contributorsCount,
        lastCommitDate,
        createdAt: new Date(repoData.created_at),
        updatedAt: new Date(repoData.updated_at),
        hasLicense: !!repoData.license,
        hasReadme: !!repoData.has_wiki || repoData.size > 0,
        hasSecurityPolicy,
        isArchived: repoData.archived,
        isFork: repoData.fork,
        isSolanaProject,
        hasAnchor,
        hasCargoToml,
      };
    } catch (error: any) {
      // Re-throw with better error context for axios errors
      if (error.response) {
        const err: any = new Error(error.response.data?.message || error.message);
        err.response = error.response;
        err.code = error.code;
        throw err;
      }
      throw error;
    }
  }
  
  /**
   * Calculate security score (0-30 points)
   * Higher is better. Deducts points for missing security indicators.
   */
  private calculateSecurityScore(metrics: GitHubRepoMetrics): number {
    let score = 30; // Start with full points
    
    // Deductions
    if (!metrics.hasLicense) score -= 5; // No license = risk
    if (!metrics.hasSecurityPolicy) score -= 3; // No security policy
    if (metrics.isArchived) score -= 10; // Archived = unmaintained
    
    // Recent activity bonus (security patches)
    if (metrics.lastCommitDate) {
      const daysSinceLastCommit = Math.floor(
        (Date.now() - metrics.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastCommit > 365) score -= 8; // 1+ year old
      else if (daysSinceLastCommit > 180) score -= 5; // 6+ months
      else if (daysSinceLastCommit > 90) score -= 2; // 3+ months
      else if (daysSinceLastCommit <= 30) score += 2; // Active in last month (bonus)
    }
    
    return Math.max(0, score);
  }
  
  /**
   * Calculate activity score (0-25 points)
   * Measures development activity and maintenance
   */
  private calculateActivityScore(metrics: GitHubRepoMetrics): number {
    let score = 0;
    
    // Commits (0-10 points)
    if (metrics.commits > 1000) score += 10;
    else if (metrics.commits > 500) score += 8;
    else if (metrics.commits > 100) score += 6;
    else if (metrics.commits > 50) score += 4;
    else if (metrics.commits > 10) score += 2;
    
    // Contributors (0-10 points)
    if (metrics.contributors > 50) score += 10;
    else if (metrics.contributors > 20) score += 8;
    else if (metrics.contributors > 10) score += 6;
    else if (metrics.contributors > 5) score += 4;
    else if (metrics.contributors > 1) score += 2;
    
    // Recent updates (0-5 points)
    if (metrics.lastCommitDate) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - metrics.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceUpdate <= 7) score += 5; // Within a week
      else if (daysSinceUpdate <= 30) score += 3; // Within a month
      else if (daysSinceUpdate <= 90) score += 1; // Within 3 months
    }
    
    return Math.min(25, score);
  }
  
  /**
   * Calculate popularity score (0-20 points)
   * Community trust and adoption indicators
   */
  private calculatePopularityScore(metrics: GitHubRepoMetrics): number {
    let score = 0;
    
    // Stars (0-10 points)
    if (metrics.stars > 10000) score += 10;
    else if (metrics.stars > 5000) score += 9;
    else if (metrics.stars > 1000) score += 8;
    else if (metrics.stars > 500) score += 6;
    else if (metrics.stars > 100) score += 4;
    else if (metrics.stars > 50) score += 2;
    else if (metrics.stars > 10) score += 1;
    
    // Forks (0-5 points)
    if (metrics.forks > 1000) score += 5;
    else if (metrics.forks > 500) score += 4;
    else if (metrics.forks > 100) score += 3;
    else if (metrics.forks > 50) score += 2;
    else if (metrics.forks > 10) score += 1;
    
    // Watchers (0-5 points)
    if (metrics.watchers > 500) score += 5;
    else if (metrics.watchers > 100) score += 4;
    else if (metrics.watchers > 50) score += 3;
    else if (metrics.watchers > 20) score += 2;
    else if (metrics.watchers > 5) score += 1;
    
    return Math.min(20, score);
  }
  
  /**
   * Calculate health score (0-15 points)
   * Repository quality and maintenance indicators
   */
  private calculateHealthScore(metrics: GitHubRepoMetrics): number {
    let score = 0;
    
    if (metrics.hasReadme) score += 3;
    if (metrics.hasLicense) score += 3;
    if (metrics.hasSecurityPolicy) score += 2;
    if (!metrics.isArchived) score += 4;
    if (!metrics.isFork) score += 2; // Original projects often better maintained
    if (metrics.openIssues < 50) score += 1; // Manageable issue count
    
    return Math.min(15, score);
  }
  
  /**
   * Calculate Solana-specific bonus score (0-10 points)
   * Only applies to Solana/Rust projects
   */
  private calculateSolanaScore(metrics: GitHubRepoMetrics): number {
    if (!metrics.isSolanaProject) return 0;
    
    let score = 5; // Base bonus for being a Solana project
    
    if (metrics.hasAnchor) score += 3; // Using Anchor framework
    if (metrics.hasCargoToml) score += 2; // Proper Rust setup
    
    return Math.min(10, score);
  }
  
  /**
   * Assign letter grade based on confidence score
   */
  private assignGrade(score: number): RepoGradeResult['grade'] {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }
  
  /**
   * Identify potential risks
   */
  private identifyRisks(metrics: GitHubRepoMetrics, result: RepoGradeResult): string[] {
    const risks: string[] = [];
    
    if (metrics.isArchived) {
      risks.push('[!] Repository is archived (no longer maintained)');
    }
    
    if (!metrics.hasLicense) {
      risks.push('[!] No license found (legal risks)');
    }
    
    if (metrics.contributors <= 1) {
      risks.push('[!] Single contributor (bus factor risk)');
    }
    
    if (metrics.lastCommitDate) {
      const daysSince = Math.floor((Date.now() - metrics.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 365) {
        risks.push(`[!] No commits in ${Math.floor(daysSince / 365)} year(s) (abandoned?)`);
      } else if (daysSince > 180) {
        risks.push('[!] No recent activity (6+ months)');
      }
    }
    
    if (metrics.stars < 10 && !metrics.isFork) {
      risks.push('[!] Low community adoption (< 10 stars)');
    }
    
    if (metrics.openIssues > 100) {
      risks.push('[!] High open issue count (maintenance backlog)');
    }
    
    if (!metrics.hasSecurityPolicy) {
      risks.push('[!] No security policy defined');
    }
    
    if (metrics.isSolanaProject && !metrics.hasAnchor && !metrics.hasCargoToml) {
      risks.push('[!] Solana project missing standard setup files');
    }
    
    return risks;
  }
  
  /**
   * Identify strengths
   */
  private identifyStrengths(metrics: GitHubRepoMetrics, result: RepoGradeResult): string[] {
    const strengths: string[] = [];
    
    if (metrics.stars > 1000) {
      const starsFormatted = metrics.stars.toLocaleString();
      strengths.push(`[+] High community trust (${starsFormatted} stars)`);
    }
    
    if (metrics.contributors > 20) {
      strengths.push(`[+] Strong contributor base (${metrics.contributors} contributors)`);
    }
    
    if (metrics.commits > 500) {
      const commitsFormatted = metrics.commits.toLocaleString();
      strengths.push(`[+] Mature codebase (${commitsFormatted} commits)`);
    }
    
    if (metrics.lastCommitDate) {
      const daysSince = Math.floor((Date.now() - metrics.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 30) {
        strengths.push('[+] Recently updated (active development)');
      }
    }
    
    if (metrics.hasLicense) {
      strengths.push('[+] Licensed (legal clarity)');
    }
    
    if (metrics.hasSecurityPolicy) {
      strengths.push('[+] Security policy defined');
    }
    
    if (metrics.isSolanaProject && metrics.hasAnchor) {
      strengths.push('[+] Uses Anchor framework (best practice)');
    }
    
    if (!metrics.isArchived && metrics.lastCommitDate) {
      const daysSince = Math.floor((Date.now() - metrics.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 90) {
        strengths.push('[+] Actively maintained');
      }
    }
    
    return strengths;
  }
  
  /**
   * Generate overall recommendation
   */
  private generateRecommendation(result: RepoGradeResult): string {
    if (!result.found) {
      return '[X] Repository not found or inaccessible';
    }
    
    if (result.confidenceScore >= 85) {
      return '[+++] HIGHLY TRUSTED - This repository shows strong indicators of quality, security, and active maintenance. Safe to use.';
    }
    
    if (result.confidenceScore >= 70) {
      return '[++] GENERALLY SAFE - This repository has good metrics but some areas could be improved. Review identified risks before use.';
    }
    
    if (result.confidenceScore >= 55) {
      return '[+] PROCEED WITH CAUTION - This repository has moderate concerns. Thoroughly review the code and risks before use.';
    }
    
    return '[!] HIGH RISK - This repository shows significant warning signs. Not recommended for production use without extensive auditing.'
  }
  
  /**
   * Format result as readable text (for bot responses)
   */
  formatForDisplay(result: RepoGradeResult): string {
    if (!result.found) {
      return `[X] **Repository not found**\n${result.githubUrl}\n\n${result.error || 'Invalid URL or inaccessible repository'}`;
    }
    
    const m = result.metrics!;
    
    let output = `**GitHub Repository Grade: ${result.grade}**\n`;
    output += `**Confidence Score: ${result.confidenceScore}/100**\n\n`;
    
    output += `**Repository:** ${m.owner}/${m.repo}\n`;
    const starsFormatted = m.stars.toLocaleString();
    const forksFormatted = m.forks.toLocaleString();
    const commitsFormatted = m.commits.toLocaleString();
    const lastUpdated = m.lastCommitDate?.toLocaleDateString() || 'Unknown';
    output += `* ${starsFormatted} stars | ${forksFormatted} forks | ${m.contributors} contributors\n`;
    output += `Language: ${m.language || 'Mixed'} ${m.isSolanaProject ? '(Solana Project)' : ''}\n`;
    output += `${commitsFormatted} commits | Last updated: ${lastUpdated}\n\n`;
    
    output += `**Score Breakdown:**\n`;
    output += `Security: ${result.securityScore}/30\n`;
    output += `Activity: ${result.activityScore}/25\n`;
    output += `Popularity: ${result.popularityScore}/20\n`;
    output += `Health: ${result.healthScore}/15\n`;
    if (result.solanaScore > 0) {
      output += `Solana Bonus: ${result.solanaScore}/10\n`;
    }
    output += `\n`;
    
    if (result.strengths.length > 0) {
      output += `**Strengths:**\n${result.strengths.join('\n')}\n\n`;
    }
    
    if (result.risks.length > 0) {
      output += `**Risks:**\n${result.risks.join('\n')}\n\n`;
    }
    
    output += `**Recommendation:**\n${result.recommendation}\n`;
    
    return output;
  }
}

// Export singleton instance
export const githubAnalyzer = new GitHubRepoAnalyzer();

/**
 * GitHub Repository Analyzer - Enhanced Edition
 * 
 * Comprehensive grading system based on industry best practices:
 * 
 * SCORING (100 points total):
 * - Functionality: 30 pts (tests exist, CI passes, can build)
 * - Code Quality: 20 pts (linter configs, complexity, style)
 * - Documentation: 20 pts (README quality, comments, API docs)
 * - Testing: 10 pts (test coverage, test files present)
 * - Version Control: 10 pts (commit quality, branching, history)
 * - Organization: 5 pts (file structure, .gitignore, license)
 * - Community: 5 pts (stars, contributors, issue response)
 * 
 * Based on: GitHub's code quality metrics, OSS maturity rubrics,
 * and educational grading best practices.
 */

import axios from 'axios';

// ============================================================================
// INTERFACES
// ============================================================================

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
  size: number; // KB
  defaultBranch: string;
  
  // Activity metrics
  commits: number;
  contributors: number;
  lastCommitDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Health indicators
  hasLicense: boolean;
  licenseType: string | null;
  hasReadme: boolean;
  readmeContent: string | null;
  hasSecurityPolicy: boolean;
  hasCodeOfConduct: boolean;
  hasContributing: boolean;
  isArchived: boolean;
  isFork: boolean;
  
  // NEW: Testing indicators
  hasTests: boolean;
  testDirectories: string[];
  testFramework: string | null;
  
  // NEW: CI/CD indicators
  hasCICD: boolean;
  cicdPlatforms: string[];
  
  // NEW: Code quality indicators
  hasLinterConfig: boolean;
  linterConfigs: string[];
  hasFormatterConfig: boolean;
  formatterConfigs: string[];
  
  // NEW: Commit quality
  recentCommits: CommitInfo[];
  commitMessageQuality: CommitQualityMetrics;
  
  // NEW: File structure
  hasProperStructure: boolean;
  hasGitignore: boolean;
  gitignoreQuality: number; // 0-100
  hasDependencyFile: boolean;
  dependencyFiles: string[];
  
  // Solana-specific
  isSolanaProject: boolean;
  hasAnchor: boolean;
  hasCargoToml: boolean;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: Date;
}

export interface CommitQualityMetrics {
  averageLength: number;
  hasConventionalCommits: boolean;
  descriptiveRatio: number; // 0-1, how many are descriptive
  singleWordRatio: number; // 0-1, how many are just "fix" or "update"
  score: number; // 0-100
}

export interface ReadmeQualityMetrics {
  exists: boolean;
  length: number;
  hasTitle: boolean;
  hasDescription: boolean;
  hasInstallation: boolean;
  hasUsage: boolean;
  hasExamples: boolean;
  hasLicense: boolean;
  hasBadges: boolean;
  hasContributing: boolean;
  hasTableOfContents: boolean;
  hasImages: boolean;
  score: number; // 0-100
}

export interface RepoGradeResult {
  githubUrl: string;
  found: boolean;
  
  // Core grade
  confidenceScore: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A';
  
  // Component scores (Grok-style weights - 100 total)
  functionalityScore: number; // 0-30 (tests, CI, builds)
  codeQualityScore: number; // 0-20 (linters, complexity)
  documentationScore: number; // 0-20 (README quality)
  vcsScore: number; // 0-10 (commit quality, branching)
  organizationScore: number; // 0-10 (structure, .gitignore, license)
  communityScore: number; // 0-10 (stars, contributors, activity)
  
  // Legacy scores (for backward compatibility)
  securityScore: number;
  activityScore: number;
  popularityScore: number;
  healthScore: number;
  solanaScore: number;
  
  // Detailed metrics
  metrics?: GitHubRepoMetrics;
  readmeQuality?: ReadmeQualityMetrics;
  commitQuality?: CommitQualityMetrics;
  
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

// ============================================================================
// CONSTANTS
// ============================================================================

// Test directory patterns
const TEST_DIRECTORIES = [
  'test', 'tests', '__tests__', 'spec', 'specs',
  'test_', '_test', 'testing', 'unittest', 'unit_tests',
  'integration_tests', 'e2e', 'cypress', 'playwright'
];

// Test file patterns
const TEST_FILE_PATTERNS = [
  /test[_-]?\w*\.(js|ts|py|rs|go|java|rb|php)$/i,
  /\w+[_-]?test\.(js|ts|py|rs|go|java|rb|php)$/i,
  /\w+\.spec\.(js|ts|py|rs|go|java|rb|php)$/i,
  /\w+\.test\.(js|ts|py|rs|go|java|rb|php)$/i,
];

// CI/CD configuration files
const CICD_FILES = {
  '.github/workflows': 'GitHub Actions',
  '.gitlab-ci.yml': 'GitLab CI',
  'Jenkinsfile': 'Jenkins',
  '.travis.yml': 'Travis CI',
  '.circleci': 'CircleCI',
  'azure-pipelines.yml': 'Azure DevOps',
  'bitbucket-pipelines.yml': 'Bitbucket Pipelines',
  '.drone.yml': 'Drone CI',
  'appveyor.yml': 'AppVeyor',
  'cloudbuild.yaml': 'Google Cloud Build',
  'buildspec.yml': 'AWS CodeBuild',
};

// Linter configuration files
const LINTER_CONFIGS = {
  '.eslintrc': 'ESLint',
  '.eslintrc.js': 'ESLint',
  '.eslintrc.json': 'ESLint',
  '.eslintrc.yml': 'ESLint',
  'eslint.config.js': 'ESLint (Flat)',
  '.pylintrc': 'Pylint',
  'pyproject.toml': 'Python (Black/Ruff/etc)',
  'setup.cfg': 'Python',
  '.flake8': 'Flake8',
  'ruff.toml': 'Ruff',
  '.rubocop.yml': 'RuboCop',
  'clippy.toml': 'Clippy (Rust)',
  '.golangci.yml': 'GolangCI-Lint',
  'checkstyle.xml': 'Checkstyle (Java)',
  '.php-cs-fixer.php': 'PHP CS Fixer',
  'tslint.json': 'TSLint (legacy)',
  'biome.json': 'Biome',
};

// Formatter configuration files
const FORMATTER_CONFIGS = {
  '.prettierrc': 'Prettier',
  '.prettierrc.js': 'Prettier',
  '.prettierrc.json': 'Prettier',
  'prettier.config.js': 'Prettier',
  '.editorconfig': 'EditorConfig',
  'rustfmt.toml': 'rustfmt',
  '.clang-format': 'clang-format',
  'gofmt': 'gofmt',
};

// Dependency files
const DEPENDENCY_FILES = {
  'package.json': 'npm/Node.js',
  'package-lock.json': 'npm',
  'yarn.lock': 'Yarn',
  'pnpm-lock.yaml': 'pnpm',
  'requirements.txt': 'pip (Python)',
  'Pipfile': 'Pipenv',
  'poetry.lock': 'Poetry',
  'pyproject.toml': 'Python',
  'Cargo.toml': 'Cargo (Rust)',
  'Cargo.lock': 'Cargo (Rust)',
  'go.mod': 'Go Modules',
  'go.sum': 'Go Modules',
  'Gemfile': 'Bundler (Ruby)',
  'Gemfile.lock': 'Bundler (Ruby)',
  'composer.json': 'Composer (PHP)',
  'build.gradle': 'Gradle (Java)',
  'pom.xml': 'Maven (Java)',
};

// Conventional commit prefixes
const CONVENTIONAL_PREFIXES = [
  'feat', 'fix', 'docs', 'style', 'refactor', 'perf',
  'test', 'build', 'ci', 'chore', 'revert', 'wip'
];

// Bad commit message patterns
const BAD_COMMIT_PATTERNS = [
  /^(fix|update|change|wip|test|tmp|temp|asdf|\.+)$/i,
  /^(initial commit|first commit|init|start)$/i,
  /^(minor|small|quick|hotfix)$/i,
  /^[a-f0-9]{7,40}$/i, // Just a hash
  /^\.$/,
  /^-$/,
];

// ============================================================================
// MAIN CLASS
// ============================================================================

export class GitHubRepoAnalyzer {
  private githubToken?: string;
  private apiBase = 'https://api.github.com';
  
  constructor(githubToken?: string) {
    this.githubToken = githubToken || process.env.GITHUB_TOKEN;
  }
  
  // ==========================================================================
  // MAIN ENTRY POINT
  // ==========================================================================
  
  /**
   * Grade a GitHub repository with comprehensive analysis
   */
  async gradeRepository(githubUrl: string): Promise<RepoGradeResult> {
    const result: RepoGradeResult = {
      githubUrl,
      found: false,
      confidenceScore: 0,
      grade: 'N/A',
      // Grok-style scores (100 total)
      functionalityScore: 0,   // 30
      codeQualityScore: 0,     // 20
      documentationScore: 0,   // 20
      vcsScore: 0,             // 10
      organizationScore: 0,    // 10
      communityScore: 0,       // 10
      // Legacy scores
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
      
      // Fetch comprehensive repository metrics
      try {
        const metrics = await this.fetchEnhancedRepoMetrics(owner, repo);
        result.metrics = metrics;
        result.found = true;
        
        // Analyze README quality
        result.readmeQuality = this.analyzeReadmeQuality(metrics.readmeContent);
        
        // Commit quality is already in metrics
        result.commitQuality = metrics.commitMessageQuality;
        
        // Calculate Grok-style component scores (100 total)
        result.functionalityScore = this.calculateFunctionalityScore(metrics);   // 30
        result.codeQualityScore = this.calculateCodeQualityScore(metrics);       // 20
        result.documentationScore = this.calculateDocumentationScore(metrics, result.readmeQuality); // 20
        result.vcsScore = this.calculateVCSScore(metrics);                       // 10
        result.organizationScore = this.calculateOrganizationScore(metrics);     // 10
        result.communityScore = this.calculateCommunityScore(metrics);           // 10
        
        // Legacy scores (for backward compatibility)
        result.securityScore = this.calculateSecurityScore(metrics);
        result.activityScore = this.calculateActivityScore(metrics);
        result.popularityScore = this.calculatePopularityScore(metrics);
        result.healthScore = this.calculateHealthScore(metrics);
        result.solanaScore = this.calculateSolanaScore(metrics);
        
        // Total confidence score (Grok weights)
        result.confidenceScore = Math.min(100, Math.round(
          result.functionalityScore +    // 30 (includes tests, CI/CD)
          result.codeQualityScore +      // 20
          result.documentationScore +    // 20
          result.vcsScore +              // 10
          result.organizationScore +     // 10
          result.communityScore          // 10
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
          result.error = `Repository not found: ${owner}/${repo}. Please check the URL.`;
        } else if (fetchError.response?.status === 403) {
          if (fetchError.response?.data?.message?.includes('rate limit')) {
            result.error = 'GitHub API rate limit exceeded. Please try again later.';
          } else {
            result.error = 'Access forbidden. Repository may be private.';
          }
        } else if (fetchError.response?.status === 401) {
          result.error = 'GitHub authentication failed.';
        } else {
          result.error = fetchError.message || 'Failed to fetch repository data';
        }
        
        console.error(`[GitHub Analyzer] Error:`, fetchError.message);
        return result;
      }
      
    } catch (error: any) {
      result.error = error.message || 'Analysis failed';
      console.error('[GitHub Analyzer] Unexpected error:', error);
      return result;
    }
  }
  
  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================
  
  /**
   * Fetch comprehensive repository metrics from GitHub API
   */
  private async fetchEnhancedRepoMetrics(owner: string, repo: string): Promise<GitHubRepoMetrics> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Rug-Killer-Solana-Bot'
    };
    
    if (this.githubToken) {
      headers['Authorization'] = `token ${this.githubToken}`;
    }
    
    // Fetch main repo data
    const repoResponse = await axios.get(
      `${this.apiBase}/repos/${owner}/${repo}`,
      { headers }
    );
    const repoData = repoResponse.data;
    
    // Parallel fetch for additional data
    const [
      languages,
      contributorsCount,
      commitsData,
      rootContents,
      readmeContent,
      recentCommits
    ] = await Promise.all([
      this.fetchLanguages(owner, repo, headers),
      this.fetchContributorsCount(owner, repo, headers),
      this.fetchCommitsData(owner, repo, headers),
      this.fetchRootContents(owner, repo, headers),
      this.fetchReadmeContent(owner, repo, headers),
      this.fetchRecentCommits(owner, repo, headers, 50)
    ]);
    
    // Analyze root contents for various files
    const fileAnalysis = this.analyzeRootContents(rootContents);
    
    // Check for test directories
    const testInfo = await this.detectTestDirectories(owner, repo, headers, rootContents);
    
    // Check for CI/CD
    const cicdInfo = await this.detectCICD(owner, repo, headers, rootContents);
    
    // Analyze commit quality
    const commitQuality = this.analyzeCommitQuality(recentCommits);
    
    // Determine if Solana project
    const isSolanaProject = 
      repoData.language === 'Rust' &&
      (fileAnalysis.hasAnchor || 
       fileAnalysis.hasCargoToml || 
       repoData.description?.toLowerCase().includes('solana') ||
       repoData.name.toLowerCase().includes('solana'));
    
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
      size: repoData.size,
      defaultBranch: repoData.default_branch,
      commits: commitsData.count,
      contributors: contributorsCount,
      lastCommitDate: commitsData.lastDate,
      createdAt: new Date(repoData.created_at),
      updatedAt: new Date(repoData.updated_at),
      hasLicense: !!repoData.license,
      licenseType: repoData.license?.spdx_id || null,
      hasReadme: !!readmeContent,
      readmeContent,
      hasSecurityPolicy: fileAnalysis.hasSecurityPolicy,
      hasCodeOfConduct: fileAnalysis.hasCodeOfConduct,
      hasContributing: fileAnalysis.hasContributing,
      isArchived: repoData.archived,
      isFork: repoData.fork,
      // Testing
      hasTests: testInfo.hasTests,
      testDirectories: testInfo.directories,
      testFramework: testInfo.framework,
      // CI/CD
      hasCICD: cicdInfo.hasCICD,
      cicdPlatforms: cicdInfo.platforms,
      // Code quality
      hasLinterConfig: fileAnalysis.linterConfigs.length > 0,
      linterConfigs: fileAnalysis.linterConfigs,
      hasFormatterConfig: fileAnalysis.formatterConfigs.length > 0,
      formatterConfigs: fileAnalysis.formatterConfigs,
      // Commits
      recentCommits,
      commitMessageQuality: commitQuality,
      // File structure
      hasProperStructure: fileAnalysis.hasProperStructure,
      hasGitignore: fileAnalysis.hasGitignore,
      gitignoreQuality: fileAnalysis.gitignoreQuality,
      hasDependencyFile: fileAnalysis.dependencyFiles.length > 0,
      dependencyFiles: fileAnalysis.dependencyFiles,
      // Solana
      isSolanaProject,
      hasAnchor: fileAnalysis.hasAnchor,
      hasCargoToml: fileAnalysis.hasCargoToml,
    };
  }
  
  private async fetchLanguages(owner: string, repo: string, headers: Record<string, string>): Promise<Record<string, number>> {
    try {
      const response = await axios.get(`${this.apiBase}/repos/${owner}/${repo}/languages`, { headers });
      return response.data;
    } catch {
      return {};
    }
  }
  
  private async fetchContributorsCount(owner: string, repo: string, headers: Record<string, string>): Promise<number> {
    try {
      const response = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/contributors?per_page=1`,
        { headers }
      );
      const linkHeader = response.headers['link'];
      if (linkHeader) {
        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
        return match ? parseInt(match[1], 10) : response.data.length;
      }
      return response.data.length;
    } catch {
      return 0;
    }
  }
  
  private async fetchCommitsData(owner: string, repo: string, headers: Record<string, string>): Promise<{ count: number; lastDate: Date | null }> {
    try {
      const response = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/commits?per_page=1`,
        { headers }
      );
      const linkHeader = response.headers['link'];
      let count = 0;
      if (linkHeader) {
        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
        count = match ? parseInt(match[1], 10) : response.data.length;
      } else {
        count = response.data.length;
      }
      
      const lastDate = response.data.length > 0 
        ? new Date(response.data[0].commit.committer.date)
        : null;
      
      return { count, lastDate };
    } catch {
      return { count: 0, lastDate: null };
    }
  }
  
  private async fetchRootContents(owner: string, repo: string, headers: Record<string, string>): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/contents/`,
        { headers }
      );
      return response.data;
    } catch {
      return [];
    }
  }
  
  private async fetchReadmeContent(owner: string, repo: string, headers: Record<string, string>): Promise<string | null> {
    try {
      const response = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/readme`,
        { headers: { ...headers, 'Accept': 'application/vnd.github.raw' } }
      );
      return response.data;
    } catch {
      return null;
    }
  }
  
  private async fetchRecentCommits(owner: string, repo: string, headers: Record<string, string>, count: number): Promise<CommitInfo[]> {
    try {
      const response = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/commits?per_page=${count}`,
        { headers }
      );
      return response.data.map((c: any) => ({
        sha: c.sha,
        message: c.commit.message.split('\n')[0], // First line only
        author: c.commit.author?.name || c.author?.login || 'Unknown',
        date: new Date(c.commit.committer.date)
      }));
    } catch {
      return [];
    }
  }
  
  private async detectTestDirectories(owner: string, repo: string, headers: Record<string, string>, rootContents: any[]): Promise<{ hasTests: boolean; directories: string[]; framework: string | null }> {
    const directories: string[] = [];
    let framework: string | null = null;
    
    // Check root for test directories
    for (const item of rootContents) {
      if (item.type === 'dir') {
        const name = item.name.toLowerCase();
        if (TEST_DIRECTORIES.some(td => name === td || name.startsWith(td))) {
          directories.push(item.name);
        }
      }
      // Check for test config files
      if (item.type === 'file') {
        const name = item.name.toLowerCase();
        if (name === 'jest.config.js' || name === 'jest.config.ts') framework = 'Jest';
        else if (name === 'vitest.config.ts' || name === 'vitest.config.js') framework = 'Vitest';
        else if (name === 'pytest.ini' || name === 'conftest.py') framework = 'pytest';
        else if (name === 'mocha.opts' || name === '.mocharc.js') framework = 'Mocha';
        else if (name === 'karma.conf.js') framework = 'Karma';
        else if (name === 'cypress.config.js' || name === 'cypress.config.ts') framework = 'Cypress';
        else if (name === 'playwright.config.ts') framework = 'Playwright';
      }
    }
    
    // Check for test files in src directory
    try {
      const srcResponse = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/contents/src`,
        { headers }
      );
      for (const item of srcResponse.data) {
        if (item.type === 'file' && TEST_FILE_PATTERNS.some(p => p.test(item.name))) {
          if (!directories.includes('src (inline tests)')) {
            directories.push('src (inline tests)');
          }
        }
      }
    } catch {
      // src directory doesn't exist
    }
    
    return {
      hasTests: directories.length > 0 || framework !== null,
      directories,
      framework
    };
  }
  
  private async detectCICD(owner: string, repo: string, headers: Record<string, string>, rootContents: any[]): Promise<{ hasCICD: boolean; platforms: string[] }> {
    const platforms: string[] = [];
    const rootFiles = rootContents.map(f => f.name.toLowerCase());
    
    // Check root files
    for (const [file, platform] of Object.entries(CICD_FILES)) {
      if (file === '.github/workflows') continue; // Special handling below
      if (rootFiles.includes(file.toLowerCase())) {
        platforms.push(platform);
      }
    }
    
    // Check for GitHub Actions
    try {
      const workflowsResponse = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/contents/.github/workflows`,
        { headers }
      );
      if (workflowsResponse.data.length > 0) {
        platforms.push('GitHub Actions');
      }
    } catch {
      // No workflows directory
    }
    
    return {
      hasCICD: platforms.length > 0,
      platforms
    };
  }
  
  private analyzeRootContents(contents: any[]): {
    hasSecurityPolicy: boolean;
    hasCodeOfConduct: boolean;
    hasContributing: boolean;
    hasAnchor: boolean;
    hasCargoToml: boolean;
    hasGitignore: boolean;
    gitignoreQuality: number;
    hasProperStructure: boolean;
    linterConfigs: string[];
    formatterConfigs: string[];
    dependencyFiles: string[];
  } {
    const files = contents.map(f => f.name.toLowerCase());
    const dirs = contents.filter(f => f.type === 'dir').map(f => f.name.toLowerCase());
    
    const linterConfigs: string[] = [];
    const formatterConfigs: string[] = [];
    const dependencyFiles: string[] = [];
    
    // Check for various config files
    for (const item of contents) {
      const name = item.name;
      const nameLower = name.toLowerCase();
      
      // Linter configs
      for (const [file, linter] of Object.entries(LINTER_CONFIGS)) {
        if (nameLower === file.toLowerCase()) {
          linterConfigs.push(linter);
        }
      }
      
      // Formatter configs
      for (const [file, formatter] of Object.entries(FORMATTER_CONFIGS)) {
        if (nameLower === file.toLowerCase()) {
          formatterConfigs.push(formatter);
        }
      }
      
      // Dependency files
      for (const [file, manager] of Object.entries(DEPENDENCY_FILES)) {
        if (nameLower === file.toLowerCase()) {
          dependencyFiles.push(manager);
        }
      }
    }
    
    // Check for proper structure (has src or lib directory)
    const hasProperStructure = dirs.some(d => 
      ['src', 'lib', 'app', 'packages', 'modules', 'programs'].includes(d)
    );
    
    // Gitignore quality (rough estimate based on existence)
    const gitignoreQuality = files.includes('.gitignore') ? 70 : 0;
    
    return {
      hasSecurityPolicy: files.includes('security.md'),
      hasCodeOfConduct: files.includes('code_of_conduct.md'),
      hasContributing: files.includes('contributing.md'),
      hasAnchor: files.includes('anchor.toml'),
      hasCargoToml: files.includes('cargo.toml'),
      hasGitignore: files.includes('.gitignore'),
      gitignoreQuality,
      hasProperStructure,
      linterConfigs: [...new Set(linterConfigs)],
      formatterConfigs: [...new Set(formatterConfigs)],
      dependencyFiles: [...new Set(dependencyFiles)],
    };
  }
  
  private analyzeCommitQuality(commits: CommitInfo[]): CommitQualityMetrics {
    if (commits.length === 0) {
      return {
        averageLength: 0,
        hasConventionalCommits: false,
        descriptiveRatio: 0,
        singleWordRatio: 1,
        score: 0
      };
    }
    
    let totalLength = 0;
    let conventionalCount = 0;
    let descriptiveCount = 0;
    let singleWordCount = 0;
    
    for (const commit of commits) {
      const msg = commit.message.trim();
      totalLength += msg.length;
      
      // Check for conventional commit format
      const isConventional = CONVENTIONAL_PREFIXES.some(prefix => 
        msg.toLowerCase().startsWith(`${prefix}:`) || 
        msg.toLowerCase().startsWith(`${prefix}(`)
      );
      if (isConventional) conventionalCount++;
      
      // Check if descriptive (not a bad pattern)
      const isBad = BAD_COMMIT_PATTERNS.some(p => p.test(msg));
      if (!isBad && msg.length > 10) descriptiveCount++;
      
      // Check for single word
      if (msg.split(/\s+/).length <= 2) singleWordCount++;
    }
    
    const averageLength = totalLength / commits.length;
    const hasConventionalCommits = conventionalCount / commits.length > 0.5;
    const descriptiveRatio = descriptiveCount / commits.length;
    const singleWordRatio = singleWordCount / commits.length;
    
    // Calculate score
    let score = 0;
    score += Math.min(30, averageLength / 2); // Up to 30 for length
    score += hasConventionalCommits ? 25 : 0; // 25 for conventional
    score += descriptiveRatio * 30; // Up to 30 for descriptive
    score -= singleWordRatio * 15; // Penalty for single word
    score = Math.max(0, Math.min(100, score));
    
    return {
      averageLength: Math.round(averageLength),
      hasConventionalCommits,
      descriptiveRatio: Math.round(descriptiveRatio * 100) / 100,
      singleWordRatio: Math.round(singleWordRatio * 100) / 100,
      score: Math.round(score)
    };
  }
  
  private analyzeReadmeQuality(content: string | null): ReadmeQualityMetrics {
    if (!content) {
      return {
        exists: false,
        length: 0,
        hasTitle: false,
        hasDescription: false,
        hasInstallation: false,
        hasUsage: false,
        hasExamples: false,
        hasLicense: false,
        hasBadges: false,
        hasContributing: false,
        hasTableOfContents: false,
        hasImages: false,
        score: 0
      };
    }
    
    const lower = content.toLowerCase();
    const length = content.length;
    
    // Check for various sections
    const hasTitle = /^#\s+.+/m.test(content);
    const hasDescription = length > 100;
    const hasInstallation = /#{1,3}\s*(install|setup|getting started)/i.test(content);
    const hasUsage = /#{1,3}\s*(usage|how to use|examples?|quick start)/i.test(content);
    const hasExamples = /```[\s\S]*?```/.test(content); // Code blocks
    const hasLicense = /#{1,3}\s*license/i.test(content) || /\[license\]/i.test(content);
    const hasBadges = /\[!\[.+\]\(.+\)\]\(.+\)/.test(content) || /!\[.+\]\(https:\/\/.*badge.*\)/i.test(content);
    const hasContributing = /#{1,3}\s*(contribut|how to contribute)/i.test(content);
    const hasTableOfContents = /#{1,3}\s*(table of contents|contents|toc)/i.test(content) || /- \[.+\]\(#.+\)/m.test(content);
    const hasImages = /!\[.*\]\(.+\.(png|jpg|jpeg|gif|svg|webp)/i.test(content);
    
    // Calculate score
    let score = 0;
    if (hasTitle) score += 10;
    if (hasDescription) score += 10;
    if (hasInstallation) score += 15;
    if (hasUsage) score += 15;
    if (hasExamples) score += 15;
    if (hasLicense) score += 5;
    if (hasBadges) score += 10;
    if (hasContributing) score += 5;
    if (hasTableOfContents) score += 5;
    if (hasImages) score += 5;
    
    // Length bonus
    if (length > 1000) score += 3;
    if (length > 3000) score += 2;
    
    return {
      exists: true,
      length,
      hasTitle,
      hasDescription,
      hasInstallation,
      hasUsage,
      hasExamples,
      hasLicense,
      hasBadges,
      hasContributing,
      hasTableOfContents,
      hasImages,
      score: Math.min(100, score)
    };
  }
  
  // ==========================================================================
  // SCORING FUNCTIONS (NEW GROK-STYLE)
  // ==========================================================================
  
  /**
   * Functionality Score (0-30 points)
   * - Tests exist and likely pass
   * - CI/CD configured
   * - Can be built/run
   */
  private calculateFunctionalityScore(metrics: GitHubRepoMetrics): number {
    let score = 0;
    
    // Has CI/CD (suggests code is tested/builds) - 12 points
    if (metrics.hasCICD) {
      score += 12;
      // Bonus for GitHub Actions (can verify builds)
      if (metrics.cicdPlatforms.includes('GitHub Actions')) {
        score += 3;
      }
    }
    
    // Has tests (functionality is verified) - 10 points
    if (metrics.hasTests) {
      score += 8;
      // Bonus for test framework detection
      if (metrics.testFramework) {
        score += 2;
      }
    }
    
    // Has dependency file (can be installed) - 5 points
    if (metrics.hasDependencyFile) {
      score += 5;
    }
    
    return Math.min(30, score);
  }
  
  /**
   * Code Quality Score (0-20 points)
   * - Linter/formatter configs
   * - Code organization
   * - Not too complex
   */
  private calculateCodeQualityScore(metrics: GitHubRepoMetrics): number {
    let score = 0;
    
    // Has linter config - 8 points
    if (metrics.hasLinterConfig) {
      score += 6;
      // Multiple linters = more thorough
      if (metrics.linterConfigs.length > 1) {
        score += 2;
      }
    }
    
    // Has formatter config - 4 points
    if (metrics.hasFormatterConfig) {
      score += 4;
    }
    
    // Proper file structure - 4 points
    if (metrics.hasProperStructure) {
      score += 4;
    }
    
    // Active development (bugs get fixed) - 4 points
    if (metrics.lastCommitDate) {
      const daysSince = (Date.now() - metrics.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) score += 4;
      else if (daysSince < 90) score += 2;
    }
    
    return Math.min(20, score);
  }
  
  /**
   * Documentation Score (0-20 points)
   * - README quality and completeness
   * - Code comments
   * - API docs
   */
  private calculateDocumentationScore(metrics: GitHubRepoMetrics, readmeQuality: ReadmeQualityMetrics): number {
    // README quality is 0-100, scale to 0-15
    let score = (readmeQuality.score / 100) * 15;
    
    // Has CONTRIBUTING.md - 2 points
    if (metrics.hasContributing) {
      score += 2;
    }
    
    // Has CODE_OF_CONDUCT.md - 1 point
    if (metrics.hasCodeOfConduct) {
      score += 1;
    }
    
    // Has security policy - 2 points
    if (metrics.hasSecurityPolicy) {
      score += 2;
    }
    
    return Math.min(20, Math.round(score));
  }
  
  /**
   * Version Control Score (0-10 points)
   * - Commit message quality
   * - Commit frequency
   * - Clean history
   */
  private calculateVCSScore(metrics: GitHubRepoMetrics): number {
    // Commit quality is 0-100, scale to 0-6
    let score = (metrics.commitMessageQuality.score / 100) * 6;
    
    // Good commit frequency - 2 points
    if (metrics.commits > 50) {
      score += 2;
    } else if (metrics.commits > 20) {
      score += 1;
    }
    
    // Conventional commits - 2 points
    if (metrics.commitMessageQuality.hasConventionalCommits) {
      score += 2;
    }
    
    return Math.min(10, Math.round(score));
  }
  
  /**
   * Organization Score (0-10 points) - Repository Best Practices
   * - .gitignore, license, file structure
   * - Security policy, code of conduct
   */
  private calculateOrganizationScore(metrics: GitHubRepoMetrics): number {
    let score = 0;
    
    // Has .gitignore - 2 points
    if (metrics.hasGitignore) {
      score += 2;
    }
    
    // Has license - 3 points
    if (metrics.hasLicense) {
      score += 3;
    }
    
    // Proper structure (src/, lib/, etc) - 2 points
    if (metrics.hasProperStructure) {
      score += 2;
    }
    
    // Not archived - 1 point
    if (!metrics.isArchived) {
      score += 1;
    }
    
    // Has security policy - 1 point
    if (metrics.hasSecurityPolicy) {
      score += 1;
    }
    
    // Has code of conduct or contributing guide - 1 point
    if (metrics.hasCodeOfConduct || metrics.hasContributing) {
      score += 1;
    }
    
    return Math.min(10, score);
  }
  
  /**
   * Community Score (0-10 points) - Collaboration & Activity
   * - Stars, forks, contributors
   * - Recent activity
   */
  private calculateCommunityScore(metrics: GitHubRepoMetrics): number {
    let score = 0;
    
    // Stars (0-3 points)
    if (metrics.stars > 1000) score += 3;
    else if (metrics.stars > 100) score += 2;
    else if (metrics.stars > 10) score += 1;
    
    // Contributors (0-3 points)
    if (metrics.contributors > 20) score += 3;
    else if (metrics.contributors > 5) score += 2;
    else if (metrics.contributors > 1) score += 1;
    
    // Forks (0-2 points)
    if (metrics.forks > 100) score += 2;
    else if (metrics.forks > 10) score += 1;
    
    // Recent activity (0-2 points)
    if (metrics.lastCommitDate) {
      const days = (Date.now() - metrics.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24);
      if (days < 30) score += 2;
      else if (days < 90) score += 1;
    }
    
    return Math.min(10, score);
  }
  
  // ==========================================================================
  // LEGACY SCORING FUNCTIONS (for backward compatibility)
  // ==========================================================================
  
  private calculateSecurityScore(metrics: GitHubRepoMetrics): number {
    let score = 30;
    if (!metrics.hasLicense) score -= 5;
    if (!metrics.hasSecurityPolicy) score -= 3;
    if (metrics.isArchived) score -= 10;
    
    if (metrics.lastCommitDate) {
      const days = (Date.now() - metrics.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24);
      if (days > 365) score -= 8;
      else if (days > 180) score -= 5;
      else if (days > 90) score -= 2;
      else if (days <= 30) score += 2;
    }
    
    return Math.max(0, score);
  }
  
  private calculateActivityScore(metrics: GitHubRepoMetrics): number {
    let score = 0;
    
    if (metrics.commits > 1000) score += 10;
    else if (metrics.commits > 500) score += 8;
    else if (metrics.commits > 100) score += 6;
    else if (metrics.commits > 50) score += 4;
    else if (metrics.commits > 10) score += 2;
    
    if (metrics.contributors > 50) score += 10;
    else if (metrics.contributors > 20) score += 8;
    else if (metrics.contributors > 10) score += 6;
    else if (metrics.contributors > 5) score += 4;
    else if (metrics.contributors > 1) score += 2;
    
    if (metrics.lastCommitDate) {
      const days = (Date.now() - metrics.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24);
      if (days <= 7) score += 5;
      else if (days <= 30) score += 3;
      else if (days <= 90) score += 1;
    }
    
    return Math.min(25, score);
  }
  
  private calculatePopularityScore(metrics: GitHubRepoMetrics): number {
    let score = 0;
    
    if (metrics.stars > 10000) score += 10;
    else if (metrics.stars > 5000) score += 9;
    else if (metrics.stars > 1000) score += 8;
    else if (metrics.stars > 500) score += 6;
    else if (metrics.stars > 100) score += 4;
    else if (metrics.stars > 50) score += 2;
    else if (metrics.stars > 10) score += 1;
    
    if (metrics.forks > 1000) score += 5;
    else if (metrics.forks > 500) score += 4;
    else if (metrics.forks > 100) score += 3;
    else if (metrics.forks > 50) score += 2;
    else if (metrics.forks > 10) score += 1;
    
    if (metrics.watchers > 500) score += 5;
    else if (metrics.watchers > 100) score += 4;
    else if (metrics.watchers > 50) score += 3;
    else if (metrics.watchers > 20) score += 2;
    else if (metrics.watchers > 5) score += 1;
    
    return Math.min(20, score);
  }
  
  private calculateHealthScore(metrics: GitHubRepoMetrics): number {
    let score = 0;
    if (metrics.hasReadme) score += 3;
    if (metrics.hasLicense) score += 3;
    if (metrics.hasSecurityPolicy) score += 2;
    if (!metrics.isArchived) score += 4;
    if (!metrics.isFork) score += 2;
    if (metrics.openIssues < 50) score += 1;
    return Math.min(15, score);
  }
  
  private calculateSolanaScore(metrics: GitHubRepoMetrics): number {
    if (!metrics.isSolanaProject) return 0;
    let score = 5;
    if (metrics.hasAnchor) score += 3;
    if (metrics.hasCargoToml) score += 2;
    return Math.min(10, score);
  }
  
  // ==========================================================================
  // GRADING & RECOMMENDATIONS
  // ==========================================================================
  
  private assignGrade(score: number): RepoGradeResult['grade'] {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }
  
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
      const days = (Date.now() - metrics.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24);
      if (days > 365) {
        risks.push(`[!] No commits in ${Math.floor(days / 365)} year(s) (abandoned?)`);
      } else if (days > 180) {
        risks.push('[!] No recent activity (6+ months)');
      }
    }
    
    if (metrics.stars < 10 && !metrics.isFork) {
      risks.push('[!] Low community adoption (< 10 stars)');
    }
    
    if (!metrics.hasSecurityPolicy) {
      risks.push('[!] No security policy defined');
    }
    
    // NEW: Testing risks
    if (!metrics.hasTests) {
      risks.push('[!] No test directory found (untested code)');
    }
    
    // NEW: CI/CD risks
    if (!metrics.hasCICD) {
      risks.push('[!] No CI/CD configuration (builds not verified)');
    }
    
    // NEW: Code quality risks
    if (!metrics.hasLinterConfig) {
      risks.push('[!] No linter configuration (code quality not enforced)');
    }
    
    // NEW: Commit quality risks
    if (metrics.commitMessageQuality.score < 30) {
      risks.push('[!] Poor commit message quality');
    }
    
    // NEW: Documentation risks
    if (result.readmeQuality && result.readmeQuality.score < 30) {
      risks.push('[!] README lacks essential sections (installation, usage)');
    }
    
    return risks;
  }
  
  private identifyStrengths(metrics: GitHubRepoMetrics, result: RepoGradeResult): string[] {
    const strengths: string[] = [];
    
    if (metrics.stars > 1000) {
      strengths.push(`[+] High community trust (${metrics.stars.toLocaleString()} stars)`);
    }
    
    if (metrics.contributors > 20) {
      strengths.push(`[+] Strong contributor base (${metrics.contributors} contributors)`);
    }
    
    if (metrics.commits > 500) {
      strengths.push(`[+] Mature codebase (${metrics.commits.toLocaleString()} commits)`);
    }
    
    if (metrics.lastCommitDate) {
      const days = (Date.now() - metrics.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24);
      if (days <= 30) {
        strengths.push('[+] Recently updated (active development)');
      }
    }
    
    if (metrics.hasLicense) {
      strengths.push(`[+] Licensed (${metrics.licenseType || 'legal clarity'})`);
    }
    
    if (metrics.hasSecurityPolicy) {
      strengths.push('[+] Security policy defined');
    }
    
    // NEW: Testing strengths
    if (metrics.hasTests) {
      const testInfo = metrics.testFramework 
        ? `using ${metrics.testFramework}` 
        : `${metrics.testDirectories.length} test directories`;
      strengths.push(`[+] Tests present (${testInfo})`);
    }
    
    // NEW: CI/CD strengths
    if (metrics.hasCICD) {
      strengths.push(`[+] CI/CD configured (${metrics.cicdPlatforms.join(', ')})`);
    }
    
    // NEW: Code quality strengths
    if (metrics.hasLinterConfig) {
      strengths.push(`[+] Code quality tools (${metrics.linterConfigs.join(', ')})`);
    }
    
    // NEW: Commit quality strengths
    if (metrics.commitMessageQuality.hasConventionalCommits) {
      strengths.push('[+] Uses conventional commit format');
    }
    
    // NEW: Documentation strengths
    if (result.readmeQuality && result.readmeQuality.score >= 70) {
      strengths.push('[+] Comprehensive README documentation');
    }
    
    if (metrics.isSolanaProject && metrics.hasAnchor) {
      strengths.push('[+] Uses Anchor framework (Solana best practice)');
    }
    
    if (!metrics.isArchived && metrics.lastCommitDate) {
      const days = (Date.now() - metrics.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24);
      if (days <= 90) {
        strengths.push('[+] Actively maintained');
      }
    }
    
    return strengths;
  }
  
  private generateRecommendation(result: RepoGradeResult): string {
    if (!result.found) {
      return '[X] Repository not found or inaccessible';
    }
    
    if (result.confidenceScore >= 85) {
      return '[+++] HIGHLY TRUSTED - This repository shows strong indicators of quality, security, and active maintenance. Safe to use.';
    }
    
    if (result.confidenceScore >= 70) {
      return '[++] GENERALLY SAFE - Good metrics with some areas for improvement. Review identified risks before use.';
    }
    
    if (result.confidenceScore >= 55) {
      return '[+] PROCEED WITH CAUTION - Moderate concerns. Thoroughly review code and risks before use.';
    }
    
    return '[!] HIGH RISK - This repository shows significant warning signs. Not recommended for production use without extensive auditing.';
  }
  
  // ==========================================================================
  // DISPLAY FORMATTING
  // ==========================================================================
  
  formatForDisplay(result: RepoGradeResult): string {
    if (!result.found) {
      return `❌ **Repository not found**\n${result.githubUrl}\n\n${result.error || 'Invalid URL or inaccessible repository'}`;
    }
    
    const m = result.metrics!;
    const rq = result.readmeQuality;
    const cq = result.commitQuality;
    
    let output = `🏛️ **GitHub Repository Grade: ${result.grade}**\n`;
    output += `**${m.owner}/${m.repo}**\n`;
    output += `${result.recommendation}\n\n`;
    
    output += `📊 **Confidence Score: ${result.confidenceScore}/100**\n\n`;
    
    // Community stats
    output += `⭐ **Community**\n`;
    output += `${m.stars.toLocaleString()} stars | ${m.forks.toLocaleString()} forks | ${m.contributors} contributors\n`;
    
    // Tech stack
    output += `💻 **Tech Stack**\n`;
    output += `${m.language || 'Mixed'} ${m.isSolanaProject ? '(Solana)' : ''}\n`;
    output += `${m.commits.toLocaleString()} commits | Last: ${m.lastCommitDate?.toLocaleDateString() || 'Unknown'}\n\n`;
    
    // Score breakdown (Grok-style)
    output += `📋 **Score Breakdown**\n`;
    output += `🔧 Functionality: ${result.functionalityScore}/30\n`;
    output += `📝 Code Quality: ${result.codeQualityScore}/20\n`;
    output += `📖 Documentation: ${result.documentationScore}/20\n`;
    output += `📂 Version Control: ${result.vcsScore}/10\n`;
    output += `🗂️ Organization: ${result.organizationScore}/10\n`;
    output += `👥 Community: ${result.communityScore}/10\n\n`;
    
    // Detailed indicators
    output += `🔍 **Detailed Analysis**\n`;
    output += `• Tests: ${m.hasTests ? `✅ (${m.testFramework || m.testDirectories.join(', ')})` : '❌ Not found'}\n`;
    output += `• CI/CD: ${m.hasCICD ? `✅ (${m.cicdPlatforms.join(', ')})` : '❌ Not configured'}\n`;
    output += `• Linting: ${m.hasLinterConfig ? `✅ (${m.linterConfigs.join(', ')})` : '❌ No config'}\n`;
    output += `• README: ${rq?.exists ? `${rq.score}/100 quality` : '❌ Missing'}\n`;
    output += `• Commits: ${cq?.score || 0}/100 message quality\n`;
    output += `• License: ${m.hasLicense ? `✅ ${m.licenseType || 'Yes'}` : '❌ Missing'}\n\n`;
    
    if (result.strengths.length > 0) {
      output += `✅ **Strengths**\n${result.strengths.join('\n')}\n\n`;
    }
    
    if (result.risks.length > 0) {
      output += `⚠️ **Risks**\n${result.risks.join('\n')}\n\n`;
    }
    
    output += `_Analyzed at ${result.analyzedAt.toLocaleString()}_`;
    
    return output;
  }
  
  // ==========================================================================
  // URL PARSING HELPERS
  // ==========================================================================
  
  private parseGitHubUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/\s]+)/);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
    
    const simple = url.match(/^([^\/]+)\/([^\/\s]+)$/);
    if (simple) {
      return { owner: simple[1], repo: simple[2] };
    }
    
    return { owner: '', repo: '' };
  }
  
  isUserProfileUrl(url: string): boolean {
    if (url.match(/^[^\/\s]+$/) && !url.includes('.')) {
      return true;
    }
    
    const profileMatch = url.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/\s?]+)(?:\?.*)?$/);
    if (profileMatch) {
      const pathAfterUsername = url.match(/github\.com\/[^\/\s?]+\/([^\/\s?]+)/);
      return !pathAfterUsername;
    }
    
    return false;
  }
  
  // User profile grading (unchanged from before)
  async gradeUserProfile(profileUrl: string): Promise<UserProfileGradeResult> {
    const username = this.parseProfileUrl(profileUrl);
    if (!username) {
      throw new Error('Invalid GitHub profile URL');
    }

    try {
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

      const CONCURRENCY_LIMIT = 5;
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

        if (i + CONCURRENCY_LIMIT < repos.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const scores = results.map(r => r.confidenceScore).filter(s => s > 0);
      const averageScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      const topRepos = results
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, 10)
        .map(r => ({
          name: r.metrics ? `${r.metrics.owner}/${r.metrics.repo}` : r.githubUrl,
          url: r.metrics?.url || r.githubUrl,
          score: r.confidenceScore,
          grade: r.grade
        }));

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
  
  private parseProfileUrl(url: string): string | null {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/\s?]+)/);
    if (match) {
      return match[1];
    }
    if (url.match(/^[^\/\s]+$/)) {
      return url;
    }
    return null;
  }
  
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
    const perPage = 100;

    try {
      while (true) {
        const response = await axios.get(
          `${this.apiBase}/users/${username}/repos?per_page=${perPage}&page=${page}&sort=updated&direction=desc`,
          { headers }
        );

        if (response.data.length === 0) break;

        for (const repo of response.data) {
          repos.push({
            owner: repo.owner.login,
            repo: repo.name,
            url: repo.html_url
          });
        }

        if (response.data.length < perPage) break;
        page++;
        if (repos.length >= 100) break;
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
}

// Export singleton instance
export const githubAnalyzer = new GitHubRepoAnalyzer();

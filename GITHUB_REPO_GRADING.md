# GitHub Repository Grading System

## Overview

The Rug Killer bot now includes a comprehensive GitHub repository grading system that analyzes and scores repositories on a **0-100% confidence scale**. This feature helps users quickly assess the trustworthiness and quality of GitHub repositories associated with Solana projects.

## Features

### 🎯 Comprehensive Scoring (0-100%)

The grading system evaluates repositories across five key dimensions:

1. **Security Score (0-30 points)**
   - License presence
   - Security policy documentation
   - Archive status (maintenance)
   - Recent activity (security patches)
   
2. **Activity Score (0-25 points)**
   - Total commits
   - Number of contributors
   - Recent updates (last 7-90 days)
   
3. **Popularity Score (0-20 points)**
   - GitHub stars
   - Forks count
   - Watchers/subscribers
   
4. **Health Score (0-15 points)**
   - README documentation
   - License clarity
   - Security policy
   - Issue management
   - Original vs forked status
   
5. **Solana Bonus (0-10 points)**
   - Rust language detection
   - Anchor framework usage
   - Cargo.toml presence
   - Solana-specific indicators

### 📊 Letter Grades

- **A+ (90-100%)**: Highly trusted, production-ready
- **A (80-89%)**: Generally safe with minor concerns
- **B (70-79%)**: Acceptable with some improvements needed
- **C (60-69%)**: Proceed with caution
- **D (50-59%)**: Significant concerns
- **F (<50%)**: High risk, not recommended

### ✅ Smart Analysis

- **Automatic Solana Detection**: Identifies Rust/Solana projects and applies specialized criteria
- **Risk Identification**: Flags concerning patterns (archived repos, single contributors, stale code)
- **Strength Highlighting**: Recognizes positive indicators (active maintenance, strong community)
- **N/A Handling**: Gracefully handles repositories not found or with missing data

## Usage

### 1. Telegram Bot

```
/graderepo <github-url>
```

**Examples:**
```
/graderepo https://github.com/solana-labs/solana
/graderepo solana-labs/solana
/graderepo github.com/coral-xyz/anchor
```

**Response Format:**
```
📊 GitHub Repository Grade: A+
🎯 Confidence Score: 95/100

Repository: solana-labs/solana
⭐ 12,345 stars | 🍴 3,456 forks | 👥 250 contributors
💻 Language: Rust (Solana Project)
📝 5,678 commits | Last updated: 12/15/2024

Score Breakdown:
🔒 Security: 28/30
⚡ Activity: 25/25
🌟 Popularity: 20/20
💚 Health: 15/15
🚀 Solana Bonus: 10/10

Strengths:
✅ High community trust (12,345 stars)
✅ Strong contributor base (250 contributors)
✅ Recently updated (active development)
✅ Uses Anchor framework (best practice)
✅ Actively maintained

Recommendation:
🟢 HIGHLY TRUSTED - This repository shows strong indicators of quality, security, and active maintenance. Safe to use.
```

### 2. Discord Bot

```
/graderepo url:<github-url>
```

Returns a rich embed with:
- Color-coded grade (green = safe, red = risky)
- Confidence score visualization
- Detailed metrics
- Risk and strength analysis
- Direct link to repository

### 3. REST API

**Endpoint:** `POST /api/grade-repo`

**Request:**
```json
{
  "githubUrl": "https://github.com/owner/repo"
}
```

**Response:**
```json
{
  "githubUrl": "https://github.com/solana-labs/solana",
  "found": true,
  "confidenceScore": 95,
  "grade": "A+",
  "securityScore": 28,
  "activityScore": 25,
  "popularityScore": 20,
  "healthScore": 15,
  "solanaScore": 10,
  "metrics": {
    "owner": "solana-labs",
    "repo": "solana",
    "url": "https://github.com/solana-labs/solana",
    "stars": 12345,
    "forks": 3456,
    "contributors": 250,
    "commits": 5678,
    "language": "Rust",
    "isSolanaProject": true,
    "hasAnchor": false,
    "hasCargoToml": true,
    "lastCommitDate": "2024-12-15T10:30:00Z",
    "hasLicense": true,
    "hasSecurityPolicy": true,
    "isArchived": false
  },
  "risks": [],
  "strengths": [
    "✅ High community trust (12,345 stars)",
    "✅ Strong contributor base (250 contributors)",
    "✅ Recently updated (active development)"
  ],
  "recommendation": "🟢 HIGHLY TRUSTED - This repository shows strong indicators of quality, security, and active maintenance. Safe to use.",
  "analyzedAt": "2024-12-15T12:00:00Z"
}
```

**Rate Limiting:**
- 5 requests per minute per IP
- Returns 429 status code when exceeded

## Integration with Grok Recommendations

The system implements the core concepts from Grok's analysis of GitHub repository grading tools:

### ✅ Implemented Features

1. **GitHub API Integration**
   - Fetches comprehensive repository metadata
   - Retrieves contributor counts
   - Analyzes commit history
   - Checks for security policies

2. **Solana-Specific Detection**
   - Identifies Rust/Solana projects automatically
   - Awards bonus points for Anchor framework usage
   - Checks for proper Cargo.toml setup
   - Recognizes Solana naming patterns

3. **Security & Health Metrics**
   - License verification
   - Security policy presence
   - Archive status checking
   - Activity recency analysis
   - Issue management assessment

4. **0-100% Confidence Scoring**
   - Weighted scoring across 5 dimensions
   - Clear grade assignments (A+ through F)
   - N/A handling for missing data

### 🔮 Future Enhancements (From Grok)

The following advanced features from Grok's recommendations can be added:

1. **OSV Scanner Integration** (Google's vulnerability scanner)
   - Scan `Cargo.lock` for known CVEs
   - Flag outdated dependencies
   - Severity scoring integration

2. **Solana Static Analyzer** (scab24/Solana_Static_Analyzer)
   - Deep Rust code analysis
   - Reentrancy detection
   - Unchecked instruction scanning
   - AST-based vulnerability reports

3. **Automated Repo Cloning**
   - Clone repos for deep analysis
   - Run static analyzers locally
   - Cache results for performance

4. **Enhanced Metrics**
   - Code coverage analysis
   - Test suite presence
   - Documentation completeness
   - Dependency freshness

## Setup

### Environment Variables

```env
# Optional: GitHub Personal Access Token for higher rate limits
GITHUB_TOKEN=ghp_your_token_here
```

**Without token:** 60 requests/hour per IP  
**With token:** 5,000 requests/hour

### Generate GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (read-only)
4. Copy token and add to `.env`

## API Examples

### Using cURL

```bash
# Grade a repository
curl -X POST http://localhost:5000/api/grade-repo \
  -H "Content-Type: application/json" \
  -d '{"githubUrl": "https://github.com/solana-labs/solana"}'
```

### Using JavaScript/Fetch

```javascript
const response = await fetch('http://localhost:5000/api/grade-repo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    githubUrl: 'https://github.com/solana-labs/solana'
  })
});

const result = await response.json();
console.log(`Grade: ${result.grade}, Score: ${result.confidenceScore}%`);
```

## Scoring Details

### Security Score Calculation (Max 30)

```
Base: 30 points
- No license: -5
- No security policy: -3
- Archived repo: -10
- Last commit > 1 year: -8
- Last commit 6-12 months: -5
- Last commit 3-6 months: -2
+ Recent commit (<30 days): +2
```

### Activity Score Calculation (Max 25)

**Commits:**
- 1000+: +10
- 500-999: +8
- 100-499: +6
- 50-99: +4
- 10-49: +2

**Contributors:**
- 50+: +10
- 20-49: +8
- 10-19: +6
- 5-9: +4
- 2-4: +2

**Recency:**
- Updated within 7 days: +5
- Updated within 30 days: +3
- Updated within 90 days: +1

### Popularity Score Calculation (Max 20)

**Stars:**
- 10,000+: +10
- 5,000-9,999: +9
- 1,000-4,999: +8
- 500-999: +6
- 100-499: +4
- 50-99: +2
- 10-49: +1

**Forks:**
- 1,000+: +5
- 500-999: +4
- 100-499: +3
- 50-99: +2
- 10-49: +1

**Watchers:**
- 500+: +5
- 100-499: +4
- 50-99: +3
- 20-49: +2
- 5-19: +1

### Health Score Calculation (Max 15)

- Has README: +3
- Has license: +3
- Has security policy: +2
- Not archived: +4
- Original (not fork): +2
- <50 open issues: +1

### Solana Bonus Calculation (Max 10)

Only applies to Solana/Rust projects:
- Base Solana project: +5
- Has Anchor.toml: +3
- Has Cargo.toml: +2

## Risk Flags

The system automatically identifies:

⚠️ **Critical Risks:**
- Archived repository
- No license
- Single contributor (bus factor)
- No activity in 1+ years

⚠️ **Moderate Risks:**
- No recent activity (6+ months)
- Low community adoption (<10 stars)
- High open issue count (100+)
- No security policy
- Missing Solana setup files

## Use Cases

### 1. Token Project Due Diligence
When a Solana token claims to have GitHub source code:
```
/graderepo <project-github-url>
```
Quickly assess if the codebase is legitimate, maintained, and secure.

### 2. Smart Money Wallet Analysis
Check if a wallet's associated projects have quality code:
```
/devaudit <wallet>  # Get associated tokens
/graderepo <token-repo-url>  # Grade each repo
```

### 3. Integration Screening
Before integrating a Solana library:
```
/graderepo https://github.com/library/repo
```
Verify it's actively maintained and secure.

### 4. Community Trust Verification
Compare competing projects:
```
/graderepo project-a/repo
/graderepo project-b/repo
```

## Limitations

1. **No Code Execution**: Does not run code or tests
2. **Metadata Only**: Relies on GitHub API data, not deep code analysis
3. **Rate Limits**: Limited by GitHub API (60/hour without token, 5000/hour with)
4. **Public Repos Only**: Cannot analyze private repositories
5. **Static Analysis**: No runtime vulnerability detection

## Roadmap

### Phase 1 (Current) ✅
- [x] GitHub API integration
- [x] 0-100% confidence scoring
- [x] Solana project detection
- [x] Telegram bot integration
- [x] Discord bot integration
- [x] REST API endpoint

### Phase 2 (Planned)
- [ ] OSV Scanner integration for dependency vulnerabilities
- [ ] Solana Static Analyzer integration for Rust code
- [ ] Repository caching for performance
- [ ] Historical score tracking
- [ ] Automated daily scans for watchlisted repos

### Phase 3 (Future)
- [ ] ML-based risk prediction
- [ ] Smart contract audit integration
- [ ] GitHub Actions workflow analysis
- [ ] Contributor reputation scoring
- [ ] Multi-repo project analysis

## Troubleshooting

### "Repository not found"
- Check URL format: `https://github.com/owner/repo`
- Verify repository is public
- Ensure correct spelling

### "Rate limit exceeded"
- Add `GITHUB_TOKEN` to `.env`
- Wait 60 minutes for rate limit reset
- Check token hasn't expired

### "N/A" grade with no data
- Repository may be private
- GitHub API may be down
- Network connectivity issues

### Low score on legitimate repo
- Check if repo is archived
- Verify recent commit activity
- Review identified risks in output

## Support

For issues or feature requests:
- GitHub Issues: [Your Repo URL]
- Discord: [Your Discord Server]
- Telegram: [Your Telegram Bot]

## Credits

Implementation inspired by Grok's analysis of GitHub repository grading tools:
- **waveupHQ/github-repo-analyzer**: Metadata fetching patterns
- **google/osv-scanner**: Vulnerability scanning concepts
- **scab24/Solana_Static_Analyzer**: Solana-specific analysis ideas
- **ejwa/gitinspector**: Statistical analysis methods

## License

MIT License - See LICENSE file for details

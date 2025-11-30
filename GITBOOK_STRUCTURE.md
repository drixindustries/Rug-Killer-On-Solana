# Rug Killer on Solana - GitBook Documentation Structure

This document outlines the complete GitBook documentation structure. You can create a GitBook account at https://www.gitbook.com and import this structure.

---

## GitBook Site Structure

### 📚 Table of Contents

```
# Introduction
├── Welcome to Rug Killer
├── What is Rug Killer?
├── Key Features Overview
└── Quick Links

# Getting Started
├── Installation
│   ├── Local Development Setup
│   ├── Railway Deployment
│   └── Docker Deployment
├── Configuration
│   ├── Environment Variables
│   ├── RPC Setup
│   └── Database Setup
└── First Token Analysis

# Platform Features
├── Token Analysis
│   ├── Multi-Layer Detection
│   ├── Risk Scoring System
│   └── Analysis Reports
├── GitHub Repository Grading
│   ├── Overview
│   ├── Scoring Methodology
│   ├── Bot Commands
│   └── API Integration
├── Temporal GNN Detection
│   ├── What is TGN?
│   ├── How It Works
│   └── Performance Metrics
├── Aged Wallet Detection
│   ├── Fake Volume Schemes
│   ├── Detection Methods
│   └── Risk Indicators
└── Pump.fun Integration
    ├── Live Auto-Scanning
    ├── WebSocket Connection
    └── Grading System

# Bot Platforms
├── Telegram Bot
│   ├── Setup Guide
│   ├── Commands Reference
│   └── Examples
├── Discord Bot
│   ├── Setup Guide
│   ├── Slash Commands
│   └── Examples
└── Bot Best Practices

# API Reference
├── Authentication
├── Token Analysis Endpoints
│   ├── POST /api/analyze
│   ├── GET /api/trending-calls
│   └── POST /api/aged-wallets
├── GitHub Grading Endpoints
│   └── POST /api/grade-repo
├── Rate Limits
└── Error Handling

# Advanced Detection
├── Temporal Graph Neural Networks
│   ├── Architecture
│   ├── Training Data
│   └── Performance Benchmarks
├── Liquidity Analysis
│   ├── Pool Depth Detection
│   ├── Lock Period Analysis
│   └── LP Burn Detection
├── Holder Distribution
│   ├── Whale Detection
│   ├── CEX Wallet Filtering
│   └── Concentration Metrics
└── Creator Tracking
    ├── Multi-Account Detection
    ├── Blacklist Verification
    └── Historical Analysis

# Web Interface
├── Dashboard Overview
├── Token Search
├── Analysis Results
├── Charts & Visualizations
└── Mobile Experience

# Development
├── Contributing Guide
├── Code Structure
├── Testing
└── Debugging Tips

# Deployment
├── Railway Guide
│   ├── Initial Setup
│   ├── Environment Configuration
│   └── Troubleshooting
├── Docker Deployment
│   ├── Building Images
│   ├── Docker Compose
│   └── Production Setup
└── Monitoring & Maintenance

# Integrations
├── DexScreener API
├── Birdeye API
├── GMGN.AI
├── MobyScreener
├── QuillCheck
└── Custom Integrations

# Troubleshooting
├── Common Issues
├── Error Messages
├── Performance Problems
└── Support Resources

# Changelog
└── Version History

# FAQ
└── Frequently Asked Questions
```

---

## Detailed Content Outline

### 1. Introduction / Welcome to Rug Killer

**Content:**
```markdown
# Welcome to Rug Killer on Solana

Rug Killer is the most advanced Solana token security analysis platform, featuring cutting-edge 2025 detection methods including Temporal Graph Neural Networks (TGN), Aged Wallet Detection, and real-time Pump.fun integration.

## 🎯 What Makes Us Different

- **99%+ Detection Rate** - Industry-leading accuracy
- **Temporal GNN** - 10-18% better than traditional methods
- **GitHub Repo Grading** - First Solana bot with this feature
- **Real-Time Pump.fun** - Auto-scan every new token
- **Multi-Platform** - Web, Telegram, Discord, API

## 🚀 Quick Links

- [Installation Guide](#getting-started/installation)
- [Bot Commands](#bot-platforms)
- [API Reference](#api-reference)
- [GitHub Grading](#platform-features/github-repository-grading)

## 📊 Platform Statistics

- Detection Rate: 99%+
- Rug Pull Accuracy: 95-98% (with TGN)
- False Positive Reduction: 50%
- API Response Time: <500ms (with caching)
- Supported Platforms: Web, Telegram, Discord

## 🛡️ Protection Features

✅ Multi-layer rug detection  
✅ Liquidity analysis  
✅ Whale detection (40+ CEX filtered)  
✅ Aged wallet farming detection  
✅ GitHub repository grading  
✅ Real-time Pump.fun scanning  
✅ Smart money tracking  

Get started with [Installation](#getting-started/installation) or try our [Live Demo](https://rugkiller.app).
```

---

### 2. Getting Started / Installation

**Content:**
```markdown
# Installation

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Solana RPC endpoint (Helius, Alchemy, etc.)
- Optional: Redis for caching
- Optional: GitHub token for repo grading

## Local Development Setup

### 1. Clone Repository

\\\bash
git clone https://github.com/drixindustries/Rug-Killer-On-Solana.git
cd Rug-Killer-On-Solana
\\\

### 2. Install Dependencies

\\\bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
\\\

### 3. Configure Environment

Create `.env` file in root:

\\\env
# Solana RPC
SOLANA_RPC_URL=https://your-rpc-endpoint

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rugkiller

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your_bot_token

# Discord (optional)
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id

# GitHub (optional - for higher rate limits)
GITHUB_TOKEN=ghp_your_token

# Redis (optional)
REDIS_URL=redis://localhost:6379
\\\

### 4. Initialize Database

\\\bash
cd server
npm run db:push
\\\

### 5. Start Development Servers

\\\bash
# Terminal 1: Server
cd server
npm run dev

# Terminal 2: Client
cd client
npm run dev
\\\

Visit http://localhost:5173

## Railway Deployment

See [Railway Guide](#deployment/railway-guide) for production deployment.

## Docker Deployment

See [Docker Guide](#deployment/docker-deployment) for container deployment.

## Next Steps

- [Configuration](#getting-started/configuration)
- [First Token Analysis](#getting-started/first-token-analysis)
- [Bot Setup](#bot-platforms)
```

---

### 3. Platform Features / GitHub Repository Grading

**Content:**
```markdown
# GitHub Repository Grading

Grade any GitHub repository with a 0-100% confidence score using multi-dimensional AI analysis.

## Overview

The GitHub Repository Grading system evaluates repositories across five key dimensions:

- 🔒 **Security** (0-30 pts) - License, policies, maintenance
- ⚡ **Activity** (0-25 pts) - Commits, contributors, updates
- 🌟 **Popularity** (0-20 pts) - Stars, forks, community trust
- 💚 **Health** (0-15 pts) - Documentation, issues, maintenance
- 🚀 **Solana Bonus** (0-10 pts) - Rust, Anchor, Cargo setup

## Scoring System

### Letter Grades

| Grade | Score | Meaning |
|-------|-------|---------|
| A+ | 90-100% | Highly trusted, production-ready |
| A | 80-89% | Generally safe, minor concerns |
| B | 70-79% | Acceptable with review |
| C | 60-69% | Proceed with caution |
| D | 50-59% | Significant concerns |
| F | 0-49% | High risk, not recommended |

### Score Breakdown

**Security Score (0-30)**
- License presence: ±5 pts
- Security policy: ±3 pts
- Archive status: -10 pts
- Recent activity: ±8 pts

**Activity Score (0-25)**
- Commit count: 0-10 pts
- Contributor count: 0-10 pts
- Recent updates: 0-5 pts

**Popularity Score (0-20)**
- GitHub stars: 0-10 pts
- Fork count: 0-5 pts
- Watchers: 0-5 pts

**Health Score (0-15)**
- README: +3 pts
- License: +3 pts
- Security policy: +2 pts
- Not archived: +4 pts
- Not fork: +2 pts
- Low issues: +1 pt

**Solana Bonus (0-10)**
- Solana/Rust project: +5 pts
- Anchor framework: +3 pts
- Cargo.toml: +2 pts

## Usage

### Telegram Bot

\\\
/graderepo https://github.com/solana-labs/solana
/graderepo solana-labs/solana
/graderepo github.com/coral-xyz/anchor
\\\

### Discord Bot

\\\
/graderepo url:https://github.com/solana-labs/solana
/graderepo url:coral-xyz/anchor
\\\

### REST API

\\\bash
curl -X POST https://api.rugkiller.app/api/grade-repo \\
  -H "Content-Type: application/json" \\
  -d '{"githubUrl": "https://github.com/solana-labs/solana"}'
\\\

### Response Example

\\\json
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
    "stars": 12345,
    "forks": 3456,
    "contributors": 250,
    "commits": 5678,
    "language": "Rust",
    "isSolanaProject": true
  },
  "risks": [],
  "strengths": [
    "✅ High community trust (12,345 stars)",
    "✅ Strong contributor base (250 contributors)",
    "✅ Recently updated"
  ],
  "recommendation": "🟢 HIGHLY TRUSTED"
}
\\\

## Risk Indicators

The system automatically detects:

⚠️ **Critical Risks**
- Archived repositories
- No license
- Single contributor
- 1+ year without commits

⚠️ **Moderate Risks**
- 6+ months inactive
- Low adoption (<10 stars)
- 100+ open issues
- No security policy

## Use Cases

### 1. Token Due Diligence
Before investing in a Solana token:
\\\
/analyze TokenAddress
/graderepo <claimed-github-url>
\\\

### 2. Integration Screening
Before using a library:
\\\
/graderepo coral-xyz/anchor
\\\

### 3. Project Comparison
Compare competing projects:
\\\
/graderepo project-a/repo
/graderepo project-b/repo
\\\

## Setup

### Optional: GitHub Token

For higher rate limits (60/hr → 5000/hr):

1. Visit https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scope: `repo` (read-only)
4. Add to `.env`:
   \\\env
   GITHUB_TOKEN=ghp_your_token_here
   \\\

## Learn More

- [Complete Guide](https://github.com/drixindustries/Rug-Killer-On-Solana/blob/main/GITHUB_REPO_GRADING.md)
- [Quick Reference](https://github.com/drixindustries/Rug-Killer-On-Solana/blob/main/GITHUB_GRADING_QUICK_REF.md)
- [API Documentation](#api-reference/github-grading-endpoints)
```

---

### 4. Bot Platforms / Telegram Bot

**Content:**
```markdown
# Telegram Bot

Complete guide to using Rug Killer on Telegram.

## Bot Link

**Official Bot:** [@RugKillerSolanaBot](https://t.me/RugKillerSolanaBot)

## Commands Reference

### Token Analysis

\\\
/analyze <address>   - Full multi-layer token analysis
/rugcheck <address>  - Quick rug pull check
/price <address>     - Get current price
/liquidity <address> - Check liquidity pools
/compare <addr1> <addr2> - Compare two tokens
\\\

### GitHub Grading (NEW!)

\\\
/graderepo <github-url> - Grade repository 0-100%
\\\

**Examples:**
\\\
/graderepo https://github.com/solana-labs/solana
/graderepo solana-labs/solana
/graderepo github.com/coral-xyz/anchor
\\\

### Market Data

\\\
/trending            - Show trending tokens
/exchanges <address> - Check exchange listings
/chart <address>     - Get chart links
\\\

### Pump.fun

\\\
/pumpfun <address>   - Pump.fun specific analysis
\\\

### Help & Info

\\\
/start               - Show welcome message
/help                - Show command list
\\\

## Example Workflow

### 1. Quick Rug Check
\\\
/rugcheck EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
\\\

**Response:**
\\\
🔍 Quick Rug Check

Token: USDC
Risk Level: 🟢 LOW

✅ No mint authority
✅ No freeze authority
✅ Liquidity locked
✅ Verified contract
\\\

### 2. Full Analysis
\\\
/analyze EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
\\\

**Response:**
\\\
📊 Token Analysis: USDC

🎯 Risk Score: 5/100 (🟢 SAFE)

Security:
✅ No mint authority
✅ No freeze authority
✅ Contract verified

Liquidity:
💰 $12.5M locked
🔒 LP tokens burned

Holders:
👥 1.2M holders
🐋 Top holder: 2.3%
✅ CEX wallets filtered

Smart Contract:
✅ No honeypot
✅ No high taxes
✅ Verified on Solscan

Recommendation:
🟢 SAFE - Low risk token
\\\

### 3. GitHub Repo Grading
\\\
/graderepo solana-labs/solana
\\\

**Response:**
\\\
📊 GitHub Repository Grade: A+
🎯 Confidence Score: 95/100

Repository: solana-labs/solana
⭐ 12,345 stars | 🍴 3,456 forks | 👥 250 contributors
💻 Language: Rust (Solana Project)
📝 5,678 commits | Last updated: 11/30/2025

Score Breakdown:
🔒 Security: 28/30
⚡ Activity: 25/25
🌟 Popularity: 20/20
💚 Health: 15/15
🚀 Solana Bonus: 10/10

Strengths:
✅ High community trust
✅ Strong contributor base
✅ Recently updated
✅ Actively maintained

Recommendation:
🟢 HIGHLY TRUSTED
\\\

## Tips & Best Practices

### Formatting Commands
- Use full token addresses (44 characters)
- GitHub URLs can be in any format
- Commands are case-insensitive

### Rate Limits
- 5 requests/minute per user
- Use `/rugcheck` for quick checks
- Use `/analyze` for full reports

### Error Handling
If you see an error:
1. Check token address format
2. Verify token exists on Solana
3. Try again after 1 minute
4. Contact support if persists

## Setup Your Own Bot

See [Telegram Bot Setup Guide](https://github.com/drixindustries/Rug-Killer-On-Solana/blob/main/TELEGRAM_WEBHOOK_SETUP.md)

## Troubleshooting

**"Token not found"**
- Verify address on Solscan
- Check if token is on Solana mainnet

**"Rate limit exceeded"**
- Wait 1 minute before retrying
- Consider using API for bulk analysis

**"Invalid GitHub URL"**
- Use full URL: https://github.com/owner/repo
- Or short format: owner/repo

## Support

- GitHub Issues: [Report Bug](https://github.com/drixindustries/Rug-Killer-On-Solana/issues)
- Discord: [Join Server](https://discord.gg/rugkiller)
```

---

### 5. API Reference / GitHub Grading Endpoints

**Content:**
```markdown
# GitHub Grading API

Grade GitHub repositories programmatically.

## Endpoint

\\\
POST /api/grade-repo
\\\

## Authentication

No authentication required. Rate limited to 5 requests/minute per IP.

## Request

### Headers
\\\
Content-Type: application/json
\\\

### Body
\\\json
{
  "githubUrl": "https://github.com/owner/repo"
}
\\\

**Supported URL Formats:**
- `https://github.com/owner/repo`
- `github.com/owner/repo`
- `owner/repo`
- `https://www.github.com/owner/repo`

## Response

### Success Response (200 OK)

\\\json
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
    "watchers": 8901,
    "openIssues": 234,
    "language": "Rust",
    "languages": {
      "Rust": 85234567,
      "C": 5678901,
      "Python": 2345678
    },
    "commits": 5678,
    "contributors": 250,
    "lastCommitDate": "2025-11-30T10:30:00Z",
    "createdAt": "2020-03-15T08:00:00Z",
    "updatedAt": "2025-11-30T10:30:00Z",
    "hasLicense": true,
    "hasReadme": true,
    "hasSecurityPolicy": true,
    "isArchived": false,
    "isFork": false,
    "isSolanaProject": true,
    "hasAnchor": false,
    "hasCargoToml": true
  },
  "risks": [],
  "strengths": [
    "✅ High community trust (12,345 stars)",
    "✅ Strong contributor base (250 contributors)",
    "✅ Recently updated (active development)",
    "✅ Licensed (legal clarity)",
    "✅ Security policy defined",
    "✅ Actively maintained"
  ],
  "recommendation": "🟢 HIGHLY TRUSTED - This repository shows strong indicators of quality, security, and active maintenance. Safe to use.",
  "analyzedAt": "2025-11-30T12:00:00Z"
}
\\\

### Not Found Response (200 OK)

\\\json
{
  "githubUrl": "https://github.com/fake/repo",
  "found": false,
  "confidenceScore": 0,
  "grade": "N/A",
  "securityScore": 0,
  "activityScore": 0,
  "popularityScore": 0,
  "healthScore": 0,
  "solanaScore": 0,
  "risks": [],
  "strengths": [],
  "recommendation": "❌ Repository not found or inaccessible",
  "analyzedAt": "2025-11-30T12:00:00Z",
  "error": "Repository not found"
}
\\\

### Error Responses

**400 Bad Request - Invalid URL**
\\\json
{
  "message": "Invalid request",
  "error": "Please provide a 'githubUrl' field with a valid GitHub repository URL"
}
\\\

**429 Too Many Requests - Rate Limit**
\\\json
{
  "message": "Rate Limit Reached",
  "error": "Too many GitHub analysis requests. Please try again in a few moments.",
  "retryAfter": 45
}
\\\

**500 Internal Server Error**
\\\json
{
  "message": "Internal server error",
  "error": "Failed to grade repository."
}
\\\

## Examples

### cURL
\\\bash
curl -X POST https://api.rugkiller.app/api/grade-repo \\
  -H "Content-Type: application/json" \\
  -d '{"githubUrl": "https://github.com/solana-labs/solana"}'
\\\

### JavaScript (Fetch)
\\\javascript
const response = await fetch('https://api.rugkiller.app/api/grade-repo', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    githubUrl: 'https://github.com/solana-labs/solana'
  })
});

const result = await response.json();
console.log(`Grade: ${result.grade}, Score: ${result.confidenceScore}%`);
\\\

### Python (Requests)
\\\python
import requests

response = requests.post(
    'https://api.rugkiller.app/api/grade-repo',
    json={'githubUrl': 'https://github.com/solana-labs/solana'}
)

result = response.json()
print(f"Grade: {result['grade']}, Score: {result['confidenceScore']}%")
\\\

### Node.js (Axios)
\\\javascript
const axios = require('axios');

const result = await axios.post('https://api.rugkiller.app/api/grade-repo', {
  githubUrl: 'https://github.com/solana-labs/solana'
});

console.log(`Grade: ${result.data.grade}, Score: ${result.data.confidenceScore}%`);
\\\

## Rate Limits

- **5 requests per minute** per IP address
- **60 requests per hour** (without GitHub token)
- **5,000 requests per hour** (with GitHub token on server)

## Response Times

- **Average:** 2-5 seconds
- **Cached:** <500ms (if recently analyzed)
- **Timeout:** 30 seconds

## Field Descriptions

### Root Fields
| Field | Type | Description |
|-------|------|-------------|
| `githubUrl` | string | Original GitHub URL provided |
| `found` | boolean | Whether repository was found |
| `confidenceScore` | number | Overall score 0-100 |
| `grade` | string | Letter grade (A+ through F or N/A) |
| `securityScore` | number | Security dimension score 0-30 |
| `activityScore` | number | Activity dimension score 0-25 |
| `popularityScore` | number | Popularity dimension score 0-20 |
| `healthScore` | number | Health dimension score 0-15 |
| `solanaScore` | number | Solana bonus score 0-10 |
| `risks` | array | List of identified risks |
| `strengths` | array | List of identified strengths |
| `recommendation` | string | Overall recommendation |
| `analyzedAt` | string | ISO 8601 timestamp |
| `error` | string | Error message (if applicable) |

### Metrics Object
| Field | Type | Description |
|-------|------|-------------|
| `owner` | string | Repository owner username |
| `repo` | string | Repository name |
| `url` | string | Full GitHub URL |
| `stars` | number | Star count |
| `forks` | number | Fork count |
| `watchers` | number | Watcher count |
| `openIssues` | number | Open issue count |
| `language` | string\|null | Primary language |
| `languages` | object | Language breakdown (bytes) |
| `commits` | number | Total commit count |
| `contributors` | number | Contributor count |
| `lastCommitDate` | string\|null | ISO 8601 timestamp of last commit |
| `createdAt` | string | Repository creation date |
| `updatedAt` | string | Last update date |
| `hasLicense` | boolean | License file present |
| `hasReadme` | boolean | README file present |
| `hasSecurityPolicy` | boolean | SECURITY.md present |
| `isArchived` | boolean | Repository archived status |
| `isFork` | boolean | Is this a fork |
| `isSolanaProject` | boolean | Detected as Solana project |
| `hasAnchor` | boolean | Anchor.toml present |
| `hasCargoToml` | boolean | Cargo.toml present |

## Integration Examples

### Token Analysis + GitHub Grading
\\\javascript
// 1. Analyze token
const tokenAnalysis = await fetch('/api/analyze', {
  method: 'POST',
  body: JSON.stringify({ tokenAddress: '...' })
}).then(r => r.json());

// 2. If GitHub URL found in metadata, grade it
if (tokenAnalysis.metadata?.githubUrl) {
  const repoGrade = await fetch('/api/grade-repo', {
    method: 'POST',
    body: JSON.stringify({ 
      githubUrl: tokenAnalysis.metadata.githubUrl 
    })
  }).then(r => r.json());
  
  // Combine confidence scores
  const overallTrust = (
    tokenAnalysis.riskScore * 0.7 +
    repoGrade.confidenceScore * 0.3
  );
  
  console.log(`Overall Trust Score: ${overallTrust}%`);
}
\\\

### Batch Analysis
\\\javascript
const repos = [
  'solana-labs/solana',
  'coral-xyz/anchor',
  'metaplex-foundation/metaplex'
];

const results = [];

for (const repo of repos) {
  const result = await fetch('/api/grade-repo', {
    method: 'POST',
    body: JSON.stringify({ githubUrl: repo })
  }).then(r => r.json());
  
  results.push(result);
  
  // Rate limit protection: wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Sort by score
results.sort((a, b) => b.confidenceScore - a.confidenceScore);
\\\

## Best Practices

1. **Cache Results:** Store results for 24 hours to avoid redundant requests
2. **Handle Errors:** Always check `found` field before using `metrics`
3. **Respect Rate Limits:** Implement exponential backoff
4. **Validate URLs:** Clean user input before sending
5. **Display Recommendations:** Show `recommendation` field to users

## See Also

- [Complete GitHub Grading Guide](#platform-features/github-repository-grading)
- [Bot Commands](#bot-platforms)
- [Token Analysis API](#api-reference/token-analysis-endpoints)
```

---

## SUMMARY.md (GitBook Required File)

**File:** `SUMMARY.md`

```markdown
# Table of contents

## Introduction

* [Welcome to Rug Killer](README.md)
* [What is Rug Killer?](introduction/what-is-rug-killer.md)
* [Key Features Overview](introduction/key-features.md)
* [Quick Links](introduction/quick-links.md)

## Getting Started

* [Installation](getting-started/installation.md)
* [Configuration](getting-started/configuration.md)
* [First Token Analysis](getting-started/first-analysis.md)

## Platform Features

* [Token Analysis](features/token-analysis.md)
* [GitHub Repository Grading](features/github-grading.md)
* [Temporal GNN Detection](features/temporal-gnn.md)
* [Aged Wallet Detection](features/aged-wallet-detection.md)
* [Pump.fun Integration](features/pumpfun.md)

## Bot Platforms

* [Telegram Bot](bots/telegram.md)
* [Discord Bot](bots/discord.md)
* [Bot Best Practices](bots/best-practices.md)

## API Reference

* [Authentication](api/authentication.md)
* [Token Analysis Endpoints](api/token-endpoints.md)
* [GitHub Grading Endpoints](api/github-endpoints.md)
* [Rate Limits](api/rate-limits.md)
* [Error Handling](api/errors.md)

## Advanced Detection

* [Temporal Graph Neural Networks](advanced/tgn.md)
* [Liquidity Analysis](advanced/liquidity.md)
* [Holder Distribution](advanced/holders.md)
* [Creator Tracking](advanced/creators.md)

## Web Interface

* [Dashboard Overview](web/dashboard.md)
* [Token Search](web/search.md)
* [Analysis Results](web/results.md)
* [Charts & Visualizations](web/charts.md)

## Development

* [Contributing Guide](development/contributing.md)
* [Code Structure](development/structure.md)
* [Testing](development/testing.md)
* [Debugging](development/debugging.md)

## Deployment

* [Railway Guide](deployment/railway.md)
* [Docker Deployment](deployment/docker.md)
* [Monitoring](deployment/monitoring.md)

## Integrations

* [DexScreener API](integrations/dexscreener.md)
* [Birdeye API](integrations/birdeye.md)
* [GMGN.AI](integrations/gmgn.md)
* [MobyScreener](integrations/mobyscreener.md)
* [QuillCheck](integrations/quillcheck.md)

## Troubleshooting

* [Common Issues](troubleshooting/common-issues.md)
* [Error Messages](troubleshooting/errors.md)
* [Performance Problems](troubleshooting/performance.md)

## Resources

* [Changelog](resources/changelog.md)
* [FAQ](resources/faq.md)
* [Support](resources/support.md)
```

---

## README.md (GitBook Home Page)

**File:** `README.md`

```markdown
---
description: Advanced Solana token security analysis platform with 99%+ detection rate
cover: .gitbook/assets/rugkiller-cover.png
coverY: 0
layout:
  cover:
    visible: true
    size: hero
  title:
    visible: true
  description:
    visible: true
  tableOfContents:
    visible: true
  outline:
    visible: true
  pagination:
    visible: true
---

# Welcome to Rug Killer on Solana

{% hint style="success" %}
**Rug Killer v2.0 is now live!** Featuring GitHub Repository Grading, Temporal GNN Detection, and real-time Pump.fun integration.
{% endhint %}

## 🎯 What is Rug Killer?

Rug Killer is the **most advanced Solana token security analysis platform**, protecting investors from rug pulls, honeypots, and scams with cutting-edge 2025 detection methods.

### Key Statistics

<table data-view="cards"><thead><tr><th></th><th></th><th></th></tr></thead><tbody><tr><td><strong>99%+</strong></td><td>Overall Detection Rate</td><td>🎯</td></tr><tr><td><strong>95-98%</strong></td><td>Rug Pull Detection (with TGN)</td><td>🧠</td></tr><tr><td><strong>50%</strong></td><td>Reduction in False Positives</td><td>✅</td></tr></tbody></table>

## 🚀 Quick Start

{% content-ref url="getting-started/installation.md" %}
[installation.md](getting-started/installation.md)
{% endcontent-ref %}

{% content-ref url="bots/telegram.md" %}
[telegram.md](bots/telegram.md)
{% endcontent-ref %}

{% content-ref url="bots/discord.md" %}
[discord.md](bots/discord.md)
{% endcontent-ref %}

## ✨ Features

### 🎯 GitHub Repository Grading (NEW!)

Grade any GitHub repository 0-100% with AI-powered analysis. First Solana bot with this capability!

* Multi-dimensional scoring (Security, Activity, Popularity, Health, Solana)
* Automatic Solana project detection
* Risk and strength identification
* Available on Telegram, Discord, and REST API

[Learn More →](features/github-grading.md)

### 🧠 Temporal GNN Detection

10-18% better rug detection using Graph Neural Networks.

* Transaction graph analysis
* Coordinated cluster detection
* F1-Score: 0.958-0.966
* Star-shaped dump pattern detection

[Learn More →](features/temporal-gnn.md)

### 📅 Aged Wallet Detection

Detect fake volume and farming schemes.

* Tiered age detection (90 days - 2+ years)
* Coordinated buy pattern detection
* Funding source analysis
* No-sell behavior tracking

[Learn More →](features/aged-wallet-detection.md)

### 🔴 Pump.fun Live Integration

Auto-scan every new token launch.

* Real-time WebSocket connection
* Diamond → Red Flag grading
* Last 100 tokens stored
* Instant analysis

[Learn More →](features/pumpfun.md)

## 🤖 Bot Platforms

<table data-view="cards"><thead><tr><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td><strong>📱 Telegram Bot</strong></td><td>@RugKillerSolanaBot</td><td><a href="bots/telegram.md">telegram.md</a></td></tr><tr><td><strong>🎮 Discord Bot</strong></td><td>Slash commands &#x26; embeds</td><td><a href="bots/discord.md">discord.md</a></td></tr></tbody></table>

## 🔌 API Access

Full REST API for custom integrations.

{% content-ref url="api/token-endpoints.md" %}
[token-endpoints.md](api/token-endpoints.md)
{% endcontent-ref %}

{% content-ref url="api/github-endpoints.md" %}
[github-endpoints.md](api/github-endpoints.md)
{% endcontent-ref %}

## 🛡️ Detection Methods

* **Multi-Layer Analysis** - Liquidity, holders, contract, metadata
* **Temporal GNN** - Transaction graph neural networks
* **Aged Wallet Detection** - Fake volume identification
* **Smart Money Tracking** - Follow profitable wallets
* **CEX Wallet Filtering** - 40+ exchanges filtered
* **Real-Time Scanning** - Pump.fun auto-analysis

## 📚 Documentation

<table data-view="cards"><thead><tr><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td><strong>Getting Started</strong></td><td>Installation &#x26; setup</td><td><a href="getting-started/installation.md">installation.md</a></td></tr><tr><td><strong>API Reference</strong></td><td>Complete API docs</td><td><a href="api/token-endpoints.md">token-endpoints.md</a></td></tr><tr><td><strong>Advanced Detection</strong></td><td>Deep technical guides</td><td><a href="advanced/tgn.md">tgn.md</a></td></tr><tr><td><strong>Deployment</strong></td><td>Production setup</td><td><a href="deployment/railway.md">railway.md</a></td></tr></tbody></table>

## 🌐 Links

* **GitHub:** [github.com/drixindustries/Rug-Killer-On-Solana](https://github.com/drixindustries/Rug-Killer-On-Solana)
* **Telegram Bot:** [@RugKillerSolanaBot](https://t.me/RugKillerSolanaBot)
* **Discord:** [Join Server](https://discord.gg/rugkiller)
* **Website:** [rugkiller.app](https://rugkiller.app)

## 💬 Support

Need help? We're here!

* GitHub Issues: [Report Bug](https://github.com/drixindustries/Rug-Killer-On-Solana/issues)
* Discord Support: [#help channel](https://discord.gg/rugkiller)
* Documentation: You're reading it!

## 📊 Status

* **Version:** 2.0.0
* **Status:** ✅ Live in Production
* **API Status:** [status.rugkiller.app](https://status.rugkiller.app)
* **Last Updated:** November 30, 2025

---

{% hint style="info" %}
**Ready to get started?** Head over to [Installation](getting-started/installation.md) to set up your own instance or try our [Live Demo](https://rugkiller.app).
{% endhint %}
```

---

## GitBook Setup Instructions

### 1. Create GitBook Account

1. Go to https://www.gitbook.com
2. Sign up for free account
3. Create new space: "Rug Killer Documentation"

### 2. Import from GitHub

**Option A: GitHub Integration (Recommended)**
1. In GitBook, go to Settings → Integrations
2. Connect GitHub repository
3. Import `docs/` folder structure
4. Set up auto-sync for updates

**Option B: Manual Import**
1. Create folder structure matching SUMMARY.md
2. Copy content from this outline into each page
3. Add images to `.gitbook/assets/`
4. Publish space

### 3. Configure GitBook

**In Space Settings:**
- **Name:** Rug Killer on Solana - Documentation
- **Description:** Complete guide to Rug Killer platform
- **Logo:** Upload rugkiller-logo.png
- **Cover:** Upload rugkiller-cover.png
- **Theme:** Dark mode
- **Domain:** docs.rugkiller.app (custom domain)

**In Customization:**
- Primary color: #14F195 (Solana green)
- Enable search
- Enable table of contents
- Enable code highlighting

### 4. Publish

1. Review all pages
2. Check internal links
3. Test search functionality
4. Click "Publish" button
5. Get public URL (e.g., rugkiller.gitbook.io/docs)

### 5. Get Embed Link

GitBook provides:
- **Public URL:** `https://rugkiller.gitbook.io/docs`
- **Embeddable Widget:** Available in Share settings
- **Custom Domain:** Configure DNS for `docs.rugkiller.app`

---

## Next Steps

After creating GitBook:

1. **Add link to website** (see next todo item)
2. **Update README** with GitBook link
3. **Add to bot help commands**
4. **Share on social media**
5. **Monitor analytics**

---

**Preview URL Structure:**
```
https://rugkiller.gitbook.io/docs/
├── getting-started/installation
├── features/github-grading
├── bots/telegram
├── api/github-endpoints
└── deployment/railway
```

**Custom Domain (after setup):**
```
https://docs.rugkiller.app/
├── getting-started/installation
├── features/github-grading
├── bots/telegram
├── api/github-endpoints
└── deployment/railway
```

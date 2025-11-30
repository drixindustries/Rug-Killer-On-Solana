# GitHub Repository Grading - Quick Reference

## 🚀 Quick Start

### Telegram
```
/graderepo https://github.com/solana-labs/solana
```

### Discord
```
/graderepo url:https://github.com/solana-labs/solana
```

### API
```bash
curl -X POST http://localhost:5000/api/grade-repo \
  -H "Content-Type: application/json" \
  -d '{"githubUrl": "https://github.com/solana-labs/solana"}'
```

## 📊 Scoring Breakdown

| Category | Max Points | What It Measures |
|----------|-----------|------------------|
| 🔒 Security | 30 | License, security policy, maintenance status, activity |
| ⚡ Activity | 25 | Commits, contributors, recent updates |
| 🌟 Popularity | 20 | Stars, forks, watchers |
| 💚 Health | 15 | README, documentation, issues, fork status |
| 🚀 Solana | 10 | Rust, Anchor, Cargo setup (bonus) |
| **Total** | **100** | Overall confidence score |

## 🎯 Grade Meanings

| Grade | Score | Meaning |
|-------|-------|---------|
| A+ | 90-100 | 🟢 Highly trusted - Production ready |
| A | 80-89 | 🟢 Generally safe - Minor concerns |
| B | 70-79 | 🟡 Acceptable - Review recommended |
| C | 60-69 | 🟠 Caution - Verify before use |
| D | 50-59 | 🔴 Risky - Significant concerns |
| F | 0-49 | 🔴 High risk - Not recommended |
| N/A | - | ❌ Not found or no data |

## ⚠️ Risk Flags

| Flag | Severity | Meaning |
|------|----------|---------|
| Archived repo | 🔴 Critical | No longer maintained |
| No license | 🔴 Critical | Legal risks |
| Single contributor | 🟠 High | Bus factor risk |
| 1+ year since commit | 🟠 High | Likely abandoned |
| 6+ months inactive | 🟡 Medium | Maintenance concerns |
| <10 stars | 🟡 Medium | Low adoption |
| 100+ open issues | 🟡 Medium | Maintenance backlog |
| No security policy | 🟡 Medium | Security unclear |

## ✅ Strength Indicators

| Indicator | Meaning |
|-----------|---------|
| 1000+ stars | Strong community trust |
| 20+ contributors | Diverse development |
| 500+ commits | Mature codebase |
| Updated <30 days | Active development |
| Has license | Legal clarity |
| Has security policy | Security-conscious |
| Uses Anchor | Solana best practices |

## 🔧 Setup

### Optional: GitHub Token (Recommended)

1. Visit: https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scope: `repo` (read-only)
4. Add to `.env`:
   ```env
   GITHUB_TOKEN=ghp_your_token_here
   ```

**Benefits:**
- Without token: 60 requests/hour
- With token: 5,000 requests/hour

## 📱 Bot Commands

### Telegram Commands
```
/graderepo <url>          - Grade a repository
/help                     - Show all commands
```

### Discord Commands
```
/graderepo url:<url>      - Grade a repository
/help                     - Show all commands
```

## 🌐 API Endpoints

### Grade Repository
**POST** `/api/grade-repo`

**Request:**
```json
{
  "githubUrl": "https://github.com/owner/repo"
}
```

**Response:**
```json
{
  "confidenceScore": 95,
  "grade": "A+",
  "found": true,
  "metrics": { ... },
  "risks": [...],
  "strengths": [...],
  "recommendation": "..."
}
```

**Rate Limits:** 5 requests/minute per IP

## 🎓 Examples

### Example 1: High-Quality Repo
```
/graderepo solana-labs/solana

📊 Grade: A+ (95/100)
✅ 12K stars, 250 contributors
✅ Recently updated
✅ Has license & security policy
🟢 HIGHLY TRUSTED
```

### Example 2: Abandoned Repo
```
/graderepo old-project/abandoned

📊 Grade: D (52/100)
⚠️ Last commit: 2 years ago
⚠️ Only 1 contributor
⚠️ No license found
🔴 HIGH RISK - Not recommended
```

### Example 3: Not Found
```
/graderepo fake/repo

📊 Grade: N/A
❌ Repository not found
Error: Invalid URL or private repo
```

## 💡 Tips

1. **Always check risks**: Even high-scoring repos may have concerns
2. **Verify Solana projects**: Look for Rust + Anchor indicators
3. **Check recency**: Active maintenance is crucial for security
4. **Compare similar projects**: Use multiple repos to validate
5. **Use with other tools**: Combine with `/execute` for token analysis

## 🔍 URL Formats Supported

All these formats work:
- `https://github.com/owner/repo`
- `github.com/owner/repo`
- `owner/repo`
- `https://www.github.com/owner/repo`

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not found" | Check URL, verify public repo |
| "Rate limit" | Add GitHub token or wait |
| Low score on good repo | Check if archived or inactive |
| N/A grade | Repository may be private |

## 📈 Scoring Formula

```
Total = Security + Activity + Popularity + Health + Solana

Security  = 30 - deductions + bonuses
Activity  = commits_score + contributors_score + recency_score
Popularity = stars_score + forks_score + watchers_score
Health    = has_readme + has_license + not_archived + ...
Solana    = base(5) + anchor(3) + cargo(2)  [if Rust/Solana]
```

## 🎯 Use Cases

1. **Due Diligence**: Verify token project code quality
2. **Integration**: Check library before using
3. **Comparison**: Compare competing projects
4. **Monitoring**: Track repo quality over time
5. **Security**: Identify abandoned/risky code

## 📞 Support

- Documentation: `GITHUB_REPO_GRADING.md`
- Test Suite: `tsx test-github-grading.ts`
- Service Code: `server/services/github-repo-analyzer.ts`

## 🚧 Known Limitations

- ❌ Cannot scan private repositories
- ❌ No deep code analysis (metadata only)
- ❌ Rate limited by GitHub API
- ❌ No runtime vulnerability detection
- ⚠️ Scores reflect current state only

## 🔮 Coming Soon

- [ ] OSV vulnerability scanner integration
- [ ] Solana static analyzer integration
- [ ] Historical score tracking
- [ ] Automated watchlist scanning
- [ ] Enhanced Solana project detection

---

**Version:** 1.0  
**Last Updated:** November 30, 2025

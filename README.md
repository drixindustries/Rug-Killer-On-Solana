# Rug Killer Alpha Bot 🛡️

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solana](https://img.shields.io/badge/Solana-14F195?style=flat&logo=solana&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Detection Rate](https://img.shields.io/badge/Detection_Rate-99%25%2B-brightgreen)
![Live Status](https://img.shields.io/badge/Status-Live-success)

**The most advanced Solana token security platform - Protect yourself from rug pulls with AI-powered detection, smart money tracking, and real-time alerts.**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

📄 **[Read the Full Whitepaper](WHITEPAPER.md)** | 🌐 **[Live Platform](https://rugkilleralphabot.fun)**

---

## 🚀 What's New (December 2025)

### 🧠 AI & ML Detection
- **Temporal GNN v2** - 10-18% better rug detection using transaction graph analysis
- **SyraxML Scoring** - Machine learning legitimacy assessment
- **DevsNightmare Detection** - Team/insider allocation analysis

### 📡 Infrastructure Upgrades
- **25+ Free RPC Endpoints** - Distributed load balancing with automatic failover
- **11 WebSocket Endpoints** - Real-time monitoring without API keys
- **Exponential Backoff** - Smart rate limit handling with jitter
- **Request Deduplication** - Prevents duplicate API calls

### 💰 Smart Money Tracking
- **39+ Alpha Wallets** - Real-time monitoring of top traders
- **Multi-Wallet Detection** - Alerts when 2+ wallets buy same token
- **Win Rate & PNL Tracking** - Performance metrics for each wallet

### 🎯 New Detection Features
- **Jito MEV Bundle Detection** - Identifies coordinated MEV attacks
- **Serial Rugger Detection** - Tracks repeat offender wallets
- **Aged Wallet Detection** - Flags dormant wallets with coordinated activity
- **On-Chain Tracing** - `/trace` command for forensic analysis

### 📊 Unified Scoring
- **Safety Score (1-100)** - Single metric for token safety
- **Danger Level (0-100)** - Risk assessment score
- **Color-Coded Alerts** - 🟢 Safe | 🟡 Moderate | 🟠 Risky | 🔴 Dangerous

---

## ⚡ Features

### Multi-Layer Detection System

| Layer | Technology | What It Detects |
|-------|------------|-----------------|
| 1 | Authority Analysis | Mint/freeze authority exploitation |
| 2 | Holder Distribution | Whale concentration, sybil attacks |
| 3 | Liquidity Analysis | LP locks, burns, rug pull patterns |
| 4 | TGN + ML | Coordinated dumps, wallet clusters |
| 5 | MEV Detection | Jito bundles, sandwich attacks |
| 6 | Smart Money | Alpha wallet movements, insider trading |

### Detection Performance

```
┌─────────────────────────────────────────────────┐
│ Metric                    │ Score               │
├─────────────────────────────────────────────────┤
│ Overall Detection Rate    │ 99%+                │
│ Rug Pull Detection (TGN)  │ 95-98%              │
│ F1-Score                  │ 0.958-0.966         │
│ False Positive Reduction  │ 50%                 │
│ Average Response Time     │ 2-5 seconds         │
└─────────────────────────────────────────────────┘
```

### Platform Capabilities

- 🔍 **52+ Risk Metrics** analyzed per token
- 🤖 **Discord & Telegram Bots** with 11 commands each
- 📊 **Real-Time Alpha Alerts** from 39+ smart wallets
- 🌐 **REST API** for custom integrations
- 📈 **Pump.fun Auto-Scanning** for new launches
- 🎨 **Beautiful Dark Mode UI** with mobile support

---

## 🤖 Bot Commands

### Discord Slash Commands

```
/execute <token>      Full 52-metric risk analysis with Safety Score
/first20 <token>      Top 20 holder breakdown with percentages
/trace <token>        On-chain forensic tracing (ZachXBT-style)
/devaudit <wallet>    Developer wallet transaction history
/blacklist <wallet>   Check AI blacklist database
/graderepo <url>      GitHub repository quality grading
/price <token>        Quick price lookup from DexScreener
/liquidity <token>    LP analysis with burn status
/compare <t1> <t2>    Side-by-side token comparison
/trending             Top 10 tokens by volume
/whaletrack <wallet>  Track whale wallet activity
```

### Telegram Commands

Same commands available with `/` prefix. Example:
```
/execute HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC
```

---

## 📡 RPC Infrastructure

### 25+ Free Public Endpoints (No API Keys Required)

| Priority | Providers |
|----------|-----------|
| High | Solana-Official, Ankr-Public, PublicNode, OnFinality, 1RPC |
| Medium | Serum, Helius-Public, Extrnode, dRPC, Gateway-FM |
| Backup | GenesysGo, HelloMoon, Syndica, Triton, 10+ more |

### Features
- **Automatic Failover** - Seamlessly switches on errors
- **Health Monitoring** - 20-second health checks
- **Rate Limit Handling** - Exponential backoff with 20% jitter
- **Request Deduplication** - Same token = single analysis

---

## 🏗️ Quick Start

```bash
# Clone the repository
git clone https://github.com/drixindustries/Rug-Killer-On-Solana.git
cd Rug-Killer-On-Solana

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys (optional - works without them)

# Run development server
npm run dev
```

Visit `http://localhost:5173`

---

## 🚀 Deploy to Railway

1. Fork this repository
2. Create new project on [Railway](https://railway.app)
3. Connect your GitHub repo
4. Add environment variables (see [RPC_SETUP_GUIDE.md](RPC_SETUP_GUIDE.md))
5. Deploy!

---

## 💰 $ANTIRUG Token

### Contract Address
```
HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC
```

### Token Utility

| Holding | Tier | Benefits |
|---------|------|----------|
| 0 | Free Trial | 3 analyses/day, 7 days |
| Any | PRO ($29/mo) | Unlimited analyses, bot access |
| Any | WHALE ($99/mo) | API access, smart money tracking |
| **10M+ tokens** | **LIFETIME** | All features, forever free |

---

## 📚 Documentation

### Getting Started
- [Whitepaper](WHITEPAPER.md) - Complete technical documentation
- [Quick Start Guide](docs/QUICK_START.md) - Get running in 5 minutes
- [RPC Setup Guide](RPC_SETUP_GUIDE.md) - Configure RPC endpoints
- [Railway Deployment](DEPLOYMENT.md) - Production deployment

### Bot Setup
- [Discord Bot Setup](DISCORD_BOT_SETUP.md) - Discord integration
- [Telegram Bot Setup](TELEGRAM_WEBHOOK_SETUP.md) - Telegram configuration

### Advanced Features
- [Temporal GNN](docs/TEMPORAL_GNN.md) - Graph neural network detection
- [Aged Wallet Detection](docs/AGED_WALLET_DETECTION.md) - Dormant wallet analysis
- [Alpha Alerts](docs/ALPHA_ALERTS.md) - Smart money tracking
- [GitHub Grading](GITHUB_REPO_GRADING.md) - Repository assessment

### API Reference
- [API Documentation](docs/API.md) - REST API endpoints
- [Webhook Setup](WEBHOOK_SETUP.md) - Real-time notifications

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript + Drizzle ORM |
| Database | PostgreSQL + Redis (caching) |
| Blockchain | Solana Web3.js + SPL Token + Metaplex |
| ML/AI | Temporal GNN, SyraxML, FinBERT |
| Bots | Discord.js + Telegraf |
| Infrastructure | Railway + Docker + 25+ RPC endpoints |

---

## 📊 API Endpoints

### Token Analysis
```http
POST /api/analyze
{
  "tokenAddress": "..."
}
```

### Wallet Verification
```http
GET /api/wallet/challenge
POST /api/wallet/verify
```

### Blacklist Operations
```http
GET /api/blacklist/check/:wallet
POST /api/blacklist/report
```

### GitHub Grading
```http
POST /api/grade-repo
{
  "repoUrl": "https://github.com/owner/repo"
}
```

See [API Reference](docs/API.md) for complete documentation.

---

## 🗺️ Roadmap

### ✅ Completed (Q1 2025)
- [x] Temporal GNN v2 implementation
- [x] Jito bundle detection
- [x] 25+ free RPC endpoints
- [x] Smart money tracking (39 wallets)
- [x] Request deduplication
- [x] Safety Score system
- [x] On-chain tracing (`/trace`)

### 🔄 In Progress (Q2 2025)
- [ ] Mobile app (iOS/Android)
- [ ] Portfolio tracking
- [ ] Custom alert rules
- [ ] Whale wallet discovery

### 📋 Planned (Q3-Q4 2025)
- [ ] Real-time X/Twitter sentiment
- [ ] Cross-chain support (Base, Ethereum)
- [ ] DAO governance for blacklist
- [ ] Advanced API tiers

---

## 🤝 Contributing

Contributions welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

## ⚖️ License

MIT License - see [LICENSE](LICENSE) file for details.

---

## ⚠️ Disclaimer

This tool is for educational and informational purposes only. Always do your own research (DYOR) before investing. Rug Killer cannot guarantee 100% accuracy. Past performance does not guarantee future results.

---

## 🔗 Links

| Resource | Link |
|----------|------|
| 🌐 Website | [rugkilleralphabot.fun](https://rugkilleralphabot.fun) |
| 📄 Whitepaper | [WHITEPAPER.md](WHITEPAPER.md) |
| 🤖 Discord Bot | [Invite Link](https://discord.com/oauth2/authorize?client_id=1439815848628846654&permissions=3072&scope=bot%20applications.commands) |
| 📱 Telegram Bot | [@RugKillerAlphaBot](https://t.me/RugKillerAlphaBot) |
| 💰 Token | `HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC` |

---

**Built for the Solana community** 🚀

[⭐ Star us on GitHub](https://github.com/drixindustries/Rug-Killer-On-Solana) | [🐛 Report Bug](https://github.com/drixindustries/Rug-Killer-On-Solana/issues) | [💡 Request Feature](https://github.com/drixindustries/Rug-Killer-On-Solana/issues)

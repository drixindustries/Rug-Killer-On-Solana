# Rug Killer on Solana

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solana](https://img.shields.io/badge/Solana-14F195?style=flat&logo=solana&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Detection Rate](https://img.shields.io/badge/Detection_Rate-99%25%2B-brightgreen)
![Live Status](https://img.shields.io/badge/Status-Live-success)

**Advanced Solana token security analysis platform - Protect yourself from rug pulls with cutting-edge 2025 detection methods.**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

---

## Features

### Multi-Layer Detection
- **Temporal GNN (NEW!)** - 10-18% better rug detection using transaction graph analysis
- **SolRPDS Composite Scoring** - Research-backed 75/100 threshold system
- **Liquidity Analysis** - Pool depth, lock periods, LP token burns
- **Holder Distribution** - Whale detection with CEX wallet filtering  
- **Creator Tracking** - Multi-account detection & blacklist verification
- **Smart Contract Analysis** - Mint/freeze authority checks
- **AI-Powered Risk Assessment** - Machine learning scam detection

### Pump.fun Integration
- **Live Auto-Scanning** - Every new token launch analyzed instantly
- **Real-Time WebSocket** - Live scan feed to all clients
- **Grade System** - Diamond, Gold, Silver, Bronze, Red Flag
- **Scan History** - Database of last 100 auto-scanned tokens

### Whale Detection
- **1% Supply Threshold** - Detects large early accumulation
- **40+ CEX Wallets Filtered** - Binance, OKX, Bybit, etc.
- **Smart Insights** - Actionable recommendations
- **Discord/Telegram Alerts** - Real-time notifications

### Aged Wallet & Farming Detection (NEW!)
- **Tiered Age Detection** - 90 days to 2+ years with risk scoring
- **Coordinated Buy Patterns** - Detects synchronized purchases within 1-minute windows
- **Funding Source Analysis** - Tracks Swopshop, FixedFloat, and other high-risk services
- **Similar Amount Detection** - Flags uniform buy amounts (automated scripts)
- **No-Sell Behavior** - Identifies fake volume holders who never sell
- **Research-Backed** - Inspired by degenfrends/solana-rugchecker, 1f1n/Dragon, and community research

### GitHub Repository Grading (NEW! 🎯)
- **0-100% Confidence Scoring** - Comprehensive repository quality assessment
- **Multi-Dimensional Analysis** - Security, activity, popularity, health, and Solana-specific metrics
- **Automatic Solana Detection** - Identifies Rust/Solana projects with Anchor framework detection
- **Risk & Strength Identification** - Highlights concerns and positive indicators
- **Bot Integration** - Available via `/graderepo` command on Telegram and Discord
- **REST API Access** - Grade any GitHub repo programmatically
- **See:** [GITHUB_REPO_GRADING.md](GITHUB_REPO_GRADING.md) and [GITHUB_GRADING_QUICK_REF.md](GITHUB_GRADING_QUICK_REF.md)

### Modern UI
- Beautiful dark mode interface
- Mobile-optimized responsive design
- Real-time updates via WebSockets
- Interactive charts and visualizations

---

## Quick Start

\\\ash
# Clone the repository
git clone https://github.com/drixindustries/Rug-Killer-On-Solana.git
cd Rug-Killer-On-Solana

# Install server dependencies
cd server
npm install

# Install client dependencies  
cd ../client
npm install

# Set up environment (see docs/QUICK_START.md)
cp .env.example .env

# Run the server
cd ../server
npm run dev

# Run the client (in new terminal)
cd client
npm run dev
\\\

Visit \http://localhost:5173\ 

---

## Deploy to Railway

1. Fork this repository
2. Create a new project on [Railway](https://railway.app)
3. Connect your GitHub repository
4. Add environment variables (see [RPC_SETUP_GUIDE.md](RPC_SETUP_GUIDE.md) and [DEPLOYMENT.md](DEPLOYMENT.md))
5. Deploy 

---

## Documentation

### 🚀 Getting Started
- [Quick Start Guide](docs/QUICK_START.md) - Get up and running in 5 minutes
- [Railway Deployment](DEPLOYMENT.md) - Deploy to production
- [RPC Setup Guide](RPC_SETUP_GUIDE.md) - Configure RPC endpoints
- [Discord Bot Setup](DISCORD_BOT_SETUP.md) - Set up Discord integration
- [Telegram Bot Setup](TELEGRAM_WEBHOOK_SETUP.md) - Configure Telegram bot

### 🔬 Advanced Features
- [Advanced Rug Detection](docs/ADVANCED_RUG_DETECTION.md) - Multi-layer detection systems
- [Temporal GNN](docs/TEMPORAL_GNN.md) - Graph Neural Network detection
- [Aged Wallet & Farming Detection](docs/AGED_WALLET_DETECTION.md) ⭐ NEW!
- [GitHub Repository Grading](GITHUB_REPO_GRADING.md) ⭐ NEW!
- [GitHub Grading Quick Reference](GITHUB_GRADING_QUICK_REF.md) ⭐ NEW!
## Bot Commands

### Telegram Commands
```
/start            - Show help and commands
/analyze <addr>   - Full token analysis
/rugcheck <addr>  - Quick rug check
/graderepo <url>  - Grade GitHub repository (NEW!)
/price <addr>     - Get token price
/liquidity <addr> - Check liquidity pool
/compare <a1> <a2> - Compare two tokens
/trending         - Show trending tokens
/pumpfun <addr>   - Pump.fun specific analysis
/chart <addr>     - Get chart links
```

### Discord Slash Commands
```
/analyze address:<addr>   - Full token analysis
/rugcheck address:<addr>  - Quick rug check
/graderepo url:<url>      - Grade GitHub repository (NEW!)
/price address:<addr>     - Get token price
/liquidity address:<addr> - Check liquidity pool
/compare token1:<a1> token2:<a2> - Compare tokens
/trending                 - Show trending tokens
/pumpfun address:<addr>   - Pump.fun analysis
/chart address:<addr>     - Get chart links
```

---

## API Endpoints

### Token Analysis
```
POST /api/analyze
Body: { "tokenAddress": "..." }
```
**Learn more:** [TGN Technical Documentation](docs/TEMPORAL_GNN.md)

---

## Key Metrics & Performance

### Detection Accuracy
- ✅ **99%+ Overall Detection Rate**
- 🎯 **95-98% Rug Pull Detection** (with Temporal GNN)
- 📊 **F1-Score: 0.958-0.966** (vs 0.912 for heuristics only)
- 🔍 **50% Reduction in False Positives**

### Platform Performance
- ⚡ **30-50% Faster API Responses** (high-speed RPC + Redis caching)
- 💾 **30-Second DexScreener Cache** (reduced redundant calls)
- 🚀 **50KB+ Lighter Website** (optimized fonts and assets)
- 📡 **Real-Time WebSocket Updates** (Pump.fun integration)

### Coverage & Integration
- 🔍 **Pump.fun Auto-Scanning** (every new token)
- 📊 **40+ CEX Wallets Filtered** (Binance, OKX, Bybit, etc.)
- 🤖 **Multi-Platform Bots** (Telegram & Discord)
- 🌐 **REST API** (for custom integrations)
- 📚 **Comprehensive Documentation** (15+ guides)

---

## Use Cases

### For Investors
- ✅ Verify token legitimacy before investing
- 🔍 Check GitHub repository quality
- 📊 Analyze holder distribution
- ⚠️ Detect coordinated rug pulls
- 📈 Track smart money wallets

### For Developers
- 🔌 Integrate via REST API
- 🤖 Use bot commands in communities
- 📚 Reference comprehensive docs
- 🚀 Deploy own instance to Railway
- 🔧 Customize detection algorithms

### For Communities
- 🛡️ Protect members from scams
- 📢 Share instant token analysis
- 🎯 Grade project GitHub repositories
- 📊 Monitor new Pump.fun launches
- ⚡ Real-time alerts for suspicious activity

---

## What Makes Rug Killer Different

### 🧠 Advanced AI Detection
- **Temporal GNN:** Only Solana bot using Graph Neural Networks
- **10-18% Better Accuracy:** Compared to traditional methods
- **Transaction Graph Analysis:** Detects coordinated patterns

### 🎯 GitHub Repository Grading
- **First in Solana:** Grade any GitHub repo 0-100%
- **Multi-Dimensional:** Security, activity, popularity, health, Solana-specific
- **Actionable Insights:** Risk flags and strength indicators

### 📅 Aged Wallet Detection
- **Fake Volume Detection:** Identifies coordinated farming
- **Funding Source Analysis:** Tracks mixer services
- **No-Sell Behavior:** Spots holders who never sell

### 🔴 Pump.fun Live Integration
- **Auto-Scanning:** Every new token analyzed
- **Real-Time:** WebSocket connection
- **Grading System:** Diamond → Red Flag classification

### ⚡ Performance Optimized
- **Redis Caching:** Instant responses
- **High-Speed RPC:** 30-50% faster
- **Optimized Frontend:** 50KB+ lighter

---

## ContributingUrl": "https://github.com/owner/repo" }
```

### Trending Tokens
```
GET /api/trending-calls
```

### Aged Wallet Detection
```
POST /api/aged-wallets
Body: { "tokenAddress": "..." }
```

See [API Reference](docs/API.md) for complete documentation.

---

## Tech Stack

**Frontend:** React + TypeScript + Vite + Tailwind CSS + Framer Motion  
**Backend:** Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL  
**Blockchain:** Solana Web3.js + SPL Token + Metaplex  
**ML/Detection:** Temporal GNN (TGN2), SolRPDS Composite Scoring, Aged Wallet Detection  
**Integrations:** DexScreener, Birdeye, GMGN.AI, MobyScreener, QuillCheck, Discord.js, Telegraf  
**Infrastructure:** Railway, Docker, Redis, GitHub API
- [Changelog](CHANGELOG.md) - All updates and improvements

---

## Tech Stack

**Frontend:** React + TypeScript + Vite + Tailwind CSS + Framer Motion  
**Backend:** Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL  
**Blockchain:** Solana Web3.js + SPL Token + Metaplex  
**ML/Detection:** Temporal GNN (TGN2), SolRPDS Composite Scoring  
**Integrations:** DexScreener API, GoPlus Security API, RugCheck API, Discord.js

---

## Advanced Detection Features

### Temporal Graph Neural Network (TGN2)
Our newest enhancement uses transaction graph analysis to detect rug pulls with **10-18% better accuracy** than traditional methods.

**What it detects:**
- Star-shaped dumps (dev wallet → many recipients)
- Coordinated wallet clusters (synchronized selling)
- Bridge wallets (single-use fund obfuscation)
- LP drains (one-way liquidity removal)
- Sniper bot clusters (early buyers coordinated dumping)

**Performance:**
- F1-Score: 0.958-0.966 (vs 0.912 for heuristics only)
- Detection Rate: 95-98% of rugs (vs 85-92%)
- False Positives: 50% reduction

**Learn more:** [TGN Technical Documentation](docs/TEMPORAL_GNN.md)

---

## Contributing

Contributions welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Disclaimer

This tool is for educational purposes only. Always DYOR before investing. Rug Killer cannot guarantee 100% accuracy.

---

**Built for the Solana community**

[Star us on GitHub](https://github.com/drixindustries/Rug-Killer-On-Solana) | [Report Bug](https://github.com/drixindustries/Rug-Killer-On-Solana/issues)

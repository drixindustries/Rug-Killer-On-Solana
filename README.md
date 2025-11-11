# 🛡️ Solana Rug Killer

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solana](https://img.shields.io/badge/Solana-14F195?style=flat&logo=solana&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)

**Protect yourself from Solana rug pulls with real-time analysis and AI-powered scam detection.**

Solana Rug Killer is a comprehensive web application that analyzes Solana SPL tokens for potential rug pull risks. It provides real-time alerts for new PumpFun launches, smart money wallet activity, and automated scam detection powered by AI.

## 🌟 Features

### Core Analysis
- **52-Metric Rug Detection** - Comprehensive token analysis with risk scoring (0-100)
- **Multi-Source Intelligence** - Integrates Rugcheck, GoPlus Security, DexScreener, and Jupiter
- **Authority Checks** - Detects mint/freeze authority status and risks
- **Holder Analysis** - Tracks top 20 holders and concentration metrics
- **Liquidity Assessment** - Real-time liquidity pool status and health checks

### AI-Powered Blacklist System
- **6 Automated Detection Rules** - Identifies honeypots, high sell taxes, suspicious authorities, wash trading, coordinated pumps, and more
- **52+ Risk Metrics** - Comprehensive analysis of scam patterns
- **Severity Scoring** - Weighted risk assessment with evidence tracking
- **Automatic Flagging** - Real-time wallet blacklist updates

### Alpha Alerts (Premium)
- **Smart Money Tracking** - Monitor influential wallet activity from configurable watchlists
- **PumpFun WebSocket** - Real-time new token launch notifications
- **Quality Filtering** - Auto-filters by RugCheck score, honeypot status, and liquidity
- **Discord/Telegram Alerts** - Instant notifications to your channels

### Bot Integration
- **Telegram Bot** - Full command suite with instant token analysis
- **Discord Bot** - Rich embeds with color-coded risk levels
- **Available Commands**:
  - `/execute [token]` - Full 52-metric rug detection scan
  - `/first20 [token]` - Top 20 holder concentration analysis
  - `/devtorture [token]` - Developer wallet history tracking
  - `/blacklist [wallet]` - Check if wallet is flagged for scams

### Access Control
- **Whop Integration** - Subscription management with Individual, Group, and Lifetime tiers
- **Token-Gated Access** - Hold 10M+ $RUGK tokens for lifetime access
- **Crypto Payments** - Solana-only with 6 confirmations and audit trails
- **Subscription Codes** - Redeemable lifetime access codes with transaction safety

## 🚀 Official Token

**Solana Rug Killer ($RUGK)**
- **Contract Address**: `2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt`
- **Blockchain**: Solana
- **Deployment**: Launched via Pump.fun platform

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon recommended)
- Solana RPC endpoint (Helius, QuickNode, or Alchemy recommended)
- Whop account for subscription management
- Optional: Telegram Bot Token and Discord Bot Token

## ⚙️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/solana-rug-killer.git
cd solana-rug-killer
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Solana RPC
SOLANA_RPC_URL=https://your-rpc-endpoint.com

# Session Secret
SESSION_SECRET=your-random-secret-here

# Whop Integration
WHOP_API_KEY=your-whop-api-key
WHOP_APP_ID=your-whop-app-id
WHOP_COMPANY_ID=your-whop-company-id
WHOP_PLAN_ID_INDIVIDUAL=plan-id-for-individual
WHOP_PLAN_ID_GROUP=plan-id-for-group

# Stripe (Optional)
STRIPE_SECRET_KEY=your-stripe-secret-key
VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Discord Bot (Optional)
DISCORD_BOT_TOKEN=your-discord-bot-token

# Admin Access
ADMIN_EMAILS=admin@example.com,admin2@example.com

# Creator Wallet (Admin Only)
CREATOR_WALLET_PRIVATE_KEY=your-wallet-private-key
```

4. **Set up the database**
```bash
npm run db:push
```

5. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 🔧 Configuration

### Solana RPC Providers
For best performance, use a premium RPC provider:
- [Helius](https://helius.dev) - Recommended for production
- [QuickNode](https://quicknode.com) - Enterprise-grade infrastructure
- [Alchemy](https://alchemy.com) - Free tier available

### Bot Setup
See [BOT_SETUP_GUIDE.md](./BOT_SETUP_GUIDE.md) for detailed instructions on setting up Telegram and Discord bots.

## 📚 Documentation

- [Bot Setup Guide](./BOT_SETUP_GUIDE.md) - Complete guide for Telegram and Discord bot configuration
- [API Documentation](./docs/API.md) - REST API endpoints and usage
- [Contributing Guidelines](./CONTRIBUTING.md) - How to contribute to the project

## 🏗️ Tech Stack

**Frontend:**
- React + TypeScript
- Vite for build tooling
- Wouter for routing
- TanStack Query for data fetching
- Shadcn UI + Tailwind CSS for styling
- Recharts for data visualization

**Backend:**
- Express.js with TypeScript
- PostgreSQL with Drizzle ORM
- Solana Web3.js
- Passport.js for authentication
- BullMQ for job queues

**Integrations:**
- Replit Auth for user authentication
- Whop for subscription management
- Stripe for payment processing
- Rugcheck.xyz for risk scores
- GoPlus Security for scam detection
- DexScreener for market data
- Jupiter for price verification

## 🛣️ Roadmap

- [ ] Mobile app (iOS/Android)
- [ ] Advanced charting with TradingView
- [ ] Portfolio tracking and alerts
- [ ] Multi-chain support (Ethereum, BSC, Base)
- [ ] NFT collection analysis
- [ ] Social sentiment analysis integration
- [ ] Machine learning models for pattern detection

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and informational purposes only. It does not constitute financial advice. Always do your own research before investing in any cryptocurrency. The developers are not responsible for any financial losses incurred from using this software.

## 🔗 Links

- **Website**: [https://yourwebsite.com](https://yourwebsite.com)
- **Token Contract**: `2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt`
- **Telegram**: [Join our community](https://t.me/yourgroup)
- **Discord**: [Join our server](https://discord.gg/yourinvite)
- **Twitter**: [@YourHandle](https://twitter.com/yourhandle)

## 💬 Support

For support, please:
- Open an issue on GitHub
- Join our [Discord server](https://discord.gg/yourinvite)
- Email us at support@yourwebsite.com

## 🙏 Acknowledgments

- Solana Foundation for the amazing blockchain platform
- Rugcheck.xyz for pioneering token risk analysis
- The open-source community for incredible tools and libraries

---

Made with ❤️ for the Solana community

#  Rug Killer Alpha Bot

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solana](https://img.shields.io/badge/Solana-14F195?style=flat&logo=solana&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)

**Protect yourself from Solana rug pulls with real-time analysis and Phantom wallet authentication.**

Rug Killer Alpha Bot is a comprehensive web application that analyzes Solana SPL tokens for potential rug pull risks. It provides real-time alerts for new PumpFun launches, smart money wallet activity, and automated scam detection powered by AI.

##  Features

### Core Analysis
- **52-Metric Rug Detection** - Comprehensive token analysis with risk scoring (0-100)
- **Multi-Source Intelligence** - Integrates Rugcheck, GoPlus Security, DexScreener, and Jupiter
- **Authority Checks** - Detects mint/freeze authority status and risks
- **Holder Analysis** - Tracks top 20 holders and concentration metrics
- **Liquidity Assessment** - Real-time liquidity pool status and health checks
- **Enhanced Pump.fun Support** - Multi-source detection with retry logic and improved PDA calculation

### Phantom Wallet Authentication
- **Wallet-Based Login** - Sign in with your Phantom wallet using signature verification
- **Session Management** - Persistent login sessions tracked by wallet address
- **Statistics Tracking** - All watchlists, portfolios, and alerts linked to your wallet
- **Secure Challenge-Response** - Anti-replay protection with time-limited challenges
- **No OAuth Required** - Simple one-click authentication with your Solana wallet

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
- **11 Available Commands**:
  - \/execute [token]\ - Full 52-metric rug detection scan
  - \/first20 [token]\ - Top 20 holder concentration analysis
  - \/devtorture [token]\ - Developer wallet history tracking
  - \/blacklist [wallet]\ - Check if wallet is flagged for scams
  - \/whaletrack [token]\ - Track smart money wallets in a token
  - \/kol [wallet]\ - Check if a wallet is a known KOL
  - \/price [token]\ - Quick price lookup with 24h change
  - \/rugcheck [token]\ - Instant rug detection with danger flags
  - \/liquidity [token]\ - Detailed liquidity pool analysis
  - \/compare [token1] [token2]\ - Side-by-side token comparison
  - \/trending\ - Top 10 Solana tokens by 24h volume

### Access Control
- **Whop Integration** - Subscription management with Individual, Group, and Lifetime tiers
- **Token-Gated Access** - Hold 10M+ \ tokens for lifetime access
- **Crypto Payments** - Solana-only with 6 confirmations and audit trails
- **Subscription Codes** - Redeemable lifetime access codes with transaction safety

##  Official Token

**Rug Killer Alpha Bot (\)**
- **Contract Address**: \2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt\
- **Blockchain**: Solana
- **Deployment**: Launched via Pump.fun platform

##  Prerequisites

- Node.js 24+ and npm
- PostgreSQL database
- Solana RPC endpoint (Helius, QuickNode, or Alchemy recommended)
- Whop account for subscription management (optional)
- Telegram Bot Token (optional)
- Discord Bot Token (optional)

##  Installation & Deployment

### Local Development

1. **Clone the repository**
\\\ash
git clone https://github.com/drixindustries/Rug-Killer-On-Solana.git
cd Rug-Killer-On-Solana
\\\

2. **Install dependencies**
\\\ash
npm install
\\\

3. **Set up environment variables**

Create a \.env\ file in the root directory with the following variables:

\\\env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Solana RPC (Multi-provider balancing)
SOLANA_RPC_URL=https://your-primary-rpc-endpoint.com
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your-key
ALCHEMY_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/your-key

# Base URL (for share links)
BASE_URL=http://localhost:5000

# Session Secret (for wallet authentication)
SESSION_SECRET=your-random-secret-here

# Official Token Mint Address (for token gating)
OFFICIAL_TOKEN_MINT_ADDRESS=2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt

# Whop Integration (Optional)
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
DISCORD_CLIENT_ID=your-discord-client-id

# Admin Access
ADMIN_EMAILS=admin@example.com,admin2@example.com

# Alpha Alerts (Optional)
ALPHA_ALERTS_ENABLED=true

# Creator Wallet (Admin Only)
CREATOR_WALLET_PRIVATE_KEY=your-wallet-private-key
\\\

4. **Set up the database**
\\\ash
npm run db:push
\\\

5. **Start the development server**
\\\ash
npm run dev
\\\

The application will be available at \http://localhost:5000\

### Production Deployment (Railway)

For production deployment on Railway, see [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed step-by-step instructions including:
- PostgreSQL database setup
- Environment variable configuration
- Custom domain setup with automatic SSL
- Database migration commands
- Troubleshooting common issues

##  Configuration

### Solana RPC Providers
The application uses an intelligent RPC balancer that automatically switches between providers for optimal performance:
- [Helius](https://helius.dev) - Recommended for production (premium features)
- [Alchemy](https://alchemy.com) - Enterprise-grade reliability
- [QuickNode](https://quicknode.com) - High-performance infrastructure
- Public RPC - Fallback for basic queries

### Bot Setup
See [BOT_SETUP_GUIDE.md](./BOT_SETUP_GUIDE.md) for detailed instructions on setting up Telegram and Discord bots.

##  Wallet Authentication Flow

1. User clicks "Sign In" button
2. Phantom wallet extension opens automatically
3. Server generates a unique challenge message
4. User signs the challenge with their private key
5. Server verifies the signature using nacl cryptography
6. Session created with wallet address as user ID
7. All statistics and data tracked to wallet address

**Security Features:**
- Challenge expires in 5 minutes
- One-time use challenges prevent replay attacks
- Signatures verified using ed25519 curve
- Sessions persist for 7 days
- No private keys ever transmitted

##  Documentation

- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md) - Production deployment on Railway
- [Bot Setup Guide](./BOT_SETUP_GUIDE.md) - Complete guide for Telegram and Discord bot configuration
- [API Documentation](./docs/API.md) - REST API endpoints and usage
- [Contributing Guidelines](./CONTRIBUTING.md) - How to contribute to the project
- [Security Policy](./SECURITY.md) - Security guidelines and vulnerability reporting

##  Legal

- **Terms of Service**: https://rugkilleralphabot.fun/terms
- **Privacy Policy**: https://rugkilleralphabot.fun/privacy

These legal documents are available in-app at \/terms\ and \/privacy\ routes for user and bot reference.

##  Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite 5.4.21 for build tooling
- Wouter for routing
- TanStack Query for data fetching
- Shadcn UI + Tailwind CSS for styling
- Recharts for data visualization
- Phantom Wallet SDK for authentication

**Backend:**
- Express.js with TypeScript
- PostgreSQL with Drizzle ORM
- Solana Web3.js + SPL Token libraries
- Express-session for session management
- TweetNaCl + BS58 for signature verification
- BullMQ for job queues

**Token Program Support:**
- SPL Token (classic)
- Token-2022 (with extensions)
- Smart program detection via account owner verification
- Multi-source mint detection (Pump.fun API + RugCheck)

**Integrations:**
- Whop for subscription management
- Stripe for payment processing
- Rugcheck.xyz for risk scores
- GoPlus Security for scam detection
- DexScreener for market data
- Jupiter for price verification
- Pump.fun API for token detection

**Deployment:**
- Railway for production hosting
- Automatic SSL with custom domains
- PostgreSQL database on Railway
- Node.js 24.11.0 runtime

##  Roadmap

- [x] Phantom wallet authentication
- [x] Pump.fun token detection improvements
- [x] Enhanced error handling for Token-2022
- [x] Multi-source RPC balancing
- [x] Session-based user tracking
- [ ] Mobile app (iOS/Android)
- [ ] Advanced charting with TradingView
- [ ] Portfolio tracking and alerts
- [ ] Multi-chain support (Ethereum, BSC, Base)
- [ ] NFT collection analysis
- [ ] Social sentiment analysis integration
- [ ] Machine learning models for pattern detection

##  Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (\git checkout -b feature/AmazingFeature\)
3. Commit your changes (\git commit -m 'Add some AmazingFeature'\)
4. Push to the branch (\git push origin feature/AmazingFeature\)
5. Open a Pull Request

##  License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

##  Disclaimer

This tool is for educational and informational purposes only. It does not constitute financial advice. Always do your own research before investing in any cryptocurrency. The developers are not responsible for any financial losses incurred from using this software.

##  Links

- **Website**: [https://rugkilleralphabot.fun](https://rugkilleralphabot.fun)
- **Token Contract**: \2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt\
- **GitHub**: [https://github.com/drixindustries/Rug-Killer-On-Solana](https://github.com/drixindustries/Rug-Killer-On-Solana)
- **Telegram**: [Join our community](https://t.me/yourgroup)
- **Discord**: [Join our server](https://discord.gg/yourinvite)
- **Twitter**: [@YourHandle](https://twitter.com/yourhandle)

##  Support

For support, please:
- Open an issue on GitHub
- Join our [Discord server](https://discord.gg/yourinvite)
- Email us at support@rugkilleralphabot.fun

##  Acknowledgments

- Solana Foundation for the amazing blockchain platform
- Phantom Wallet team for excellent wallet infrastructure
- Rugcheck.xyz for pioneering token risk analysis
- The open-source community for incredible tools and libraries
- Pump.fun for revolutionizing token launches on Solana

##  Recent Updates

### November 2025
-  **Wallet Authentication** - Added Phantom wallet login with signature verification
-  **Enhanced Pump.fun Support** - Multi-source detection, retry logic, improved PDA calculation
-  **Token Program Detection** - Smart detection for SPL Token vs Token-2022
-  **Session Management** - Persistent login sessions tracked by wallet address
-  **Branding Update** - Rebranded to "Rug Killer Alpha Bot" across all platforms
-  **Mascot Integration** - Added floating mascot with CSS animations
-  **Bot Commands** - Added \/price\, \/rugcheck\, \/liquidity\, \/compare\, \/trending\
-  **Error Handling** - Improved getMint error handling for Token-2022

---

Made with  for the Solana community

**Last Updated**: November 15, 2025

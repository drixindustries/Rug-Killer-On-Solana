# Solana Rug Killer - Token Risk Analysis Platform

## Overview

Solana Rug Killer is a comprehensive web application designed to protect Solana traders from rug pulls and scams. It provides real-time token analysis using 52+ risk metrics, integrating data from multiple sources including Rugcheck, GoPlus Security, DexScreener, Jupiter, and Birdeye. The platform features AI-powered blacklist detection, Telegram and Discord bots for instant analysis, and premium features like smart money tracking and PumpFun launch alerts.

The application uses an inverted risk scoring system (0=dangerous, 100=safe) with color-coded risk levels: GREEN (70-100), YELLOW (40-70), ORANGE (20-40), RED (0-20). It includes subscription-based access control via Whop integration and token-gated access for holders of 10M+ $ANTIRUG tokens (contract: `2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt`).

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**November 13, 2025:**
- Implemented Telegram bot command autocomplete menu using setMyCommands() API (5 commands: start, execute, first20, devtorture, blacklist)
- **Telegram bot is currently ungated** - all features are publicly accessible with no subscription/token requirements
- Comprehensive codebase cleanup for GitHub deployment:
  - Removed all TODO/FIXME comments
  - Removed excessive console.log statements (retained only critical startup and error messages)
  - Removed commented-out code blocks
  - Cleaned up development comments and references
  - Streamlined logging for clean production logs
- Added quick links in bot responses for cross-platform analysis:
  - AXiom trading platform (axiom.trade - Y Combinator-backed Solana DEX)
  - Padre bot (corrected username to @padre_tg_bot)
  - Birdeye analytics platform
  - GMGN, Solscan, DexScreener, and Rugcheck
- Improved API error handling:
  - Birdeye API calls skip gracefully when API key is not configured
  - Jupiter API failures handled silently without error spam
  - Better validation for invalid Solana addresses
  - Analysis continues to work with core RPC data even when optional APIs fail
- Codebase is production-ready and GitHub-ready

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type safety
- Vite for fast development and optimized production builds
- TanStack Query (React Query) for server state management
- Wouter for client-side routing
- Tailwind CSS with shadcn/ui component library
- Recharts for data visualization

**Design Patterns:**
- Component-based architecture with reusable UI components from shadcn/ui
- Custom hooks for authentication (`useAuth`) and API interactions
- Dark theme with warm cyberpunk aesthetic (near-black backgrounds with warm orange accents)
- Responsive design with mobile-first approach

**Key Frontend Features:**
- Token analysis dashboard with real-time risk scoring
- Portfolio tracking and watchlist management
- Price alerts and notification system
- Social features (comments, votes, leaderboard)
- Analytics dashboard with historical tracking

### Backend Architecture

**Technology Stack:**
- Node.js with Express.js REST API
- TypeScript for type-safe server code
- Drizzle ORM for database interactions
- Passport.js with OpenID Connect for Replit Auth
- WebSocket support for real-time updates (Telegram/Discord bots)

**Design Patterns:**
- Service-oriented architecture with dedicated services for each external API
- RPC balancer for load distribution across multiple Solana RPC providers (Helius, Alchemy, Ankr, Serum, Public)
- Worker pattern for background jobs (analytics, alerts, social aggregation)
- Caching layer with TTL-based price cache (20-second default)
- Middleware-based authentication and access control

**Core Services:**
- `SolanaTokenAnalyzer`: Main analysis engine coordinating all data sources
- `RugcheckService`: Rugcheck API integration
- `GoPlusSecurityService`: GoPlus security data
- `DexScreenerService`: Market data and liquidity info
- `JupiterPriceService`: Price data from Jupiter aggregator
- `BirdeyeAPI`: Enhanced market data with LP burn status
- `PumpFunAPI`: Pump.fun token detection and bonding curve tracking
- `LPChecker`: Liquidity pool burn verification
- `RpcBalancer`: Intelligent RPC provider selection with fallback

**Risk Analysis Engine:**
- 52-metric comprehensive analysis including:
  - Mint/freeze authority checks
  - Top holder concentration (excludes known exchanges, protocols, bundlers)
  - Bundle detection for coordinated wallet activity
  - Liquidity pool status and burn verification
  - Market cap and volume analysis
  - Social sentiment from Rugcheck and GoPlus
- AI-powered verdict system with natural language recommendations
- Automatic blacklist flagging based on 6 detection rules

### Data Storage Solutions

**Database:** PostgreSQL via Neon (serverless)

**Schema Design:**
- `users`: User accounts and profiles
- `subscriptions`: Subscription tiers and status (Whop integration)
- `subscription_codes`: Lifetime access codes with redemption tracking
- `wallet_connections`: Solana wallet addresses for token-gated access
- `watchlist_entries`: User token watchlists
- `portfolio_positions`: Trading portfolio tracking
- `price_alerts`: User-configured price alerts
- `token_snapshots`: Historical token data for trend analysis
- `trending_tokens`: Hot tokens feed with auto-refresh
- `risk_statistics`: Aggregate rug pull metrics
- `bad_actor_labels`: AI blacklist system
- `kol_wallets`: KOL (Key Opinion Leader) wallet tracking for smart money alerts
- `user_profiles`: Social features (reputation, bio)
- `token_comments`: Community discussion
- `community_votes`: Token safety voting
- `shared_watchlists`: Public watchlist sharing

**Session Management:**
- PostgreSQL-backed session store via connect-pg-simple
- 7-day session TTL with automatic renewal
- Secure cookies (httpOnly, secure flags)

### Authentication and Authorization

**Authentication:**
- Replit Auth via OpenID Connect (Passport.js strategy)
- Session-based authentication with encrypted cookies
- Token refresh handling for expired sessions

**Authorization Tiers:**
- **Public**: Landing pages, documentation
- **Free**: Basic token analysis (rate-limited)
- **Individual ($20)**: Full analysis, bot access, limited alerts
- **Group ($100)**: Team features, unlimited alerts
- **Lifetime**: Token-gated (10M+ $ANTIRUG) or redeemable codes

**Access Control:**
- `hasActiveAccess` middleware gates premium endpoints
- Checks both Whop subscription status AND token holdings
- Admin bypass via `ADMIN_EMAILS` environment variable
- Subscription verification includes expiration and payment status

### External Dependencies

**Solana Blockchain:**
- `@solana/web3.js`: Blockchain interaction (v1.98.4)
- `@solana/spl-token`: Token program operations
- Multiple RPC providers with automatic failover:
  - Helius (primary, requires `HELIUS_KEY`)
  - Alchemy (secondary, requires `ALCHEMY_KEY`)
  - Ankr (backup)
  - Serum (backup)
  - Public Solana RPC (fallback)

**Third-Party APIs:**
- **Rugcheck** (`https://api.rugcheck.xyz/v1`): Token safety reports (optional `RUGCHECK_API_KEY`)
- **GoPlus Security** (`https://api.gopluslabs.io/api/v1`): Security analysis
- **DexScreener** (`https://api.dexscreener.com`): Market data and liquidity
- **Jupiter** (`https://api.jup.ag/price/v2`): Price aggregation
- **Birdeye** (`https://public-api.birdeye.so`): Enhanced market data (optional `BIRDEYE_API_KEY`)
- **Pump.fun** (`https://pump.fun/api`): Token launch detection

**Payment & Subscription:**
- **Whop SDK**: Subscription management (requires `WHOP_API_KEY`, `WHOP_APP_ID`, `WHOP_COMPANY_ID`)
- Solana crypto payments (requires `PHANTOM_WALLET_ADDRESS` for receiving)

**Bot Platforms:**
- **Telegram** via `telegraf`: Bot commands and alerts (requires `TELEGRAM_BOT_TOKEN`)
- **Discord** via `discord.js`: Slash commands and rich embeds (requires `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`)

**Development Tools:**
- **Playwright**: E2E testing
- **Jest**: Unit and integration testing
- **Supertest**: API integration testing
- **Nock**: HTTP mocking for tests
- **TypeScript**: Type safety across stack
- **ESBuild**: Production bundling
- **Drizzle Kit**: Database migrations

**Infrastructure:**
- **Replit**: Hosting and deployment
- **Neon**: Serverless PostgreSQL database (requires `DATABASE_URL`)
- **WebSocket**: Real-time bot communication
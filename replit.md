# Solana Rug Killer

## Overview

Solana Rug Killer is a comprehensive token analysis platform that helps traders identify potential rug pulls and scams on the Solana blockchain. The application provides real-time risk scoring, holder analysis, liquidity assessment, and AI-powered scam detection to protect users from fraudulent tokens.

The platform combines data from multiple sources (Rugcheck, GoPlus Security, DexScreener, Jupiter, Birdeye) with proprietary analysis algorithms to generate a comprehensive risk score (0-100 scale, where 0 is most dangerous and 100 is safest). It includes premium features like Telegram/Discord bots for instant analysis, alpha alerts for new token launches, and social features like watchlists and community voting.

**Official Token:** $RUGK (Contract: `2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt`)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework:** React 18 with TypeScript, built using Vite
- **UI Components:** Radix UI primitives with shadcn/ui component library
- **Styling:** Tailwind CSS with custom dark cyberpunk theme (warm orange primary colors on near-black backgrounds)
- **State Management:** TanStack Query (React Query) for server state caching and synchronization
- **Routing:** Wouter for lightweight client-side routing
- **Charts:** Recharts for data visualization (price history, holder distribution, risk statistics)

**Key Design Decisions:**
- Single-page application with declarative routing for fast navigation
- Component-driven architecture with atomic design principles
- Real-time data updates via polling (no WebSocket connections from client)
- Mobile-responsive design with accessibility considerations (ARIA labels, keyboard navigation)

### Backend Architecture

- **Runtime:** Node.js with TypeScript (ESM modules)
- **Framework:** Express.js for HTTP server and API routes
- **API Design:** RESTful endpoints with Zod schema validation
- **Background Workers:** Periodic jobs for analytics collection, alert monitoring, and social aggregation
- **Rate Limiting:** RPC balancer with weighted failover across multiple Solana RPC providers
- **Caching:** In-memory price cache with configurable TTL (20 seconds default) to reduce API calls

**Key Design Decisions:**
- Express chosen for simplicity and middleware ecosystem
- Modular service architecture (separate services for each external API)
- Worker pattern for background tasks (analytics, alerts, social features) - designed for BullMQ but using setInterval for simplicity
- RPC balancing to prevent rate limits and improve reliability (Helius, Alchemy, Ankr, Serum, Public RPC)

### Token Analysis Engine

The core analysis system evaluates 52+ risk metrics and produces a 0-100 risk score:

1. **Authority Checks:** Mint authority, freeze authority (revoked = safer)
2. **Holder Analysis:** Top 20 concentration, bundle detection, whale identification
3. **Liquidity Assessment:** LP burn status, liquidity depth, market cap validation
4. **External API Integration:** Rugcheck risk scores, GoPlus security flags, DexScreener market data
5. **Pump.fun Detection:** Direct API integration to detect launch platform and bonding curve progress
6. **AI Verdict System:** Natural language recommendations based on aggregated risk factors

**Risk Score Formula:** Inverted scale where 0 = extreme danger, 100 = safest. Combines weighted factors from all sources.

**Rationale:** Multi-source validation reduces false positives and provides comprehensive coverage of known scam patterns.

### Bot Integration

**Telegram Bot:**
- Built with Telegraf framework
- Commands: `/execute`, `/first20`, `/devtorture`, `/blacklist`
- Rich formatted messages with emoji sections and color-coded risk levels
- Deployed as singleton instance (started only when credentials are configured)

**Discord Bot:**
- Built with discord.js (v14+)
- Slash commands with rich embeds
- Color-coded by risk level (green/yellow/orange/red)
- Auto-registered commands via REST API

**Shared Logic:** Both bots use the same `SolanaTokenAnalyzer` service to ensure consistent results.

### Access Control

**Authentication:** Replit Auth (OpenID Connect) with session-based authentication
- Session storage: PostgreSQL with connect-pg-simple
- Session TTL: 7 days
- Secure cookies with httpOnly and secure flags

**Authorization Tiers:**
1. **Free:** Limited to basic features (currently disabled for testing)
2. **Individual ($20/month):** Full analysis, bot access, alerts
3. **Group ($100/month):** Multi-user access for teams
4. **Lifetime:** Token holders with 10M+ $RUGK OR redeemed subscription codes

**Access Methods:**
- Whop integration for paid subscriptions
- Crypto payments (Solana-only, 6 confirmations required)
- Token-gated access via wallet connection (checks $RUGK balance)
- Redeemable subscription codes with transaction safety

**Rationale:** Multiple access methods provide flexibility while the token-gating creates utility for $RUGK holders.

### Social Features

- **Community Voting:** Users vote tokens as "safe", "risky", or "scam" with weighted reputation system
- **Reputation Score:** Calculated from comment votes, report accuracy, and account age
- **Watchlists:** Private and shareable watchlists with real-time updates
- **Leaderboard:** Top analysts ranked by reputation and activity
- **Token Comments:** Threaded discussions with upvote/downvote system
- **Reporting:** User-submitted reports for moderation review

**Rationale:** Crowdsourced intelligence complements automated analysis and builds community engagement.

### Analytics System

**Token Snapshots:** Historical tracking of risk scores, prices, and holder counts (collected every 5 minutes)

**Trending Tokens:** Real-time feed of high-volume tokens with auto-refresh (30s intervals)

**Risk Statistics:** Aggregated metrics over 7-day and 30-day periods:
- Total rugs detected
- Common red flags (pie chart visualization)
- Detection accuracy rates
- False positive analysis

**Performance Metrics:** Success rates, coverage, and system health KPIs

**Rationale:** Historical data enables trend analysis and improves detection algorithms over time.

## External Dependencies

### Blockchain & RPC Services

**Solana RPC Providers:**
- Helius (primary, 40% weight) - requires `HELIUS_KEY`
- Alchemy (35% weight) - requires `ALCHEMY_KEY`
- Ankr (15% weight)
- Serum (10% weight)
- Public RPC (5% weight, fallback)

**Connection Libraries:**
- `@solana/web3.js` - Solana blockchain interaction
- `@solana/spl-token` - Token program utilities

### Token Analysis APIs

**Rugcheck API:**
- Endpoint: `https://api.rugcheck.xyz/v1`
- Optional API key: `RUGCHECK_API_KEY`
- Provides: Risk scores, authority status, holder concentration

**GoPlus Security API:**
- Endpoint: `https://api.gopluslabs.io/api/v1`
- No authentication required
- Provides: Honeypot detection, high sell tax, trading pause status

**DexScreener API:**
- Endpoint: `https://api.dexscreener.com`
- No authentication required
- Provides: Real-time prices, liquidity, volume, pair data

**Jupiter Price API:**
- Endpoint: `https://api.jup.ag/price/v2`
- No authentication required
- Provides: Token prices and market data

**Birdeye API (Optional):**
- Endpoint: `https://public-api.birdeye.so`
- Optional API key: `BIRDEYE_API_KEY`
- Provides: Enhanced market data, LP burn status, holder analysis
- Graceful degradation if not configured

**Pump.fun API:**
- Endpoint: `https://pump.fun/api`
- No authentication required
- Provides: Launch platform detection, dev bought percentage, bonding curve progress

### Database

**PostgreSQL (Neon):**
- Connection: `@neondatabase/serverless` with WebSocket support
- ORM: Drizzle ORM with schema validation
- Tables: 20+ tables including users, subscriptions, watchlists, portfolios, analytics, social features
- Migrations: Drizzle Kit for schema management

**Rationale:** Serverless Postgres chosen for Replit compatibility and automatic scaling.

### Subscription & Payments

**Whop:**
- SDK: `@whop/sdk`
- Purpose: Subscription management for Individual and Group tiers
- Environment variables: `WHOP_API_KEY`, `WHOP_APP_ID`, `WHOP_COMPANY_ID`, plan IDs
- Webhook integration for subscription status updates

**Crypto Payments (Solana-only):**
- Payment addresses generated per-user with expiry (1 hour)
- 6 confirmations required before activation
- Audit trail stored in `payment_audit` table
- Requires: `PHANTOM_WALLET_ADDRESS` environment variable

**Rationale:** Whop provides fiat payment infrastructure while crypto payments align with Web3 audience.

### Bot Platforms

**Telegram:**
- Library: `telegraf`
- Bot token: `TELEGRAM_BOT_TOKEN`
- Application ID: `8506172883`
- Username: `@RugKillerAlphaBot`

**Discord:**
- Library: `discord.js` (v14+)
- Bot token: `DISCORD_BOT_TOKEN`
- Client ID: `1437952073319714879`
- Public key: `DISCORD_PUBLIC_KEY`
- Slash commands auto-registered

**Rationale:** Both platforms popular in crypto trading communities for instant alerts and analysis.

### Testing & Quality

**End-to-End Tests:**
- Playwright for browser automation
- Test runners: Chromium, Firefox, WebKit
- Coverage: Token analysis flows, subscription checkout, bot interactions

**Integration Tests:**
- Supertest for API testing
- Nock for HTTP mocking
- Coverage: All API endpoints with success/error cases

**Unit Tests:**
- Jest with ts-jest
- Mock utilities in `tests/utils/solana-mocks.ts`
- Fixtures in `tests/fixtures/solana/token-fixtures.ts`

**Rationale:** Multi-layer testing ensures reliability given the financial nature of token analysis.

### Development Tools

- **TypeScript:** Type safety across entire codebase
- **Vite:** Fast development server with HMR
- **ESBuild:** Production bundling for server code
- **Drizzle Kit:** Database migrations and schema management
- **Replit Plugins:** Dev banner, cartographer, runtime error overlay
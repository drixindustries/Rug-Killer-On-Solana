# Solana Rug Detector

## Overview
The Solana Rug Detector is a comprehensive web application designed to analyze Solana SPL tokens for potential rug pull risks. It provides real-time analysis by checking for common indicators such as mint/freeze authority, holder concentration, liquidity pool status, and suspicious transaction patterns. The project's ambition is to offer a robust tool for investors to identify and mitigate risks in the Solana ecosystem, leveraging advanced analytics and AI-driven insights to protect users from fraudulent schemes.

## User Preferences
- Modern, data-dense dashboard design (inspired by Linear and Dexscreener)
- Clean, professional aesthetic with subtle interactions
- Color-coded risk indicators (green/yellow/orange/red)
- Monospace fonts for addresses and technical data

## System Architecture

### UI/UX Decisions
The frontend, built with React and TypeScript using Vite, features a modern, data-dense dashboard design. It utilizes Shadcn UI and Tailwind CSS for a clean, professional aesthetic with subtle interactions. Color-coded risk indicators (green/yellow/orange/red) and monospace fonts for technical data ensure clarity and efficient information consumption. Recharts is used for data visualization, and typography includes Inter for UI and JetBrains Mono for monospace elements.

### Technical Implementations
- **Frontend**: React, TypeScript, Vite, Wouter (routing), React Query (data fetching), Shadcn UI, Tailwind CSS, Recharts.
- **Backend**: Express.js with TypeScript, utilizing `@solana/web3.js` and `@solana/spl-token` for blockchain interaction.
- **Data Storage**: PostgreSQL for persistent data (users, subscriptions, wallet connections, crypto payment audit trails, AI blacklist data). In-memory storage (MemStorage) is used for session data.
- **Solana Integration**: Connects to Solana mainnet via a configurable RPC URL, with graceful handling for public RPC rate limits.
- **Authentication & Authorization**: Replit Auth blueprint (Google, GitHub, X, Apple, email/password) integrated with Stripe for subscription management. Token-gated access is a planned feature.
- **Payment Systems**:
    - **Stripe**: Full subscription system with 1-week free trial, $20/mo Basic, and $100/mo Premium tiers. Includes checkout flow, webhook handling for lifecycle events, and subscription management UI.
    - **Crypto Payments**: Production-ready Solana payment processing requiring 6 confirmations, with payment address generation, blockchain monitoring, and a full audit trail.
- **Bots**: Telegram and Discord bots for token analysis, holder analysis, dev wallet history, and blacklist checks, supporting markdown and rich embeds.
- **AI Blacklist System**: A rules-based detection engine with 6 automated rules analyzing 52+ risk metrics to flag honeypots, high sell taxes, suspicious authorities, and wash trading patterns. It includes severity scoring, evidence tracking, and dedicated API endpoints.

### Feature Specifications
- **Token Analysis**: Authority checks (mint/freeze), holder analysis (top 20, concentration), liquidity assessment, 0-100 risk scoring with detailed red flags, and recent transaction history.
- **User Management**: User accounts, session management, and wallet connections.
- **Subscription Tiers**: Basic ($20/mo) and Premium ($100/mo) with a 1-week free trial.
- **Blacklist**: Automated wallet flagging and reporting mechanism.
- **Bot Commands**: `/execute`, `/first20`, `/devtorture`, `/blacklist` for both Telegram and Discord.

### System Design Choices
- **Monorepo Structure**: `client/` for frontend, `server/` for backend, `shared/` for common types and schemas.
- **Type Safety**: Centralized TypeScript types and Zod validation schemas ensure consistency.
- **Error Resilience**: Graceful degradation with safe defaults and error messages when external services or RPC calls fail.
- **Modular Design**: Component-first approach for reusable UI components and a factory pattern for bot implementations.

## External Dependencies
- **Solana Blockchain**: Primary blockchain for token analysis and crypto payments.
- **Replit Auth**: User authentication service.
- **Stripe**: Subscription management and payment processing.
- **Rugcheck.xyz**: Community-driven risk scores and liquidity analysis.
- **GoPlus Security**: Honeypot detection, contract security scanning, and scam detection flags.
- **DexScreener**: Real-time market data (price, volume, liquidity, market cap).
- **Jupiter Aggregator**: Price verification and liquidity aggregation.
- **Helius/QuickNode/Alchemy**: Recommended custom Solana RPC providers for production.
- **Telegram Bot API**: For Telegram bot integration.
- **Discord API**: For Discord bot integration.

## Recent Implementation (November 11, 2025)

### Phase 3: Crypto Payment System (COMPLETED ✅)
- **SOL-only payment processing** with blockchain monitoring
- **Security**: Fails fast if PHANTOM_WALLET_ADDRESS not configured, ETH/BTC blocked
- **6-confirmation requirement** before subscription activation
- **Full audit trail** with payment_audit table
- **API**: `/api/create-crypto-payment`, `/api/crypto-payment/:id`, `/api/crypto-payment/:id/check`

### Phase 4: Telegram & Discord Bots (COMPLETED ✅)
- **Factory pattern**: No side effects on import, graceful startup if tokens missing
- **Commands**: `/execute`, `/first20`, `/devtorture`, `/blacklist`
- **Telegram**: Markdown formatting with emoji indicators, quick DM analysis
- **Discord**: Rich embeds with slash commands, color-coded risk levels
- **Production-safe**: Bots only start when valid tokens provided

### Phase 5: AI Blacklist System (COMPLETED ✅)
- **6 automated detection rules** analyzing 52+ risk metrics
- **Auto-flags**: Honeypots (90), high sell tax (80), suspicious authorities (75)
- **Evidence tracking**: Timestamped entries with severity scoring
- **Deduplication**: Prevents spam for same wallet+labelType
- **API**: `/api/blacklist/check/:wallet`, `/api/blacklist/report`, `/api/blacklist/stats`, `/api/blacklist/top`
- **Integration**: Automatic analysis on every token scan, blacklist info in responses

## Environment Variables

### Required for Basic Operation
- None (uses public Solana RPC by default)

### Required for Crypto Payments (SOL only)
- `PHANTOM_WALLET_ADDRESS` - Your Solana wallet for receiving payments ⚠️ CRITICAL

### Required for Stripe Subscriptions
- `STRIPE_SECRET_KEY` - Stripe secret key (sk_test_* or sk_live_*)
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key
- `STRIPE_PRICE_ID_BASIC` - Price ID for $20/mo Basic tier
- `STRIPE_PRICE_ID_PREMIUM` - Price ID for $100/mo Premium tier

### Optional for Bots (graceful skip if not set)
- `TELEGRAM_BOT_TOKEN` - From @BotFather
- `DISCORD_BOT_TOKEN` - From Discord Developer Portal
- `DISCORD_CLIENT_ID` - Discord application ID

### Optional for Performance
- `SOLANA_RPC_URL` - Custom RPC endpoint (default: public mainnet)
- `HELIUS_API_KEY` - Recommended for better rate limits
- `STRIPE_WEBHOOK_SECRET` - For webhook signature verification

## Next Steps
1. **Set environment variables** for desired features (payments, bots)
2. **Test crypto payment flow** once PHANTOM_WALLET_ADDRESS is configured
3. **Test bot commands** once bot tokens are configured
4. **UI integration** for crypto payments and blacklist features
5. **ML training** for Phase 2 AI blacklist (currently rules-based)
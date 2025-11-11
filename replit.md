# Solana Rug Killer

## Overview
Solana Rug Killer is a comprehensive web application designed to analyze Solana SPL tokens for potential rug pull risks. It provides real-time analysis by checking for common indicators such as mint/freeze authority, holder concentration, liquidity pool status, and suspicious transaction patterns. The project's ambition is to offer a robust tool for investors to identify and mitigate risks in the Solana ecosystem, leveraging advanced analytics and AI-driven insights to protect users from fraudulent schemes.

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
    - **Whop**: Full subscription system with Merchant of Record handling (2.7% + $0.30 fees). Includes 1-week free trial, $20/mo Basic, and $100/mo Premium tiers. Features hosted checkout, webhook handling for lifecycle events, and automatic tax/compliance.
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

### Phase 7: Stripe→Whop Migration (COMPLETED ✅)
- **Complete payment migration** from Stripe to Whop
- **Database schema changes**: Removed Stripe fields, added `whopMembershipId`, `whopPlanId`, `whopUserId`
- **Status vocabulary alignment**: Migrated to Whop lifecycle ("valid", "trialing", "past_due", "cancelled", "expired")
- **Access control fix**: Updated `hasActiveAccess` to recognize all Whop statuses
- **Whop SDK integration**: Client with `createWhopCheckout`, `getWhopMembership`, `cancelWhopMembership` helpers
- **Webhook handler**: POST /api/whop/webhook for payment.succeeded, membership.went_valid, membership.went_invalid
- **Frontend updates**: Removed Stripe SDK, direct redirect to Whop hosted checkout

## Previous Implementations

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

### Phase 6: Comprehensive Access Control & Security (COMPLETED ✅)
- **Zero-Tolerance Access Control**: NO unauthorized access without active subscription OR 10M+ official tokens
- **Subscription Gating**: Free trial for 7 days, then MUST pay or prove token holdings
- **Protected Endpoints**: `/api/analyze-token`, `/api/bot/invite-links` require hasActiveAccess
- **Challenge-Response Wallet Verification**: Prevents ALL signature replay attacks
  - User requests `GET /api/wallet/challenge` → receives 5-minute nonce
  - User signs challenge with wallet (Ed25519)
  - User submits `POST /api/wallet/verify` with {walletAddress, signature, challenge}
  - Server validates: challenge exists, not expired, not used, signature valid, 10M+ official tokens
  - Challenge marked as used (single-use enforcement)
- **Official Token Mint Enforcement**: Server-controlled `OFFICIAL_TOKEN_MINT_ADDRESS` only
- **Database Schema**: `wallet_challenges` table for anti-replay, `wallet_connections` for eligibility
- **Security Features**:
  - Trial status bug fixed (both 'active' and 'trial' allowed)
  - Token mint bypass prevented (no user-controlled mint address)
  - Signature replay attacks impossible (challenge-response with expiry)
  - Wallet verification requires fresh challenge + Ed25519 signature
  - 24-hour revalidation window for token holders
  - Auto-expiry when subscription or trial ends
- **Bot Access Gating**: Telegram/Discord bots accessible only with subscription OR official token holdings
- **API**: `GET /api/wallet/challenge`, `POST /api/wallet/verify`, `GET /api/wallet`, `GET /api/bot/invite-links`

## Environment Variables

### Required for Basic Operation
- None (uses public Solana RPC by default)

### Required for Crypto Payments (SOL only)
- `PHANTOM_WALLET_ADDRESS` - Your Solana wallet for receiving payments ⚠️ CRITICAL

### Required for Token Gating (10M+ token access)
- `OFFICIAL_TOKEN_MINT_ADDRESS` - The SPL token mint address for access verification ⚠️ CRITICAL

### Required for Whop Subscriptions
- `WHOP_API_KEY` - Whop API key from developer dashboard
- `WHOP_APP_ID` - Whop application ID
- `WHOP_COMPANY_ID` - Whop company/business ID
- `WHOP_PLAN_ID_BASIC` - Plan ID for $20/mo Basic tier
- `WHOP_PLAN_ID_PREMIUM` - Plan ID for $100/mo Premium tier

### Optional for Bots (graceful skip if not set)
- `TELEGRAM_BOT_TOKEN` - From @BotFather
- `DISCORD_BOT_TOKEN` - From Discord Developer Portal
- `DISCORD_CLIENT_ID` - Discord application ID

### Optional for Performance
- `SOLANA_RPC_URL` - Custom RPC endpoint (default: public mainnet)
- `HELIUS_API_KEY` - Recommended for better rate limits

## Security Posture

### Access Control Logic
Every protected endpoint enforces:
1. **Subscription Check**: User has subscription with status='active' OR 'trial' AND currentPeriodEnd > now
2. **OR Token Holder Check**: User has walletConnection with isEligible=true AND lastVerifiedAt < 24h ago
3. **Challenge-Response**: Wallet verification requires:
   - Fresh challenge from `GET /api/wallet/challenge` (5min expiry)
   - Ed25519 signature of challenge
   - Validation against `OFFICIAL_TOKEN_MINT_ADDRESS` only
   - Single-use enforcement (marked as used after verification)

### Protection Layers
- ✅ **Trial Status**: Both 'active' and 'trial' subscriptions grant access
- ✅ **Token Mint**: Only `OFFICIAL_TOKEN_MINT_ADDRESS` counts (server-controlled)
- ✅ **Signature Replay**: Challenge-response prevents reuse of old signatures
- ✅ **24h Revalidation**: Token holders must reverify every 24 hours
- ✅ **Auto-Expiry**: Access removed when subscription/trial ends

### Recommended Before Production
1. **Rate Limiting**: Add rate limiting on `/api/wallet/challenge` to prevent abuse
2. **Monitoring**: Set up alerts for repeated verification failures
3. **Environment**: Ensure `OFFICIAL_TOKEN_MINT_ADDRESS` is configured

## Next Steps
1. **Set environment variables** for desired features (payments, bots, token gating)
2. **Configure OFFICIAL_TOKEN_MINT_ADDRESS** to enable 10M+ token holder access
3. **Test wallet verification flow** with challenge-response system
4. **Add rate limiting** to challenge endpoint (recommended for production)
5. **UI integration** for wallet verification and bot invite links
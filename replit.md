# Solana Rug Killer

## Overview
Solana Rug Killer is a web application designed to analyze Solana SPL tokens for potential rug pull risks. Its primary purpose is to provide real-time analysis of common indicators like mint/freeze authority, holder concentration, liquidity pool status, and suspicious transaction patterns. The project aims to equip investors with a robust tool for identifying and mitigating risks within the Solana ecosystem, leveraging advanced analytics to protect users from fraudulent schemes and contribute to a safer investment environment.

## User Preferences
- Modern, data-dense dashboard design (inspired by Linear and Dexscreener)
- Clean, professional aesthetic with subtle interactions
- Color-coded risk indicators (green/yellow/orange/red)
- Monospace fonts for addresses and technical data

## System Architecture

### UI/UX Decisions
The frontend features a modern, data-dense dashboard using React, TypeScript, Vite, Shadcn UI, and Tailwind CSS. It incorporates color-coded risk indicators and monospace fonts for technical data. Recharts is used for data visualization, with Inter for UI typography and JetBrains Mono for monospace elements.

### Technical Implementations
- **Frontend**: React, TypeScript, Vite, Wouter (routing), React Query (data fetching), Shadcn UI, Tailwind CSS, Recharts.
- **Backend**: Express.js with TypeScript, using `@solana/web3.js` and `@solana/spl-token` for Solana blockchain interaction.
- **Data Storage**: PostgreSQL for persistent data (users, subscriptions, subscription codes, code redemptions, wallet connections, crypto payment audit trails, AI blacklist data). In-memory storage (MemStorage) for session data.
- **Solana Integration**: Connects to Solana mainnet via a configurable RPC URL.
- **Authentication & Authorization**: Replit Auth blueprint (Google, GitHub, X, Apple, email/password) integrated with Whop for subscription management and token-gated access.
- **Payment Systems**: Whop for subscription management and crypto payments (Solana only) with 6 confirmations and audit trails.
- **Subscription Codes**: Database-driven redemption system with row-level locking, transaction safety, SQL-based usage counting to prevent race conditions, and Whop webhook protection to prevent downgrades of lifetime subscriptions.
- **Bots**: Telegram and Discord bots provide token analysis, holder analysis, dev wallet history, and blacklist checks, supporting markdown and rich embeds.
- **AI Blacklist System**: A rules-based detection engine with 6 automated rules analyzing over 52 risk metrics to identify honeypots, high sell taxes, suspicious authorities, and wash trading patterns. Includes severity scoring, evidence tracking, and dedicated API endpoints.
- **Alpha Alerts**: Live monitoring service that auto-pings Discord/Telegram channels when detecting: (1) Alpha caller signals from top Solana callers (Gemnl, ATM.day, Alpha Gardner), (2) New token launches from pump.fun WebSocket, (3) Quality-filtered gems (RugCheck > 85, no honeypots, liquidity > $5K). Monitoring-only with no automated trading or private keys.
- **Creator Wallet**: Secure wallet service for pump.fun creator rewards (0.05% of trading volume). Admin-only access with one-time private key generation, Phantom wallet import instructions, and balance monitoring. Stored in `CREATOR_WALLET_PRIVATE_KEY` secret.

### Feature Specifications
- **Token Analysis**: Authority checks, holder analysis, liquidity assessment, 0-100 risk scoring with red flags, and transaction history.
- **User Management**: Accounts, session management, and wallet connections.
- **Subscription Tiers**: Individual, Group, and Lifetime plans with a 1-week free trial.
- **Subscription Codes**: Redeemable codes for lifetime access with transaction-safe redemption, usage limits, expiration dates, and Whop webhook protection.
- **Blacklist**: Automated wallet flagging and reporting.
- **Bot Commands**: `/execute`, `/first20`, `/devtorture`, `/blacklist` for Telegram and Discord.
- **Creator Wallet**: Admin-only pump.fun creator wallet management for earning 0.05% trading volume rewards. Secure one-time private key generation with Phantom wallet integration. Access at `/admin/wallet` (requires admin email in `ADMIN_EMAILS` secret).

### System Design Choices
- **Monorepo Structure**: `client/` for frontend, `server/` for backend, `shared/` for common types.
- **Type Safety**: Centralized TypeScript types and Zod validation schemas.
- **Error Resilience**: Graceful degradation and error messages for external service failures.
- **Modular Design**: Component-first approach and a factory pattern for bot implementations.

## External Dependencies
- **Solana Blockchain**: Primary blockchain for token analysis and crypto payments.
- **Replit Auth**: User authentication service.
- **Whop**: Subscription management and payment processing.
- **Rugcheck.xyz**: Community-driven risk scores and liquidity analysis.
- **GoPlus Security**: Honeypot detection, contract security scanning, and scam detection flags.
- **DexScreener**: Real-time market data (price, volume, liquidity, market cap).
- **Jupiter Aggregator**: Price verification and liquidity aggregation.
- **Helius/QuickNode/Alchemy**: Recommended custom Solana RPC providers.
- **Telegram Bot API**: For Telegram bot integration.
- **Discord API**: For Discord bot integration.
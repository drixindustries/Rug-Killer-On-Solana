# Solana Rug Detector

A comprehensive web application for analyzing Solana tokens to detect potential rug pull risks.

## Overview
This application provides real-time analysis of Solana SPL tokens, checking for common rug pull indicators including mint authority, freeze authority, holder concentration, liquidity pool status, and suspicious transaction patterns.

## Recent Changes (November 11, 2025)

### Phase 1: Token Analysis MVP (Completed)
- Initial MVP implementation complete with multi-source data aggregation
- Frontend: React dashboard with exceptional visual design following design_guidelines.md
- Backend: Solana RPC integration with comprehensive risk analysis
- External APIs integrated: Rugcheck, GoPlus Security, DexScreener, Jupiter
- Error handling: Graceful fallbacks for RPC rate limits and network errors
- Market data display: Real-time prices, volume, liquidity from DexScreener
- Price verification: Jupiter aggregator integration for additional price data

### Phase 2: Authentication & Subscription System (Completed)
- PostgreSQL database with 4 tables:
  - `users`: User accounts with Replit Auth + Stripe integration (stripeCustomerId, stripeSubscriptionId)
  - `sessions`: Session storage for authentication
  - `subscriptions`: Subscription tiers and status tracking (tier, status, currentPeriodStart, currentPeriodEnd)
  - `wallet_connections`: Solana wallet connections for token-gated access
- Replit Auth blueprint integrated (Google, GitHub, X, Apple, email/password login)
- Stripe subscription system fully implemented:
  - 1-week free trial for all new users (auto-created on first login)
  - $20/mo Basic tier: Discord + Telegram DMs
  - $100/mo Premium tier: Discord + Telegram groups
  - Checkout flow with metadata persistence (userId, tier)
  - Webhook handling for subscription lifecycle events (checkout.session.completed, customer.subscription.updated/deleted)
  - Billing period extraction with graceful fallbacks (billing_period → current_period_* fields)
  - Status mapping: active, trial, cancelled (collapses past_due/unpaid/incomplete to cancelled)
  - Subscription management UI with cancel functionality
- Token-gated access: Planned feature for 10M+ token holders

## Project Architecture

### Frontend (`client/`)
- **Framework**: React + TypeScript with Vite
- **Routing**: Wouter for client-side routing
- **Data Fetching**: React Query (useMutation for POST requests)
- **UI Components**: Shadcn UI + Tailwind CSS
- **Charts**: Recharts for data visualization
- **Typography**: Inter (UI) and JetBrains Mono (monospace)

### Backend (`server/`)
- **Framework**: Express.js with TypeScript
- **Blockchain Integration**: @solana/web3.js + @solana/spl-token
- **RPC**: Connects to Solana mainnet (configurable via SOLANA_RPC_URL)
- **Storage**: In-memory (MemStorage) for session data

### Shared (`shared/`)
- **Schema**: Centralized TypeScript types and Zod validation schemas
- **Type Safety**: Consistent types between frontend and backend

## Key Features

### Token Analysis (Core Features Completed)
1. **Authority Checks**
   - Mint authority detection (can dev mint unlimited tokens?)
   - Freeze authority detection (can dev freeze accounts?)

2. **Holder Analysis**
   - Top 20 holder addresses with balances
   - Holder concentration percentage (top 10)
   - Interactive holder distribution chart

3. **Liquidity Assessment**
   - Liquidity pool status detection
   - Risk classification (SAFE/RISKY/UNKNOWN)

4. **Risk Scoring**
   - 0-100 risk score calculation
   - Risk level classification (LOW/MODERATE/HIGH/EXTREME)
   - Detailed red flag alerts with severity levels

5. **Transaction History**
   - Recent transaction timeline
   - Suspicious activity detection

### UI Components
- **Token Input**: Address validation with example tokens
- **Risk Score Card**: Large visual risk indicator with counter animation
- **Critical Alerts**: Color-coded alert cards for immediate red flags
- **Metrics Grid**: 6 key metrics (supply, holders, concentration, liquidity, creation date, token program)
- **Top Holders Table**: Sortable table with copy-to-clipboard functionality
- **Holder Distribution Chart**: Horizontal bar chart showing concentration
- **Transaction Timeline**: Vertical timeline with transaction type icons
- **Token Metadata Card**: Token details with Solscan integration link

## User Preferences
- Modern, data-dense dashboard design (inspired by Linear and Dexscreener)
- Clean, professional aesthetic with subtle interactions
- Color-coded risk indicators (green/yellow/orange/red)
- Monospace fonts for addresses and technical data

## Environment Configuration

### Required Environment Variables
None required for basic functionality (uses public Solana RPC by default)

### Required Environment Variables (Stripe)
- `STRIPE_SECRET_KEY`: Stripe secret key (sk_test_* for testing, sk_live_* for production)
- `VITE_STRIPE_PUBLIC_KEY`: Stripe publishable key (pk_test_* for testing, pk_live_* for production)
- `STRIPE_PRICE_ID_BASIC`: Stripe price ID for $20/mo Basic tier (create in Stripe dashboard)
- `STRIPE_PRICE_ID_PREMIUM`: Stripe price ID for $100/mo Premium tier (create in Stripe dashboard)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret (optional, for webhook signature verification)

### Optional Environment Variables
- `SOLANA_RPC_URL`: Custom Solana RPC endpoint (default: https://api.mainnet-beta.solana.com)
  - **Note**: Public RPC has strict rate limits (429 errors common)
  - **Recommended**: Use Helius, QuickNode, or Alchemy for production
  - Example: `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`

## Known Limitations

### Public RPC Rate Limits
The default public Solana RPC endpoint (https://api.mainnet-beta.solana.com) has very strict rate limits:
- **Impact**: May return 429 errors during analysis
- **Handling**: App gracefully handles errors with safe defaults
- **Solution**: Configure custom RPC endpoint via SOLANA_RPC_URL environment variable
- **Recommended Providers**: Helius, QuickNode, Alchemy (all have free tiers)

### External API Data Availability
Rugcheck and GoPlus APIs may not have data for all tokens:
- **Rugcheck**: Primarily tracks newer tokens and DeFi projects; may not have data for established tokens like USDC
- **GoPlus**: Database coverage varies; established tokens like USDC may return null results
- **Handling**: Cards only render when data is available; missing data does not cause errors
- **UI Behavior**: If Rugcheck/GoPlus return null, their respective cards won't display

### Error Handling Strategy
When RPC calls fail:
1. Backend returns complete response with safe defaults
2. Risk score defaults to 100 (EXTREME)
3. Error message shown in red flags section
4. All UI components handle missing data gracefully
5. No runtime crashes - user can retry analysis

## Development

### Running the Project
```bash
npm run dev
```
This starts both Express (port 5000) and Vite dev server

### Project Structure
```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities and API client
├── server/              # Backend Express application
│   ├── solana-analyzer.ts  # Solana blockchain integration
│   ├── routes.ts        # API routes
│   └── storage.ts       # Data storage interface
├── shared/              # Shared types and schemas
│   └── schema.ts        # TypeScript types + Zod schemas
└── design_guidelines.md # Frontend design specifications
```

### API Endpoints

**Token Analysis:**
- **POST /api/analyze-token**
  - Request: `{ tokenAddress: string }`
  - Response: Complete TokenAnalysisResponse with risk data
  - Error handling: Returns 200 with safe defaults on RPC failures

**Subscription Management:**
- **GET /api/subscription/status**
  - Returns current user subscription status
  - Auto-creates 1-week free trial for new users
- **POST /api/create-subscription**
  - Creates Stripe Checkout session
  - Request: `{ tier: 'basic' | 'premium' }`
  - Metadata: userId and tier persisted for webhook processing
- **POST /api/cancel-subscription**
  - Cancels active Stripe subscription
  - Requires authenticated user with active subscription
- **POST /api/stripe/webhook**
  - Processes Stripe webhook events
  - Handles: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
  - Signature verification using raw body
  - Upserts subscription records with billing periods and status mapping

## Testing
- End-to-end testing framework configured
- Test known tokens: USDC, SOL (wrapped)
- Error scenarios tested (invalid addresses, RPC failures)

## Integrated External Services

### Rugcheck.xyz
- Community-driven risk scores and liquidity analysis
- Token verification status
- Market liquidity metrics from top DEXes

### GoPlus Security
- Honeypot detection with buy/sell tax analysis
- Contract security scanning (mintable, freezable, open source)
- Scam detection flags
- Security risk warnings

### DexScreener
- Real-time market data from all Solana DEXes
- Price, 24h volume, liquidity, market cap, FDV
- Trading activity (buys/sells) across timeframes
- Multi-DEX pair aggregation (Raydium, Orca, etc.)

### Jupiter Aggregator
- Price verification from Jupiter's liquidity aggregator
- Buy/sell price quotes with confidence levels
- Independent price source for cross-validation

## Next Steps / Future Enhancements
1. **Pump.fun Live Monitor**: Real-time WebSocket monitoring of new token launches (IN PROGRESS)
2. **Payment System**: Stripe subscriptions for Discord/Telegram alerts ($20/mo DMs, $100/mo groups)
3. **Discord Bot**: Token alert notifications to Discord users/channels
4. **Telegram Bot**: Token alert notifications to Telegram users/groups
5. **Social Verification**: Check website/Twitter/Discord links
6. **Token Watchlist**: Save and monitor multiple tokens
7. **Historical Data**: Track token metrics over time with PostgreSQL
8. **Export Reports**: PDF/CSV export of analysis results

## Technical Decisions
- **PostgreSQL storage**: Database persistence for user accounts and subscriptions
- **In-memory session storage**: Sufficient for MVP session management
- **Public RPC**: Good for demo/development, custom RPC recommended for production
- **Component-first design**: Modular, reusable components for maintainability
- **Type safety**: Shared schema ensures frontend/backend consistency
- **Error resilience**: Graceful degradation when external services fail

## Subscription System Implementation Details

### Webhook Processing
The Stripe webhook handler implements production-ready patterns:

1. **Billing Period Extraction** (`extractBillingPeriod` helper):
   - Validates subscription items (warns if !== 1 for single-tier MVP)
   - Guards against empty items array (returns current_period_* immediately)
   - Attempts to extract `billing_period` from subscription items (Stripe API 2025 structure)
   - Falls back to subscription `current_period_*` fields (canonical source)
   - Returns consistent `{ start: Date, end: Date }` structure

2. **Status Mapping** (`mapStripeStatus` helper):
   - Maps Stripe subscription statuses to 3-status DB schema: `active` | `cancelled` | `trial`
   - Active → `active`, Trialing → `trial`
   - Past_due, unpaid, canceled, incomplete, paused → `cancelled` (revokes access)
   - Logs unknown statuses as warnings

3. **Event Handling**:
   - `checkout.session.completed`: Creates/updates subscription with correct status and billing periods
   - `customer.subscription.updated`: Updates subscription status and billing periods
   - `customer.subscription.deleted`: Marks subscription as cancelled
   - All handlers use upsert pattern (create if missing, update if exists)
   - All handlers process metadata (userId, tier) from checkout session

### MVP Scope Limitations
- **Single-item subscriptions**: Users can only subscribe to ONE tier at a time
- **No mid-cycle upgrades**: Plan changes require cancellation + new checkout
- **Status collapse**: Multiple Stripe statuses map to `cancelled` (correct for access control)
- **Future enhancements**: Multi-tier, proration, upgrade/downgrade flow requires refactoring

## Version
v1.0.0 - Initial MVP Release

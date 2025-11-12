# Changelog

All notable changes to the Solana Rug Killer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Testing Infrastructure (Option A)**:
  - 32 comprehensive unit tests for `server/solana-analyzer.ts` covering risk scoring, bundle detection, holder filtering, and API resilience (429 rate limits, timeouts)
  - 15+ integration tests using Supertest for API endpoints
  - 16 end-to-end tests using Playwright for frontend flows (token search, bundle visualization, auto-refresh, risk indicators)
  - Test fixtures and mocking utilities with deterministic Solana data
  - Jest configuration with separate coverage directories (unit: 92%, integration, global: 70%)
  - Playwright configuration with Chromium/Firefox/WebKit support
  - Mock builder pattern for flexible test scenarios
- **User Features (Option B)**:
  - **Portfolio Tracker**: Track holdings, transactions, and P&L with weighted-average cost basis
    - Weighted-average cost basis calculation using decimal.js for precision
    - Row-level locking (SELECT FOR UPDATE) for transactional integrity
    - Support for buy/sell/airdrop transaction types
    - Real-time unrealized P&L calculation via price cache integration
    - Realized P&L tracking across all transactions
    - Comprehensive transaction history with filtering by token
    - Safe numeric formatting with Number() wrapping to prevent display errors
    - Client-side validation preventing negative quantities and malformed inputs
    - Complete data-testid coverage for testing
  - **Price Alerts**: Get notified when prices hit your targets
    - Four alert types: price_above, price_below, percent_change, percent_drop
    - BullMQ worker for periodic alert monitoring (every 60 seconds)
    - Price cache integration (15-30s TTL) for efficient monitoring
    - Configurable lookback windows for percentage-based alerts
    - Alert persistence with lastPrice tracking (toFixed(8) precision)
    - Active/inactive toggle for alert management
    - Email notifications when alerts trigger (ready for integration)
    - Safe numeric formatting preventing exponential notation
    - Client-side validation for token addresses (length >= 32) and target values
    - Complete data-testid coverage for testing
  - **Token Comparison**: Compare multiple tokens side-by-side
    - Batch analysis of up to 10 tokens simultaneously
    - Side-by-side comparison of risk scores, holder metrics, and market data
    - Mobile-responsive design with card-based layout
    - Desktop table view for detailed analysis
    - Safe numeric formatting for all metrics
    - Complete data-testid coverage for testing
  - **Price Cache Infrastructure**:
    - Batch price fetching with 15-30s TTL caching
    - DexScreener and Jupiter integration for accurate pricing
    - Automatic cache invalidation and refresh
    - Support for multi-token queries via POST /api/prices
- Bundle percentage detection (DevsNightmarePro style) - calculates % of supply controlled by bundled wallets
- Auto-refresh functionality - automatically re-analyzes tokens every 5 minutes
- Orange UI highlighting for bundle warnings in MetricsGrid component
- Comprehensive bundle visualization pie chart with interactive tooltips
- Navigation menu enhancements with "Tools" section for Portfolio, Alerts, and Comparison
- This CHANGELOG.md file to track all changes

### Fixed
- Pump.fun LP detection now handles both `pump_fun` and `pump_fun_amm` market types
- LP burn percentage calculation for pump.fun tokens (now uses `lpLockedPct` instead of `lpBurn`)
- Liquidity status logic - tokens with >=90% locked liquidity now correctly show as SAFE
- Bundle percentage display logic - only shows prominent metric when bundles are detected

### Changed
- **GitHub Actions CI/CD Pipeline Enhanced**:
  - Split into separate jobs: lint/typecheck, unit tests, integration tests, e2e tests, build, security scan
  - Codecov integration for test coverage tracking
  - Playwright test reports uploaded as artifacts
  - Process cleanup to prevent hung CI runners (10-15 minute timeouts)
  - Separate coverage directories to prevent overwriting
- MetricsGrid component now shows "Bundle Supply % (DevsNightmare)" metric when bundles detected
- Updated market type detection to use prefix matching (`startsWith('pump_fun')`) instead of exact match
- Enhanced holder filtering to expose bundle supply percentage in API response
- Improved documentation in replit.md with pump_fun_amm market type handling
- Exported Express app from server/index.ts for integration testing

---

## [1.0.0] - 2024-11-12

### Initial Release Features

#### Core Analysis
- Multi-source token analysis (Rugcheck, GoPlus, DexScreener, Jupiter)
- Real-time holder count using `getProgramAccounts` RPC method
- Authority checks (mint/freeze)
- Top holder concentration analysis
- Transaction history timeline
- 0-100 risk scoring with red flags

#### Advanced Holder Filtering
- Multi-layered filtering system excluding non-whale addresses:
  - LP Addresses (DEX pairs, bonding curves, token accounts)
  - Known Exchanges (CEX wallets, DeFi protocol addresses)
  - Bundled Wallets (coordinated purchase detection)
- Interactive pie chart visualization
- Transparency API field exposing all filtered addresses
- Confidence-based alerts with edge-case protection

#### Market Data Integration
- Complete market metrics from DexScreener (price, market cap, FDV, volume, transactions)
- Accurate holder counts (not just top 20)
- Pump.fun liquidity detection with lpLockedPct support
- Real-time USD liquidity values
- Token metadata from DexScreener for pump.fun tokens

#### Authentication & Payments
- Replit Auth integration (Google, GitHub, X, Apple, email/password)
- Whop subscription management (Individual, Group, Lifetime plans)
- 1-week free trial for all plans
- Crypto payments (Solana only) with 6 confirmations
- Subscription codes with redemption system
- Admin access control via ADMIN_EMAILS

#### Bots & Alerts
- Telegram bot with token analysis commands
- Discord bot with rich embeds
- Live alpha alerts for:
  - Smart money wallet signals
  - New pump.fun launches (WebSocket)
  - Quality-filtered gems (RugCheck >85, liquidity >$5K)

#### AI Blacklist System
- Rules-based detection engine with 6 automated rules
- Analyzes 52+ risk metrics
- Honeypot detection
- High sell tax identification
- Suspicious authority flagging
- Wash trading pattern detection

#### Creator Wallet
- Admin-only pump.fun creator wallet management
- Earn 0.05% of trading volume rewards
- Secure one-time private key generation
- Phantom wallet integration
- Balance monitoring

---

## Version History

### Key Milestones

**November 2024 - Data Accuracy Improvements**
- Implemented complete market data integration
- Added actual holder count calculation
- Enhanced holder filtering with bundle detection
- Fixed pump.fun liquidity detection
- Added bundle visualization

**October 2024 - Initial Development**
- Core token analysis engine
- Multi-source data aggregation
- Basic risk scoring
- UI/UX foundation

---

## Contributing

When adding to this changelog:
1. Add unreleased changes to the `[Unreleased]` section
2. Follow the format: Added, Changed, Deprecated, Removed, Fixed, Security
3. Move unreleased items to a versioned release when deploying
4. Use present tense ("Add feature" not "Added feature")
5. Reference issue numbers when applicable

---

## Support

- **Documentation**: See [replit.md](./replit.md)
- **Issues**: Report bugs via GitHub Issues
- **Token**: $RUGK - `2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt`
- **Website**: https://rugkilleronsol.org

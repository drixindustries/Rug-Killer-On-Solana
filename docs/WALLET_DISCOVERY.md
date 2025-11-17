# Wallet Discovery System

## Overview

The Rug Killer Alpha Bot now includes an **automated wallet discovery system** that continuously identifies and monitors profitable traders on Solana. This system combines:

1. **Manual Wallet Seeding** - 45 pre-verified KOL wallets from kolscan.io
2. **Automated Discovery** - Analyzes successful tokens to find early buyers with high win rates
3. **External Sources** - Integrates with Birdeye API and community submissions
4. **Alpha Alert Integration** - Automatically monitors discovered wallets for alpha calls

This gives you access to **100+ smart money wallets** for free, completely automated and open source.

---

## Features

### 🔍 Automatic Wallet Discovery

The system analyzes successful token launches to identify wallets that:
- Buy tokens early (first 50 buyers)
- Maintain 60%+ win rate
- Generate 5+ SOL profit
- Execute 10+ trades minimum

**How it works:**
1. Monitors pump.fun for 10x+ tokens
2. Analyzes first 50 buyers of each successful token
3. Tracks performance across multiple tokens
4. Calculates win rate, profit, and hold times
5. Saves profitable wallets to database
6. Auto-adds to alpha alert monitoring

### 📊 Performance Tracking

Each wallet is scored on:
- **Win Rate**: Percentage of profitable trades
- **Total Profit**: SOL earned across all trades
- **Influence Score**: Composite metric (0-100) based on performance
- **Activity**: Last active timestamp
- **Trade Count**: Total wins + losses

### 🔄 External Wallet Sources

Aggregates wallets from:
- **Birdeye API**: Top traders and trending wallets (requires paid API)
- **Community Submissions**: Manually added by admins
- **Public Sources**: Publicly shared wallets from various platforms

### 🚨 Alpha Alert Integration

Discovered wallets are automatically:
1. Added to the alpha alert monitoring pool
2. Watched via Solana RPC `onLogs` listener
3. Filtered for quality (RugCheck > 85, no honeypots, liquidity > $5K)
4. Sent to Discord/Telegram when they buy tokens

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Wallet Discovery Flow                      │
└─────────────────────────────────────────────────────────────┘

1. Source Collection
   ├── Manual Seeds (seed-kol-wallets.ts) → 45 KOLs
   ├── Automated Discovery (wallet-discovery.ts) → Analyzes successful tokens
   ├── External APIs (external-wallet-sources.ts) → Birdeye, etc
   └── Community Submissions → Manual admin additions

2. Performance Analysis
   ├── Track wallet transactions via Solana RPC
   ├── Calculate win rate, profit, hold times
   ├── Compute influence score (0-100)
   └── Filter by minimum thresholds

3. Database Storage (kolWallets table)
   ├── walletAddress (unique)
   ├── displayName, twitterHandle, telegramHandle
   ├── profitSol, wins, losses
   ├── influenceScore, rank
   ├── source (kolscan, auto-discovered, birdeye, manual)
   └── lastActiveAt, updatedAt

4. Alpha Alert Integration
   ├── Load wallets from database (min influence 60)
   ├── Monitor top 100 wallets via Solana RPC
   ├── Detect buy transactions in real-time
   ├── Apply quality filters
   └── Send alerts to Discord/Telegram

5. Scheduled Maintenance
   ├── Run discovery every 6 hours
   ├── Update influence scores
   ├── Clean up inactive wallets (30+ days old, score < 40)
   └── Sync external sources
```

---

## Configuration

### Environment Variables

```bash
# Alpha Alerts (Required)
ALPHA_ALERTS_ENABLED=true
ALPHA_DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
ALPHA_TELEGRAM_BOT_TOKEN=1234567890:ABC...
ALPHA_TELEGRAM_CHAT_ID=-1001234567890

# External APIs (Optional - enhances discovery)
BIRDEYE_API_KEY=your_birdeye_key_here
HELIUS_API_KEY=your_helius_key_here
ALCHEMY_KEY=your_alchemy_key_here

# Discovery Settings (Optional)
WALLET_DISCOVERY_MIN_WIN_RATE=0.6        # Default: 60%
WALLET_DISCOVERY_MIN_TRADES=10           # Default: 10 trades
WALLET_DISCOVERY_MIN_PROFIT=5            # Default: 5 SOL
WALLET_DISCOVERY_MIN_INFLUENCE=60        # Default: 60 for monitoring
```

### Database Schema

```sql
CREATE TABLE kol_wallets (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  twitter_handle VARCHAR(255),
  telegram_handle VARCHAR(255),
  rank INTEGER,
  profit_sol DECIMAL(20, 9),
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  influence_score INTEGER DEFAULT 50,  -- 0-100
  is_verified BOOLEAN DEFAULT false,
  source VARCHAR(255),  -- 'kolscan', 'auto-discovered', 'birdeye', 'manual'
  last_active_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints (Admin Only)

### Get Discovery Status

```bash
GET /api/admin/wallets/discovery/status
```

**Response:**
```json
{
  "scheduler": {
    "isRunning": true,
    "nextRun": "Every 6 hours"
  },
  "alphaAlerts": {
    "isRunning": true,
    "monitoredCallers": 78,
    "totalCallers": 78,
    "activeListeners": 78,
    "activeWebSockets": 1
  }
}
```

### Manually Trigger Discovery

```bash
POST /api/admin/wallets/discovery/run
Content-Type: application/json

{
  "tokenMints": [
    "token1MintAddress...",
    "token2MintAddress..."
  ]
}
```

**Response:**
```json
{
  "message": "Wallet discovery started",
  "status": "running"
}
```

### Add Manual Wallet

```bash
POST /api/admin/wallets/add
Content-Type: application/json

{
  "walletAddress": "ABC123...",
  "displayName": "TopTrader",
  "twitterHandle": "@toptrader",
  "source": "community-submission"
}
```

### List All Wallets

```bash
GET /api/admin/wallets/list?limit=100&offset=0
```

**Response:**
```json
{
  "wallets": [
    {
      "id": 1,
      "walletAddress": "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o",
      "displayName": "Cented",
      "rank": 1,
      "profitSol": "256.53",
      "wins": 88,
      "losses": 73,
      "influenceScore": 95,
      "source": "kolscan"
    }
  ],
  "total": 78,
  "limit": 100,
  "offset": 0
}
```

### Remove Wallet

```bash
DELETE /api/admin/wallets/:walletAddress
```

### Sync External Sources

```bash
POST /api/admin/wallets/external/sync
```

---

## Why Use This System?

### Open Source & Free
- No monthly subscriptions or hidden fees
- Full transparency - audit all code yourself
- Self-hosted - you control your data

### Customizable
- Adjust win rate thresholds (default 60%)
- Set minimum profit requirements (default 5 SOL)
- Configure influence scoring algorithm
- Add your own data sources

### Automated
- Discovers new profitable wallets every 6 hours
- Auto-updates performance metrics
- Removes inactive/low-performing wallets
- Seamlessly integrates with alpha alerts

### Community-Driven
- Contribute wallet sources
- Share improvements
- No vendor lock-in
- Built by traders, for traders

---

## Usage Examples

### Starting the System

```typescript
// Server automatically starts on launch if ALPHA_ALERTS_ENABLED=true
// In server/index.ts:

if (process.env.ALPHA_ALERTS_ENABLED === 'true') {
  const { getAlphaAlertService } = await import('./alpha-alerts');
  const alphaService = getAlphaAlertService();
  await alphaService.start(); // Loads wallets from DB + starts monitoring

  const { initializeWalletDiscovery } = await import('./wallet-scheduler');
  initializeWalletDiscovery(); // Starts 6-hour discovery cycle
}
```

### Manually Discovering Wallets

```typescript
import { getWalletDiscoveryService } from './services/wallet-discovery';

const discoveryService = getWalletDiscoveryService();

// Analyze specific successful tokens
const successfulMints = [
  'token1Address...',
  'token2Address...',
];

const newWallets = await discoveryService.discoverProfitableWallets(successfulMints);
console.log(`Discovered ${newWallets.length} profitable wallets`);
```

### Adding External Wallets

```typescript
import { getExternalWalletService } from './services/external-wallet-sources';

const externalService = getExternalWalletService();

// Fetch from Birdeye (requires API key)
const birdeyeWallets = await externalService.fetchBirdeyeTopTraders();

// Import community wallets
await externalService.importCommunityWallets([
  {
    address: 'wallet1...',
    displayName: 'CommunityTrader1',
    winRate: 0.75,
    profitSol: 45.2,
    source: 'twitter-thread'
  }
]);
```

### Monitoring Wallet Activity

```typescript
import { getAlphaAlertService } from './alpha-alerts';

const alphaService = getAlphaAlertService();

// Add custom callback for alerts
alphaService.onAlert(async (alert) => {
  console.log('Alpha Alert:', alert);
  
  // Custom logic (e.g., auto-trade, log to database, etc)
  if (alert.type === 'caller_signal') {
    console.log(`${alert.source} bought ${alert.mint}`);
  }
});

await alphaService.start();
```

---

## Development Roadmap

### Phase 1 (Complete) ✅
- [x] Manual KOL wallet seeding
- [x] Database schema for wallet tracking
- [x] Alpha alert integration

### Phase 2 (Complete) ✅
- [x] Automated wallet discovery from successful tokens
- [x] Performance analysis (win rate, profit, hold times)
- [x] Influence scoring system
- [x] Scheduled discovery jobs (6-hour cycle)
- [x] Admin API endpoints

### Phase 3 (In Progress) 🔄
- [ ] DexScreener integration for trending tokens
- [ ] Birdeye API integration (requires paid plan)
- [ ] Real-time transaction parsing for accurate PnL
- [ ] Price oracle integration for profit calculation

### Phase 4 (Planned) 📋
- [ ] Machine learning for wallet scoring
- [ ] Wallet clustering (identify coordinated groups)
- [ ] Social sentiment analysis (Twitter/Telegram correlation)
- [ ] Copy-trading automation (optional)
- [ ] Public wallet leaderboard

---

## Troubleshooting

### No Wallets Being Discovered

**Check:**
1. `ALPHA_ALERTS_ENABLED=true` in environment
2. Database connection working (`npm run db:push`)
3. Scheduler is running (check logs for `[Wallet Scheduler]`)
4. Token mints are valid Solana addresses
5. RPC endpoint is not rate-limited

**Debug:**
```bash
# Check scheduler status via API
curl http://localhost:5000/api/admin/wallets/discovery/status

# Manually trigger discovery
curl -X POST http://localhost:5000/api/admin/wallets/discovery/run \
  -H "Content-Type: application/json" \
  -d '{"tokenMints": []}'

# View logs
railway logs
```

### Wallets Not Sending Alerts

**Check:**
1. `ALPHA_DISCORD_WEBHOOK` or Telegram credentials configured
2. Wallets have `influenceScore >= 60`
3. Alpha alert service is running
4. Quality filters are passing (RugCheck > 85, etc)

**Debug:**
```typescript
const alphaService = getAlphaAlertService();
console.log(alphaService.getStatus());
```

### External Sources Not Working

**Birdeye:**
- Requires paid API plan for trader analytics
- Free tier only has basic token data
- Check `BIRDEYE_API_KEY` is set

**Community Wallets:**
- Must be manually submitted via admin API
- No automatic scraping of paid services

---

## Security & Legal

### What We DON'T Do
❌ Scrape private data from paid services  
❌ Reverse engineer proprietary APIs  
❌ Share user wallets without consent  
❌ Guarantee trading performance  

### What We DO
✅ Analyze publicly available blockchain data  
✅ Use official APIs with proper authentication  
✅ Respect rate limits and ToS  
✅ Provide open-source tools for transparency  

### Privacy
- Wallet addresses are public on Solana blockchain
- We only track on-chain activity (no personal data)
- Source attribution (kolscan, auto-discovered, etc)
- Users can request wallet removal via admin API

---

## Contributing

Want to improve wallet discovery? Here's how:

1. **Add New Data Sources**
   - Implement in `server/services/external-wallet-sources.ts`
   - Follow existing API patterns (Birdeye example)
   - Submit PR with tests

2. **Improve Discovery Algorithm**
   - Enhance `server/services/wallet-discovery.ts`
   - Better win rate calculation
   - More accurate profit tracking
   - Advanced filtering logic

3. **Add Machine Learning**
   - Train model on historical wallet performance
   - Predict future profitability
   - Cluster wallets by trading patterns

4. **Community Contributions**
   - Share publicly known profitable wallets
   - Report bugs in GitHub issues
   - Suggest new features

---

## License

MIT License - See LICENSE file for details

**Note:** This is educational software. Trading cryptocurrencies is risky. Do your own research. Not financial advice.

---

## Support

- **Documentation**: [docs/](../docs/)
- **GitHub Issues**: [Report bugs](https://github.com/drixindustries/Rug-Killer-On-Solana/issues)
- **Discord**: Join our community (link in README)
- **Twitter**: [@RugKillerBot](https://twitter.com/rugkillerbot)

---

**Built with ❤️ by the Rug Killer Alpha Bot team**

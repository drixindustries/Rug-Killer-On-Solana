# Wallet Tracking Systems - Quick Reference

## 🚨 IMPORTANT: These are THREE SEPARATE SYSTEMS

### 1. 📢 **Alpha Alerts** - KOL/Influencer Copy Trading
**Purpose:** Track known influential traders and get notified when THEY buy tokens

**Database:** `alpha_callers` table (in-memory, loaded from `smart_wallets` table with `/alpha reload`)

**Commands:**
- Discord: `/alpha add <wallet> <name>` - Add KOL to watch
- Discord: `/alpha remove <wallet>` - Remove KOL
- Discord: `/alpha reload [mininfluence]` - Load from DB
- Discord: `/alpha status` - View monitored callers
- Discord: `/alpha setchannel` - Set alert destination
- Telegram: `/alpha_add <wallet> <name>`
- Telegram: `/alpha_remove <wallet>`
- Telegram: `/alpha_reload [mininfluence]`

**What it does:**
- Monitors specific wallets you configure
- Sends alerts when they buy new tokens
- Uses WebSocket connections to Helius/Solana
- Best for: Following respected traders, influencers, successful whales

**Alert Example:**
```
🔥 ALPHA CALL: BullMarketKing bought $TOKEN
Wallet: 7xKXtg...
Token: pump123...
```

---

### 2. 🧠 **Smart Money Relay** - Elite Performance Detection
**Purpose:** Automatically detect ANY wallet with elite trading stats (≥75% winrate, ≥$500K profit)

**Database:** `smart_wallets` table (stores wallets for reference, NOT actively monitored)

**Commands:**
- Discord: `/smartwallet add <wallet> <name> [influence]` - Add to DB for tracking
- Discord: `/smartwallet list [limit]` - View DB entries
- Discord: `/smartwallet view <wallet>` - View details
- Discord: `/smart setchannel` - Set alert destination
- Discord: `/smart test` - Send test alert
- Telegram: `/smartwallet_add <wallet> <name> [influence]`
- Telegram: `/smartwallet_list [limit]`
- Telegram: `/smart_here` - Configure chat for alerts

**What it does:**
- Helius webhook receives ALL new Pump.fun/Raydium token launches
- Extracts EVERY wallet from transaction data
- Queries Helius API to calculate each wallet's win rate and profit
- Only alerts on elite wallets (≥75% winrate AND ≥$500K profit)
- Dynamic - doesn't require pre-loaded watchlist

**Alert Example:**
```
🧠 SMART MONEY DETECTED
Token: $TEST (pump123...)
Wallet: 5Q544f... | 82.5% WR | $750K profit
Directive: PRIORITY WATCH
```

**Key Difference from Alpha:** You DON'T need to know the wallet beforehand - it finds elite traders automatically!

---

### 3. 🏦 **KOL Wallets** - Historical Database
**Purpose:** Reference database of known KOLs from kolscan.io

**Database:** `kol_wallets` table

**Seeding:** Automatic on startup if `SEED_WALLETS=true`

**Commands:** None - read-only reference

**What it does:**
- Pre-loaded database of 45+ high-influence traders
- Used by token analyzer to detect KOL involvement
- Adds credibility score to token analysis
- NOT used for real-time alerts (that's Alpha Alerts)

---

## System Comparison

| Feature | Alpha Alerts | Smart Money Relay | KOL Wallets |
|---------|-------------|-------------------|-------------|
| **Purpose** | Copy known traders | Auto-detect elite wallets | Reference database |
| **Monitoring** | Active WebSocket | Passive webhook | None |
| **Wallet Source** | Manual configuration | Helius real-time detection | Pre-seeded from kolscan.io |
| **Alert Trigger** | Wallet buys token | Elite wallet detected in new token | N/A |
| **Requires Setup** | Yes - add wallets | No - automatic | No - pre-loaded |
| **Best For** | Following influencers | Finding unknown whales | Token credibility scoring |

---

## Configuration Summary

### Environment Variables

**Alpha Alerts:**
```bash
ALPHA_CHANNEL_IDS=1234567890  # Fallback Discord channels
ALPHA_TELEGRAM_CHAT_IDS=-1001234567890  # Fallback Telegram chats
```

**Smart Money Relay:**
```bash
SMART_MONEY_CHANNEL_IDS=0987654321  # Fallback Discord channels
SMART_MONEY_TELEGRAM_CHAT_IDS=-1009876543210  # Fallback Telegram chats
HELIUS_API_KEY=your_key  # Required for Helius scanner
```

**KOL Database:**
```bash
SEED_WALLETS=true  # Auto-seed on startup
```

### Database Tables

1. **`smart_wallets`** - Shared by Alpha AND Smart Money (source of confusion!)
   - Alpha uses it via `/alpha reload` to load wallets into in-memory tracker
   - Smart Money uses it for reference only (DB doesn't trigger alerts)

2. **`kol_wallets`** - Separate, used by token analyzer only

3. **`alpha_alert_targets`** - Discord/Telegram channels for alpha alerts

4. **`smart_alert_targets`** - Discord/Telegram channels for smart money alerts

5. **`smart_signals`** - Log of smart money detections

---

## Common Mistakes (FIXED)

❌ **OLD BEHAVIOR:** `/smartwallet add` would add to BOTH alpha caller tracker AND smart money DB
✅ **NEW BEHAVIOR:** `/smartwallet add` only adds to `smart_wallets` DB (for reference)

**To add an alpha caller:** Use `/alpha add <wallet> <name>` (NOT `/smartwallet add`)

**To track elite wallets:** Just configure `/smart setchannel` - Helius scanner finds them automatically!

---

## Which System Should I Use?

### Use **Alpha Alerts** if:
- ✅ You know specific wallets you trust
- ✅ You want to copy their trades
- ✅ You follow Twitter/Discord influencers and have their wallet addresses
- ✅ You want instant notifications when THEY buy

### Use **Smart Money Relay** if:
- ✅ You want to discover NEW whales you don't know about
- ✅ You want data-driven alerts (win rate, profit thresholds)
- ✅ You don't want to manually track 100+ wallets
- ✅ You want performance-based filtering (PRIORITY WATCH, HIGH WATCH, etc.)

### Use Both?
**Yes!** They complement each other:
- Alpha Alerts = Known traders you trust
- Smart Money = Unknown whales the system discovers

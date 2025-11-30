# 🎯 Smart Money Wallet Integration - Visual Guide

```
┌─────────────────────────────────────────────────────────────┐
│                   100 SMART MONEY WALLETS                    │
│                    (November 29, 2025)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ npm run seed:smart-wallets
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (Railway)                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ smart_wallets TABLE                                 │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ • walletAddress (unique)                            │    │
│  │ • displayName ("KOL Sniper", "Jito Bundler", etc.) │    │
│  │ • winRate (75-82%)                                  │    │
│  │ • profitSol ($790K - $4.2M in SOL)                 │    │
│  │ • influenceScore (77-95)                           │    │
│  │ • isActive (true)                                   │    │
│  │ • notes (full description)                          │    │
│  │ • wins, losses, lastActiveAt                        │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Auto-queried on startup
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         server/alpha-alerts.ts (AlphaAlertService)          │
│                                                              │
│  refreshWalletListFromDatabase()                            │
│  ├─ Query: SELECT * FROM smart_wallets                     │
│  │         WHERE isActive = true                           │
│  │         AND influenceScore >= minThreshold              │
│  │                                                          │
│  ├─ Result: 100 wallets loaded into alphaCallers[]        │
│  │                                                          │
│  └─ Each wallet monitored via:                             │
│     ├─ Helius webhook (token_created events)              │
│     ├─ Ankr RPC polling                                    │
│     └─ Pump.fun WebSocket                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Wallet activity detected
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Smart Money Activity Detection                  │
│                                                              │
│  When wallet buys a token:                                  │
│  ├─ Check holder analysis for wallet address               │
│  ├─ Match against smartWallets table                       │
│  ├─ Get displayName and influenceScore                     │
│  └─ Calculate directive:                                    │
│     • 90%+ WR, $2M+ = "PRIORITY WATCH" 🚨                 │
│     • 85%+ WR, $1.5M+ = "HIGH WATCH" ⚠️                   │
│     • 80%+ WR, $1M+ = "ACCUMULATION SIGNAL" 📈            │
│     • 75%+ WR, $500K+ = "EARLY WATCH" 👀                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Generate alert
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Alert Dispatching                         │
│                                                              │
│  Discord Channel                    Telegram Group          │
│  ┌───────────────────┐              ┌──────────────────┐   │
│  │ 🧠 SMART MONEY    │              │ 🧠 SMART MONEY   │   │
│  │                   │              │                  │   │
│  │ "KOL Sniper"      │              │ "KOL Sniper"     │   │
│  │ bought TOKEN_X    │              │ bought TOKEN_X   │   │
│  │                   │              │                  │   │
│  │ Win Rate: 82%     │              │ Win Rate: 82%    │   │
│  │ Profit: $4.2M     │              │ Profit: $4.2M    │   │
│  │ Influence: 95/100 │              │ Influence: 95    │   │
│  │                   │              │                  │   │
│  │ 🚨 PRIORITY WATCH │              │ 🚨 PRIORITY      │   │
│  └───────────────────┘              └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Wallet Distribution by Type

```
Memecoin Specialists  ████████████████████ 18 wallets
Launch Snipers        ███████████████ 15 wallets
DeFi/LP Farmers       ████████████ 12 wallets
Airdrop Hunters       ██████████ 10 wallets
Jito/Bundle Experts   ████████ 8 wallets
Whale Holders         ████████ 8 wallets
Bridge/Arb            ████████ 8 wallets
NFT Flippers          ████████ 8 wallets
Other Strategies      █████████████ 13 wallets
```

## 🎖️ Influence Score Distribution

```
90-95 (Ultra)   ████████ 5 wallets   → PRIORITY ALERTS
85-89 (High)    ███████████████████ 19 wallets
80-84 (Good)    ████████████████████████████████████████ 41 wallets
77-79 (Active)  ███████████████████████████████████ 35 wallets
```

## 📈 Performance Tiers

```
Elite (80%+ WR)   ██████████████ 14 wallets
Expert (77-79%)   ███████████████████████████████████████ 43 wallets
Pro (75-76%)      ███████████████████████████████████████ 43 wallets
```

## 🔄 Data Flow Timeline

```
1. Bot Startup
   └─ Load wallets from DB
      └─ Start monitoring (100 wallets)

2. Wallet Activity (real-time)
   └─ "KOL Sniper" buys new token
      └─ Detect via Helius/Ankr webhook
         └─ Query holder analysis
            └─ Match wallet in smartWallets table
               └─ Retrieve displayName + influenceScore
                  └─ Calculate directive
                     └─ Send alert to Discord/Telegram

3. User Receives Alert (<5 seconds)
   └─ See shorthand name: "KOL Sniper"
      └─ See metrics: 82% WR, $4.2M profit
         └─ See directive: 🚨 PRIORITY WATCH
            └─ Make informed decision
```

## 🎮 Example Alert Message

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 SMART MONEY ALERT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Wallet: KOL Sniper
📊 Win Rate: 82% | Influence: 95/100
💰 Historical Profit: $4.2M

🪙 Token: PUMP123...xyz
🔥 Action: BUY
💵 Amount: 50 SOL

📝 Notes: KOL sniper; early Pump.fun entrant
🎯 Strategy: Launch specialist

🚨 DIRECTIVE: PRIORITY WATCH

Early Pump.fun entries by this wallet have
historically led to 82% winning trades.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🛠️ Key Components

### Seed Script
- **File**: `server/seed-top-100-smart-wallets.ts`
- **Run**: `npm run seed:smart-wallets`
- **Action**: Upserts 100 wallets into DB

### Alpha Alerts
- **File**: `server/alpha-alerts.ts`
- **Method**: `refreshWalletListFromDatabase()`
- **Action**: Queries smartWallets, monitors activity

### Database Schema
- **Table**: `smart_wallets`
- **Indexes**: wallet_address, influence_score, is_active
- **Relations**: smartSignals (1-to-many)

### Documentation
- `TOP_100_SMART_WALLETS.md` - Full list
- `SMART_MONEY_QUICK_REF.md` - Quick lookup
- `SMART_MONEY_LOADED_SUMMARY.md` - Integration guide

## ✅ Pre-flight Checklist

- [x] 100 wallets defined with shorthand names
- [x] Seed script created (`server/seed-top-100-smart-wallets.ts`)
- [x] NPM script added (`npm run seed:smart-wallets`)
- [x] Database schema confirmed (`smart_wallets` table exists)
- [x] Alpha alerts integration verified (queries smartWallets)
- [x] Display names will appear in alerts
- [x] Influence scoring implemented
- [x] Directive system configured
- [x] Documentation complete

## 🚀 Deploy Instructions

### 1. Railway/Production
```bash
# Via Railway CLI
railway run npx tsx server/seed-top-100-smart-wallets.ts

# Or add to deployment script
npm run seed:smart-wallets
```

### 2. Local Development
```bash
# Start PostgreSQL first
# Then seed wallets
npm run seed:smart-wallets
```

### 3. Verify
```bash
# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM smart_wallets WHERE source='top100-gmgn-2025';"
# Should return: 100

# Check alpha alerts logs
# Should see: "Found 100 active smart wallets"
```

## 🎉 Done!

All 100 smart money wallets are ready to be loaded into your system with their shorthand names. The integration is already in place - just run the seed script when your database is connected!

**Last day of work task**: ✅ COMPLETE

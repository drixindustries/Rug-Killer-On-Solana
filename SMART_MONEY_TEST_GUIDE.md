# 🧪 Smart Money Wallet Testing Guide

## ✅ Test Results Summary

The test script successfully verified:
- ✅ **Smart Money Relay**: Working (published and received event)
- ✅ **Database Connection**: Available (but not seeded yet)
- ⚠️ **Discord Webhook**: Not configured
- ⚠️ **Telegram Bot**: Token set, but Chat ID missing

## 🔧 Configuration Needed

### 1. Discord Alpha Alerts

Add to your `.env` file:
```bash
DISCORD_ALPHA_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

**How to get Discord webhook:**
1. Open your Discord server
2. Right-click the channel where you want alerts
3. Edit Channel → Integrations → Webhooks
4. Create New Webhook
5. Copy the Webhook URL
6. Paste into `.env` as `DISCORD_ALPHA_WEBHOOK`

### 2. Telegram Alpha Alerts

Add to your `.env` file:
```bash
TELEGRAM_ALPHA_CHAT_ID=-1001234567890
```

**How to get Telegram Chat ID:**

#### Method 1: Using Bot Command
1. Start your bot: `npm run dev`
2. In your Telegram group, send: `/chatid`
3. Bot will reply with the Chat ID
4. Add to `.env` as `TELEGRAM_ALPHA_CHAT_ID`

#### Method 2: Manual Method
1. Add your bot to the group
2. Send a test message in the group
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find `"chat":{"id":-1001234567890}` in the response
5. Copy that ID (including the minus sign)
6. Add to `.env`

## 🚀 Running the Test

Once configured, run:
```bash
npm run test:smart-wallets
```

This will:
1. ✅ Test database connection
2. ✅ Test smart money relay service
3. ✅ Send a test alert to Discord
4. ✅ Send a test alert to Telegram
5. ✅ Show system health status

## 📬 Expected Test Messages

### Discord Alert (Embed)
```
🧪 SMART MONEY TEST ALERT

👤 Wallet: KOL Sniper (Test Wallet)
   4aKx7fV9r4e8...

📊 Performance
   Win Rate: 82%
   Profit: $4.2M
   Influence: 95/100

🪙 Token Activity
   Token: BtQQxvS6RNm5...
   Action: BUY
   Age: 5 minutes

🎯 Directive: 🚨 ACCUMULATION SIGNAL

📝 Notes
   KOL sniper; early Pump.fun entrant. This wallet has 
   historically identified winning memecoins with 82% accuracy.
```

### Telegram Alert (Markdown)
```
🧪 SMART MONEY TEST ALERT

🧠 Smart Money Activity Detected

👤 Wallet: KOL Sniper (Test)
   4aKx7fV9r4e8...

📊 Performance:
   • Win Rate: 82%
   • Profit: $4.2M
   • Influence: 95/100

🪙 Token Activity:
   • Token: BtQQxvS6RNm5...
   • Action: BUY
   • Age: 5 minutes

🎯 Directive: 🚨 ACCUMULATION SIGNAL

📝 Notes:
   KOL sniper; early Pump.fun entrant...
```

## 🔄 Full Setup Process

### 1. Seed Smart Wallets (Once Database is Running)
```bash
npm run seed:smart-wallets
```
This loads the 100 elite wallets into your database.

### 2. Configure Webhooks
Add to `.env`:
```bash
DISCORD_ALPHA_WEBHOOK=your_webhook_url
TELEGRAM_ALPHA_CHAT_ID=your_chat_id
```

### 3. Run Test
```bash
npm run test:smart-wallets
```

### 4. Verify Alerts
Check both Discord and Telegram for test messages.

### 5. Start Bot Server
```bash
npm run dev
```
Now live monitoring is active!

## 🎯 What Each Test Does

### Step 1: Database Connection
- Queries `smart_wallets` table
- Shows first 5 active wallets
- Displays their names, win rates, and influence scores

### Step 2: Smart Money Relay
- Creates a mock smart money event
- Publishes through the relay service
- Verifies event delivery
- Shows relay statistics

### Step 3: Discord Alert
- Sends a formatted embed to Discord
- Includes all wallet details
- Uses color-coded directive
- Shows timestamp

### Step 4: Telegram Alert
- Sends Markdown formatted message
- Includes performance metrics
- Shows directive with emoji
- Optimized for mobile viewing

### Step 5: Health Check
- Verifies all environment variables
- Shows system configuration
- Reports on component status

## 📊 Understanding the Test Wallet

**Name**: KOL Sniper (Rank #1 from Top 100)

**Performance**:
- Win Rate: 82%
- Realized Profit: $4.2M (2025)
- Influence Score: 95/100

**Strategy**: Early Pump.fun entry specialist

**Directive**: ACCUMULATION SIGNAL
- Calculated from win rate (82%) and profit ($4.2M)
- Triggers high-priority alerts

## 🛠️ Troubleshooting

### Database Connection Failed
**Issue**: `❌ Database connection failed`

**Solution**: 
- Your local PostgreSQL isn't running
- The test will use mock data and continue
- To fix: Start PostgreSQL or use Railway database URL

### Discord Webhook Not Configured
**Issue**: `⚠️ DISCORD_ALPHA_WEBHOOK not configured`

**Solution**:
1. Get webhook URL from Discord channel settings
2. Add to `.env`: `DISCORD_ALPHA_WEBHOOK=url`
3. Re-run test

### Telegram Chat ID Missing
**Issue**: `⚠️ Telegram not configured`

**Solution**:
1. Get chat ID using bot command or manual method
2. Add to `.env`: `TELEGRAM_ALPHA_CHAT_ID=-1001234567890`
3. Re-run test

### No Alerts Received
**Check**:
1. Verify webhook URLs are correct
2. Check bot has permissions in channels
3. Look at terminal output for error messages
4. Verify environment variables loaded: `echo $DISCORD_ALPHA_WEBHOOK`

## 🎉 Success Indicators

You'll know the system is working when:

✅ Database shows active smart wallets  
✅ Relay service publishes events  
✅ Discord receives test embed  
✅ Telegram receives test message  
✅ Terminal shows all green checkmarks  

## 📝 Quick Commands

```bash
# Test smart money alerts
npm run test:smart-wallets

# Seed wallets to database
npm run seed:smart-wallets

# Start bot server
npm run dev

# Check environment
cat .env | grep -E "DISCORD_ALPHA|TELEGRAM_ALPHA"
```

## 🔮 Next Steps After Testing

Once tests pass:

1. **Seed Database**: `npm run seed:smart-wallets` (when DB available)
2. **Start Server**: `npm run dev`
3. **Monitor Logs**: Watch for smart money activity
4. **Verify Live Alerts**: Wait for real wallet activity

The system will automatically:
- Load 100 wallets from database
- Monitor their activity via webhooks
- Send alerts when they buy tokens
- Include wallet name, performance, and directive

---

**Test Script Location**: `test-smart-money-wallets.ts`  
**Command**: `npm run test:smart-wallets`  
**Status**: ✅ Ready to use (configure webhooks first)

# 🚀 Smart Money Alerts - Quick Setup

## 📋 Prerequisites Checklist

- [ ] PostgreSQL database running (or Railway DB URL)
- [ ] Discord webhook URL
- [ ] Telegram bot token
- [ ] Telegram chat ID

## ⚡ 3-Step Setup

### Step 1: Get Your Webhook URLs

#### Discord Webhook
1. Open Discord → Server → Channel Settings
2. Integrations → Webhooks → New Webhook
3. Copy webhook URL
4. Add to `.env`:
   ```bash
   DISCORD_ALPHA_WEBHOOK=https://discord.com/api/webhooks/...
   ```

#### Telegram Chat ID
1. Send a message in your Telegram group
2. Run helper:
   ```bash
   npm run get-telegram-chatid
   ```
3. Copy the Chat ID shown
4. Add to `.env`:
   ```bash
   TELEGRAM_ALPHA_CHAT_ID=-1001234567890
   ```

### Step 2: Seed Smart Wallets
```bash
npm run seed:smart-wallets
```

Loads 100 elite wallets with shorthand names.

### Step 3: Test Alerts
```bash
npm run test:smart-wallets
```

Sends test messages to Discord and Telegram.

## ✅ Verify

You should see:
- ✅ Database: "Found X active smart wallets"
- ✅ Discord: Test embed with "KOL Sniper" details
- ✅ Telegram: Test message with wallet performance

## 🎯 Expected Test Alert

```
🧪 SMART MONEY TEST ALERT

👤 Wallet: KOL Sniper
📊 Win Rate: 82% | Profit: $4.2M
🎯 Directive: 🚨 ACCUMULATION SIGNAL

This wallet has historically identified winning
memecoins with 82% accuracy.
```

## 🚀 Go Live

Once tests pass:
```bash
npm run dev
```

The system will:
1. Load 100 smart wallets from database
2. Monitor their blockchain activity
3. Send alerts when they buy tokens
4. Include shorthand names and directives

## 📁 Key Files

- **Seed Script**: `server/seed-top-100-smart-wallets.ts`
- **Test Script**: `test-smart-money-wallets.ts`
- **Telegram Helper**: `get-telegram-chatid.ts`

## 🆘 Need Help?

### Database Not Connected
```bash
# Check DATABASE_URL in .env
echo $DATABASE_URL

# Or use Railway database
# Get from Railway dashboard
```

### Discord Not Receiving
- Check webhook URL is correct
- Verify bot has permissions
- Test manually: paste webhook URL in browser with `/slack` suffix

### Telegram Not Receiving
- Verify bot token is correct
- Check chat ID includes minus sign (for groups)
- Ensure bot is admin in group/channel

## 🎉 Success Metrics

After setup, you'll receive alerts like:

```
🧠 SMART MONEY ALERT

👤 KOL Sniper bought $TOKEN
   Win Rate: 82% | Influence: 95/100

🚨 PRIORITY WATCH
   This wallet has $4.2M in realized profits
   with 82% win rate on Pump.fun launches.

🔗 [View on Solscan]
```

---

**Commands Summary**:
- `npm run get-telegram-chatid` - Get Telegram Chat ID
- `npm run seed:smart-wallets` - Load 100 wallets
- `npm run test:smart-wallets` - Send test alerts
- `npm run dev` - Start live monitoring

**Status**: ✅ Ready (configure webhooks → test → go live)

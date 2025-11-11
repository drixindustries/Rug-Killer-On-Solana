# 🤖 Rug Killer Alpha Bot - Complete Setup Guide

## ✅ Features Already Built

Your bots are **100% ready** with all features:

### **Core Commands (Both Platforms)**
- `/execute [token]` - Full 52-metric rug detection scan
- `/first20 [token]` - Top 20 holder concentration analysis
- `/devtorture [token]` - Developer wallet history tracking
- `/blacklist [wallet]` - Check if wallet is flagged for scams

### **Telegram Exclusive**
- Direct message any token address → Instant quick analysis
- `/start` - Welcome message with command list

### **Discord Exclusive**
- Rich embeds with color-coded risk levels (green/yellow/orange/red)
- Slash commands with auto-complete
- Server-wide real-time alerts (optional)

### **Alpha Alerts** 🔥
- Monitors influential wallet activity from configurable watchlists
- Real-time pump.fun new token launches via WebSocket
- Quality filtering: RugCheck > 85, no honeypots, liquidity > $5K
- Auto-pings Discord/Telegram channels with @everyone

---

## 📋 Part 1: Create Telegram Bot

### **Step 1: Talk to BotFather**

1. Open Telegram
2. Search for **@BotFather** (verified with blue checkmark)
3. Click **Start**

### **Step 2: Create Your Bot**

Send these commands to BotFather:

```
/newbot
```

**BotFather will ask:** "Alright, a new bot. How are we going to call it?"

**You reply:**
```
Rug Killer Alpha Bot
```

**BotFather will ask:** "Good. Now let's choose a username for your bot."

**You reply:**
```
RugKillerAlphaBot
```
(Must end in "bot" or "Bot", no spaces)

### **Step 3: Copy Your Token**

BotFather will send you a message like:

```
Done! Congratulations on your new bot. You will find it at t.me/RugKillerAlphaBot.

Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567
```

**COPY THAT ENTIRE TOKEN!**

### **Step 4: Set Bot Description (Optional)**

Make your bot look professional:

```
/setdescription
```

Select your bot, then paste this description:

```
🔥 Solana Rug Killer Alpha Bot

Protect yourself from rug pulls with real-time token analysis powered by 52+ security metrics.

Commands:
• /execute - Full rug detection scan
• /first20 - Holder concentration
• /devtorture - Dev wallet history
• /blacklist - Scam check

Send any token address for instant analysis!
```

### **Step 5: Set Bot About (Optional)**

```
/setabouttext
```

Select your bot, then paste:

```
Advanced Solana token security analysis. Detects rug pulls, honeypots, and scams using AI-powered metrics.
```

---

## 📋 Part 2: Create Discord Bot

### **Step 1: Go to Discord Developer Portal**

1. Visit: https://discord.com/developers/applications
2. Click **"New Application"**
3. Name: **Rug Killer Alpha Bot**
4. Agree to terms → **Create**

### **Step 2: Get Your Client ID**

1. You're now on the "General Information" page
2. **Copy the "Application ID"** (also called Client ID)
   - Example: `1234567890123456789`
3. **Save this - you'll need it for Replit secrets!**

### **Step 3: Create the Bot**

1. Click **"Bot"** in the left sidebar
2. Click **"Add Bot"** → Confirm
3. Under "Token" section, click **"Reset Token"** → Confirm
4. **COPY THE TOKEN** (you can only see it once!)
   - Example: `MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.AbCdEf.GhIjKlMnOpQrStUvWxYz`
5. **Save this token securely!**

### **Step 4: Configure Bot Settings**

Scroll down on the Bot page:

**Privileged Gateway Intents:**
- ✅ Enable **MESSAGE CONTENT INTENT**
- ✅ Enable **SERVER MEMBERS INTENT** (optional, for member counts)

Click **"Save Changes"**

### **Step 5: Set Bot Avatar (Optional)**

1. Click **"General Information"** in left sidebar
2. Click **APP ICON** → Upload your Rug Killer logo
3. **Save Changes**

---

## 🔐 Part 3: Add Secrets to Replit

Now add these secrets to your Replit project:

### **Required Secrets:**

1. **TELEGRAM_BOT_TOKEN**
   ```
   Paste the token from BotFather (Step 2, Part 1)
   ```

2. **TELEGRAM_BOT_URL**
   ```
   https://t.me/RugKillerAlphaBot
   ```
   (Use your actual bot username)

3. **DISCORD_BOT_TOKEN**
   ```
   Paste the token from Discord Developer Portal (Step 3, Part 2)
   ```

4. **DISCORD_CLIENT_ID**
   ```
   Paste the Application ID from Discord Developer Portal (Step 2, Part 2)
   ```

### **Optional (For Alpha Alerts):**

5. **ALPHA_DISCORD_WEBHOOK** *(optional)*
   - Create a webhook in your Discord server
   - Settings → Integrations → Webhooks → New Webhook
   - Copy webhook URL

6. **ALPHA_TELEGRAM_CHAT_ID** *(optional)*
   - For Telegram channel alerts
   - Get chat ID by sending a message to your bot, then check: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`

---

## 🚀 Part 4: Start the Bots

### **In Replit:**

1. **Add all secrets** from Part 3
2. **Restart the app** (it auto-restarts when you add secrets)
3. **Check logs** for success messages:
   ```
   ✅ Telegram bot started: @RugKillerAlphaBot
   ✅ Discord bot registered slash commands
   ✅ Discord bot ready
   ```

### **If Bots Don't Start:**

Check the logs for errors. Common issues:
- ❌ Missing required secrets
- ❌ Invalid bot token (copy/paste error)
- ❌ Discord intents not enabled

---

## 🧪 Part 5: Test Your Bots

### **Telegram:**

1. Open Telegram
2. Search for **@RugKillerAlphaBot**
3. Click **Start**
4. Try commands:
   ```
   /start
   /execute EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
   ```
   (That's USDC token for testing)

### **Discord:**

1. **Invite bot to your server:**
   - The website will show the invite link automatically
   - Or construct manually:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147502080&scope=bot%20applications.commands
   ```
   (Replace YOUR_CLIENT_ID)

2. **Test commands:**
   ```
   /execute address:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
   ```

---

## 📊 Part 6: Enable Alpha Alerts

### **For Discord:**

1. Create a dedicated channel: `#alpha-alerts`
2. Go to **Server Settings → Integrations → Webhooks**
3. **Create Webhook:**
   - Name: `RugKiller Alerts`
   - Channel: `#alpha-alerts`
   - Copy webhook URL
4. Add to Replit secrets as **ALPHA_DISCORD_WEBHOOK**

### **For Telegram:**

1. Create a Telegram channel or group
2. Add your bot as admin
3. Send a message to the channel
4. Get chat ID from: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
5. Add to Replit secrets as **ALPHA_TELEGRAM_CHAT_ID**

---

## ✅ You're Done!

Your bots are now live with:
- ✅ Full token analysis
- ✅ Holder concentration reports
- ✅ Dev wallet tracking
- ✅ Blacklist checking
- ✅ Alpha alerts (if webhooks configured)

**Bot invite links will appear automatically in your website header/footer for subscribed users!**

---

## 🆘 Troubleshooting

### **Bot not responding:**
- Check Replit logs for errors
- Verify bot tokens are correct
- Ensure Discord intents are enabled

### **Commands not appearing in Discord:**
- Wait 1-2 minutes after bot starts
- Kick and re-invite the bot
- Check bot has "applications.commands" scope

### **Alpha alerts not working:**
- Verify webhook URLs are correct
- Check bot is admin in Telegram channel
- Ensure RPC_URL is set (custom Helius/QuickNode recommended)

### **"Unauthorized" errors:**
- User needs active subscription OR 10M+ $RUGK tokens
- Check subscription status in app
- Verify Whop integration is working

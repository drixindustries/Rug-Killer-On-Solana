# Discord Bot Setup Guide

## ⚠️ QUICK FIX - Bot Commands Not Showing?

**If your Discord bot commands are not appearing in your server, the most common issue is:**

The `DISCORD_ENABLED` environment variable is **NOT set to `true`**!

**Solution:**
1. Add `DISCORD_ENABLED=true` to your environment variables (Railway, Replit Secrets, or .env file)
2. Restart your application
3. Check the server logs - you should see "✅ Discord bot started successfully"
4. If you see "ℹ️ Discord bot disabled", the bot is not enabled

---

## Quick Setup Checklist

Your Discord bot is **RugKillerAlphaBot** with Application ID: `1437952073319714879`

### ✅ Step 1: Enable Bot in Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (RugKillerAlphaBot - ID: 1437952073319714879)
3. Navigate to **Bot** section (left sidebar)
4. Scroll down to **"Privileged Gateway Intents"**
5. **OPTIONAL** (only if you want to add message-based commands in the future):
   - Toggle ON **Message Content Intent**
   - Toggle ON **Server Members Intent** (if you need member events)

**Note:** The bot currently uses **slash commands** which don't require privileged intents. The basic `Guilds` intent is all that's needed.

### ✅ Step 2: Invite Bot to Your Server

Use this invite link (replace YOUR_CLIENT_ID with `1437952073319714879`):

```
https://discord.com/api/oauth2/authorize?client_id=1437952073319714879&permissions=277025770496&scope=bot%20applications.commands
```

**Permissions included:**
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands
- Add Reactions

### ✅ Step 3: Verify Environment Variables

**IMPORTANT:** Make sure these are set in your environment (Replit Secrets, Railway, or .env file):

```bash
DISCORD_ENABLED=true
DISCORD_BOT_TOKEN=your-bot-token-here
DISCORD_CLIENT_ID=1437952073319714879
DISCORD_PUBLIC_KEY=78e4e4e211267262d640e1b019c769940c58d46cd8ec3d15043c27832d38bc84
```

**Note:** The `DISCORD_ENABLED=true` variable is **required** for the bot to start. Without it, the bot will not load even if you have valid credentials.

### ✅ Step 4: Test the Bot

Once the bot is running, you can test it in your Discord server:

1. Type `/` in any channel
2. You should see the RugKillerAlphaBot commands:
   - `/execute` - Full 52-metric rug detection scan
   - `/first20` - Top 20 holder concentration analysis
   - `/devaudit` - Developer wallet history tracking
   - `/blacklist` - Check if wallet is flagged

## Available Commands

### `/execute <token_address>`
**Full Token Analysis**

Performs comprehensive 52-metric rug detection including:
- Risk score (0-100) with color-coded levels
- Mint & freeze authority checks
- Top holder concentration
- Liquidity pool status and LP burn percentage
- Red flags and warnings
- Links to Rugcheck, DexScreener, and BubbleMaps

**Example:**
```
/execute 2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt
```

### `/first20 <token_address>`
**Holder Analysis**

Shows detailed breakdown of top 20 holders:
- Wallet addresses (truncated for readability)
- Token balance
- Percentage of total supply
- Top 10 and Top 20 concentration percentages
- Holder distribution chart

**Example:**
```
/first20 2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt
```

### `/devaudit <token_address>`
**Developer Wallet History**

Tracks developer wallet activity:
- Previous token launches
- Success/failure rate
- Rug pull history
- Pattern recognition
- Creator wallet credibility score

**Example:**
```
/devaudit 2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt
```

### `/blacklist <wallet_address>`
**Blacklist Check**

Checks if a wallet is flagged in our AI-powered blacklist:
- Severity level (0-100)
- Flag types (honeypot creator, wash trading, etc.)
- Evidence and reasoning
- Related scam tokens
- Historical activity

**Example:**
```
/blacklist AbCd1234EfGh5678IjKl9012MnOp3456QrSt7890UvWx
```

## Troubleshooting

### Bot Not Responding

1. **Check DISCORD_ENABLED is set to true** - This is the most common issue! The bot won't start without `DISCORD_ENABLED=true` in your environment
2. **Check bot is online** - Look for green status in Discord server and check server logs for "Discord bot started successfully"
3. **Verify permissions** - Bot needs Send Messages and Use Slash Commands
4. **Re-invite bot** - Use the invite link above with fresh permissions
5. **Check logs** - Restart the application and check console for:
   - "✅ Discord bot started successfully" (bot is running)
   - "ℹ️ Discord bot disabled" (bot is not enabled - check DISCORD_ENABLED variable)

### Commands Not Showing

1. **Wait 1-2 minutes** - Slash commands take time to propagate
2. **Restart Discord** - Completely close and reopen Discord app
3. **Re-register commands** - Restart the Replit application
4. **Check scope** - Make sure you invited with `applications.commands` scope

### "Used disallowed intents" Error

This error means you're requesting privileged intents that aren't enabled in the Developer Portal.

**Solution:**
- The bot has been updated to only use `Guilds` intent (no privileged intents needed)
- If you see this error, restart the Replit application after enabling the intent in Discord Developer Portal

## Rich Embed Features

All bot responses use **rich embeds** with:

- **Color-coding** based on risk level:
  - 🟢 Green (0-30): LOW risk
  - 🟡 Yellow (31-60): MODERATE risk
  - 🟠 Orange (61-80): HIGH risk
  - 🔴 Red (81-100): EXTREME risk

- **Organized sections** with clear headers
- **Inline fields** for compact information display
- **Timestamps** on all responses
- **External links** to additional resources

## Rate Limiting

Discord enforces rate limits on bot commands:
- **5 commands per 5 seconds** per user
- **50 commands per 10 seconds** per guild

If you hit rate limits, wait a few seconds before trying again.

## Support

For bot issues:
- **GitHub Issues**: Report bugs and request features
- **Discord Community**: Get help from other users
- **Email**: legal@yourwebsite.com

## Links

- **Discord Developer Portal**: https://discord.com/developers/applications
- **Bot Invite**: https://discord.com/api/oauth2/authorize?client_id=1437952073319714879&permissions=277025770496&scope=bot%20applications.commands
- **Main Documentation**: See [BOT_SETUP_GUIDE.md](./BOT_SETUP_GUIDE.md)
- **Terms of Service**: https://yourwebsite.com/terms
- **Privacy Policy**: https://yourwebsite.com/privacy

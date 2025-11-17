# Discord Bot Setup Guide

## Problem: "Cannot add bot to server" / OAuth2 Issues

This guide will help you properly configure and invite your Discord bot to your server.

---

## Step 1: Create/Configure Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (or create a new one if needed)
3. Note your **Application ID** - this is your `DISCORD_CLIENT_ID`

---

## Step 2: Get Your Bot Token

1. In your Discord application, go to the **Bot** section (left sidebar)
2. If you haven't created a bot yet, click **"Add Bot"**
3. Under the bot's username, click **"Reset Token"** (or "Copy" if it's visible)
4. **IMPORTANT**: Save this token immediately - you can only see it once!
5. This is your `DISCORD_BOT_TOKEN`

### Bot Settings to Configure:

Under **Privileged Gateway Intents**, enable:
- ✅ **MESSAGE CONTENT INTENT** (required for the bot to read messages)
- ✅ **SERVER MEMBERS INTENT** (optional, but recommended)
- ✅ **PRESENCE INTENT** (optional)

Click **Save Changes**

---

## Step 3: Configure OAuth2 Permissions

1. Go to **OAuth2** → **URL Generator** (left sidebar)

2. Under **SCOPES**, select:
   - ✅ `bot`
   - ✅ `applications.commands`

3. Under **BOT PERMISSIONS**, select:
   - ✅ **Send Messages**
   - ✅ **Send Messages in Threads**
   - ✅ **Embed Links**
   - ✅ **Attach Files**
   - ✅ **Read Message History**
   - ✅ **Use Slash Commands**
   - ✅ **Mention @everyone, @here, and All Roles** (for alpha alerts)
   - ✅ **Add Reactions** (optional)
   - ✅ **Use External Emojis** (optional)

4. **Copy the Generated URL** at the bottom of the page

---

## Step 4: Update Your .env File

1. Open `server/.env` (create it from `.env.example` if it doesn't exist)

2. Add/update these lines:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
DISCORD_CLIENT_ID=YOUR_APPLICATION_ID_HERE
DISCORD_ENABLED=true

# Optional: Admin user IDs (comma-separated Discord user IDs)
ALPHA_DISCORD_ADMIN_IDS=123456789012345678,987654321098765432
```

### How to Get Your Discord User ID:
1. Enable Developer Mode in Discord: Settings → Advanced → Developer Mode
2. Right-click your username → Copy User ID
3. Add it to `ALPHA_DISCORD_ADMIN_IDS`

---

## Step 5: Invite Bot to Your Server

### Option A: Use the URL from Step 3
1. Open the URL you copied in Step 3
2. Select your server from the dropdown
3. Click **Authorize**
4. Complete the captcha

### Option B: Generate URL Manually
Use this template (replace `YOUR_CLIENT_ID` with your actual Application ID):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=414464724032&scope=bot%20applications.commands
```

**Permission Integer Breakdown** (`414464724032`):
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Use Slash Commands
- Mention @everyone
- Use External Emojis

---

## Step 6: Start Your Bot

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies (if not already done):
```bash
npm install
```

3. Start the server:
```bash
npm run dev
```

4. You should see:
```
✅ Discord bot logged in as YourBotName#1234
Started refreshing Discord application (/) commands.
Successfully reloaded Discord application (/) commands.
```

---

## Step 7: Test the Bot

1. In your Discord server, type `/help`
2. The bot should respond with a list of commands
3. Try `/execute <token_address>` with a Solana token address

---

## Common Issues & Solutions

### ❌ "Missing Access" when adding bot
**Solution**: Make sure you have `bot` and `applications.commands` scopes selected in OAuth2

### ❌ "Invalid Permissions" 
**Solution**: The bot needs at minimum:
- Send Messages
- Embed Links
- Use Slash Commands

### ❌ "Bot doesn't respond to commands"
**Solution**: 
1. Check that `DISCORD_ENABLED=true` in `.env`
2. Verify `DISCORD_BOT_TOKEN` is correct
3. Make sure **MESSAGE CONTENT INTENT** is enabled in Discord Developer Portal
4. Restart your server after changing `.env`

### ❌ "Slash commands not showing"
**Solution**:
1. Wait 1-2 minutes after bot joins (Discord caches commands)
2. Check server logs for "Successfully reloaded Discord application (/) commands"
3. Try kicking and re-inviting the bot
4. Make sure `applications.commands` scope is selected

### ❌ "Bot is online but doesn't read messages"
**Solution**: Enable **MESSAGE CONTENT INTENT** in Discord Developer Portal → Bot → Privileged Gateway Intents

### ❌ "@everyone mentions don't work in alpha alerts"
**Solution**: 
1. Make sure bot has "Mention @everyone" permission
2. Bot's role must be higher than @everyone in server role hierarchy
3. The channel must allow @everyone mentions

---

## Advanced Configuration

### Alpha Alerts (Optional)

If you want the bot to send alpha/smart money alerts:

1. Configure in `.env`:
```env
ALPHA_ALERTS_ENABLED=true
ALPHA_DISCORD_ADMIN_IDS=your_discord_user_id
```

2. In Discord, use these commands:
```
/alpha setchannel #channel-name    # Set alert channel
/alpha where                       # Check configured channel
/alpha start                       # Start monitoring
/alpha status                      # Check service status
```

3. Smart Money alerts:
```
/smart setchannel #channel-name    # Set smart money channel
/smart where                       # Check configured channel
```

### Required Permissions for Alerts:
- Administrator, Manage Guild, or Manage Channels role
- Or be in `ALPHA_DISCORD_ADMIN_IDS` list

---

## Full OAuth2 URL Template

Here's the complete URL with all recommended permissions:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=414464724032&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID` with your actual Discord Application ID.

---

## Verification Checklist

Before inviting the bot, verify:

- [ ] `DISCORD_BOT_TOKEN` is set in `.env`
- [ ] `DISCORD_CLIENT_ID` is set in `.env`
- [ ] `DISCORD_ENABLED=true` in `.env`
- [ ] **MESSAGE CONTENT INTENT** is enabled in Discord Developer Portal
- [ ] OAuth2 URL includes `bot` and `applications.commands` scopes
- [ ] Bot has Send Messages, Embed Links, and Use Slash Commands permissions
- [ ] Database is running and migrations are applied (`npm run migrate` in server/)

---

## Quick Reference: Required .env Variables

```env
# REQUIRED for Discord bot
DISCORD_BOT_TOKEN=your_bot_token_from_discord_dev_portal
DISCORD_CLIENT_ID=your_application_id_from_discord
DISCORD_ENABLED=true

# OPTIONAL
ALPHA_DISCORD_ADMIN_IDS=comma_separated_user_ids
DISCORD_INVITE_URL=your_custom_invite_url
```

---

## Still Having Issues?

1. **Check Bot Status**: Make sure the bot is online in your server (green dot)
2. **Check Logs**: Look at server terminal for error messages
3. **Verify Token**: Make sure there are no extra spaces in `DISCORD_BOT_TOKEN`
4. **Restart Server**: After any `.env` changes, restart the server
5. **Check Intents**: Verify MESSAGE CONTENT INTENT is enabled in Discord Dev Portal

---

## What Permissions Does the Bot Actually Need?

**Minimum (Core Functionality)**:
- Send Messages
- Embed Links
- Use Slash Commands

**Recommended (Full Features)**:
- Send Messages in Threads
- Attach Files
- Read Message History
- Mention @everyone (for alerts)
- Add Reactions
- Use External Emojis

**Not Required**:
- Administrator (never give bots admin!)
- Manage Channels
- Manage Roles
- Kick/Ban Members

---

## Success!

Once configured correctly, you should be able to:
- ✅ See the bot online in your server
- ✅ Use `/help` to see all commands
- ✅ Use `/execute <token>` to analyze tokens
- ✅ Paste Solana addresses directly in chat for quick links
- ✅ Set up alpha alerts with `/alpha setchannel`

---

## Need Help?

If you're still stuck:
1. Check the server logs for specific error messages
2. Verify all environment variables are set correctly
3. Make sure Discord Developer Portal settings match this guide
4. Try creating a fresh bot application and starting over

The most common issue is forgetting to enable **MESSAGE CONTENT INTENT** in the Discord Developer Portal!

# Discord Bot Troubleshooting Guide

## Common Issues and Solutions

### ❌ Issue: Discord bot commands not showing in server

**Symptom:** When you type `/` in Discord, you don't see any bot commands or the bot doesn't respond.

**Most Common Cause:** The `DISCORD_ENABLED` environment variable is not set to `true`.

**Solution:**

1. **Set the environment variable:**
   - If using Railway: Add `DISCORD_ENABLED=true` to your environment variables
   - If using Replit: Add `DISCORD_ENABLED=true` to Secrets
   - If using local .env file: Add `DISCORD_ENABLED=true` to your `.env` file

2. **Verify all required environment variables are set:**
   ```bash
   DISCORD_ENABLED=true
   DISCORD_BOT_TOKEN=your-actual-bot-token
   DISCORD_CLIENT_ID=your-actual-client-id
   ```

3. **Restart your application**

4. **Check the server logs:**
   - ✅ Success: `"✅ Discord bot started successfully"`
   - ❌ Not enabled: `"ℹ️ Discord bot disabled (set DISCORD_ENABLED=true to enable)"`
   - ⚠️ Error: Look for error messages about Discord

### ❌ Issue: Bot shows as offline

**Possible Causes:**
1. Invalid or expired bot token
2. Bot token not set in environment
3. Application crashed or not running

**Solution:**
1. Verify `DISCORD_BOT_TOKEN` is correct in your Discord Developer Portal
2. Make sure `DISCORD_ENABLED=true` is set
3. Check server logs for errors

### ❌ Issue: Commands registered but not responding

**Possible Causes:**
1. Bot doesn't have proper permissions in the server
2. Slash commands not properly registered

**Solution:**
1. Re-invite the bot with proper permissions using this link:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=277025770496&scope=bot%20applications.commands
   ```
   (Replace YOUR_CLIENT_ID with your actual client ID)

2. Make sure the bot has these permissions:
   - Send Messages
   - Embed Links
   - Read Message History
   - Use Slash Commands
   - Add Reactions

3. Wait 1-2 minutes for Discord to propagate the slash commands
4. Restart Discord (completely close and reopen)

### ❌ Issue: "Used disallowed intents" error

**Cause:** The bot is trying to use privileged intents that aren't enabled in the Developer Portal.

**Solution:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to "Bot" section
4. Scroll down to "Privileged Gateway Intents"
5. Enable "Message Content Intent" if you want the bot to read message content
6. Save changes
7. Restart your application

**Note:** The current bot implementation only requires basic `Guilds` intent and doesn't need privileged intents for slash commands to work.

## Verification Steps

Follow these steps to ensure everything is set up correctly:

1. **Environment Variables**
   ```bash
   # Check these are set:
   echo $DISCORD_ENABLED        # Should be: true
   echo $DISCORD_BOT_TOKEN      # Should be: your-bot-token (not PLACEHOLDER_TOKEN)
   echo $DISCORD_CLIENT_ID      # Should be: your-client-id (not PLACEHOLDER_ID)
   ```

2. **Server Logs**
   - Start your application
   - Look for: `"✅ Discord bot started successfully"`
   - Look for: `"✅ Discord bot logged in as YourBotName#1234"`
   - Look for: `"Successfully reloaded Discord application (/) commands"`

3. **Discord Server**
   - Bot should show as "Online" (green status)
   - Type `/` in any channel
   - You should see your bot's commands in the autocomplete list

4. **Test a Command**
   - Try `/help` command
   - Should get a rich embed with all available commands

## Getting Help

If you're still having issues after following this guide:

1. **Check the server logs** - Most issues show up in the logs
2. **Review the main setup guide** - [DISCORD_BOT_SETUP.md](./DISCORD_BOT_SETUP.md)
3. **Check deployment documentation** - [DEPLOYMENT.md](./DEPLOYMENT.md)
4. **Open a GitHub Issue** - Include:
   - Your environment (Railway, Replit, local, etc.)
   - Relevant server logs (remove sensitive tokens!)
   - What you've already tried

## Quick Reference

**Required Environment Variables:**
```bash
DISCORD_ENABLED=true              # REQUIRED - Bot won't start without this!
DISCORD_BOT_TOKEN=your-token      # From Discord Developer Portal > Bot
DISCORD_CLIENT_ID=your-client-id  # From Discord Developer Portal > General Information
```

**Bot Invite Link Template:**
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=277025770496&scope=bot%20applications.commands
```

**Success Indicators:**
- ✅ Server logs show "Discord bot started successfully"
- ✅ Bot shows as online in Discord
- ✅ Commands appear when typing `/`
- ✅ Commands respond when used

# Alpha Alerts Troubleshooting Guide

## Overview

The `/alpha` command system is fully implemented in Discord. If alerts aren't working, follow this step-by-step guide to diagnose and fix the issue.

## ✅ Quick Checklist

Before troubleshooting, verify these requirements are met:

1. **Environment Variables Set:**
   - `ALPHA_ALERTS_ENABLED=true`
   - `ALPHA_DISCORD_ADMIN_IDS=<your_discord_user_id>`
   - `DISCORD_BOT_TOKEN=<your_bot_token>`
   - `DISCORD_CLIENT_ID=<your_client_id>`

2. **Admin Permissions:**
   - You must have Administrator, Manage Guild, or Manage Channels role in the Discord server
   - OR your Discord user ID must be in `ALPHA_DISCORD_ADMIN_IDS` environment variable

3. **Channel Configuration:**
   - Run `/alpha setchannel #channel-name` to set the alert destination
   - Run `/alpha where` to verify channel is configured

4. **Service Started:**
   - Run `/alpha start` to start the monitoring service
   - Run `/alpha status` to check if service is running

## 🔍 Step-by-Step Diagnosis

### Step 1: Check Admin Permissions

Run `/alpha debug` (this command works even without admin permissions).

**Expected output:**
```
userId: 123456789012345678
guildId: 987654321098765432
hasGuildPerms: true
isAdminEnv: true
adminAllowlistSize: 1
inAllowlist: true
relayDisabled: false
```

**If you see `hasGuildPerms: false` and `isAdminEnv: false`:**
- Add your Discord user ID to `ALPHA_DISCORD_ADMIN_IDS` environment variable
- OR get Administrator/Manage Guild/Manage Channels role in the server
- Restart the bot after changing environment variables

**How to get your Discord user ID:**
1. Enable Developer Mode in Discord Settings > App Settings > Advanced
2. Right-click your username and select "Copy User ID"
3. Add to Railway: `railway variables --set ALPHA_DISCORD_ADMIN_IDS=<your_user_id>`

### Step 2: Verify Service is Running

Run `/alpha status`

**Expected output:**
```
Alpha Status: running=true, callers=0/0, listeners=0, websockets=1
```

**If running=false:**
- Run `/alpha start`
- Check Railway logs for errors: `railway logs`
- Look for `[ALPHA ALERTS] Starting service...` in logs

**If service won't start:**
- Check `ALPHA_ALERTS_ENABLED=true` in Railway variables
- Check RPC endpoints are configured (HELIUS_API_KEY or ALPHA_HTTP_RPC)
- Look for error messages in logs starting with `[ALPHA ALERT]`

### Step 3: Check Channel Configuration

Run `/alpha where`

**Expected output:**
```
📍 Alpha alerts go to #alpha-alerts
```

**If "No channel configured":**
- Run `/alpha setchannel #your-channel` to set the channel
- Bot must have Send Messages permission in that channel
- Bot must be able to @mention @everyone (needs Mention Everyone permission)

### Step 4: Verify Bot Relay is Active

Check Railway logs for this message when bot starts:
```
[Discord Bot] Alpha alert relay config - botRelay: true | direct: false | hasDirectTargets: false | relayEnv: 
✅ Alpha alert callback registered for Discord
```

**If you see "Skipping Discord alpha alert bot relay":**
- This means ALPHA_ALERTS_DIRECT_SEND=true and direct webhook is configured
- Alerts will go to ALPHA_DISCORD_WEBHOOK URL instead of bot relay
- Either clear ALPHA_ALERTS_DIRECT_SEND or set ALPHA_ALERTS_BOT_RELAY=true

### Step 5: Add Wallets to Monitor

Run `/alpha add <wallet_address> <name>`

Example:
```
/alpha add 7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3 "Test Trader"
```

**Check status after adding:**
```
/alpha status
```

You should see `callers=1/1` (1 monitored out of 1 total).

### Step 6: Test Alert Delivery

Use the debug endpoint to trigger a test alert:

```bash
curl -X POST https://your-app.railway.app/debug/alpha-test
```

**Check Railway logs for:**
```
[ALPHA ALERTS] Sending alert - Type: caller_signal | Mint: So11111... | Source: Test Wallet
[ALPHA ALERTS] Triggering 1 callback(s)
[ALPHA ALERTS] ✅ Callback executed successfully
[Discord Bot] Alpha alert received - Type: caller_signal | Mint: So11111... | Source: Test Wallet
[Discord Bot] Total alpha targets: 1
[Discord Bot] Discord targets: 1
[Discord Bot] Attempting to send to channel 1234567890 in guild 9876543210
[Discord Bot] ✅ Alert sent successfully to channel 1234567890
```

**If no Discord targets:**
- Run `/alpha setchannel #your-channel` again
- Verify with `/alpha where`
- Check database: Query `alphaTargets` table for platform='discord'

**If alert not sent to channel:**
- Check bot permissions in that channel (Send Messages, Embed Links, Mention Everyone)
- Try a different channel
- Check channel is text or announcement type (not voice/forum/etc)

## 🐛 Common Issues

### Issue: "⛔ Admins only" error

**Solution:**
1. Run `/alpha debug` to check permissions
2. Add your user ID to `ALPHA_DISCORD_ADMIN_IDS`
3. OR get admin role in the server
4. Restart bot after environment variable changes

### Issue: No alerts appearing

**Possible causes:**
1. Service not started - Run `/alpha start`
2. No channel configured - Run `/alpha setchannel #channel`
3. No wallets monitored - Run `/alpha add <wallet> <name>`
4. Bot missing permissions - Check Send Messages, Mention Everyone
5. Direct send mode active - Check ALPHA_ALERTS_DIRECT_SEND env var

### Issue: Command not showing in Discord

**Possible causes:**
1. Bot not invited with `applications.commands` scope
2. Slash commands not registered - Check logs for "Successfully reloaded Discord application (/) commands"
3. Discord client cache - Restart Discord app
4. Wrong bot token - Verify DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID

### Issue: Service keeps stopping

**Check logs for:**
- WebSocket connection errors
- RPC rate limiting
- Database connection issues
- Memory/CPU limits reached on Railway

**Solutions:**
- Upgrade Railway plan for more resources
- Use Helius RPC (set HELIUS_API_KEY)
- Reduce number of monitored wallets
- Increase ALPHA_REFRESH_INTERVAL_MS (default 60000)

## 🔧 Debug Commands

### Environment Variables to Check

```bash
# Railway CLI
railway variables

# Look for these:
ALPHA_ALERTS_ENABLED=true
ALPHA_DISCORD_ADMIN_IDS=<your_user_id>
DISCORD_BOT_TOKEN=<token>
DISCORD_CLIENT_ID=<client_id>
ALPHA_ALERTS_DIRECT_SEND=false  # or not set
ALPHA_ALERTS_BOT_RELAY=true     # or not set (defaults to true)
```

### Discord Commands Reference

| Command | Description |
|---------|-------------|
| `/alpha status` | Show service status (running, callers, listeners, websockets) |
| `/alpha start` | Start alpha monitoring service |
| `/alpha stop` | Stop alpha monitoring service |
| `/alpha debug` | Show permission diagnostics (works without admin) |
| `/alpha setchannel [#channel]` | Set alert destination channel |
| `/alpha clearchannel` | Clear configured channel |
| `/alpha where` | Show configured channel |
| `/alpha add <wallet> <name>` | Add wallet to monitor |
| `/alpha remove <wallet>` | Remove monitored wallet |

### API Debug Endpoints

```bash
# Trigger test alert
curl -X POST https://your-app.railway.app/debug/alpha-test

# Check service status
curl https://your-app.railway.app/debug/alpha-status

# Send startup message
curl -X POST https://your-app.railway.app/debug/alpha-startup
```

## 📊 Log Interpretation

### Successful Alert Flow

```
[ALPHA ALERTS] Sending alert - Type: caller_signal | Mint: ABC123... | Source: Trader
[ALPHA ALERTS] Triggering 1 callback(s)
[ALPHA ALERTS] ✅ Callback executed successfully
[Discord Bot] Alpha alert received - Type: caller_signal | Mint: ABC123... | Source: Trader
[Discord Bot] Total alpha targets: 1
[Discord Bot] Discord targets: 1
[Discord Bot] Attempting to send to channel 1234567890 in guild 9876543210
[Discord Bot] ✅ Alert sent successfully to channel 1234567890
```

### Permission Denied Log

```
[Discord /alpha] User username#1234 (ID: 123456789012345678) | Guild: 987654321098765432 | Subcommand: start
[Discord /alpha] PERMISSION DENIED for user 123456789012345678 | hasGuildPerms: false | isAdminEnv: false
```

### No Discord Targets Configured

```
[Discord Bot] Alpha alert received - Type: caller_signal | Mint: ABC123... | Source: Trader
[Discord Bot] Total alpha targets: 0
[Discord Bot] Discord targets: 0
[Discord Bot] ⚠️ No Discord targets configured. Use /alpha setchannel to configure.
```

## 🎯 Complete Setup Example

Here's a complete example of setting up alpha alerts from scratch:

```bash
# 1. Set environment variables on Railway
railway variables --set ALPHA_ALERTS_ENABLED=true
railway variables --set ALPHA_DISCORD_ADMIN_IDS=123456789012345678

# 2. Restart service
railway up -d

# 3. In Discord, run these commands:
/alpha debug              # Verify permissions
/alpha setchannel #alpha  # Set channel
/alpha where              # Verify channel
/alpha start              # Start service
/alpha status             # Check status

# 4. Add a wallet to monitor
/alpha add 7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3 "Alpha Trader"

# 5. Test alert delivery
curl -X POST https://your-app.railway.app/debug/alpha-test

# 6. Check logs
railway logs --tail
```

## 🆘 Still Not Working?

If you've followed all steps and alerts still aren't working:

1. **Capture full logs:**
   ```bash
   railway logs --tail > alpha-debug.log
   ```

2. **Run all debug commands and document results:**
   - `/alpha debug`
   - `/alpha status`
   - `/alpha where`
   - `curl https://your-app.railway.app/debug/alpha-status`

3. **Check Railway metrics:**
   - CPU usage (should be < 80%)
   - Memory usage (should be < 80%)
   - Network traffic (check for rate limiting)

4. **Verify bot permissions in Discord:**
   - Go to Server Settings > Roles
   - Find bot's role
   - Check these permissions:
     - Send Messages ✅
     - Embed Links ✅
     - Mention Everyone ✅
     - Read Message History ✅
     - Use Slash Commands ✅

5. **Test with minimal configuration:**
   - Stop all other services
   - Use only 1 monitored wallet
   - Use only 1 Discord channel
   - Monitor logs for any errors

## 📝 Notes

- Alpha alerts require an active RPC connection (preferably Helius)
- Bot must be online and connected to Discord
- Channel must allow @everyone mentions for alerts to ping users
- Service auto-starts on deployment if `ALPHA_ALERTS_ENABLED=true`
- Nansen integration is optional (requires `NANSEN_API_KEY`)
- Direct send mode bypasses bot relay and uses webhooks instead

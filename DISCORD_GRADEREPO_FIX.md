# Discord /graderepo Command Fix

## Problem
The `/graderepo` command is not showing up in Discord.

## Root Cause
The command is properly defined in `server/discord-bot.ts` but hasn't been registered with Discord's API yet. Commands need to be explicitly registered when the bot starts.

## Solution

### Option 1: Restart Railway Deployment (Recommended)
1. Go to your Railway dashboard
2. Find your Rug-Killer-On-Solana deployment
3. Click on the service
4. Click **"Restart"** or redeploy by pushing a commit
5. Wait for the bot to restart (watch the logs)
6. Look for this log message: `"Successfully reloaded Discord application (/) commands."`
7. Wait 1-2 minutes for Discord to sync the commands

### Option 2: Manual Redeploy
```bash
git commit --allow-empty -m "Force redeploy to register Discord commands"
git push
```

This will trigger a Railway redeploy and the bot will register all commands on startup.

## Verification

After restarting, test in Discord:
1. Type `/` in any channel
2. Look for `/graderepo` in the command list
3. Use it: `/graderepo url:solana-labs/solana`

## Technical Details

The `/graderepo` command is defined at line 440-442 in `server/discord-bot.ts`:
```typescript
new SlashCommandBuilder()
  .setName('graderepo')
  .setDescription('Grade a GitHub repository (0-100% confidence)')
  .addStringOption(option => option.setName('url').setDescription('GitHub repository URL (e.g., https://github.com/owner/repo)').setRequired(true))
```

The command handler is at lines 1915-2012 and properly:
- Defers the reply
- Imports the GitHub analyzer
- Grades the repository
- Returns a formatted embed with the results

The command registration happens automatically in the `clientReady` event (line 2754).

## If Still Not Working

Check Railway logs for:
- `"Started refreshing Discord application (/) commands."`
- `"Successfully reloaded Discord application (/) commands."`
- Any errors during command registration

If you see registration errors, check that:
- `DISCORD_BOT_TOKEN` is valid
- `DISCORD_CLIENT_ID` matches your bot application ID (1437952073319714879)
- The bot has been invited with the `applications.commands` scope

## Next Steps
After the restart, the command should appear immediately in Discord (may take 1-2 minutes to sync globally).

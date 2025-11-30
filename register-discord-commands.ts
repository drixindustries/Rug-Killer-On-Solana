/**
 * Script to manually register Discord slash commands
 * Run this if commands are not appearing in Discord
 */
import { REST, Routes, SlashCommandBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import * as dotenv from 'dotenv';

dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName('scan')
    .setDescription('Analyze a Solana token')
    .addStringOption(option => option.setName('address').setDescription('Token address').setRequired(true)),
  new SlashCommandBuilder()
    .setName('rugcheck')
    .setDescription('Quick rug check')
    .addStringOption(option => option.setName('address').setDescription('Token address').setRequired(true)),
  new SlashCommandBuilder()
    .setName('price')
    .setDescription('Get current token price')
    .addStringOption(option => option.setName('address').setDescription('Token address').setRequired(true)),
  new SlashCommandBuilder()
    .setName('liquidity')
    .setDescription('Check liquidity pool')
    .addStringOption(option => option.setName('address').setDescription('Token address').setRequired(true)),
  new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare two tokens')
    .addStringOption(option => option.setName('token1').setDescription('First token address').setRequired(true))
    .addStringOption(option => option.setName('token2').setDescription('Second token address').setRequired(true)),
  new SlashCommandBuilder()
    .setName('trending')
    .setDescription('Show trending tokens'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),
  new SlashCommandBuilder()
    .setName('alpha')
    .setDescription('Alpha feed controls (admin)')
    .addSubcommand(sc => sc.setName('status')
      .setDescription('Show alpha service status')
      .addBooleanOption(o => o.setName('verbose').setDescription('Show detailed caller list'))
    )
    .addSubcommand(sc => sc.setName('start').setDescription('Start alpha monitoring'))
    .addSubcommand(sc => sc.setName('stop').setDescription('Stop alpha monitoring'))
    .addSubcommand(sc => sc.setName('debug').setDescription('Show admin detection and permission info (ephemeral)'))
    .addSubcommand(sc => sc.setName('setchannel')
      .setDescription('Set this server\'s alpha alert channel')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('Channel to receive alpha pings')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      )
    )
    .addSubcommand(sc => sc.setName('clearchannel').setDescription('Clear the configured alpha alert channel'))
    .addSubcommand(sc => sc.setName('where').setDescription('Show the configured alpha alert channel'))
    .addSubcommand(sc => sc.setName('add')
      .setDescription('Add alpha caller wallet')
      .addStringOption(o => o.setName('wallet').setDescription('Wallet address').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('Display name').setRequired(true))
    )
    .addSubcommand(sc => sc.setName('remove')
      .setDescription('Remove alpha caller wallet')
      .addStringOption(o => o.setName('wallet').setDescription('Wallet address').setRequired(true))
    )
    .addSubcommand(sc => sc.setName('reload')
      .setDescription('Reload wallets from database')
      .addIntegerOption(o => o.setName('mininfluence').setDescription('Minimum influence score (default: 60)').setMinValue(0).setMaxValue(100))
    ),
  new SlashCommandBuilder()
    .setName('smart')
    .setDescription('Smart Money calls routing (admin)')
    .addSubcommand(sc => sc.setName('setchannel')
      .setDescription('Set this server\'s Smart Money alert channel')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('Channel to receive Smart Money calls')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      )
    )
    .addSubcommand(sc => sc.setName('clearchannel').setDescription('Clear the configured Smart Money alert channel'))
    .addSubcommand(sc => sc.setName('where').setDescription('Show the configured Smart Money alert channel'))
    .addSubcommand(sc => sc.setName('test').setDescription('Send a test Smart Money alert')),
  new SlashCommandBuilder()
    .setName('holders')
    .setDescription('Show top N holders')
    .addStringOption(option => option.setName('address').setDescription('Token address').setRequired(true))
    .addIntegerOption(option => option.setName('n').setDescription('How many holders (max 50)').setMinValue(1).setMaxValue(50)),
  new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Exchange whitelist utilities')
    .addSubcommand(sc => sc.setName('stats')
      .setDescription('Show whitelist stats and sample wallets'))
    .addSubcommand(sc => sc.setName('check')
      .setDescription('Check if a wallet is whitelisted')
      .addStringOption(o => o.setName('wallet').setDescription('Wallet address').setRequired(true)))
    .addSubcommand(sc => sc.setName('add')
      .setDescription('Add a wallet to the exchange whitelist (admin only)')
      .addStringOption(o => o.setName('wallet').setDescription('Wallet address').setRequired(true))),
  new SlashCommandBuilder()
    .setName('exchanges')
    .setDescription('Show exchange wallet presence in holders')
    .addStringOption(option => option.setName('address').setDescription('Token address').setRequired(true)),
  new SlashCommandBuilder()
    .setName('pumpfun')
    .setDescription('Pump.fun specific view')
    .addStringOption(option => option.setName('address').setDescription('Token address').setRequired(true)),
  new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report a suspicious wallet')
    .addStringOption(option => option.setName('wallet').setDescription('Wallet address').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Why is it suspicious?').setRequired(true)),
  new SlashCommandBuilder()
    .setName('blackliststats')
    .setDescription('Show blacklist statistics'),
  new SlashCommandBuilder()
    .setName('blacklisttop')
    .setDescription('Show top flagged wallets')
    .addIntegerOption(option => option.setName('limit').setDescription('How many to show (max 50)').setMinValue(1).setMaxValue(50)),
  new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Restart the bot process (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('chart')
    .setDescription('Show a quick chart link')
    .addStringOption(option => option.setName('address').setDescription('Token address').setRequired(true)),
  new SlashCommandBuilder()
    .setName('graderepo')
    .setDescription('Grade a GitHub repository (0-100% confidence)')
    .addStringOption(option => option.setName('url').setDescription('GitHub repository URL (e.g., https://github.com/owner/repo)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('smartwallet')
    .setDescription('Manage Smart Money wallet DB (admin)')
    .addSubcommand(sc => sc.setName('add')
      .setDescription('Add smart wallet to DB')
      .addStringOption(o => o.setName('wallet').setDescription('Wallet address').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('Display name').setRequired(true))
      .addIntegerOption(o => o.setName('influence').setDescription('Influence score 0-100').setMinValue(0).setMaxValue(100))
    )
    .addSubcommand(sc => sc.setName('remove')
      .setDescription('Deactivate a smart wallet')
      .addStringOption(o => o.setName('wallet').setDescription('Wallet address').setRequired(true))
    )
    .addSubcommand(sc => sc.setName('activate')
      .setDescription('Re-activate a smart wallet')
      .addStringOption(o => o.setName('wallet').setDescription('Wallet address').setRequired(true))
    )
    .addSubcommand(sc => sc.setName('list')
      .setDescription('List active smart wallets')
      .addIntegerOption(o => o.setName('limit').setDescription('How many to show').setMinValue(1).setMaxValue(50))
    )
    .addSubcommand(sc => sc.setName('view')
      .setDescription('View smart wallet details')
      .addStringOption(o => o.setName('wallet').setDescription('Wallet address').setRequired(true))
    ),
].map(command => command.toJSON());

async function registerCommands() {
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

  if (!BOT_TOKEN || !CLIENT_ID) {
    console.error('❌ Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in .env file');
    process.exit(1);
  }

  if (BOT_TOKEN === 'PLACEHOLDER_TOKEN' || CLIENT_ID === 'PLACEHOLDER_ID') {
    console.error('❌ Discord credentials are still placeholder values. Update your .env file.');
    process.exit(1);
  }

  try {
    const rest = new REST().setToken(BOT_TOKEN);
    
    console.log('🔄 Started registering Discord application (/) commands...');
    console.log(`📝 Registering ${commands.length} commands`);
    
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands },
    );
    
    console.log('✅ Successfully registered all Discord application (/) commands!');
    console.log('💡 Commands should now be available in Discord (may take a few seconds to sync)');
    console.log('📋 Registered commands:');
    commands.forEach((cmd: any) => {
      console.log(`   - /${cmd.name}: ${cmd.description}`);
    });
  } catch (error) {
    console.error('❌ Error registering Discord commands:', error);
    process.exit(1);
  }
}

registerCommands();

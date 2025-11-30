import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, ChannelType, PermissionFlagsBits } from 'discord.js';
import { tokenAnalyzer } from './solana-analyzer';
import { storage } from './storage';
import type { TokenAnalysisResponse } from '../shared/schema';
import { buildCompactMessage, formatNumber, getRiskEmoji, formatAddress } from './bot-formatter';
import { getAlphaAlertService } from './alpha-alerts';
import { checkBlacklist, reportWallet, getBlacklistStats, getTopFlaggedWallets } from './ai-blacklist';
import { EXCHANGE_WALLETS, LAST_UPDATED as EXCHANGE_LAST_UPDATED, WHITELIST_VERSION as EXCHANGE_WHITELIST_VERSION, getExchangeStats, isExchangeWallet, addExchangeWallet } from './exchange-whitelist';
import { nameCache } from './name-cache';
import { rally } from './bot-personality';
import { trendingCallsTracker } from './trending-calls-tracker';
import { holderAnalysis } from './services/holder-analysis';
import { DexScreenerService } from './dexscreener-service';
import { getCreatorWallet } from './creator-wallet';
import { smartMoneyRelay } from './services/smart-money-relay.ts';

// Instantiate shared service singletons needed in command handlers
const dexScreener = new DexScreenerService();
const creatorWalletService = getCreatorWallet();

// Client instance - only created when startDiscordBot() is called
let clientInstance: Client | null = null;

// Lightweight status helper for health checks
export function isDiscordBotRunning(): boolean {
  return !!clientInstance;
}

// ============================================================================
// HELPER FUNCTIONS (module-level for reuse/testing)
// ============================================================================

function getRiskColor(riskLevel: string): number {
  switch (riskLevel) {
    case 'LOW':
      return 0x00ff00; // Green
    case 'MODERATE':
      return 0xffff00; // Yellow
    case 'HIGH':
      return 0xff6600; // Orange
    case 'EXTREME':
      return 0xff0000; // Red
    default:
      return 0x808080; // Gray
  }
}

function getLiquidityFieldValue(liquidityPool: any): string {
  if (!liquidityPool) {
    return `Status: No Data\nLP Burn: ❓ No Data Available`;
  }
  
  let value = `Status: ${liquidityPool.status || 'Unknown'}`;
  
  // Add LP Burn Information - only show if data is available
  if (liquidityPool.burnPercentage !== undefined && liquidityPool.burnPercentage !== null) {
    const burnPct = liquidityPool.burnPercentage;
    let burnEmoji = '';
    
    if (liquidityPool.isBurned || burnPct >= 99.99) {
      burnEmoji = '✅🔥';
    } else if (burnPct >= 90) {
      burnEmoji = '⚠️🔥';
    } else if (burnPct >= 50) {
      burnEmoji = '🟡';
    } else {
      burnEmoji = '❌';
    }
    
    value += `\nLP Burn: ${burnEmoji} ${burnPct.toFixed(2)}%`;
  } else {
    // Data unavailable - don't mislead users
    value += `\nLP Burn: ❓ No Data`;
  }
  
  return value;
}

function stripBold(text?: string): string {
  if (typeof text !== 'string') return '';
  return text.replace(/\*\*/g, '');
}

function addSectionField(embed: EmbedBuilder, raw: string | undefined, fallbackLabel: string, inline = false): void {
  if (!raw) return;
  const trimmed = raw.trim();
  if (!trimmed) return;
  const lines = trimmed.split('\n');
  const firstLine = lines.shift() ?? '';
  const name = lines.length > 0 ? stripBold(firstLine) : fallbackLabel;
  const value = lines.length > 0 ? lines.join('\n') : firstLine;
  if (!name || !value) return;
  embed.addFields({
    name: name.slice(0, 256),
    value: value.slice(0, 1024),
    inline
  });
}

function createAnalysisEmbed(analysis: TokenAnalysisResponse): EmbedBuilder {
  const messageData = buildCompactMessage(analysis);
  const color = getRiskColor(analysis.riskLevel);
  
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${messageData.header} ⚠️ ${messageData.age}`)
    .setDescription(`**Risk Level: ${analysis.riskLevel}** (Score: ${analysis.riskScore}/100)\n_Short rule: higher = safer; lower = riskier_`)
    .setFooter({ text: `Contract: ${analysis.tokenAddress}` })
    .setTimestamp()
    .setImage(`https://dd.dexscreener.com/ds-data/tokens/solana/${analysis.tokenAddress}.png?size=lg&t=${Date.now()}`);
  
  // AI VERDICT
  const sanitizedAiVerdict = stripBold(messageData.aiVerdict);
  if (sanitizedAiVerdict) {
    embed.addFields({
      name: '🤖 AI Analysis',
      value: sanitizedAiVerdict,
      inline: false
    });
  }
  
  // CORE METRICS (Security, Holders, Market in columns)
  embed.addFields({
    name: '🔐 Security',
    value: messageData.security.split('\n').slice(1).join('\n'), // Remove header
    inline: true
  });
  
  embed.addFields({
    name: '👥 Holders',
    value: messageData.holders.split('\n').slice(1).join('\n'), // Remove header
    inline: true
  });
  
  if (messageData.market) {
    embed.addFields({
      name: '💰 Market',
      value: messageData.market.split('\n').slice(1).join('\n'), // Remove header
      inline: true
    });
  }
  
  // PUMP.FUN
  if (messageData.pumpFun) {
    embed.addFields({
      name: '🎯 Pump.fun',
      value: messageData.pumpFun.split('\n').slice(1).join('\n'), // Remove header
      inline: true
    });
  }
  
  addSectionField(embed, messageData.floorInfo, '📊 Support Analysis');
  addSectionField(embed, messageData.honeypot, '🍯 Honeypot Detection');
  addSectionField(embed, messageData.funding, '💸 Suspicious Funding');
  addSectionField(embed, messageData.bundle, '📦 Bundle Activity');
  addSectionField(embed, messageData.network, '🌐 Wallet Network', true);
  addSectionField(embed, messageData.whales, '🐋 Whale Activity', true);
  addSectionField(embed, messageData.pumpDump, '🚨 Pump & Dump');
  addSectionField(embed, messageData.liquidity, '💧 Liquidity Alerts');
  addSectionField(embed, messageData.holderActivity, '📉 Holder Activity');
  addSectionField(embed, messageData.agedWallets, '⏰ Aged Wallet Risk');
  addSectionField(embed, messageData.gmgn, '📊 GMGN Intelligence');
  
  // TGN & ML ANALYSIS - AI Models
  if (messageData.tgnAnalysis) {
    embed.addFields({
      name: '🧠 Temporal GNN (Neural Network)',
      value: messageData.tgnAnalysis.split('\n').slice(1).join('\n'), // Remove header
      inline: true
    });
  }
  
  if (messageData.mlAnalysis) {
    embed.addFields({
      name: '🤖 ML Decision Tree (TypeScript)',
      value: messageData.mlAnalysis.split('\n').slice(1).join('\n'), // Remove header
      inline: true
    });
  }
  
  // WALLET AGES - Prominent section for wallet age analysis
  const sanitizedWalletAges = stripBold(messageData.walletAges);
  if (sanitizedWalletAges) {
    embed.addFields({
      name: '⏰ Wallet Ages',
      value: sanitizedWalletAges,
      inline: false
    });
  }
  
  // ADVANCED DETECTION (Consolidate into sections)
  const advancedWarnings: string[] = [...messageData.alerts];
  
  // Add warnings field if any exist (max 1024 chars per field)
  if (advancedWarnings.length > 0) {
    embed.addFields({
      name: '⚠️ Advanced Detection',
      value: advancedWarnings.join('\n\n').slice(0, 1024),
      inline: false
    });
  }
  
  // QUICK LINKS
  embed.addFields({
    name: '🔗 Quick Links',
    value: messageData.links.split('\n').join('\n')
  });
  
  embed.setURL(`https://solscan.io/token/${analysis.tokenAddress}`);
  
  return embed;
}

// ============================================================================
// SLASH COMMANDS DEFINITION
// ============================================================================

const commands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands and how to use the bot'),
  new SlashCommandBuilder()
    .setName('execute')
    .setDescription('Full 52-metric rug detection scan')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Token contract address')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('first20')
    .setDescription('Analyze top 20 token holders')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Token contract address')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('devaudit')
    .setDescription('Track dev wallet history')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Token contract address')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Check if wallet is flagged')
    .addStringOption(option =>
      option.setName('wallet')
        .setDescription('Wallet address to check')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('whaletrack')
    .setDescription('Track smart money wallets in a token')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Token contract address')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('kol')
    .setDescription('Check if a wallet is a known KOL')
    .addStringOption(option =>
      option.setName('wallet')
        .setDescription('Wallet address to check')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('price')
    .setDescription('Quick price lookup for a token')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Token contract address')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('rugcheck')
    .setDescription('Instant rug detection scan')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Token contract address')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('liquidity')
    .setDescription('Detailed liquidity pool analysis')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Token contract address')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare two tokens side by side')
    .addStringOption(option =>
      option.setName('token1')
        .setDescription('First token address')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('token2')
        .setDescription('Second token address')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('trending')
    .setDescription('Show trending Solana tokens by volume'),
  new SlashCommandBuilder()
    .setName('watch')
    .setDescription('Add a token to your watchlist')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Token contract address')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('unwatch')
    .setDescription('Remove a token from your watchlist')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Token contract address')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('watchlist')
    .setDescription('Show your watchlist'),
  new SlashCommandBuilder()
    .setName('alert')
    .setDescription('Create a price alert')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Token contract address')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('direction')
        .setDescription('Alert when price goes ...')
        .addChoices({ name: 'above', value: 'above' }, { name: 'below', value: 'below' })
        .setRequired(true)
    )
    .addNumberOption(option =>
      option.setName('price')
        .setDescription('Target price in USD')
        .setRequired(true)
    ),
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

// ============================================================================
// CLIENT FACTORY (creates and configures Discord client)
// ============================================================================

function createDiscordClient(botToken: string, clientId: string): Client {
  // Use Guilds, GuildMessages, and MessageContent for slash commands + direct message analysis
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });
  let restartScheduled = false;
  
  // Register slash commands
  const registerCommands = async () => {
    try {
      const rest = new REST().setToken(botToken);
      console.log('Started refreshing Discord application (/) commands.');
      
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      
      console.log('Successfully reloaded Discord application (/) commands.');
    } catch (error) {
      console.error('Error registering Discord commands:', error);
    }
  };
  
  // Handle interactions
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    try {
      const platformUserId = `discord:${interaction.user.id}`;
      // Build admin allowlist from multiple env vars for compatibility
      const adminEnvVars = [
        process.env.ALPHA_DISCORD_ADMIN_IDS,
        process.env.DISCORD_ADMIN_IDS,
        process.env.DISCORD_ADMIN_ID,
        process.env.ADMIN_DISCORD_IDS,
      ].filter(Boolean) as string[];
      const adminAllowlist = new Set(
        adminEnvVars
          .flatMap(v => v.split(',').map(s => s.trim()))
          .filter(Boolean)
      );
      const isAdminEnv = adminAllowlist.has(interaction.user.id);
      const hasGuildPerms = !!(interaction.memberPermissions && (
        interaction.memberPermissions.has(PermissionFlagsBits.Administrator) ||
        interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ||
        interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)
      ));
      const canAdmin = (cmdName: string) => {
        // For alpha-related admin commands, require guild perms in servers; fallback to env allowlist for DMs or edge cases
        if (interaction.guildId) return hasGuildPerms || isAdminEnv;
        return isAdminEnv;
      };
      const ensureUser = async () => {
        try {
          await storage.upsertUser({ id: platformUserId, email: null as any });
        } catch {}
      };
      if (interaction.commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🔥 RUG KILLER ALPHA BOT')
          .setDescription('Protect yourself from rug pulls with comprehensive token analysis!')
          .addFields(
            {
              name: '📋 Core Commands',
              value: '`/execute <address>` - Full scan\n`/holders <address> [n]` - Top N holders\n`/devaudit <address>` - Dev wallet history\n`/blacklist <wallet>` - Check blacklist\n`/help` - Show this help message'
            },
            {
              name: '👥 Group Tier Commands',
              value: '`/whaletrack <address>` - Smart money tracking\n`/kol <wallet>` - Check if wallet is KOL'
            },
            {
              name: '🔥 NEW Popular Commands',
              value: '`/price <address>` - Quick price\n`/rugcheck <address>` - Instant rug scan\n`/liquidity <address>` - LP analysis\n`/compare <token1> <token2>` - Compare tokens\n`/trending` - Top tokens by volume\n`/exchanges <address>` - Exchange presence\n`/graderepo <url>` - Grade GitHub repo (0-100%)\n`/whitelist stats|check` - Exchange whitelist tools\n`/pumpfun <address>` - Pump.fun view\n`/chart <address>` - Chart link'
            },
            {
              name: '🔔 Personal Tools',
              value: '`/watch <address>` add • `/unwatch <address>` remove • `/watchlist` show\n`/alert <address> above|below <price>` set price alert'
            },
            {
              name: '🧰 Admin/Community',
              value: '`/report <wallet> <reason>` report scammer\n`/blackliststats` stats • `/blacklisttop [limit]` top\n`/alpha <subcommand>` status|start|stop|add|remove (admin)'
            },
            {
              name: '💡 Quick Tip',
              value: 'You can also paste any Solana token address directly in chat for instant analysis!'
            }
          )
          .setFooter({ text: 'Rug Killer Alpha Bot • Protecting the Solana ecosystem' })
          .setTimestamp();
        
        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
        
      } else if (interaction.commandName === 'execute') {
        const tokenAddress = interaction.options.getString('address', true);
        console.log(`[Discord /execute] User ${interaction.user.tag} scanning: ${tokenAddress}`);
        
        await interaction.deferReply();
        
        try {
          // Add timeout to prevent hanging (60s for new tokens that need indexing)
          const analysisPromise = tokenAnalyzer.analyzeToken(tokenAddress);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Analysis timeout after 60 seconds')), 60000)
          );
          
          const analysis = await Promise.race([analysisPromise, timeoutPromise]) as any;
          console.log(`[Discord /execute] Analysis complete for ${tokenAddress}`);
          
          // Remember symbol/name mapping for quick $symbol lookups later
          try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
          const embed = createAnalysisEmbed(analysis);
          
          await interaction.editReply({ embeds: [embed] });
          console.log(`[Discord /execute] Reply sent for ${tokenAddress}`);
        } catch (error: any) {
          console.error(`[Discord /execute] Error for ${tokenAddress}:`, error.message);
          
          // Provide more specific error messages based on the error type
          let errorTitle = '❌ Analysis Failed';
          let errorDescription = `Failed to analyze token: \`${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}\`\n\n`;
          
          if (error.message?.includes('Token data unavailable') || error.message?.includes('services failed')) {
            errorTitle = '⏳ Token Data Not Ready';
            errorDescription += `**Error:** ${error.message}\n\n` +
              `This token might be:\n` +
              `• Too new (just launched)\n` +
              `• Not yet indexed by data providers\n` +
              `• Missing liquidity pool\n\n` +
              `Try again in a few moments once the token is indexed.`;
          } else if (error.message?.includes('Invalid')) {
            errorTitle = '❌ Invalid Token Address';
            errorDescription += `The provided address is not a valid Solana token address.\n\n` +
              `Please verify the address and try again.`;
          } else if (error.message?.includes('RPC') || error.message?.includes('connection')) {
            errorTitle = '🔌 Connection Issue';
            errorDescription += `**Error:** ${error.message}\n\n` +
              `Blockchain connection is experiencing issues.\n\n` +
              `Please try again in a moment.`;
          } else {
            errorDescription += `**Error:** ${error?.message || 'Unknown error'}\n\n` +
              `This could be due to:\n` +
              `• Invalid token address\n` +
              `• RPC connection issues\n` +
              `• Token data not available\n\n` +
              `Please verify the address and try again.`;
          }
          
          const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle(errorTitle)
            .setDescription(errorDescription)
            .setTimestamp();
          
          await interaction.editReply({ embeds: [errorEmbed] });
        }
        
      } else if (interaction.commandName === 'first20') {
        const tokenAddress = interaction.options.getString('address', true);
        
        await interaction.deferReply();
        
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
        
        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`📊 Top 20 Holders - ${analysis.metadata.symbol}`)
          .setDescription(`Total Top 10: **${analysis.topHolderConcentration.toFixed(2)}%**`)
          .setTimestamp();
        
        // Split holders into 3 fields (Discord has 1024 char limit per field)
        const holders = analysis.topHolders.slice(0, 20);
        const fieldsData = [
          holders.slice(0, 7),
          holders.slice(7, 14),
          holders.slice(14, 20),
        ];
        
        fieldsData.forEach((group, index) => {
          if (group.length > 0) {
            embed.addFields({
              name: index === 0 ? 'Top Holders' : '\u200b',
              value: group.map((h, i) => {
                const rank = (index * 7) + i + 1;
                return `${rank}. \`${formatAddress(h.address)}\` - ${h.percentage.toFixed(2)}%`;
              }).join('\n'),
              inline: false
            });
          }
        });
        
        if (analysis.topHolderConcentration > 50) {
          embed.setFooter({ text: '⚠️ WARNING: High holder concentration detected!' });
        }
        
        await interaction.editReply({ embeds: [embed] });
        
      } else if (interaction.commandName === 'devaudit') {
        const tokenAddress = interaction.options.getString('address', true);
        
        await interaction.deferReply();
        
        try {
          const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
          try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
          
          let hasFlags = false;
          
          const embed = new EmbedBuilder()
            .setTitle(`🔥 Dev Audit Report - ${analysis.metadata.symbol}`)
            .setDescription(`Contract: \`${tokenAddress}\``)
            .setTimestamp();
          
          // Mint authority
          let mintValue = '';
          if (analysis.mintAuthority.hasAuthority && !analysis.mintAuthority.isRevoked) {
            mintValue = `❌ **ACTIVE**\nDev can mint unlimited tokens!`;
            if (analysis.mintAuthority.authorityAddress) {
              mintValue += `\nAuthority: \`${formatAddress(analysis.mintAuthority.authorityAddress)}\``;
            }
            hasFlags = true;
          } else {
            mintValue = '✅ **REVOKED**\nDev cannot mint new tokens';
          }
          embed.addFields({
            name: '🪙 Mint Authority',
            value: mintValue,
            inline: false
          });
          
          // Freeze authority
          let freezeValue = '';
          if (analysis.freezeAuthority.hasAuthority && !analysis.freezeAuthority.isRevoked) {
            freezeValue = `❌ **ACTIVE**\nDev can freeze accounts!`;
            if (analysis.freezeAuthority.authorityAddress) {
              freezeValue += `\nAuthority: \`${formatAddress(analysis.freezeAuthority.authorityAddress)}\``;
            }
            hasFlags = true;
          } else {
            freezeValue = '✅ **REVOKED**\nDev cannot freeze accounts';
          }
          embed.addFields({
            name: '🧊 Freeze Authority',
            value: freezeValue,
            inline: false
          });
          
          // Token age
          if (analysis.creationDate) {
            const age = Math.floor((Date.now() - analysis.creationDate) / (1000 * 60 * 60 * 24));
            let ageText = `${age} days old`;
            if (age < 7) {
              ageText += '\n⚠️ Very new token - high risk!';
              hasFlags = true;
            } else if (age < 30) {
              ageText += '\n⚠️ New token - exercise caution';
            } else {
              ageText += '\n✅ Established token';
            }
            embed.addFields({
              name: '📅 Token Age',
              value: ageText,
              inline: false
            });
          }
          
          // Set color based on flags
          embed.setColor(hasFlags ? 0xff0000 : 0x00ff00);
          
          // Add overall verdict
          embed.addFields({
            name: '━━━━━━━━━━━━━━━━',
            value: !hasFlags 
              ? '🎉 **VERDICT: SAFE**\n✅ Token passes Dev Audit checks!' 
              : '⚠️ **VERDICT: CONCERNING**\n🚨 Token has concerning dev permissions!',
            inline: false
          });
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error: any) {
          console.error('devaudit command error:', error);
          await interaction.editReply({ 
            content: `❌ Error analyzing token: ${error.message}\n\nMake sure the address is a valid Solana token contract.` 
          });
        }
        
      } else if (interaction.commandName === 'blacklist') {
        const walletAddress = interaction.options.getString('wallet', true);
        await interaction.deferReply();
        const result = await checkBlacklist(walletAddress);
        const color = result.isBlacklisted ? 0xff0000 : 0x00cc66;
        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle('🔍 Blacklist Check')
          .setDescription(`Wallet: \`${formatAddress(walletAddress)}\``)
          .addFields({ name: 'Status', value: result.isBlacklisted ? `🚨 FLAGGED (severity ${result.severity})` : '✅ Not currently flagged' })
          .setTimestamp();
        if (result.labels.length > 0) {
          embed.addFields({ name: 'Labels', value: result.labels.map(l => `• ${l.type} (sev ${l.severity})`).join('\n') });
        }
        await interaction.editReply({ embeds: [embed] });
        
      } else if (interaction.commandName === 'whaletrack') {
        const tokenAddress = interaction.options.getString('address', true);
        
        await interaction.deferReply();
        
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
        const holderAddresses = analysis.topHolders.map(h => h.address);
        const kolHolders = await storage.getKolWalletsByAddresses(holderAddresses);
        
        const embed = new EmbedBuilder()
          .setColor(kolHolders.length > 0 ? 0xff9900 : 0x00ff00)
          .setTitle(`🐋 Whale Tracking - ${analysis.metadata.symbol}`)
          .setTimestamp();
        
        if (kolHolders.length === 0) {
          embed.setDescription('✅ No known smart money wallets detected in top holders')
            .addFields({
              name: 'Analysis',
              value: 'This could be a good sign - no influential traders have entered yet, or it could mean the token hasn\'t attracted attention from experienced traders.'
            });
        } else {
          const totalKolPercentage = kolHolders.reduce((sum, kol) => {
            const holder = analysis.topHolders.find(h => h.address === kol.walletAddress);
            return sum + (holder?.percentage || 0);
          }, 0);
          
          embed.setDescription(`⚠️ **${kolHolders.length} Smart Money Wallet${kolHolders.length > 1 ? 's' : ''} Detected**`);
          
          const kolData = kolHolders.slice(0, 5).map(kol => {
            const holder = analysis.topHolders.find(h => h.address === kol.walletAddress);
            const percentage = holder ? holder.percentage.toFixed(2) : 'N/A';
            
            let value = `Wallet: \`${formatAddress(kol.walletAddress)}\`\n`;
            value += `Holdings: ${percentage}% of supply\n`;
            value += `Influence: ${kol.influenceScore !== null ? kol.influenceScore.toString() : 'N/A'}/100`;
            if (kol.profitSol) {
              value += `\nProfit: ${formatNumber(Number(kol.profitSol) || 0)} SOL`;
            }
            
            return {
              name: `💎 ${kol.displayName || 'Unknown KOL'}`,
              value,
              inline: false
            };
          });
          
          embed.addFields(...kolData);
          
          let statusText = `**Total Smart Money Holdings: ${totalKolPercentage.toFixed(2)}%**\n\n`;
          if (totalKolPercentage > 30) {
            statusText += '🚨 HIGH concentration - Smart money controls significant supply!';
          } else if (totalKolPercentage > 15) {
            statusText += '⚠️ MODERATE concentration - Watch for coordinated sells';
          } else {
            statusText += '✅ LOW concentration - Smart money has small positions';
          }
          
          embed.addFields({
            name: '📊 Summary',
            value: statusText
          });
        }
        
        await interaction.editReply({ embeds: [embed] });
        
      } else if (interaction.commandName === 'kol') {
        const walletAddress = interaction.options.getString('wallet', true);
        
        await interaction.deferReply();
        
        const kol = await storage.getKolWallet(walletAddress);
        
        if (!kol) {
          const embed = new EmbedBuilder()
            .setColor(0x808080)
            .setTitle('📊 KOL Check')
            .setDescription(`Wallet: \`${formatAddress(walletAddress)}\``)
            .addFields({
              name: 'Status',
              value: '❌ Not found in KOL database\n\nThis wallet is not currently tracked as a known influential trader.'
            })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          return;
        }
        
        const influenceScore = kol.influenceScore !== null ? kol.influenceScore : 0;
        const color = influenceScore > 80 ? 0xff6b2c : influenceScore > 60 ? 0xffa500 : 0x3498db;
        
        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle('💎 KOL Profile Found')
          .setDescription(`**${kol.displayName || 'Unknown'}**\nWallet: \`${formatAddress(kol.walletAddress)}\``)
          .setTimestamp();
        
        let statsValue = `• Rank: #${kol.rank !== null ? kol.rank.toString() : 'N/A'}\n`;
        statsValue += `• Influence Score: ${kol.influenceScore !== null ? kol.influenceScore.toString() : 'N/A'}/100\n`;
        
        if (kol.profitSol !== null) {
          statsValue += `• Total Profit: ${formatNumber(Number(kol.profitSol) || 0)} SOL\n`;
        }
        
        if (kol.wins !== null && kol.losses !== null) {
          const total = kol.wins + kol.losses;
          const winRate = total > 0 ? ((kol.wins / total) * 100).toFixed(1) : 'N/A';
          statsValue += `• Wins: ${kol.wins} | Losses: ${kol.losses}\n`;
          statsValue += `• Win Rate: ${winRate}%`;
        }
        
        embed.addFields({
          name: '📊 Stats',
          value: statsValue
        });
        
        if (kol.lastActiveAt) {
          const lastActive = new Date(kol.lastActiveAt);
          embed.addFields({
            name: '📅 Last Active',
            value: lastActive.toLocaleDateString()
          });
        }
        
        let tierText = '';
        if (kol.influenceScore && kol.influenceScore > 80) {
          tierText = '🔥 **HIGHLY INFLUENTIAL** - Top tier trader';
        } else if (kol.influenceScore && kol.influenceScore > 60) {
          tierText = '⭐ **INFLUENTIAL** - Experienced trader';
        } else {
          tierText = '📈 **TRACKED** - Known trader';
        }
        
        embed.addFields({
          name: 'Tier',
          value: tierText
        });
        
        await interaction.editReply({ embeds: [embed] });
      
      } else if (interaction.commandName === 'price') {
        const tokenAddress = interaction.options.getString('address', true);
        
        await interaction.deferReply();
        
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
        const pair = analysis.dexscreenerData?.pairs?.[0];
        
        const embed = new EmbedBuilder()
          .setTitle(`💰 Price Check - ${analysis.metadata.symbol}`)
          .setTimestamp();
        
        if (pair) {
          const price = parseFloat(pair.priceUsd || '0');
          const change24h = pair.priceChange?.h24 ?? 0;
          
          embed.setColor(change24h >= 0 ? 0x00ff00 : 0xff0000);
          
          let priceInfo = `**Current Price**: $${price.toFixed(price < 0.01 ? 8 : 4)}\n\n`;
          
          const changeEmoji = change24h >= 0 ? '📈' : '📉';
          const changeColor = change24h >= 0 ? '🟢' : '🔴';
          priceInfo += `${changeEmoji} **24h Change**: ${changeColor} ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`;
          
          embed.setDescription(priceInfo);
          
          embed.addFields(
            { name: '📦 24h Volume', value: `$${formatNumber(pair.volume?.h24 ?? 0)}`, inline: true },
            { name: '💧 Liquidity', value: `$${formatNumber(pair.liquidity?.usd || 0)}`, inline: true }
          );
          
          if (pair.marketCap) {
            embed.addFields({ name: '💎 Market Cap', value: `$${formatNumber(pair.marketCap)}`, inline: true });
          }
          
          if (pair.fdv) {
            embed.addFields({ name: '🌐 FDV', value: `$${formatNumber(pair.fdv)}`, inline: true });
          }
        } else {
          embed.setColor(0x808080);
          embed.setDescription('⚠️ Price data not available\n\nToken may not have active trading pairs yet.');
        }
        
        await interaction.editReply({ embeds: [embed] });
      
      } else if (interaction.commandName === 'rugcheck') {
        const tokenAddress = interaction.options.getString('address', true);
        
        await interaction.deferReply();
        
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
        
        const riskEmoji = getRiskEmoji(analysis.riskLevel);
        const color = getRiskColor(analysis.riskLevel);
        
        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(`🔒 Rug Check - ${analysis.metadata.symbol}`)
          .setDescription(`${riskEmoji} **RISK LEVEL: ${analysis.riskLevel}**\nRisk Score: ${analysis.riskScore}/100`)
          .setTimestamp();
        
        let dangerFlags = 0;
        let warningFlags = 0;
        
        let securityChecks = '';

        if (analysis.mintAuthority && analysis.mintAuthority.hasAuthority && !analysis.mintAuthority.isRevoked) {
          securityChecks += '❌ Mint Authority Active\n';
          dangerFlags++;
        } else {
          securityChecks += '✅ Mint Authority Revoked\n';
        }

        if (analysis.freezeAuthority && analysis.freezeAuthority.hasAuthority && !analysis.freezeAuthority.isRevoked) {
          securityChecks += '❌ Freeze Authority Active\n';
          dangerFlags++;
        } else {
          securityChecks += '✅ Freeze Authority Revoked\n';
        }
        
        const burnPct = analysis.liquidityPool?.burnPercentage;
        if (burnPct !== undefined && burnPct !== null) {
          if (burnPct >= 99.99) {
            securityChecks += `✅ LP Fully Burned (${burnPct.toFixed(1)}%)\n`;
          } else if (burnPct >= 80) {
            securityChecks += `⚠️ LP Mostly Burned (${burnPct.toFixed(1)}%)\n`;
            warningFlags++;
          } else if (burnPct >= 50) {
            securityChecks += `⚠️ LP Partially Burned (${burnPct.toFixed(1)}%)\n`;
            warningFlags++;
          } else {
            securityChecks += `❌ LP Not Burned (${burnPct.toFixed(1)}%)\n`;
            dangerFlags++;
          }
        } else {
          securityChecks += `❓ LP Burn Status: No Data\n`;
          warningFlags++;
        }
        
        embed.addFields({ name: '🔐 Security Checks', value: securityChecks });
        
        let holderAnalysisText = '';
        if (analysis.topHolderConcentration > 80) {
          holderAnalysisText += `❌ Extreme Concentration (${analysis.topHolderConcentration.toFixed(1)}%)\n`;
          dangerFlags++;
        } else if (analysis.topHolderConcentration > 50) {
          holderAnalysisText += `⚠️ High Concentration (${analysis.topHolderConcentration.toFixed(1)}%)\n`;
          warningFlags++;
        } else {
          holderAnalysisText += `✅ Good Distribution (${analysis.topHolderConcentration.toFixed(1)}%)\n`;
        }
        holderAnalysisText += `• Total Holders: ${analysis.holderCount}`;
        if (analysis.systemWalletsFiltered && analysis.systemWalletsFiltered > 0) {
          holderAnalysisText += `\n• System Wallets Filtered: ${analysis.systemWalletsFiltered}`;
        }
        
        embed.addFields({ name: '📊 Holder Analysis', value: holderAnalysisText });
        
        // TGN Temporal Analysis (if available)
        if (analysis.tgnResult) {
          const tgn = analysis.tgnResult;
          const rugPercent = (tgn.rugProbability * 100).toFixed(1);
          let tgnEmoji = '✅';
          let tgnText = '';
          
          if (tgn.rugProbability > 0.70) {
            tgnEmoji = '🚨';
            tgnText = `${tgnEmoji} **HIGH RUG RISK**: ${rugPercent}% probability\n`;
            dangerFlags += 2;
          } else if (tgn.rugProbability > 0.40) {
            tgnEmoji = '⚠️';
            tgnText = `${tgnEmoji} **MODERATE RISK**: ${rugPercent}% rug probability\n`;
            warningFlags++;
          } else {
            tgnText = `${tgnEmoji} **LOW RISK**: ${rugPercent}% rug probability\n`;
          }
          
          tgnText += `• Graph: ${tgn.graphMetrics.nodeCount} wallets, ${tgn.graphMetrics.edgeCount} transactions\n`;
          const confidence = tgn.confidence ? (tgn.confidence * 100).toFixed(0) : 'N/A';
          tgnText += `• Model Confidence: ${confidence}%\n• [What is Temporal GNN?](https://github.com/drixindustries/Rug-Killer-On-Solana/blob/main/docs/TEMPORAL_GNN.md)`;
          
          if (analysis.isPreMigration) {
            tgnText += `\n⏳ **Pre-Migration** (Pump.fun bonding curve)`;
          }
          
          if (tgn.patterns.length > 0) {
            tgnText += `\n\n**Detected Patterns:**\n`;
            for (const pattern of tgn.patterns.slice(0, 3)) {
              const patternEmoji = pattern.type === 'migration_event' ? '🔄' : 
                                   pattern.confidence > 0.8 ? '🔴' : '🟡';
              tgnText += `${patternEmoji} ${pattern.description}\n`;
            }
          }
          
          embed.addFields({ name: '🧠 Temporal GNN Analysis', value: tgnText });
        }
        
        if (analysis.aiVerdict) {
          embed.addFields({
            name: '🤖 AI Analysis',
            value: `${analysis.aiVerdict.rating} - ${analysis.aiVerdict.verdict}`
          });
        }
        
        let verdict = '';
        if (dangerFlags >= 3) {
          verdict = '🚨 **HIGH RUG RISK** - Multiple red flags detected!\nConsider avoiding this token.';
        } else if (dangerFlags >= 1 || warningFlags >= 3) {
          verdict = '⚠️ **MODERATE RISK** - Some concerns detected.\nDo your own research before investing.';
        } else if (warningFlags >= 1) {
          verdict = '✅ **LOW RISK** - Minor concerns only.\nToken appears relatively safe.';
        } else {
          verdict = '✅ **VERY LOW RISK** - All checks passed!\nToken has strong security measures.';
        }
        
        embed.addFields({ name: '━━━━━━━━━━━━━━━━', value: verdict });
        
        await interaction.editReply({ embeds: [embed] });
      
      } else if (interaction.commandName === 'liquidity') {
        const tokenAddress = interaction.options.getString('address', true);
        
        await interaction.deferReply();
        
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
        const pair = analysis.dexscreenerData?.pairs?.[0];
        
        const embed = new EmbedBuilder()
          .setTitle(`💧 Liquidity Analysis - ${analysis.metadata.symbol}`)
          .setTimestamp();
        
        if (pair) {
          const liquidityUsd = pair.liquidity?.usd || 0;
          
          let qualityEmoji = '';
          let qualityText = '';
          if (liquidityUsd < 1000) {
            qualityEmoji = '🚨';
            qualityText = 'VERY LOW - High slippage risk!';
            embed.setColor(0xff0000);
          } else if (liquidityUsd < 5000) {
            qualityEmoji = '⚠️';
            qualityText = 'LOW - Expect slippage on medium trades';
            embed.setColor(0xffaa00);
          } else if (liquidityUsd < 50000) {
            qualityEmoji = '✅';
            qualityText = 'MODERATE - Decent for small-medium trades';
            embed.setColor(0xffff00);
          } else {
            qualityEmoji = '✅';
            qualityText = 'HIGH - Good for large trades';
            embed.setColor(0x00ff00);
          }
          
          embed.setDescription(`💰 **Total Liquidity**: $${formatNumber(liquidityUsd)}\n${qualityEmoji} **${qualityText}**`);
          
          let breakdown = '';
          if (pair.liquidity?.base !== undefined) {
            breakdown += `• Token: ${formatNumber(pair.liquidity.base)} ${analysis.metadata?.symbol || 'TOKEN'}\n`;
          }
          if (pair.liquidity?.quote !== undefined) {
            breakdown += `• ${pair.quoteToken?.symbol || 'SOL'}: ${formatNumber(pair.liquidity.quote)}`;
          }
          
          if (breakdown) {
            embed.addFields({ name: '📊 Liquidity Breakdown', value: breakdown });
          }
          
          const burnPct = analysis.liquidityPool?.burnPercentage;
          let lpStatus = '';
          if (burnPct !== undefined && burnPct !== null) {
            lpStatus += `• Burned: ${burnPct.toFixed(2)}%\n\n`;
            
            if (burnPct >= 99.99) {
              lpStatus += '✅ LP is locked forever - Cannot be pulled!';
            } else if (burnPct >= 80) {
              lpStatus += `⚠️ Most LP burned, but ${(100 - burnPct).toFixed(2)}% could be pulled`;
            } else {
              lpStatus += `❌ ${(100 - burnPct).toFixed(2)}% LP can be pulled - RUG RISK!`;
            }
          } else {
            lpStatus = '❓ LP burn data not available\n⚠️ Cannot verify if liquidity is locked';
          }
          
          embed.addFields({ name: '🔥 LP Token Status', value: lpStatus });
          
          const volumeToLiqRatio = liquidityUsd > 0 ? (pair.volume.h24 / liquidityUsd) : 0;
          let tradingMetrics = `• 24h Volume: $${formatNumber(pair.volume.h24)}\n`;
          tradingMetrics += `• Vol/Liq Ratio: ${volumeToLiqRatio.toFixed(2)}x\n\n`;
          
          if (volumeToLiqRatio > 3) {
            tradingMetrics += '🔥 **VERY HIGH** activity - Popular token!';
          } else if (volumeToLiqRatio > 1) {
            tradingMetrics += '✅ **GOOD** activity - Healthy trading';
          } else if (volumeToLiqRatio > 0.1) {
            tradingMetrics += '⚠️ **LOW** activity - Limited trading';
          } else {
            tradingMetrics += '🚨 **VERY LOW** activity - Dead pool?';
          }
          
          embed.addFields({ name: '📈 Trading Metrics', value: tradingMetrics });
        } else {
          embed.setColor(0x808080);
          embed.setDescription('⚠️ No liquidity pool found\n\nThis token may not have active trading pairs yet.');
        }
        
        await interaction.editReply({ embeds: [embed] });
      
      } else if (interaction.commandName === 'compare') {
        const token1 = interaction.options.getString('token1', true);
        const token2 = interaction.options.getString('token2', true);
        
        await interaction.deferReply();
        
        const [analysis1, analysis2] = await Promise.all([
          tokenAnalyzer.analyzeToken(token1),
          tokenAnalyzer.analyzeToken(token2)
        ]);
        try { nameCache.remember(token1, analysis1?.metadata?.symbol, analysis1?.metadata?.name as any); } catch {}
        try { nameCache.remember(token2, analysis2?.metadata?.symbol, analysis2?.metadata?.name as any); } catch {}
        
        const pair1 = analysis1.dexscreenerData?.pairs?.[0];
        const pair2 = analysis2.dexscreenerData?.pairs?.[0];
        
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('⚖️ Token Comparison')
          .setDescription(`**Token A**: ${analysis1.metadata.symbol}\n**Token B**: ${analysis2.metadata.symbol}`)
          .setTimestamp();
        
        const betterRisk = analysis1.riskScore > analysis2.riskScore ? 'A' : 'B';
        let riskComparison = `A: ${analysis1.riskScore}/100 (${analysis1.riskLevel}) ${getRiskEmoji(analysis1.riskLevel)}\n`;
        riskComparison += `B: ${analysis2.riskScore}/100 (${analysis2.riskLevel}) ${getRiskEmoji(analysis2.riskLevel)}\n`;
        riskComparison += `👑 Winner: Token ${betterRisk}`;
        
        embed.addFields({ name: '🛡️ Risk Score', value: riskComparison });
        
        // Market data
        const price1 = pair1?.priceUsd ? parseFloat(pair1.priceUsd) : 0;
        const price2 = pair2?.priceUsd ? parseFloat(pair2.priceUsd) : 0;
        const vol1 = pair1?.volume?.h24 ?? 0;
        const vol2 = pair2?.volume?.h24 ?? 0;
        const mcap1 = pair1?.marketCap ?? 0;
        const mcap2 = pair2?.marketCap ?? 0;
        const liq1 = pair1?.liquidity?.usd ?? 0;
        const liq2 = pair2?.liquidity?.usd ?? 0;
        
        if (price1 > 0 || price2 > 0) {
          const betterVol = vol1 > vol2 ? 'A' : 'B';
          let priceVol = `A: $${price1.toFixed(price1 < 0.01 ? 8 : 4)} | Vol: $${formatNumber(vol1)}\n`;
          priceVol += `B: $${price2.toFixed(price2 < 0.01 ? 8 : 4)} | Vol: $${formatNumber(vol2)}\n`;
          priceVol += `👑 Higher Volume: Token ${betterVol}`;
          embed.addFields({ name: '💰 Price & Volume', value: priceVol });
        }
        
        if (mcap1 > 0 || mcap2 > 0) {
          const betterMcap = mcap1 > mcap2 ? 'A' : 'B';
          let mcapComparison = `A: $${formatNumber(mcap1)}\n`;
          mcapComparison += `B: $${formatNumber(mcap2)}\n`;
          mcapComparison += `👑 Larger: Token ${betterMcap}`;
          embed.addFields({ name: '📊 Market Cap', value: mcapComparison });
        }
        
        if (liq1 > 0 || liq2 > 0) {
          const betterLiq = liq1 > liq2 ? 'A' : 'B';
          let liqComparison = `A: $${formatNumber(liq1)}\n`;
          liqComparison += `B: $${formatNumber(liq2)}\n`;
          liqComparison += `👑 Better: Token ${betterLiq}`;
          embed.addFields({ name: '💧 Liquidity', value: liqComparison });
        } else {
          embed.addFields({ name: '⚠️ Market Data', value: 'No trading data available for these tokens' });
        }
        
        const betterDist = (analysis1.topHolderConcentration ?? 100) < (analysis2.topHolderConcentration ?? 100) ? 'A' : 'B';
        let holderComparison = `A: ${(analysis1.topHolderConcentration ?? 0).toFixed(1)}% (${analysis1.holderCount ?? 0} holders)\n`;
        holderComparison += `B: ${(analysis2.topHolderConcentration ?? 0).toFixed(1)}% (${analysis2.holderCount ?? 0} holders)\n`;
        holderComparison += `👑 Better Distribution: Token ${betterDist}`;
        
        embed.addFields({ name: '👥 Holder Distribution', value: holderComparison });

        const a_mint = analysis1.mintAuthority?.hasAuthority && !analysis1.mintAuthority?.isRevoked ? '❌' : '✅';
        const b_mint = analysis2.mintAuthority?.hasAuthority && !analysis2.mintAuthority?.isRevoked ? '❌' : '✅';
        const a_freeze = analysis1.freezeAuthority?.hasAuthority && !analysis1.freezeAuthority?.isRevoked ? '❌' : '✅';
        const b_freeze = analysis2.freezeAuthority?.hasAuthority && !analysis2.freezeAuthority?.isRevoked ? '❌' : '✅';
        let security = `Mint: A ${a_mint} | B ${b_mint} • Freeze: A ${a_freeze} | B ${b_freeze}`;
        
        embed.addFields({ name: '🔐 Security', value: security });
        
        let aScore = 0;
        let bScore = 0;
        
        if (analysis1.riskScore > analysis2.riskScore) aScore++; else bScore++;
        if (vol1 > vol2) aScore++; else bScore++;
        if (liq1 > liq2) aScore++; else bScore++;
        if ((analysis1.topHolderConcentration ?? 100) < (analysis2.topHolderConcentration ?? 100)) aScore++; else bScore++;
        
        let verdict = '';
        if (aScore > bScore) {
          verdict = `🏆 **OVERALL**: Token A appears safer (${aScore}-${bScore})`;
        } else if (bScore > aScore) {
          verdict = `🏆 **OVERALL**: Token B appears safer (${bScore}-${aScore})`;
        } else {
          verdict = `⚖️ **OVERALL**: Both tokens are similar (${aScore}-${bScore})`;
        }
        
        embed.addFields({ name: '━━━━━━━━━━━━━━━━', value: verdict });
        
        await interaction.editReply({ embeds: [embed] });
      
      } else if (interaction.commandName === 'trending') {
        await interaction.deferReply();
        
        const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/solana');
        
        if (!response.ok) {
          throw new Error('Failed to fetch trending data');
        }
        
        const data = await response.json();
        const pairs = data.pairs || [];
        
        const trending = pairs
          .filter((p: any) => p.chainId === 'solana')
          .sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
          .slice(0, 10);
        
        if (trending.length === 0) {
          const embed = new EmbedBuilder()
            .setColor(0x808080)
            .setTitle('🔥 Trending Tokens')
            .setDescription('⚠️ No trending tokens found at the moment.')
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          return;
        }
        
        const embed = new EmbedBuilder()
          .setColor(0xff6600)
          .setTitle('🔥 Trending Solana Tokens')
          .setDescription('_Top 10 by 24h Volume_')
          .setTimestamp();
        
        trending.forEach((pair: any, index: number) => {
          const symbol = pair.baseToken?.symbol || 'Unknown';
          const price = parseFloat(pair.priceUsd || 0);
          const change24h = pair.priceChange?.h24 || 0;
          const volume = pair.volume?.h24 || 0;
          const liquidity = pair.liquidity?.usd || 0;
          
          const trendEmoji = change24h >= 0 ? '📈' : '📉';
          
          let fieldValue = `Price: $${price < 0.01 ? price.toFixed(8) : price.toFixed(4)} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(1)}%)\n`;
          fieldValue += `Vol: $${formatNumber(volume)} | Liq: $${formatNumber(liquidity)}\n`;
          fieldValue += `\`${pair.baseToken?.address}\``;
          
          embed.addFields({
            name: `${index + 1}. ${symbol} ${trendEmoji}`,
            value: fieldValue,
            inline: false
          });
        });
        
        embed.addFields({
          name: '━━━━━━━━━━━━━━━━',
          value: '💡 Use /execute <address> for full analysis'
        });
        
        await interaction.editReply({ embeds: [embed] });
      } else if (interaction.commandName === 'holders') {
        const tokenAddress = interaction.options.getString('address', true);
        const n = interaction.options.getInteger('n') ?? 20;
        await interaction.deferReply();
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`📊 Top ${Math.min(n, 50)} Holders - ${analysis.metadata.symbol}`)
          .setDescription(`Top 10: **${analysis.topHolderConcentration.toFixed(2)}%**`)
          .setTimestamp();
        analysis.topHolders.slice(0, Math.min(n, 50)).forEach((h, idx) => {
          embed.addFields({ name: `#${idx + 1}` , value: `\`${formatAddress(h.address)}\` - ${h.percentage.toFixed(2)}%`, inline: false });
        });
        await interaction.editReply({ embeds: [embed] });
      } else if (interaction.commandName === 'report') {
        const wallet = interaction.options.getString('wallet', true);
        const reason = interaction.options.getString('reason', true);
        await interaction.deferReply({ ephemeral: true });
        await reportWallet(wallet, 'scammer', reason, platformUserId);
        await interaction.editReply({ content: '✅ Report submitted. Thank you for helping keep the ecosystem safe!' });
      } else if (interaction.commandName === 'watch') {
        const tokenAddress = interaction.options.getString('address', true);
        await interaction.deferReply({ ephemeral: true });
        await ensureUser();
        try {
          await storage.addToWatchlist({ userId: platformUserId, tokenAddress, label: null as any, metadata: null as any });
          await interaction.editReply({ content: `✅ Added to your watchlist: \`${formatAddress(tokenAddress)}\`` });
        } catch (e: any) {
          await interaction.editReply({ content: `⚠️ Could not add: ${e?.message || 'unknown error'}` });
        }
      } else if (interaction.commandName === 'unwatch') {
        const tokenAddress = interaction.options.getString('address', true);
        await interaction.deferReply({ ephemeral: true });
        await ensureUser();
        try {
          await storage.removeFromWatchlist(platformUserId, tokenAddress);
          await interaction.editReply({ content: `✅ Removed from your watchlist: \`${formatAddress(tokenAddress)}\`` });
        } catch (e: any) {
          await interaction.editReply({ content: `⚠️ Could not remove: ${e?.message || 'unknown error'}` });
        }
      } else if (interaction.commandName === 'watchlist') {
        await interaction.deferReply({ ephemeral: true });
        await ensureUser();
        const list = await storage.getWatchlist(platformUserId);
        if (list.length === 0) {
          await interaction.editReply({ content: 'ℹ️ Your watchlist is empty. Use `/watch <address>` to add tokens.' });
        } else {
          const lines = list.map((w, i) => `${i + 1}. \`${formatAddress(w.tokenAddress)}\`${w.label ? ` — ${w.label}` : ''}`);
          await interaction.editReply({ content: `📝 Your Watchlist (${list.length}):\n${lines.join('\n')}` });
        }
      } else if (interaction.commandName === 'alert') {
        const tokenAddress = interaction.options.getString('address', true);
        const direction = interaction.options.getString('direction', true) as 'above' | 'below';
        const price = interaction.options.getNumber('price', true);
        await interaction.deferReply({ ephemeral: true });
        await ensureUser();
        const alertType = direction === 'above' ? 'price_above' : 'price_below';
        try {
          await storage.createPriceAlert({ userId: platformUserId, tokenAddress, alertType: alertType as any, targetValue: price.toString(), lookbackWindowMinutes: null as any });
          await interaction.editReply({ content: `🔔 Alert set: ${direction.toUpperCase()} $${price} for \`${formatAddress(tokenAddress)}\`` });
        } catch (e: any) {
          await interaction.editReply({ content: `⚠️ Could not create alert: ${e?.message || 'unknown error'}` });
        }
      } else if (interaction.commandName === 'alpha') {
        // Wrap alpha command handling in try/catch so any error still yields a Discord response
        try {
          let sub: string;
            try {
              sub = interaction.options.getSubcommand(false) || 'status';
            } catch {
              sub = 'status';
            }
          console.log(`[Discord /alpha] User ${interaction.user.tag} (ID: ${interaction.user.id}) | Guild: ${interaction.guildId || 'DM'} | Subcommand: ${sub}`);
          const alpha = getAlphaAlertService();
          const isDebug = sub === 'debug';
          if (!interaction.deferred && !interaction.replied) {
            try {
              await interaction.deferReply({ ephemeral: true });
            } catch (deferError) {
              console.error('[Discord /alpha] Failed to defer reply:', deferError);
              throw deferError;
            }
          }
          if (!isDebug && !canAdmin('alpha')) {
            console.log(`[Discord /alpha] PERMISSION DENIED for user ${interaction.user.id} | hasGuildPerms: ${hasGuildPerms} | isAdminEnv: ${isAdminEnv}`);
            await interaction.editReply({ content: '⛔ Admins only.' });
            return;
          }
          console.log(`[Discord /alpha] Permission granted for user ${interaction.user.id} | hasGuildPerms: ${hasGuildPerms} | isAdminEnv: ${isAdminEnv}`);
          if (sub === 'status') {
            const verbose = interaction.options.getBoolean('verbose') || false;
            const st = alpha.getStatus(verbose);
            console.log(`[Discord /alpha status] Service status: ${JSON.stringify(st)}`);
            let content = `**Alpha Status**\n` +
              `• Running: ${st.isRunning ? '✅' : '🛑'}\n` +
              `• Monitored Callers: ${st.monitoredCallers} / ${st.totalCallers}\n` +
              `• Active Listeners: ${st.activeListeners}\n` +
              `• WebSockets: ${st.activeWebSockets}`;
            if (st.message) content += `\n\n**💡 Suggestion:**\n${st.message}`;
            if (verbose && st.callers) {
              const callerList = st.callers.map(c => `• ${c.name} (${formatAddress(c.wallet)}) - ${c.enabled ? '✅' : '❌'}`).join('\n');
              content += `\n\n**Configured Callers:**\n${callerList}`;
            }
            await interaction.editReply({ content });
          } else if (sub === 'start') {
            console.log('[Discord /alpha start] Starting alpha alerts service...');
            await alpha.start();
            await interaction.editReply({ content: '✅ Alpha monitoring started.' });
          } else if (sub === 'stop') {
            console.log('[Discord /alpha stop] Stopping alpha alerts service...');
            await alpha.stop();
            await interaction.editReply({ content: '🛑 Alpha monitoring stopped.' });
          } else if (sub === 'debug') {
            const lines = [
              `userId: ${interaction.user.id}`,
              `guildId: ${interaction.guildId || 'DM'}`,
              `hasGuildPerms: ${hasGuildPerms}`,
              `isAdminEnv: ${isAdminEnv}`,
              `adminAllowlistSize: ${adminAllowlist.size}`,
              `inAllowlist: ${adminAllowlist.has(interaction.user.id)}`,
              `relayDisabled: ${process.env.ALPHA_ALERTS_DIRECT_SEND === 'true'}`
            ];
            await interaction.editReply({ content: 'Alpha Debug:\n' + lines.join('\n') });
          } else if (sub === 'setchannel') {
            if (!interaction.guildId) { await interaction.editReply({ content: '❌ This command must be used in a server.' }); return; }
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
              await interaction.editReply({ content: '❌ Please select a text or announcement channel.' });
              return;
            }
            try {
              console.log(`[Discord /alpha setchannel] Setting alpha target - Guild: ${interaction.guildId} | Channel: ${channel.id}`);
              await storage.setAlphaTarget({ platform: 'discord', groupId: interaction.guildId, channelId: channel.id });
              await interaction.editReply({ content: `✅ Alpha alerts will be sent to <#${channel.id}>.` });
            } catch (err: any) {
              console.error('[Discord /alpha setchannel] Error:', err);
              await interaction.editReply({ content: `❌ Failed to set channel: ${err?.message || 'Unknown error'}` });
            }
          } else if (sub === 'clearchannel') {
            if (!interaction.guildId) { await interaction.editReply({ content: '❌ This command must be used in a server.' }); return; }
            try {
              await storage.clearAlphaTarget('discord', interaction.guildId);
              await interaction.editReply({ content: '🧹 Cleared this server\'s alpha alert channel.' });
            } catch (err: any) {
              console.error('[Discord /alpha clearchannel] Error:', err);
              await interaction.editReply({ content: `❌ Failed to clear channel: ${err?.message || 'Unknown error'}` });
            }
          } else if (sub === 'where') {
            if (!interaction.guildId) { await interaction.editReply({ content: '❌ This command must be used in a server.' }); return; }
            try {
              const cfg = await storage.getAlphaTarget('discord', interaction.guildId);
              console.log(`[Discord /alpha where] Retrieved target for guild ${interaction.guildId}: ${JSON.stringify(cfg)}`);
              await interaction.editReply({ content: cfg ? `📍 Alpha alerts go to <#${cfg.channelId}>` : 'ℹ️ No channel configured for this server.' });
            } catch (err: any) {
              console.error('[Discord /alpha where] Error:', err);
              await interaction.editReply({ content: `❌ Failed to get channel: ${err?.message || 'Unknown error'}` });
            }
          } else if (sub === 'add') {
            const wallet = interaction.options.getString('wallet', true);
            const name = interaction.options.getString('name', true);
            console.log(`[Discord /alpha add] Adding alpha caller - Wallet: ${wallet} | Name: ${name}`);
            alpha.addCaller(wallet, name);
            await interaction.editReply({ content: `✅ Added alpha caller ${name} (${formatAddress(wallet)})` });
          } else if (sub === 'remove') {
            const wallet = interaction.options.getString('wallet', true);
            console.log(`[Discord /alpha remove] Removing alpha caller - Wallet: ${wallet}`);
            alpha.removeCaller(wallet);
            await interaction.editReply({ content: `✅ Removed alpha caller (${formatAddress(wallet)})` });
          } else if (sub === 'reload') {
            const minInfluence = interaction.options.getInteger('mininfluence') ?? 60;
            console.log(`[Discord /alpha reload] Reloading wallets from database with min influence: ${minInfluence}`);
            await alpha.loadWalletsFromDatabase(minInfluence);
            const st = alpha.getStatus();
            await interaction.editReply({ content: `✅ Reloaded wallets from database.\n• Total Callers: ${st.totalCallers}\n• Monitored: ${st.monitoredCallers}` });
          } else {
            await interaction.editReply({ content: '⚠️ Unknown subcommand. Try `/alpha status`.' });
          }
        } catch (err: any) {
          console.error('[Discord /alpha] Unhandled error:', err);
          try {
            if (!interaction.deferred && !interaction.replied) {
              await interaction.reply({ content: `❌ Alpha command failed: ${err?.message || 'Unknown error'}`, ephemeral: true });
            } else {
              await interaction.editReply({ content: `❌ Alpha command failed: ${err?.message || 'Unknown error'}` });
            }
          } catch (inner) {
            console.error('[Discord /alpha] Failed sending error response:', inner);
          }
        }
      } else if (interaction.commandName === 'smart') {
        const sub = interaction.options.getSubcommand(true);
        if (!canAdmin('smart')) {
          await interaction.reply({ content: '⛔ Admins only.', ephemeral: true });
          return;
        }
        await interaction.deferReply({ ephemeral: true });
        if (!interaction.guildId && sub !== 'test') {
          await interaction.editReply({ content: '❌ This command must be used in a server.' });
          return;
        }
        if (sub === 'setchannel') {
          const channel = interaction.options.getChannel('channel') || interaction.channel;
          if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
            await interaction.editReply({ content: '❌ Please select a text or announcement channel.' });
            return;
          }
          await storage.setSmartTarget({ platform: 'discord', groupId: interaction.guildId, channelId: channel.id });
          await interaction.editReply({ content: `✅ Smart Money calls will be sent to <#${channel.id}>.` });
        } else if (sub === 'clearchannel') {
          await storage.clearSmartTarget('discord', interaction.guildId);
          await interaction.editReply({ content: '🧹 Cleared this server\'s Smart Money alert channel.' });
        } else if (sub === 'where') {
          const cfg = await storage.getSmartTarget('discord', interaction.guildId);
          await interaction.editReply({ content: cfg ? `📍 Smart Money calls go to <#${cfg.channelId}>` : 'ℹ️ No Smart Money channel configured for this server.' });
        } else if (sub === 'test') {
          // Publish a mock smart money event through the relay
          const mockEvent = {
            tokenMint: 'pump1234567890abcdefghijklmnopqrstuv',
            tokenSymbol: 'TEST',
            tokenName: 'Test Token',
            wallets: [
              {
                address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
                winrate: 82.5,
                profit: 750000,
                directive: 'PRIORITY WATCH',
              },
              {
                address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
                winrate: 78.0,
                profit: 600000,
                directive: 'HIGH WATCH',
              },
            ],
            source: 'helius-webhook',
            timestamp: Date.now(),
          };
          
          smartMoneyRelay.publish(mockEvent);
          
          await interaction.editReply({ 
            content: `🧪 **Test Smart Money Alert Sent**\n\n` +
              `Token: \`${mockEvent.tokenSymbol}\` (\`${mockEvent.tokenMint}\`)\n` +
              `Wallets: ${mockEvent.wallets.length}\n` +
              `Top Directive: ${mockEvent.wallets[0].directive}\n\n` +
              `Check your configured Smart Money channels for the alert.`
          });
        }
      } else if (interaction.commandName === 'whitelist') {
        const subcommand = interaction.options.getSubcommand(false) ?? 'stats';
        if (subcommand === 'check') {
          await interaction.deferReply({ ephemeral: true });
          const walletInput = interaction.options.getString('wallet', true).trim();
          const normalized = walletInput.replace(/\s+/g, '');
          const whitelisted = isExchangeWallet(normalized);
          const embed = new EmbedBuilder()
            .setColor(whitelisted ? 0x00cc66 : 0xff3366)
            .setTitle('🏦 Exchange Whitelist Check')
            .setDescription(`Wallet: \`${formatAddress(normalized)}\``)
            .addFields({
              name: whitelisted ? 'Status' : 'Status',
              value: whitelisted
                ? '✅ This wallet is on the exchange whitelist and will be excluded from rug score penalties.'
                : '❌ This wallet is **not** on the exchange whitelist. It will be treated as a normal holder.',
            })
            .setFooter({ text: `Version ${EXCHANGE_WHITELIST_VERSION} • Updated ${EXCHANGE_LAST_UPDATED}` });
          await interaction.editReply({ embeds: [embed] });
        } else if (subcommand === 'stats') {
          await interaction.deferReply();
          const total = EXCHANGE_WALLETS.size;
          const sampleSize = Math.min(total, 10);
          const sample = Array.from(EXCHANGE_WALLETS).slice(0, sampleSize);
          const sampleList = sample.length
            ? sample.map((address, idx) => `${idx + 1}. \`${formatAddress(address)}\``).join('\n')
            : 'Whitelist is currently empty.';
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🏦 Exchange Wallet Whitelist')
            .setDescription(`Tracking **${total}** known exchange wallets from major CEX venues.`)
            .addFields(
              {
                name: 'Version',
                value: `v${EXCHANGE_WHITELIST_VERSION} • Updated ${EXCHANGE_LAST_UPDATED}`,
                inline: true,
              },
              {
                name: 'Usage',
                value: 'Use `/exchanges <token>` to quantify how much supply belongs to exchanges.',
                inline: true,
              },
              {
                name: `Sample (${sampleSize})`,
                value: sampleList,
              }
            );
          await interaction.editReply({ embeds: [embed] });
        } else if (subcommand === 'add') {
          await interaction.deferReply({ ephemeral: true });
          if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await interaction.editReply({ content: '⛔ Admin only. You need Administrator permission to modify the whitelist.' });
            return;
          }
          const walletInput = interaction.options.getString('wallet', true).trim();
          const result = addExchangeWallet(walletInput);
          if ((result as any).error) {
            await interaction.editReply({ content: `❌ Failed to add: ${(result as any).error}` });
            return;
          }
            if (result.already) {
              await interaction.editReply({ content: `ℹ️ Wallet \`${formatAddress(walletInput)}\` is already whitelisted. (Total: ${result.size})` });
              return;
            }
            if (result.added) {
              await interaction.editReply({ content: `✅ Added wallet \`${formatAddress(walletInput)}\` to exchange whitelist. New size: ${result.size}` });
            } else {
              await interaction.editReply({ content: '❌ Unknown failure adding wallet.' });
            }
        }
      } else if (interaction.commandName === 'exchanges') {
        const tokenAddress = interaction.options.getString('address', true);
        await interaction.deferReply();
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
        const stats = getExchangeStats(analysis.topHolders.map(h => ({ address: h.address, percentage: h.percentage })));
        const embed = new EmbedBuilder()
          .setColor(stats.isSignificant ? 0xffa500 : 0x00cc66)
          .setTitle(`🏦 Exchange Presence - ${analysis.metadata.symbol}`)
          .setDescription(`Exchanges hold ${stats.totalPercentage.toFixed(2)}% across ${stats.count} wallets`)
          .setTimestamp();
        if (stats.holders.length > 0) {
          embed.addFields({ name: 'Exchange Holders', value: stats.holders.slice(0, 10).map(h => `• \`${formatAddress(h.address)}\` — ${h.percentage.toFixed(2)}%`).join('\n') });
        }
        await interaction.editReply({ embeds: [embed] });
      } else if (interaction.commandName === 'pumpfun') {
        const tokenAddress = interaction.options.getString('address', true);
        await interaction.deferReply();
        
        try {
          const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
          try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
          const pf = analysis.pumpFunData;
          const pair = analysis.dexscreenerData?.pairs?.[0];
          
          if (!pf?.isPumpFun) {
            const embed = new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle('❌ Not a Pump.fun Token')
              .setDescription(`\`${formatAddress(tokenAddress)}\` is not identified as a pump.fun token.\n\nUse \`/execute\` for full analysis.`);
            await interaction.editReply({ embeds: [embed] });
            return;
          }
          
          // Build enhanced pump.fun embed
          const bondingCurve = pf.bondingCurve ?? 0;
          const devBought = pf.devBought ?? 0;
          const graduated = pf.mayhemMode || bondingCurve >= 99;
          
          // Risk assessment
          const riskEmoji = getRiskEmoji(analysis.riskLevel);
          const safetyScore = analysis.riskScore;
          
          // Price info
          const price = pair?.priceUsd ? parseFloat(pair.priceUsd) : 0;
          const priceChange = pair?.priceChange?.h24 ?? 0;
          const priceEmoji = priceChange >= 0 ? '📈' : '📉';
          
          // Market stats
          const fdv = pair?.fdv ?? pair?.marketCap ?? 0;
          const volume = pair?.volume?.h24 ?? 0;
          const liquidity = pair?.liquidity?.usd ?? 0;
          
          // Txn stats
          const buys = pair?.txns?.h24?.buys ?? 0;
          const sells = pair?.txns?.h24?.sells ?? 0;
          const buyRatio = buys + sells > 0 ? (buys / (buys + sells)) * 100 : 0;
          
          // Holder stats
          const holders = analysis.holderCount ?? 0;
          const top10 = analysis.topHolderConcentration ?? 0;
          
          // Token age
          const ageMs = analysis.creationDate ? Date.now() - analysis.creationDate : 0;
          const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
          const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
          const ageStr = ageDays > 0 ? `${ageDays}d` : `${ageHours}h`;
          
          const embed = new EmbedBuilder()
            .setColor(graduated ? 0x00ff00 : bondingCurve >= 75 ? 0xffa500 : 0x3498db)
            .setTitle(`${riskEmoji} ${analysis.metadata.name} - $${analysis.metadata.symbol}`)
            .setURL(`https://pump.fun/${tokenAddress}`)
            .setImage(`https://dd.dexscreener.com/ds-data/tokens/solana/${tokenAddress}.png?size=lg&t=${Date.now()}`)
            .addFields(
              {
                name: '💰 Price',
                value: price > 0 
                  ? `$${price.toFixed(price < 0.0001 ? 8 : 6)}\n${priceEmoji} ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(1)}% [24h]`
                  : 'N/A',
                inline: true
              },
              {
                name: '📊 FDV',
                value: `$${formatNumber(fdv)}`,
                inline: true
              },
              {
                name: '🔥 Vol [24h]',
                value: `$${formatNumber(volume)}`,
                inline: true
              },
              {
                name: '🎯 Bonding Progress',
                value: bondingCurve >= 99 
                  ? `✅ ${bondingCurve.toFixed(1)}% - **GRADUATED**`
                  : `${bondingCurve.toFixed(1)}%${bondingCurve >= 75 ? ' 🚀' : bondingCurve >= 50 ? ' 📈' : ''}`,
                inline: true
              },
              {
                name: '💧 Liquidity',
                value: `$${formatNumber(liquidity)}`,
                inline: true
              },
              {
                name: '⏱️ Age',
                value: ageStr,
                inline: true
              },
              {
                name: '🔄 Txns [24h]',
                value: `🟢 ${buys} / 🔴 ${sells}\n${buyRatio >= 60 ? '🔥' : buyRatio <= 40 ? '⚠️' : '📊'} ${buyRatio.toFixed(0)}% buys`,
                inline: true
              },
              {
                name: '👥 Holders',
                value: `${holders}\nTop 10: ${top10.toFixed(1)}%`,
                inline: true
              },
              {
                name: '🎯 Safety',
                value: `${safetyScore}/100 (${analysis.riskLevel})`,
                inline: true
              }
            );
          
          // Add dev bought warning if > 0
          if (devBought > 0) {
            embed.addFields({
              name: devBought > 5 ? '🚨 Dev Holdings' : '⚠️ Dev Holdings',
              value: `${devBought.toFixed(1)}%${devBought > 10 ? ' - **HIGH RISK**' : devBought > 5 ? ' - Moderate Risk' : ''}`,
              inline: false
            });
          }
          
          // Add king data if exists
          if (pf.king) {
            embed.addFields({
              name: '👑 King of the Hill',
              value: `${formatAddress(pf.king.address)} holds ${pf.king.percentage.toFixed(1)}%`,
              inline: false
            });
          }
          
          // Security info
          const mintRevoked = analysis.mintAuthority?.isRevoked ?? false;
          const freezeRevoked = analysis.freezeAuthority?.isRevoked ?? false;
          embed.addFields({
            name: '🔐 Security',
            value: `Mint: ${mintRevoked ? '✅' : '❌'} | Freeze: ${freezeRevoked ? '✅' : '❌'}`,
            inline: false
          });
          
          // Quick links
          const links = [
            `[Pump.fun](https://pump.fun/${tokenAddress})`,
            `[GMGN](https://gmgn.ai/sol/token/${tokenAddress})`,
            `[Padre](https://padre.fun/token/${tokenAddress})`,
            `[DexScreener](https://dexscreener.com/solana/${tokenAddress})`,
            `[Solscan](https://solscan.io/token/${tokenAddress})`
          ].join(' • ');
          
          embed.setFooter({ text: `Contract: ${tokenAddress}` });
          embed.setDescription(links);
          embed.setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error: any) {
          console.error('Pumpfun command error:', error);
          const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ Analysis Failed')
            .setDescription(`Failed to analyze token.\n\n**Error:** ${error?.message || 'Unknown error'}`);
          await interaction.editReply({ embeds: [errorEmbed] });
        }
      } else if (interaction.commandName === 'blackliststats') {
        await interaction.deferReply();
        try {
          const statsPromise = getBlacklistStats();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          );
          const s = await Promise.race([statsPromise, timeoutPromise]) as any;
          
          const embed = new EmbedBuilder()
            .setColor(0x8888ff)
            .setTitle('📛 Blacklist Statistics')
            .addFields(
              { name: 'Total Labels', value: String(s.total || 0), inline: true },
              { name: 'Active', value: String(s.active || 0), inline: true },
              { name: 'Avg Severity', value: (s.avgSeverity || 0).toFixed(1), inline: true },
            )
            .addFields(
              { name: 'Ruggers', value: String(s.ruggers || 0), inline: true },
              { name: 'Scammers', value: String(s.scammers || 0), inline: true },
              { name: 'Honeypots', value: String(s.honeypots || 0), inline: true },
            )
            .setTimestamp();
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply({ content: '❌ Database not available in in-memory mode. Set up PostgreSQL to enable blacklist features.' });
        }
      } else if (interaction.commandName === 'blacklisttop') {
        const limit = interaction.options.getInteger('limit') ?? 10;
        await interaction.deferReply();
        const top = await getTopFlaggedWallets(Math.min(limit, 50));
        const embed = new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle('🚫 Top Flagged Wallets')
          .setDescription(top.length ? top.map((w: { walletAddress: string; severity: number; rugCount: number }, i: number) => `${i + 1}. \`${formatAddress(w.walletAddress)}\` — sev ${w.severity}, rugs ${w.rugCount}`).join('\n') : 'No data')
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } else if (interaction.commandName === 'reload') {
        if (!canAdmin('reload')) {
          await interaction.reply({ content: '⛔ Admins only.', ephemeral: true });
          return;
        }
        if (restartScheduled) {
          await interaction.reply({ content: '⏳ Restart already in progress. Stand by…', ephemeral: true });
          return;
        }
        restartScheduled = true;
        await interaction.reply({ content: '♻️ Restarting bot… back in a few seconds.', ephemeral: true });
        console.log(`[Discord /reload] Restart requested by ${interaction.user.tag} (${interaction.user.id})`);
        setTimeout(() => {
          try {
            client.destroy();
          } catch (err) {
            console.error('[Discord /reload] Error during client destroy:', err);
          }
          process.exit(0);
        }, 1500);
      } else if (interaction.commandName === 'chart') {
        const tokenAddress = interaction.options.getString('address', true);
        const embed = new EmbedBuilder()
          .setColor(0x1abc9c)
          .setTitle('📈 Price Chart')
          .setURL(`https://dexscreener.com/solana/${tokenAddress}`)
          .setDescription(`[View on DexScreener](https://dexscreener.com/solana/${tokenAddress})`)
          .setImage(`https://dd.dexscreener.com/ds-data/tokens/solana/${tokenAddress}.png?size=lg&t=${Date.now()}`)
          .setFooter({ text: `Token: ${formatAddress(tokenAddress)}` })
          .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: false });
      } else if (interaction.commandName === 'graderepo') {
        const githubUrl = interaction.options.getString('url', true);
        console.log(`[Discord /graderepo] User ${interaction.user.tag} grading: ${githubUrl}`);
        
        await interaction.deferReply();
        
        try {
          // Import the analyzer
          const { githubAnalyzer } = await import('./services/github-repo-analyzer.js');
          const result = await githubAnalyzer.gradeRepository(githubUrl);
          
          console.log(`[Discord /graderepo] Analysis complete for ${githubUrl}`);
          
          if (!result.found) {
            const errorEmbed = new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle('❌ Repository Not Found')
              .setDescription(result.error || 'Invalid GitHub URL or inaccessible repository')
              .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
          }
          
          const m = result.metrics!;
          
          // Determine color based on grade
          let color = 0x808080; // Gray default
          if (result.confidenceScore >= 85) color = 0x00ff00; // Green
          else if (result.confidenceScore >= 70) color = 0xffff00; // Yellow
          else if (result.confidenceScore >= 55) color = 0xff8800; // Orange
          else color = 0xff0000; // Red
          
          const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`📊 GitHub Repository Grade: ${result.grade}`)
            .setURL(m.url)
            .setDescription(`**${m.owner}/${m.repo}**\n${result.recommendation}`)
            .addFields(
              {
                name: '🎯 Confidence Score',
                value: `**${result.confidenceScore}/100**`,
                inline: true
              },
              {
                name: '⭐ Community',
                value: `${m.stars.toLocaleString()} stars\n${m.forks.toLocaleString()} forks\n${m.contributors} contributors`,
                inline: true
              },
              {
                name: '💻 Tech Stack',
                value: `${m.language || 'Mixed'}${m.isSolanaProject ? ' (Solana)' : ''}\n${m.commits.toLocaleString()} commits\nLast: ${m.lastCommitDate?.toLocaleDateString() || 'Unknown'}`,
                inline: true
              },
              {
                name: '📊 Score Breakdown',
                value: 
                  `🔒 Security: ${result.securityScore}/30\n` +
                  `⚡ Activity: ${result.activityScore}/25\n` +
                  `🌟 Popularity: ${result.popularityScore}/20\n` +
                  `💚 Health: ${result.healthScore}/15` +
                  (result.solanaScore > 0 ? `\n🚀 Solana: ${result.solanaScore}/10` : ''),
                inline: false
              }
            )
            .setTimestamp();
          
          if (result.strengths.length > 0) {
            embed.addFields({
              name: '✅ Strengths',
              value: result.strengths.slice(0, 5).join('\n').slice(0, 1024),
              inline: false
            });
          }
          
          if (result.risks.length > 0) {
            embed.addFields({
              name: '⚠️ Risks',
              value: result.risks.slice(0, 5).join('\n').slice(0, 1024),
              inline: false
            });
          }
          
          embed.setFooter({ text: `Analyzed at ${result.analyzedAt.toLocaleString()}` });
          
          await interaction.editReply({ embeds: [embed] });
          console.log(`[Discord /graderepo] Reply sent for ${githubUrl}`);
        } catch (error: any) {
          console.error(`[Discord /graderepo] Error for ${githubUrl}:`, error);
          
          const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ Analysis Failed')
            .setDescription(`Failed to analyze repository: ${error.message || 'Unknown error'}`)
            .setTimestamp();
          
          await interaction.editReply({ embeds: [errorEmbed] });
        }
      } else if (interaction.commandName === 'smartwallet') {
        const sc = interaction.options.getSubcommand();
        const member = interaction.member as any;
        const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
          member?.permissions?.has?.(PermissionFlagsBits.ManageGuild) ||
          member?.permissions?.has?.(PermissionFlagsBits.ManageChannels) ||
          (process.env.DISCORD_ADMIN_IDS || '').split(',').includes(interaction.user.id);
        if (!isAdmin) {
          await interaction.reply({ content: '❌ Admin only (Administrator, Manage Guild, or Manage Channels).', ephemeral: true });
          return;
        }
        if (sc === 'add') {
          const wallet = interaction.options.getString('wallet', true);
          const name = interaction.options.getString('name', true);
          const influence = interaction.options.getInteger('influence') ?? 60;
          await interaction.deferReply();
          try {
            const added = await storage.upsertSmartWallet({ walletAddress: wallet, displayName: name, influenceScore: influence, source: 'manual', isActive: true });
            await interaction.editReply(`✅ Smart wallet added: \`${formatAddress(wallet)}\` (${name}) with influence ${influence}\n\n⚠️ Note: This is for Smart Money tracking only. Use \`/alpha add\` to add alpha callers.`);
          } catch (e: any) {
            await interaction.editReply(`❌ Failed: ${e.message}`);
          }
        } else if (sc === 'remove') {
          const wallet = interaction.options.getString('wallet', true);
          await interaction.deferReply();
          try {
            await storage.setSmartWalletActive(wallet, false);
            await interaction.editReply(`✅ Smart wallet deactivated: \`${formatAddress(wallet)}\``);
          } catch (e: any) {
            await interaction.editReply(`❌ Failed: ${e.message}`);
          }
        } else if (sc === 'activate') {
          const wallet = interaction.options.getString('wallet', true);
          await interaction.deferReply();
          try {
            const w = await storage.setSmartWalletActive(wallet, true);
            await interaction.editReply(`✅ Smart wallet re-activated: \`${formatAddress(wallet)}\``);
          } catch (e: any) {
            await interaction.editReply(`❌ Failed: ${e.message}`);
          }
        } else if (sc === 'list') {
          const limit = interaction.options.getInteger('limit') ?? 20;
          await interaction.deferReply();
          const wallets = await storage.getActiveSmartWallets(0, limit);
          if (!wallets.length) {
            await interaction.editReply('No smart wallets in DB.');
          } else {
            const lines = wallets.map((w, i) => `${i + 1}. \`${formatAddress(w.walletAddress)}\` — ${w.displayName || 'Unknown'} (inf ${w.influenceScore})`);
            await interaction.editReply(`🧠 **Smart Wallets (${wallets.length})**\n${lines.join('\n')}`);
          }
        } else if (sc === 'view') {
          const wallet = interaction.options.getString('wallet', true);
          await interaction.deferReply();
          const w = await storage.getSmartWallet(wallet);
          if (!w) {
            await interaction.editReply(`❌ Wallet not found in smart DB: \`${formatAddress(wallet)}\``);
          } else {
            const embed = new EmbedBuilder()
              .setColor(0x66ccff)
              .setTitle('🧠 Smart Wallet Details')
              .addFields(
                { name: 'Address', value: `\`\`\`${w.walletAddress}\`\`\``, inline: false },
                { name: 'Name', value: w.displayName || 'N/A', inline: true },
                { name: 'Source', value: w.source || 'N/A', inline: true },
                { name: 'Influence', value: String(w.influenceScore ?? 'N/A'), inline: true },
                { name: 'Win Rate', value: `${w.winRate ?? 'N/A'}%`, inline: true },
                { name: 'Active', value: w.isActive ? '✅' : '❌', inline: true },
              )
              .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
          }
        }
      }
      
    } catch (error) {
      console.error('Discord command error:', error);
      
      // Get meaningful error message
      let errorMsg = '❌ Error executing command.';
      if (error instanceof Error) {
        // Show specific error details for debugging
        if (error.message.includes('Invalid') || error.message.includes('not found')) {
          errorMsg += ` ${error.message}`;
        } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
          errorMsg += ' Request timed out. The RPC might be slow. Try again.';
        } else if (error.message.includes('rate limit')) {
          errorMsg += ' Rate limited. Please wait a moment and try again.';
        } else {
          errorMsg += ` ${error.message}`;
        }
      }
      errorMsg += '\n\n*Tip: Make sure you\'re using a valid Solana token address.*';
      
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMsg });
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      }
    }
  });
  
  // Handle direct messages and mentions
  const lastResponded: Map<string, number> = new Map(); // key: channelId:symbol
  client.on('messageCreate', async message => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Ignore empty messages
    if (!message.content) return;
    
    const text = message.content.trim();
    const lowerText = text.toLowerCase();
    
    // Debug logging for command detection
    if (text.startsWith('!')) {
      console.log(`[Discord] Command detected: "${text}" from ${message.author.tag}`);
    
    // ===================================================================
    // PRIORITY 1: Handle ! prefix commands FIRST (for Android users)
    // These work WITHOUT requiring bot mention
    // ===================================================================
    
    // !scan or !execute - Full rug detection scan
    // More flexible regex: allows multiple spaces and works with/without trailing content
    const scanMatch = text.match(/^!(?:scan|execute)\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
    if (scanMatch) {
      const tokenAddress = scanMatch[1];
      console.log(`[Discord !scan] User ${message.author.tag} scanning: ${tokenAddress}`);
      
      const intro = rally.getAnalysisIntro('this token', true);
      const loadingMsg = await message.reply(intro.message);
      
      try {
        await message.channel.sendTyping();
        
        const analysisPromise = tokenAnalyzer.analyzeToken(tokenAddress);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Analysis timeout after 30 seconds')), 30000)
        );
        
        const analysis = await Promise.race([analysisPromise, timeoutPromise]) as any;
        console.log(`[Discord !scan] Analysis complete for ${tokenAddress}`);
        
        try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
        const embed = createAnalysisEmbed(analysis);
        
        const riskComment = rally.getRiskCommentary(analysis.riskScore, analysis.riskLevel);
        
        await loadingMsg.edit({ content: riskComment.message, embeds: [embed] });
        console.log(`[Discord !scan] Reply sent for ${tokenAddress}`);
        return;
      } catch (error: any) {
        console.error(`[Discord !scan] Error for ${tokenAddress}:`, error.message);
        
        let errorType: 'invalid_address' | 'not_found' | 'network_error' | 'rate_limit' | 'generic' = 'generic';
        if (error.message.includes('Invalid') || error.message.includes('not valid')) errorType = 'invalid_address';
        else if (error.message.includes('not found')) errorType = 'not_found';
        else if (error.message.includes('timeout') || error.message.includes('network')) errorType = 'network_error';
        else if (error.message.includes('rate limit')) errorType = 'rate_limit';
        
        const errorResponse = rally.getErrorResponse(errorType);
        await loadingMsg.edit({ content: errorResponse.message });
        return;
      }
    }
    
    // !help - Show command list
    const helpMatch = text.match(/^!help$/i);
    if (helpMatch) {
      const helpEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🤖 Rug Killer Alpha Bot - Command Guide')
        .setDescription('**For Android users:** Use `!command` instead of `/command`\n\n**Available Commands:**')
        .addFields(
          { name: '!scan [address]', value: 'Full 52-metric rug detection scan', inline: false },
          { name: '!execute [address]', value: 'Same as !scan (alias)', inline: false },
          { name: '!first20 [address]', value: 'Analyze top 20 token holders', inline: false },
          { name: '!devaudit [address]', value: 'Track developer wallet history', inline: false },
          { name: '!blacklist [wallet]', value: 'Check if wallet is flagged', inline: false },
          { name: '!whaletrack [address]', value: 'Track smart money wallets', inline: false },
          { name: '!kol [wallet]', value: 'Check if wallet is a known KOL', inline: false },
          { name: '!price [address]', value: 'Quick price lookup', inline: false },
          { name: '!rugcheck [address]', value: 'Instant rug detection', inline: false }
        )
        .setFooter({ text: 'Scan any Solana token for rug pulls in seconds!' });
      
      await message.reply({ embeds: [helpEmbed] });
      return;
    }
    
    // !first20 - Top 20 holders
    const first20Match = text.match(/^!first20\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
    if (first20Match) {
      const tokenAddress = first20Match[1];
      const loadingMsg = await message.reply('🔍 Analyzing top 20 holders...');
      
      try {
        await message.channel.sendTyping();
        const holders = await holderAnalysis.analyzeHolders(tokenAddress);
        
        if (!holders || holders.top20Holders.length === 0) {
          await loadingMsg.edit('⚠️ Could not fetch holder data for this token.');
          return;
        }
        
        const embed = new EmbedBuilder()
          .setColor('#3498db')
          .setTitle(`🏆 Top 20 Holders`)
          .setDescription(`Total Holders: ${holders.holderCount}\nTop 10: ${holders.topHolderConcentration.toFixed(1)}%`)
          .setFooter({ text: `Token: ${tokenAddress}` });
        
        const top20Text = holders.top20Holders.slice(0, 20).map((h, idx) => 
          `${idx + 1}. ${h.address.slice(0, 4)}...${h.address.slice(-4)} - ${h.percentage.toFixed(2)}%`
        ).join('\n');
        
        embed.addFields({ name: 'Top 20 Holders', value: top20Text || 'No data', inline: false });
        
        await loadingMsg.edit({ content: '', embeds: [embed] });
      } catch (error: any) {
        await loadingMsg.edit(`❌ Error: ${error.message}`);
      }
      return;
    }
    
    // !devaudit - Developer wallet audit
    const devauditMatch = text.match(/^!devaudit[\s\n]+([1-9A-HJ-NP-Za-km-z]{32,44})$/im);
    if (devauditMatch) {
      const tokenAddress = devauditMatch[1];
      const loadingMsg = await message.reply('🔍 Auditing developer wallet...');
      
      try {
        await message.channel.sendTyping();
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        
        const devWallet = analysis.topHolders?.[0];
        if (!devWallet) {
          await loadingMsg.edit('⚠️ Could not identify developer wallet.');
          return;
        }
        
        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle(`🔎 Developer Wallet Audit`)
          .addFields(
            { name: 'Dev Wallet', value: `${devWallet.address.slice(0, 8)}...${devWallet.address.slice(-8)}`, inline: false },
            { name: 'Holdings', value: `${devWallet.percentage.toFixed(2)}%`, inline: true },
            { name: 'Status', value: devWallet.percentage > 15 ? '⚠️ HIGH' : '✅ Normal', inline: true }
          )
          .setFooter({ text: `Token: ${tokenAddress}` });
        
        await loadingMsg.edit({ content: '', embeds: [embed] });
      } catch (error: any) {
        await loadingMsg.edit(`❌ Error: ${error.message}`);
      }
      return;
    }
    
    // !blacklist - Check wallet blacklist
    const blacklistMatch = text.match(/^!blacklist[\s\n]+([1-9A-HJ-NP-Za-km-z]{32,44})$/im);
    if (blacklistMatch) {
      const walletAddress = blacklistMatch[1];
      const loadingMsg = await message.reply('🔍 Checking blacklist...');
      
      try {
        const isBlacklisted = await creatorWalletService.isWalletBlacklisted(walletAddress);
        
        const embed = new EmbedBuilder()
          .setColor(isBlacklisted ? '#e74c3c' : '#2ecc71')
          .setTitle(isBlacklisted ? '🚨 BLACKLISTED WALLET' : '✅ Clean Wallet')
          .setDescription(`Wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`)
          .addFields({ 
            name: 'Status', 
            value: isBlacklisted ? '⚠️ This wallet is flagged for suspicious activity' : '✅ No flags found', 
            inline: false 
          });
        
        await loadingMsg.edit({ content: '', embeds: [embed] });
      } catch (error: any) {
        await loadingMsg.edit(`❌ Error: ${error.message}`);
      }
      return;
    }
    
    // !whaletrack - Track whales
    const whaletrackMatch = text.match(/^!whaletrack\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
    if (whaletrackMatch) {
      const tokenAddress = whaletrackMatch[1];
      const loadingMsg = await message.reply('🐋 Tracking smart money...');
      
      try {
        await message.channel.sendTyping();
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        
        const whales = analysis.whaleDetection;
        if (!whales || whales.whaleCount === 0) {
          await loadingMsg.edit('📊 No significant whale activity detected.');
          return;
        }
        
        const embed = new EmbedBuilder()
          .setColor('#9b59b6')
          .setTitle(`🐋 Whale Activity`)
          .addFields(
            { name: 'Whale Count', value: `${whales.whaleCount}`, inline: true },
            { name: 'Total Supply', value: `${whales.totalWhaleSupplyPercent.toFixed(1)}%`, inline: true },
            { name: 'Avg Buy Size', value: `${whales.averageBuySize.toFixed(2)}%`, inline: true }
          )
          .setFooter({ text: `Token: ${tokenAddress}` });
        
        await loadingMsg.edit({ content: '', embeds: [embed] });
      } catch (error: any) {
        await loadingMsg.edit(`❌ Error: ${error.message}`);
      }
      return;
    }
    
    // !kol - Check KOL status
    const kolMatch = text.match(/^!kol\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
    if (kolMatch) {
      const walletAddress = kolMatch[1];
      const loadingMsg = await message.reply('🔍 Checking KOL status...');
      
      try {
        const isKOL = await creatorWalletService.isKnownKOL(walletAddress);
        
        const embed = new EmbedBuilder()
          .setColor(isKOL ? '#f39c12' : '#95a5a6')
          .setTitle(isKOL ? '⭐ Known KOL' : '👤 Unknown Wallet')
          .setDescription(`Wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`)
          .addFields({ 
            name: 'Status', 
            value: isKOL ? '⭐ This is a known Key Opinion Leader' : 'ℹ️ Not a registered KOL', 
            inline: false 
          });
        
        await loadingMsg.edit({ content: '', embeds: [embed] });
      } catch (error: any) {
        await loadingMsg.edit(`❌ Error: ${error.message}`);
      }
      return;
    }
    
    // !price - Quick price check
    const priceMatch = text.match(/^!price\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
    if (priceMatch) {
      const tokenAddress = priceMatch[1];
      const loadingMsg = await message.reply('💰 Fetching price...');
      
      try {
        const dexData = await dexScreener.getTokenData(tokenAddress);
        const pair = dexData?.pairs?.[0];
        
        if (!pair) {
          await loadingMsg.edit('⚠️ No price data found.');
          return;
        }
        
        const price = parseFloat(pair.priceUsd || '0');
        const priceChange = pair.priceChange?.h24 ?? 0;
        const emoji = priceChange >= 0 ? '📈' : '📉';
        
        const embed = new EmbedBuilder()
          .setColor(priceChange >= 0 ? '#2ecc71' : '#e74c3c')
          .setTitle(`💰 ${pair.baseToken?.symbol || 'Token'} Price`)
          .addFields(
            { name: 'Price', value: `$${price.toFixed(8)}`, inline: true },
            { name: '24h Change', value: `${emoji} ${priceChange.toFixed(2)}%`, inline: true },
            { name: 'Market Cap', value: `$${formatNumber(pair.marketCap || 0)}`, inline: true }
          )
          .setFooter({ text: `Token: ${tokenAddress}` });
        
        await loadingMsg.edit({ content: '', embeds: [embed] });
      } catch (error: any) {
        await loadingMsg.edit(`❌ Error: ${error.message}`);
      }
      return;
    }
    
    // !rugcheck - Quick rug scan
    const rugcheckMatch = text.match(/^!rugcheck\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
    if (rugcheckMatch) {
      const tokenAddress = rugcheckMatch[1];
      const loadingMsg = await message.reply('🔍 Running quick rug scan...');
      
      try {
        await message.channel.sendTyping();
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        
        const embed = new EmbedBuilder()
          .setColor(getRiskColor(analysis.riskLevel))
          .setTitle(`🛡️ Quick Rug Scan`)
          .addFields(
            { name: 'Risk Level', value: `${analysis.riskLevel} (${analysis.riskScore}/100)`, inline: true },
            { name: 'Mint Authority', value: analysis.mintAuthority?.hasAuthority ? '❌ Active' : '✅ Revoked', inline: true },
            { name: 'Freeze Authority', value: analysis.freezeAuthority?.hasAuthority ? '❌ Active' : '✅ Revoked', inline: true }
          )
          .setFooter({ text: `Token: ${tokenAddress}` });
        
        if (analysis.redFlags && analysis.redFlags.length > 0) {
          const flags = analysis.redFlags.slice(0, 3).map(f => `${f.severity === 'critical' ? '🔴' : '🟠'} ${f.title}`).join('\n');
          embed.addFields({ name: '⚠️ Red Flags', value: flags, inline: false });
        }
        
        await loadingMsg.edit({ content: '', embeds: [embed] });
      } catch (error: any) {
        await loadingMsg.edit(`❌ Error: ${error.message}`);
      }
      return;
    }
    
    // !holders - Top N holders
    const holdersMatch = text.match(/^!holders\s+([1-9A-HJ-NP-Za-km-z]{32,44})(?:\s+(\d+))?/i);
    if (holdersMatch) {
      const tokenAddress = holdersMatch[1];
      const count = holdersMatch[2] ? parseInt(holdersMatch[2]) : 10;
      const loadingMsg = await message.reply(`🔍 Analyzing top ${count} holders...`);
      
      try {
        await message.channel.sendTyping();
        const holders = await holderAnalysis.analyzeHolders(tokenAddress);
        
        if (!holders || holders.top20Holders.length === 0) {
          await loadingMsg.edit('⚠️ Could not fetch holder data.');
          return;
        }
        
        const holderText = holders.top20Holders.slice(0, count).map((h, idx) => 
          `${idx + 1}. ${h.address.slice(0, 4)}...${h.address.slice(-4)} - ${h.percentage.toFixed(2)}%`
        ).join('\n');
        
        const embed = new EmbedBuilder()
          .setColor('#3498db')
          .setTitle(`👥 Top ${count} Holders`)
          .setDescription(`Total: ${holders.holderCount}`)
          .addFields({ name: 'Holders', value: holderText, inline: false })
          .setFooter({ text: `Token: ${tokenAddress}` });
        
        await loadingMsg.edit({ content: '', embeds: [embed] });
      } catch (error: any) {
        await loadingMsg.edit(`❌ Error: ${error.message}`);
      }
      return;
    }
    
    // !liquidity - LP analysis
    const liquidityMatch = text.match(/^!liquidity[\s\n]+([1-9A-HJ-NP-Za-km-z]{32,44})$/im);
    if (liquidityMatch) {
      const tokenAddress = liquidityMatch[1];
      const loadingMsg = await message.reply('💧 Analyzing liquidity...');
      
      try {
        await message.channel.sendTyping();
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        const liq = analysis.liquidityInfo;
        
        const embed = new EmbedBuilder()
          .setColor('#3498db')
          .setTitle(`💧 Liquidity Analysis`)
          .addFields(
            { name: 'Pool Size', value: `$${formatNumber(liq?.poolSize || 0)}`, inline: true },
            { name: 'Locked', value: liq?.isLocked ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Burned', value: liq?.isBurned ? '✅ Yes' : '❌ No', inline: true }
          )
          .setFooter({ text: `Token: ${tokenAddress}` });
        
        await loadingMsg.edit({ content: '', embeds: [embed] });
      } catch (error: any) {
        await loadingMsg.edit(`❌ Error: ${error.message}`);
      }
      return;
    }
    
    // !chart - Chart links
    const chartMatch = text.match(/^!chart[\s\n]+([1-9A-HJ-NP-Za-km-z]{32,44})$/im);
    if (chartMatch) {
      const tokenAddress = chartMatch[1];
      
      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('📊 Chart Links')
        .setDescription(
          `🟢 [DexScreener](https://dexscreener.com/solana/${tokenAddress})\n` +
          `🟣 [Pump.fun](https://pump.fun/${tokenAddress})\n` +
          `🔍 [GMGN](https://gmgn.ai/sol/token/${tokenAddress})`
        );
      
      await message.reply({ embeds: [embed] });
      return;
    }
    
    // !pumpfun - Pump.fun link
    const pumpfunMatch = text.match(/^!pumpfun[\s\n]+([1-9A-HJ-NP-Za-km-z]{32,44})$/im);
    if (pumpfunMatch) {
      const tokenAddress = pumpfunMatch[1];
      await message.reply(`🟣 **Pump.fun**: https://pump.fun/${tokenAddress}`);
      return;
    }
    
    // !watch - Add to watchlist
    const watchMatch = text.match(/^!watch[\s\n]+([1-9A-HJ-NP-Za-km-z]{32,44})$/im);
    if (watchMatch) {
      const tokenAddress = watchMatch[1];
      const userId = message.author.id;
      
      try {
        await storage.addToWatchlist({ userId, tokenAddress, label: null, metadata: null });
        await message.reply(`✅ Added to your watchlist: \`${formatAddress(tokenAddress)}\``);
      } catch (error: any) {
        await message.reply(`❌ Error: ${error.message}`);
      }
      return;
    }
    
    // !unwatch - Remove from watchlist
    const unwatchMatch = text.match(/^!unwatch[\s\n]+([1-9A-HJ-NP-Za-km-z]{32,44})$/im);
    if (unwatchMatch) {
      const tokenAddress = unwatchMatch[1];
      const userId = message.author.id;
      
      try {
        await storage.removeFromWatchlist(userId, tokenAddress);
        await message.reply(`✅ Removed from your watchlist: \`${formatAddress(tokenAddress)}\``);
      } catch (error: any) {
        await message.reply(`❌ Error: ${error.message}`);
      }
      return;
    }
    
    // !watchlist - Show watchlist
    const watchlistMatch = text.match(/^!watchlist$/i);
    if (watchlistMatch) {
      const userId = message.author.id;
      
      try {
        const list = await storage.getWatchlist(userId);
        if (!list || list.length === 0) {
          await message.reply('ℹ️ Your watchlist is empty. Use `!watch <address>` to add tokens.');
          return;
        }
        
        const lines = list.map((item, i) => `${i + 1}. \`${formatAddress(item.tokenAddress)}\``);
        await message.reply(`📝 **Your Watchlist (${list.length})**\n${lines.join('\n')}`);
      } catch (error: any) {
        await message.reply(`❌ Error: ${error.message}`);
      }
      return;
    }
    
    // !report - Report wallet
    const reportMatch = text.match(/^!report[\s\n]+([1-9A-HJ-NP-Za-km-z]{32,44})[\s\n]+(.+)$/im);
    if (reportMatch) {
      const walletAddress = reportMatch[1];
      const reason = reportMatch[2];
      const userId = message.author.id;
      
      try {
        await reportWallet(walletAddress, reason, userId);
        await message.reply(`✅ Reported wallet: \`${formatAddress(walletAddress)}\`\nReason: ${reason}`);
      } catch (error: any) {
        await message.reply(`❌ Error: ${error.message}`);
      }
      return;
    }

    // End of ! command handling block
  }
    
    // ===================================================================
    // PRIORITY 2: Handle bot mentions/replies (personality responses)
    // ===================================================================
    
    const isMentioned = message.mentions.has(client.user!.id);
    const isReply = !!message.reference?.messageId;
    
    if (isMentioned || isReply) {
      // Handle greetings
      if (lowerText.match(/\b(hi|hey|hello|sup|yo|gm|gn|wassup|what'?s up)\b/)) {
        const timeOfDay = rally.getTimeOfDay();
        const greeting = lowerText.includes('gm') ? rally.getGreeting(message.author.id, 'morning') :
                        lowerText.includes('gn') ? rally.getFarewell(message.author.id) :
                        rally.getGreeting(message.author.id, timeOfDay);
        await message.reply(greeting.message);
        return;
      }
      
      // Handle thanks
      if (lowerText.match(/\b(thanks|thank you|thx|ty|appreciate)\b/)) {
        const thanks = rally.respondToThanks(message.author.username);
        await message.reply(thanks.message);
        return;
      }
      
      // Handle help requests
      if (lowerText.match(/\b(help|commands|how|what can you do)\b/)) {
        const help = rally.getHelpMessage();
        await message.reply(help.message);
        return;
      }
      
      // Try small talk response
      const smallTalk = rally.respondToSmallTalk(text);
      if (smallTalk) {
        await message.reply(smallTalk.message);
        return;
      }
      
      // Default personality response when mentioned
      const defaultGreeting = rally.getGreeting(message.author.id);
      await message.reply(defaultGreeting.message);
      return;
    }
    
    // ===================================================================
    // PRIORITY 3: Intelligent conversation participation (optional, natural)
    // Rally chimes in when she has something relevant to add - not forced
    // ===================================================================
    
    // Randomly respond to crypto conversations (5% chance to keep it natural)
    // Only in channels where bot has been active recently or crypto terms are used
    const shouldConsiderResponse = Math.random() < 0.05; // 5% of messages
    
    if (shouldConsiderResponse) {
      const contextualResponse = rally.shouldRespondToConversation(text, message.channel.id);
      
      if (contextualResponse) {
        // Throttle to prevent spam (60 seconds between unsolicited responses per channel)
        const throttleKey = `conversation:${message.channel.id}`;
        const now = Date.now();
        const lastConvoResponse = lastResponded.get(throttleKey) || 0;
        
        if (now - lastConvoResponse > 60_000) {
          lastResponded.set(throttleKey, now);
          
          // Add a small delay to make it feel more natural (1-3 seconds)
          const naturalDelay = 1000 + Math.random() * 2000;
          await new Promise(resolve => setTimeout(resolve, naturalDelay));
          
          await message.reply(contextualResponse.message);
          return;
        }
      }
    }
    
    // ===================================================================
    // PRIORITY 4: Handle $symbol mentions (cashtag injection)
    // ===================================================================
    
    // Handle $symbol mentions (cashtag injection like Rick bot)
    // Triggers on messages like "$ZKSL is moving" or "$BONK to the moon"
    const symbolMatch = text.match(/\$([A-Za-z0-9]{2,15})/);

    if (symbolMatch) {
      const sym = symbolMatch[1].toUpperCase();

      // Throttle to prevent spam (15 seconds per symbol per channel)
      const throttleKey = `${message.channelId}:${sym.toLowerCase()}`;
      const now = Date.now();
      const last = lastResponded.get(throttleKey) || 0;
      if (now - last < 15_000) {
        return; // prevent spam within 15s for same symbol in channel
      }

      // Try to resolve from cache first
      let resolved = nameCache.resolve(sym);

      // If not cached, search DexScreener for the symbol
      if (!resolved) {
        try {
          const searchUrl = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(sym)}`;
          const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });

          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const solanaPair = searchData.pairs?.find((p: any) =>
              p.chainId === 'solana' &&
              (p.baseToken?.symbol?.toLowerCase() === sym.toLowerCase() ||
               p.quoteToken?.symbol?.toLowerCase() === sym.toLowerCase())
            );

            if (solanaPair) {
              resolved = solanaPair.baseToken.symbol.toLowerCase() === sym.toLowerCase()
                ? solanaPair.baseToken.address
                : solanaPair.quoteToken.address;
            }
          }
        } catch (searchErr) {
          // Silently fail search - just won't respond to uncached symbols
        }
      }

      if (resolved) {
        lastResponded.set(throttleKey, now);

        // Track this cashtag mention for trending calls
        try {
          const channelName = message.channel && 'name' in message.channel ? message.channel.name : 'DM';
          trendingCallsTracker.trackCashtag(
            sym,
            resolved,
            'discord',
            message.channelId,
            channelName || 'Unknown',
            message.author.id,
            message.author.username,
            text
          );
        } catch (trackErr) {
          console.warn('[TrendingCalls] Failed to track cashtag:', trackErr);
        }

        try {
          await message.channel.sendTyping();
          const analysis = await tokenAnalyzer.analyzeToken(resolved);

          try {
            nameCache.remember(resolved, analysis?.metadata?.symbol, analysis?.metadata?.name as any);
          } catch {}

          // Update risk score in tracker as best-effort work - no user-facing noise
          try {
            trendingCallsTracker.updateRiskScore(resolved, analysis.riskScore);
          } catch (updateErr) {
            console.warn('[TrendingCalls] Failed to update risk score:', updateErr);
          }

          const embed = createAnalysisEmbed(analysis);
          await message.reply({ embeds: [embed] });
          return;
        } catch (err) {
          // Silently fail - don't spam errors for cashtag mentions
          return;
        }
      }

      // If symbol not found, silently ignore (don't spam "not recognized" messages)
    }
  }); // End of messageCreate handler
  
  // Ready event (using clientReady for Discord.js v14+)
  client.once('clientReady' as any, async () => {
    console.log(`✅ Discord bot logged in as ${client.user?.tag}`);
    registerCommands();
    
    // Register alpha alert callback to send alerts to configured Discord channels (gated)
    const alphaService = getAlphaAlertService();
    const relayEnv = (process.env.ALPHA_ALERTS_BOT_RELAY || '').toLowerCase();
    const direct = process.env.ALPHA_ALERTS_DIRECT_SEND === 'true';
    const hasDirectTargets = Boolean(process.env.ALPHA_DISCORD_WEBHOOK || process.env.ALPHA_TELEGRAM_CHAT_ID);
    const botRelay = relayEnv === 'true' ? true : (relayEnv === 'false' ? false : !(direct && hasDirectTargets));

    console.log(`[Discord Bot] Alpha alert relay config - botRelay: ${botRelay} | direct: ${direct} | hasDirectTargets: ${hasDirectTargets} | relayEnv: ${relayEnv}`);
    
    if (!botRelay) {
      console.log('⏭️ Skipping Discord alpha alert bot relay (direct send active)');
    } else {
      alphaService.onAlert(async (alert, message) => {
        try {
          console.log(`[Discord Bot] Alpha alert received - Type: ${alert.type} | Mint: ${alert.mint} | Source: ${alert.source}`);
          const allTargets = await storage.getAlphaTargets();
          const discordTargets = allTargets.filter(t => t.platform === 'discord');
          if (discordTargets.length === 0) {
            console.log(`[Discord Bot] ⚠️ No Discord targets configured. Use /alpha setchannel to configure.`);
          }
          for (const target of discordTargets) {
            try {
              const channel = await client.channels.fetch(target.channelId);
              if (channel && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)) {
                await (channel as any).send({
                  content: `${message}`,
                  allowedMentions: { parse: [] }
                });
              }
            } catch (channelError) {
              console.error(`[Discord Bot] Failed to send alpha alert to channel ${target.channelId}:`, channelError);
            }
          }
        } catch (error) {
          console.error('[Discord Bot] Error handling alpha alert:', error);
        }
      });
      console.log('✅ Alpha alert callback registered for Discord');
    }

    // Smart Money relay listener
    try {
      const { smartMoneyRelay } = await import('./services/smart-money-relay.js');
      smartMoneyRelay.onEvent(async (evt: any) => {
        try {
          const targets = await storage.getSmartTargets();
          const discordTargets = targets.filter(t => t.platform === 'discord');
          // Fallback env channels if DB empty
          const extraEnv = (process.env.SMART_MONEY_CHANNEL_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
          const targetChannelIds = [
            ...discordTargets.map(t => t.channelId),
            ...extraEnv
          ].filter((v, i, arr) => arr.indexOf(v) === i);

          if (targetChannelIds.length === 0) {
            console.log('[SmartMoneyRelay] No smart money channels configured. Use /smart setchannel or SMART_MONEY_CHANNEL_IDS env.');
            return;
          }

            const header = `🧠 **SMART MONEY DETECTED** — ${evt.symbol || 'Unknown'} (${evt.tokenMint.slice(0,6)}… )`;
          const ageLine = `Age: ${evt.ageMinutes.toFixed(1)}m | Elite: ${evt.eliteWallets.length}/${evt.walletCount}`;
          const walletLines = evt.eliteWallets.map((w: any) => {
            const short = `${w.address.slice(0,6)}…${w.address.slice(-4)}`;
            return `• ${short} • ${w.winrate.toFixed(1)}% win • $${Math.round(w.profit).toLocaleString()} • ${w.directive}`;
          });
          const analysis = evt.analysis ? `\nRisk: ${evt.analysis.riskScore} | Holders: ${evt.analysis.holderCount} | Top10: ${evt.analysis.topConcentration?.toFixed?.(2) ?? evt.analysis.topConcentration}% | AgedRisk: ${evt.analysis.agedWalletRisk} | Funding: ${evt.analysis.suspiciousFundingPct?.toFixed?.(1) ?? evt.analysis.suspiciousFundingPct}% | Bundled: ${evt.analysis.bundled ? 'Yes' : 'No'}` : '';
          const legend = 'Directives: PRIORITY WATCH > HIGH WATCH > ACCUMULATION SIGNAL > EARLY WATCH > INFO';
          const links = `Pump.fun: https://pump.fun/${evt.tokenMint}\nDexscreener: https://dexscreener.com/solana/${evt.tokenMint}\nSolscan: https://solscan.io/token/${evt.tokenMint}`;
          const message = [header, ageLine, '', 'Elite Wallets:', ...walletLines, analysis, '', legend, '', links].join('\n');

          for (const channelId of targetChannelIds) {
            try {
              const channel = await client.channels.fetch(channelId);
              if (channel && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)) {
                await (channel as any).send({ content: message, allowedMentions: { parse: [] } });
              }
            } catch (err) {
              console.error('[SmartMoneyRelay] Failed to send smart money alert to channel', channelId, err);
            }
          }
        } catch (err) {
          console.error('[SmartMoneyRelay] Error handling smart money event:', err);
        }
      });
      console.log('✅ Smart Money relay listener registered');
    } catch (err) {
      console.error('[SmartMoneyRelay] Failed to register listener:', err);
    }
  });
  
  return client;
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function startDiscordBot() {
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  
  if (!BOT_TOKEN || BOT_TOKEN === 'PLACEHOLDER_TOKEN' || !CLIENT_ID || CLIENT_ID === 'PLACEHOLDER_ID') {
    console.log('⚠️  Discord bot token not configured. Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID to enable bot.');
    return;
  }
  
  // Prevent duplicate instances
  if (clientInstance) {
    console.log('⚠️  Discord bot already running');
    return;
  }
  
  try {
    clientInstance = createDiscordClient(BOT_TOKEN, CLIENT_ID);
    await clientInstance.login(BOT_TOKEN);
    console.log('✅ Discord bot started successfully');
  } catch (error: any) {
    console.error('❌ Error starting Discord bot:', error?.message || error);
    console.log('⚠️ Discord bot unavailable (silenced):', error?.message || 'Unknown error');
    clientInstance = null;
    // Don't throw - allow server to continue
  }
}

// Optional: Export getter for client instance (returns null until started)
export function getDiscordClient(): Client | null {
  return clientInstance;
}

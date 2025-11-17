import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, ChannelType, PermissionFlagsBits } from 'discord.js';
import { tokenAnalyzer } from './solana-analyzer';
import { storage } from './storage';
import type { TokenAnalysisResponse } from '../shared/schema';
import { buildCompactMessage, formatNumber, getRiskEmoji, formatAddress } from './bot-formatter';
import { getAlphaAlertService } from './alpha-alerts';
import { checkBlacklist, reportWallet, getBlacklistStats, getTopFlaggedWallets } from './ai-blacklist';
import { getExchangeStats } from './exchange-whitelist';

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

function createAnalysisEmbed(analysis: TokenAnalysisResponse): EmbedBuilder {
  const messageData = buildCompactMessage(analysis);
  const color = getRiskColor(analysis.riskLevel);
  
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(messageData.header)
    .setDescription(`**Risk Score: ${analysis.riskScore}/100** (${analysis.riskLevel})\n_0 = Do Not Buy • 100 = Strong Buy_`)
    .setFooter({ text: `Contract: ${analysis.tokenAddress}` })
    .setTimestamp();
  
  // AI VERDICT
  if (messageData.aiVerdict) {
    embed.addFields({
      name: '🤖 AI Analysis',
      value: messageData.aiVerdict.replace(/\*\*/g, ''),
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
  
  // ADVANCED DETECTION (Consolidate into sections)
  const advancedWarnings: string[] = [];
  
  if (messageData.honeypot) {
    advancedWarnings.push(messageData.honeypot.replace(/\*\*/g, '**'));
  }
  
  if (messageData.funding) {
    advancedWarnings.push(messageData.funding.replace(/\*\*/g, '**'));
  }
  
  if (messageData.bundle) {
    advancedWarnings.push(messageData.bundle.replace(/\*\*/g, '**'));
  }
  
  if (messageData.network) {
    advancedWarnings.push(messageData.network.replace(/\*\*/g, '**'));
  }
  
  if (messageData.whales) {
    advancedWarnings.push(messageData.whales.replace(/\*\*/g, '**'));
  }
  
  if (messageData.pumpDump) {
    advancedWarnings.push(messageData.pumpDump.replace(/\*\*/g, '**'));
  }
  
  if (messageData.liquidity) {
    advancedWarnings.push(messageData.liquidity.replace(/\*\*/g, '**'));
  }
  
  if (messageData.holderActivity) {
    advancedWarnings.push(messageData.holderActivity.replace(/\*\*/g, '**'));
  }
  
  if (messageData.agedWallets) {
    advancedWarnings.push(messageData.agedWallets.replace(/\*\*/g, '**'));
  }
  
  if (messageData.gmgn) {
    advancedWarnings.push(messageData.gmgn.replace(/\*\*/g, '**'));
  }
  
  // Add alerts from red flags
  if (messageData.alerts.length > 0) {
    advancedWarnings.push(...messageData.alerts);
  }
  
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
    .addSubcommand(sc => sc.setName('status').setDescription('Show alpha service status'))
    .addSubcommand(sc => sc.setName('start').setDescription('Start alpha monitoring'))
    .addSubcommand(sc => sc.setName('stop').setDescription('Stop alpha monitoring'))
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
    .addSubcommand(sc => sc.setName('where').setDescription('Show the configured Smart Money alert channel')),
  new SlashCommandBuilder()
    .setName('holders')
    .setDescription('Show top N holders')
    .addStringOption(option => option.setName('address').setDescription('Token address').setRequired(true))
    .addIntegerOption(option => option.setName('n').setDescription('How many holders (max 50)').setMinValue(1).setMaxValue(50)),
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
    .setName('chart')
    .setDescription('Show a quick chart link')
    .addStringOption(option => option.setName('address').setDescription('Token address').setRequired(true)),
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
      const isAdminEnv = (process.env.ALPHA_DISCORD_ADMIN_IDS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .includes(interaction.user.id);
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
              value: '`/price <address>` - Quick price\n`/rugcheck <address>` - Instant rug scan\n`/liquidity <address>` - LP analysis\n`/compare <token1> <token2>` - Compare tokens\n`/trending` - Top tokens by volume\n`/exchanges <address>` - Exchange presence\n`/pumpfun <address>` - Pump.fun view\n`/chart <address>` - Chart link'
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
        
        await interaction.deferReply();
        
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        const embed = createAnalysisEmbed(analysis);
        
        await interaction.editReply({ embeds: [embed] });
        
      } else if (interaction.commandName === 'first20') {
        const tokenAddress = interaction.options.getString('address', true);
        
        await interaction.deferReply();
        
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        
        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`📊 Top 20 Holders - ${analysis.metadata.symbol}`)
          .setDescription(`Total Top 10 Concentration: **${analysis.topHolderConcentration.toFixed(2)}%**`)
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
        const pair = analysis.dexscreenerData?.pairs?.[0];
        
        const embed = new EmbedBuilder()
          .setTitle(`💰 Price Check - ${analysis.metadata.symbol}`)
          .setTimestamp();
        
        if (pair) {
          const price = parseFloat(pair.priceUsd);
          const change24h = pair.priceChange.h24;
          
          embed.setColor(change24h >= 0 ? 0x00ff00 : 0xff0000);
          
          let priceInfo = `**Current Price**: $${price.toFixed(price < 0.01 ? 8 : 4)}\n\n`;
          
          const changeEmoji = change24h >= 0 ? '📈' : '📉';
          const changeColor = change24h >= 0 ? '🟢' : '🔴';
          priceInfo += `${changeEmoji} **24h Change**: ${changeColor} ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`;
          
          embed.setDescription(priceInfo);
          
          embed.addFields(
            { name: '📦 24h Volume', value: `$${formatNumber(pair.volume.h24)}`, inline: true },
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
        
        let holderAnalysis = '';
        if (analysis.topHolderConcentration > 80) {
          holderAnalysis += `❌ Extreme Concentration (${analysis.topHolderConcentration.toFixed(1)}%)\n`;
          dangerFlags++;
        } else if (analysis.topHolderConcentration > 50) {
          holderAnalysis += `⚠️ High Concentration (${analysis.topHolderConcentration.toFixed(1)}%)\n`;
          warningFlags++;
        } else {
          holderAnalysis += `✅ Good Distribution (${analysis.topHolderConcentration.toFixed(1)}%)\n`;
        }
        holderAnalysis += `• Total Holders: ${analysis.holderCount}`;
        
        embed.addFields({ name: '📊 Holder Analysis', value: holderAnalysis });
        
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
            breakdown += `• Token: ${formatNumber(pair.liquidity.base)} ${analysis.metadata.symbol}\n`;
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
        
        if (pair1 && pair2) {
          const betterVol = pair1.volume.h24 > pair2.volume.h24 ? 'A' : 'B';
          let priceVol = `A: $${parseFloat(pair1.priceUsd).toFixed(8)} | Vol: $${formatNumber(pair1.volume.h24)}\n`;
          priceVol += `B: $${parseFloat(pair2.priceUsd).toFixed(8)} | Vol: $${formatNumber(pair2.volume.h24)}\n`;
          priceVol += `👑 Higher Volume: Token ${betterVol}`;
          
          embed.addFields({ name: '💰 Price & Volume', value: priceVol });
          
          if (pair1.marketCap && pair2.marketCap) {
            const betterMcap = pair1.marketCap > pair2.marketCap ? 'A' : 'B';
            let mcapComparison = `A: $${formatNumber(pair1.marketCap)}\n`;
            mcapComparison += `B: $${formatNumber(pair2.marketCap)}\n`;
            mcapComparison += `👑 Larger: Token ${betterMcap}`;
            
            embed.addFields({ name: '📊 Market Cap', value: mcapComparison });
          }
          
          const betterLiq = (pair1.liquidity?.usd || 0) > (pair2.liquidity?.usd || 0) ? 'A' : 'B';
          let liqComparison = `A: $${formatNumber(pair1.liquidity?.usd || 0)}\n`;
          liqComparison += `B: $${formatNumber(pair2.liquidity?.usd || 0)}\n`;
          liqComparison += `👑 Better: Token ${betterLiq}`;
          
          embed.addFields({ name: '💧 Liquidity', value: liqComparison });
        }
        
        const betterDist = analysis1.topHolderConcentration < analysis2.topHolderConcentration ? 'A' : 'B';
        let holderComparison = `A: ${analysis1.topHolderConcentration.toFixed(1)}% (${analysis1.holderCount} holders)\n`;
        holderComparison += `B: ${analysis2.topHolderConcentration.toFixed(1)}% (${analysis2.holderCount} holders)\n`;
        holderComparison += `👑 Better Distribution: Token ${betterDist}`;
        
        embed.addFields({ name: '👥 Holder Distribution', value: holderComparison });

        const a_mint = analysis1.mintAuthority?.hasAuthority ? '❌' : '✅';
        const b_mint = analysis2.mintAuthority?.hasAuthority ? '❌' : '✅';
        const a_freeze = analysis1.freezeAuthority?.hasAuthority ? '❌' : '✅';
        const b_freeze = analysis2.freezeAuthority?.hasAuthority ? '❌' : '✅';        let security = `Mint Revoked: A ${a_mint} | B ${b_mint}\n`;
        security += `Freeze Revoked: A ${a_freeze} | B ${b_freeze}`;
        
        embed.addFields({ name: '🔐 Security', value: security });
        
        let aScore = 0;
        let bScore = 0;
        
        if (analysis1.riskScore > analysis2.riskScore) aScore++; else bScore++;
        if ((pair1?.volume.h24 || 0) > (pair2?.volume.h24 || 0)) aScore++; else bScore++;
        if ((pair1?.liquidity?.usd || 0) > (pair2?.liquidity?.usd || 0)) aScore++; else bScore++;
        if (analysis1.topHolderConcentration < analysis2.topHolderConcentration) aScore++; else bScore++;
        
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
        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`📊 Top ${Math.min(n, 50)} Holders - ${analysis.metadata.symbol}`)
          .setDescription(`Top 10 Concentration: **${analysis.topHolderConcentration.toFixed(2)}%**`)
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
        const sub = interaction.options.getSubcommand(true);
        const alpha = getAlphaAlertService();
        if (!canAdmin('alpha')) {
          await interaction.reply({ content: '⛔ Admins only.', ephemeral: true });
          return;
        }
        await interaction.deferReply({ ephemeral: true });
        if (sub === 'status') {
          const st = alpha.getStatus();
          await interaction.editReply({ content: `Alpha Status: running=${st.isRunning}, callers=${st.monitoredCallers}/${st.totalCallers}, listeners=${st.activeListeners}, websockets=${st.activeWebSockets}` });
        } else if (sub === 'start') {
          await alpha.start();
          await interaction.editReply({ content: '✅ Alpha monitoring started.' });
        } else if (sub === 'stop') {
          await alpha.stop();
          await interaction.editReply({ content: '🛑 Alpha monitoring stopped.' });
        } else if (sub === 'setchannel') {
          if (!interaction.guildId) {
            await interaction.editReply({ content: '❌ This command must be used in a server.' });
            return;
          }
          const channel = interaction.options.getChannel('channel') || interaction.channel;
          if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
            await interaction.editReply({ content: '❌ Please select a text or announcement channel.' });
            return;
          }
          await storage.setAlphaTarget({ platform: 'discord', groupId: interaction.guildId, channelId: channel.id });
          await interaction.editReply({ content: `✅ Alpha alerts will be sent to <#${channel.id}> (@everyone).` });
        } else if (sub === 'clearchannel') {
          if (!interaction.guildId) {
            await interaction.editReply({ content: '❌ This command must be used in a server.' });
            return;
          }
          await storage.clearAlphaTarget('discord', interaction.guildId);
          await interaction.editReply({ content: '🧹 Cleared this server\'s alpha alert channel.' });
        } else if (sub === 'where') {
          if (!interaction.guildId) {
            await interaction.editReply({ content: '❌ This command must be used in a server.' });
            return;
          }
          const cfg = await storage.getAlphaTarget('discord', interaction.guildId);
          await interaction.editReply({ content: cfg ? `📍 Alpha alerts go to <#${cfg.channelId}>` : 'ℹ️ No channel configured for this server.' });
        } else if (sub === 'add') {
          const wallet = interaction.options.getString('wallet', true);
          const name = interaction.options.getString('name', true);
          alpha.addCaller(wallet, name);
          await interaction.editReply({ content: `✅ Added alpha caller ${name} (${formatAddress(wallet)})` });
        } else if (sub === 'remove') {
          const wallet = interaction.options.getString('wallet', true);
          alpha.removeCaller(wallet);
          await interaction.editReply({ content: `✅ Removed alpha caller (${formatAddress(wallet)})` });
        }
      } else if (interaction.commandName === 'smart') {
        const sub = interaction.options.getSubcommand(true);
        if (!canAdmin('smart')) {
          await interaction.reply({ content: '⛔ Admins only.', ephemeral: true });
          return;
        }
        await interaction.deferReply({ ephemeral: true });
        if (!interaction.guildId) {
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
          await interaction.editReply({ content: `✅ Smart Money calls will be sent to <#${channel.id}> (@everyone).` });
        } else if (sub === 'clearchannel') {
          await storage.clearSmartTarget('discord', interaction.guildId);
          await interaction.editReply({ content: '🧹 Cleared this server\'s Smart Money alert channel.' });
        } else if (sub === 'where') {
          const cfg = await storage.getSmartTarget('discord', interaction.guildId);
          await interaction.editReply({ content: cfg ? `📍 Smart Money calls go to <#${cfg.channelId}>` : 'ℹ️ No Smart Money channel configured for this server.' });
        }
      } else if (interaction.commandName === 'exchanges') {
        const tokenAddress = interaction.options.getString('address', true);
        await interaction.deferReply();
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
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
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        const pf = analysis.pumpFunData;
        const embed = new EmbedBuilder()
          .setColor(0xff66aa)
          .setTitle(`🎯 Pump.fun View - ${analysis.metadata.symbol}`)
          .setTimestamp();
        if (pf?.isPumpFun) {
          let body = `• Bonding: ${((pf.bondingCurve || 0) * 100).toFixed(0)}% complete\n`;
          if (pf.devBought) body += `• Dev Bought: ${pf.devBought}%\n`;
          if (pf.mayhemMode) body += `• Mayhem Mode active\n`;
          if (pf.king) body += `• King: \`${formatAddress(pf.king.address)}\` (${pf.king.percentage.toFixed(2)}%)\n`;
          body += `\nLinks: [pump.fun](https://pump.fun/${tokenAddress}) • [gmgn](https://gmgn.ai/sol/token/${tokenAddress})`;
          embed.setDescription(body);
        } else {
          embed.setDescription('Not identified as a pump.fun token.');
        }
        await interaction.editReply({ embeds: [embed] });
      } else if (interaction.commandName === 'blackliststats') {
        await interaction.deferReply();
        const s = await getBlacklistStats();
        const embed = new EmbedBuilder()
          .setColor(0x8888ff)
          .setTitle('📛 Blacklist Statistics')
          .addFields(
            { name: 'Total Labels', value: String((s as any).total || 0), inline: true },
            { name: 'Active', value: String((s as any).active || 0), inline: true },
            { name: 'Avg Severity', value: ((s as any).avgSeverity || 0).toFixed(1), inline: true },
          )
          .addFields(
            { name: 'Ruggers', value: String((s as any).ruggers || 0), inline: true },
            { name: 'Scammers', value: String((s as any).scammers || 0), inline: true },
            { name: 'Honeypots', value: String((s as any).honeypots || 0), inline: true },
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } else if (interaction.commandName === 'blacklisttop') {
        const limit = interaction.options.getInteger('limit') ?? 10;
        await interaction.deferReply();
        const top = await getTopFlaggedWallets(Math.min(limit, 50));
        const embed = new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle('🚫 Top Flagged Wallets')
          .setDescription(top.length ? top.map((w, i) => `${i + 1}. \`${formatAddress(w.walletAddress)}\` — sev ${w.severity}, rugs ${w.rugCount}`).join('\n') : 'No data')
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } else if (interaction.commandName === 'chart') {
        const tokenAddress = interaction.options.getString('address', true);
        await interaction.reply({ content: `📈 Chart links for \`${formatAddress(tokenAddress)}\`\n• DexScreener: https://dexscreener.com/solana/${tokenAddress}\n• GMGN: https://gmgn.ai/sol/token/${tokenAddress}`, ephemeral: false });
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
            await interaction.editReply(`✅ Smart wallet added: \`${formatAddress(wallet)}\` (${name}) with influence ${influence}`);
            const alphaService = getAlphaAlertService();
            alphaService.addCaller(wallet, name);
          } catch (e: any) {
            await interaction.editReply(`❌ Failed: ${e.message}`);
          }
        } else if (sc === 'remove') {
          const wallet = interaction.options.getString('wallet', true);
          await interaction.deferReply();
          try {
            await storage.setSmartWalletActive(wallet, false);
            await interaction.editReply(`✅ Smart wallet deactivated: \`${formatAddress(wallet)}\``);
            const alphaService = getAlphaAlertService();
            alphaService.removeCaller(wallet);
          } catch (e: any) {
            await interaction.editReply(`❌ Failed: ${e.message}`);
          }
        } else if (sc === 'activate') {
          const wallet = interaction.options.getString('wallet', true);
          await interaction.deferReply();
          try {
            const w = await storage.setSmartWalletActive(wallet, true);
            await interaction.editReply(`✅ Smart wallet re-activated: \`${formatAddress(wallet)}\``);
            const alphaService = getAlphaAlertService();
            alphaService.addCaller(wallet, w.displayName || 'Trader');
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
  
  // Fun personality responses when mentioned
  const personalityQuotes = [
    "🎭 Hiya puddin'! Need me to sniff out some rugs? Just drop that contract address and watch me work!",
    "💣 BOOM! Someone called? Drop a token address and I'll tell ya if it's a keeper or a rug-pullin' disaster!",
    "🔨 Harley's Rug Detector at your service! Toss me a contract and I'll smash through the BS faster than you can say 'diamond hands'!",
    "🎪 Oh oh oh! You rang? I LOVE exposing scammers! Give me a token address and I'll tear it apart... in the fun way!",
    "💥 Well well well, what do we have here? Another ape lookin' for alpha? Drop that CA and let's see if it's legit or just another honeypot!",
    "🃏 Miss me? Course ya did! I'm the only bot crazy enough to actually ENJOY hunting rugs. Try me with a token address!",
    "🎯 YOOHOO! Ready to blow up some scammer's plans? Hand over that contract address and watch the fireworks!",
    "🦇 Batsy wouldn't approve of my methods but WHO CARES! Drop a token and I'll go full detective mode on those devs!",
  ];

  // Handle direct messages and mentions
  client.on('messageCreate', async message => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Ignore empty messages
    if (!message.content) return;
    
    const text = message.content.trim();
    
    // Check if bot is mentioned
    if (message.mentions.has(client.user!.id) || message.reference?.messageId) {
      const randomQuote = personalityQuotes[Math.floor(Math.random() * personalityQuotes.length)];
      await message.reply(randomQuote);
      return;
    }
    
    // Check if it's a Solana address (base58, 32-44 chars, no spaces)
    if (text.length >= 32 && text.length <= 44 && !/\s/.test(text)) {
      try {
        // Validate it looks like a Solana address (base58)
        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
        if (!base58Regex.test(text)) return;
        
        // Create embed with explorer links
        const linksEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`🔗 Quick Links`)
          .setDescription(`Token: \`${text.slice(0, 4)}...${text.slice(-4)}\``)
          .addFields(
            { name: '📊 GMGN.ai', value: `[View on GMGN](https://gmgn.ai/sol/token/${text})`, inline: true },
            { name: '🎯 Padre', value: `[View on Padre](https://padre.fun/token/${text})`, inline: true },
            { name: '📈 Axiom.trade', value: `[View on Axiom](https://axiom.trade/token/${text})`, inline: true },
            { name: '🔍 Solscan', value: `[View on Solscan](https://solscan.io/token/${text})`, inline: true }
          )
          .setFooter({ text: `💡 Use /execute ${text.slice(0, 8)}... for full rug analysis` })
          .setTimestamp();
        
        await message.reply({ embeds: [linksEmbed] });
      } catch (error) {
        // Silently ignore - not a valid token address
        // This prevents spam when users send normal messages
      }
    }
  });
  
  // Ready event
  client.once('ready', () => {
    console.log(`✅ Discord bot logged in as ${client.user?.tag}`);
    registerCommands();
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

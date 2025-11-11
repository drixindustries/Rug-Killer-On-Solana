import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } from 'discord.js';
import { tokenAnalyzer } from './solana-analyzer';
import type { TokenAnalysisResponse } from '@shared/schema';

// Client instance - only created when startDiscordBot() is called
let clientInstance: Client | null = null;

// ============================================================================
// HELPER FUNCTIONS (module-level for reuse/testing)
// ============================================================================

function formatAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}

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

function getRiskEmoji(riskLevel: string): string {
  switch (riskLevel) {
    case 'LOW':
      return '✅';
    case 'MODERATE':
      return '⚠️';
    case 'HIGH':
      return '🚨';
    case 'EXTREME':
      return '❌';
    default:
      return '❓';
  }
}

function createAnalysisEmbed(analysis: TokenAnalysisResponse): EmbedBuilder {
  const emoji = getRiskEmoji(analysis.riskLevel);
  const color = getRiskColor(analysis.riskLevel);
  
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} ${analysis.metadata.name} (${analysis.metadata.symbol})`)
    .setDescription(`Risk Score: **${analysis.riskScore}/100** (${analysis.riskLevel})`)
    .addFields(
      {
        name: '📊 Token Info',
        value: `Supply: ${formatNumber(analysis.metadata.supply)}\nHolders: ${analysis.holderCount}\nTop 10: ${analysis.topHolderConcentration.toFixed(2)}%`,
        inline: true
      },
      {
        name: '🔒 Authorities',
        value: `Mint: ${analysis.mintAuthority.hasAuthority ? (analysis.mintAuthority.isRevoked ? '✅ Revoked' : '❌ Active') : '✅ None'}\nFreeze: ${analysis.freezeAuthority.hasAuthority ? (analysis.freezeAuthority.isRevoked ? '✅ Revoked' : '❌ Active') : '✅ None'}`,
        inline: true
      },
      {
        name: '💧 Liquidity',
        value: analysis.liquidityPool.status,
        inline: true
      }
    )
    .setFooter({ text: `Contract: ${formatAddress(analysis.tokenAddress)}` })
    .setTimestamp();
  
  // Add red flags if any
  if (analysis.redFlags.length > 0) {
    const criticalFlags = analysis.redFlags.filter(f => f.severity === 'critical' || f.severity === 'high');
    if (criticalFlags.length > 0) {
      embed.addFields({
        name: '⚠️ Red Flags',
        value: criticalFlags.map(f => `${f.severity === 'critical' ? '🔴' : '🟠'} ${f.title}`).join('\n').slice(0, 1024)
      });
    }
  }
  
  // Add market data if available
  if (analysis.dexscreenerData?.pairs?.[0]) {
    const pair = analysis.dexscreenerData.pairs[0];
    embed.addFields({
      name: '💰 Market Data',
      value: `Price: $${parseFloat(pair.priceUsd).toFixed(8)}\n24h Vol: $${formatNumber(pair.volume.h24)}\nLiquidity: $${formatNumber(pair.liquidity?.usd || 0)}\n24h Change: ${pair.priceChange.h24.toFixed(2)}%`
    });
  }
  
  embed.setURL(`https://solscan.io/token/${analysis.tokenAddress}`);
  
  return embed;
}

// ============================================================================
// SLASH COMMANDS DEFINITION
// ============================================================================

const commands = [
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
    .setName('devtorture')
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
].map(command => command.toJSON());

// ============================================================================
// CLIENT FACTORY (creates and configures Discord client)
// ============================================================================

function createDiscordClient(botToken: string, clientId: string): Client {
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
      if (interaction.commandName === 'execute') {
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
        
      } else if (interaction.commandName === 'devtorture') {
        const tokenAddress = interaction.options.getString('address', true);
        
        await interaction.deferReply();
        
        const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
        
        const embed = new EmbedBuilder()
          .setColor(0xff6b2c)
          .setTitle(`🔥 Dev Torture Report - ${analysis.metadata.symbol}`)
          .setDescription(`Contract: \`${formatAddress(tokenAddress)}\``)
          .setTimestamp();
        
        // Mint authority
        if (analysis.mintAuthority.hasAuthority && !analysis.mintAuthority.isRevoked) {
          embed.addFields({
            name: '❌ Mint Authority Active',
            value: `Dev can mint unlimited tokens!\nAuthority: \`${formatAddress(analysis.mintAuthority.authorityAddress || 'Unknown')}\``
          });
        }
        
        // Freeze authority
        if (analysis.freezeAuthority.hasAuthority && !analysis.freezeAuthority.isRevoked) {
          embed.addFields({
            name: '❌ Freeze Authority Active',
            value: `Dev can freeze accounts!\nAuthority: \`${formatAddress(analysis.freezeAuthority.authorityAddress || 'Unknown')}\``
          });
        }
        
        // Token age
        if (analysis.creationDate) {
          const age = Math.floor((Date.now() - analysis.creationDate) / (1000 * 60 * 60 * 24));
          let ageText = `Token Age: ${age} days`;
          if (age < 7) {
            ageText += '\n⚠️ Very new token - high risk!';
          }
          embed.addFields({
            name: '📅 Age',
            value: ageText
          });
        }
        
        // Coming soon features
        embed.addFields({
          name: '🔜 Coming Soon',
          value: '• Past rug history\n• Serial rugger detection\n• KOL shill tracking\n• Hidden wallet connections'
        });
        
        await interaction.editReply({ embeds: [embed] });
        
      } else if (interaction.commandName === 'blacklist') {
        const walletAddress = interaction.options.getString('wallet', true);
        
        await interaction.deferReply();
        
        // TODO: Integrate with blacklist API
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🔍 Blacklist Check')
          .setDescription(`Wallet: \`${formatAddress(walletAddress)}\``)
          .addFields(
            {
              name: 'Status',
              value: '✅ Not currently flagged'
            },
            {
              name: '🔜 Coming Soon',
              value: '• Rug history tracking\n• Pattern recognition\n• Serial rugger database\n• Community reports'
            }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
      
    } catch (error) {
      console.error('Discord command error:', error);
      
      if (interaction.deferred) {
        await interaction.editReply({ content: '❌ Error executing command. Please check the address and try again.' });
      } else {
        await interaction.reply({ content: '❌ Error executing command. Please check the address and try again.', ephemeral: true });
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
  } catch (error) {
    console.error('Error starting Discord bot:', error);
    clientInstance = null;
    throw error;
  }
}

// Optional: Export getter for client instance (returns null until started)
export function getDiscordClient(): Client | null {
  return clientInstance;
}

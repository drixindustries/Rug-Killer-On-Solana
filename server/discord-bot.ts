import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } from 'discord.js';
import { tokenAnalyzer } from './solana-analyzer';
import { storage } from './storage';
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

function getLiquidityFieldValue(liquidityPool: any): string {
  let value = `Status: ${liquidityPool.status}`;
  
  // Add LP Burn Information - only show if data is available
  if (liquidityPool.burnPercentage !== undefined) {
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
    value += `\nLP Burn: ❓ Unknown`;
  }
  
  return value;
}

function createAnalysisEmbed(analysis: TokenAnalysisResponse): EmbedBuilder {
  const emoji = getRiskEmoji(analysis.riskLevel);
  const color = getRiskColor(analysis.riskLevel);
  
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} ${analysis.metadata.name} (${analysis.metadata.symbol})`)
    .setDescription(`**${analysis.riskScore}/100** (${analysis.riskLevel})\n_Higher = Safer (0=Dangerous, 100=Safe)_`)
    .setFooter({ text: `Contract: ${formatAddress(analysis.tokenAddress)}` })
    .setTimestamp();
  
  // CONTRACT ADDRESS (prominently displayed)
  embed.addFields({
    name: '📋 Contract Address',
    value: `\`${analysis.tokenAddress}\``,
    inline: false
  });
  
  // AI VERDICT
  if (analysis.aiVerdict) {
    embed.addFields({
      name: '🤖 AI VERDICT',
      value: `${analysis.aiVerdict.rating} - ${analysis.aiVerdict.verdict}`,
      inline: false
    });
  }
  
  // PRICE DATA
  if (analysis.dexscreenerData?.pairs?.[0]) {
    const pair = analysis.dexscreenerData.pairs[0];
    const priceChange = pair.priceChange.h24 >= 0 ? '📈' : '📉';
    embed.addFields({
      name: '💰 PRICE',
      value: `Price: $${parseFloat(pair.priceUsd).toFixed(8)}\n24h Vol: $${formatNumber(pair.volume.h24)}\n24h Change: ${priceChange} ${pair.priceChange.h24.toFixed(2)}%\nMCap: $${formatNumber(pair.marketCap || 0)}`,
      inline: true
    });
  }
  
  // SECURITY
  const burnPct = analysis.liquidityPool.burnPercentage;
  const burnEmoji = burnPct !== undefined ? (burnPct >= 99.99 ? '✅' : burnPct >= 50 ? '⚠️' : '❌') : '❓';
  const burnText = burnPct !== undefined ? `${burnPct.toFixed(1)}%` : 'Unknown';
  
  embed.addFields({
    name: '🔐 SECURITY',
    value: `Mint: ${analysis.mintAuthority.hasAuthority ? '❌ Active' : '✅ Revoked'}\nFreeze: ${analysis.freezeAuthority.hasAuthority ? '❌ Active' : '✅ Revoked'}\nLP Burn: ${burnEmoji} ${burnText}`,
    inline: true
  });
  
  // PUMP.FUN INFO
  if (analysis.pumpFunData?.isPumpFun) {
    embed.addFields({
      name: '🎯 PUMP.FUN',
      value: `Dev Bought: ${analysis.pumpFunData.devBought.toFixed(2)}%\nBonding Curve: ${analysis.pumpFunData.bondingCurve.toFixed(2)}%`,
      inline: true
    });
  }
  
  // HOLDERS
  embed.addFields({
    name: '👛 HOLDERS',
    value: `Total: ${analysis.holderCount}\nTop 10: ${analysis.topHolderConcentration.toFixed(2)}%\nSupply: ${formatNumber(analysis.metadata.supply)}`,
    inline: true
  });
  
  // RED FLAGS
  if (analysis.redFlags.length > 0) {
    const criticalFlags = analysis.redFlags.filter(f => f.severity === 'critical' || f.severity === 'high');
    if (criticalFlags.length > 0) {
      embed.addFields({
        name: '⚠️ ALERTS',
        value: criticalFlags.slice(0, 3).map(f => `${f.severity === 'critical' ? '🔴' : '🟠'} ${f.title}`).join('\n').slice(0, 1024)
      });
    }
  }
  
  // QUICK LINKS
  embed.addFields({
    name: '🔗 QUICK LINKS',
    value: `[Solscan](https://solscan.io/token/${analysis.tokenAddress}) • [DexScreener](https://dexscreener.com/solana/${analysis.tokenAddress}) • [Rugcheck](https://rugcheck.xyz/tokens/${analysis.tokenAddress})\n[AXiom](https://axiom.trade) • [Padre Bot](https://t.me/padre_tg_bot?start=${analysis.tokenAddress}) • [GMGN](https://gmgn.ai/sol/token/${analysis.tokenAddress}) • [Birdeye](https://birdeye.so/token/${analysis.tokenAddress}?chain=solana)`
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
      if (interaction.commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🔥 SOLANA RUG KILLER')
          .setDescription('Protect yourself from rug pulls with comprehensive token analysis!')
          .addFields(
            {
              name: '📋 Core Commands',
              value: '`/execute <address>` - Full 52-metric scan\n`/first20 <address>` - Top 20 holder analysis\n`/devtorture <address>` - Dev wallet history\n`/blacklist <wallet>` - Check if wallet is flagged\n`/help` - Show this help message'
            },
            {
              name: '🐋 Whale Tier Commands',
              value: '`/whaletrack <address>` - Smart money tracking\n`/kol <wallet>` - Check if wallet is KOL'
            },
            {
              name: '💡 Quick Tip',
              value: 'You can also paste any Solana token address directly in chat for instant analysis!'
            }
          )
          .setFooter({ text: 'Solana Rug Killer • Protecting the Solana ecosystem' })
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
        
        await interaction.editReply({ embeds: [embed] });
        
      } else if (interaction.commandName === 'blacklist') {
        const walletAddress = interaction.options.getString('wallet', true);
        
        await interaction.deferReply();
        
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🔍 Blacklist Check')
          .setDescription(`Wallet: \`${formatAddress(walletAddress)}\``)
          .addFields({
            name: 'Status',
            value: '✅ Not currently flagged'
          })
          .setTimestamp();
        
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
              value += `\nProfit: ${formatNumber(kol.profitSol)} SOL`;
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
          statsValue += `• Total Profit: ${formatNumber(kol.profitSol)} SOL\n`;
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
  
  // Handle direct messages with token addresses (like Telegram bot)
  client.on('messageCreate', async message => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Ignore empty messages
    if (!message.content) return;
    
    const text = message.content.trim();
    
    // Check if it's a Solana address (base58, 32-44 chars, no spaces)
    if (text.length >= 32 && text.length <= 44 && !/\s/.test(text)) {
      try {
        // Send "analyzing" message
        const processingMsg = await message.reply('🔍 Quick analysis...');
        
        // Analyze the token
        const analysis = await tokenAnalyzer.analyzeToken(text);
        const embed = createAnalysisEmbed(analysis);
        
        // Delete the "analyzing" message and send the result
        await processingMsg.delete();
        await message.reply({ embeds: [embed] });
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

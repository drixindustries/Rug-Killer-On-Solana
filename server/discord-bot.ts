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
    .setDescription(`**Risk Score: ${analysis.riskScore}/100** (${analysis.riskLevel})\n_Higher = Safer • 0=Dangerous, 100=Safe_`)
    .setFooter({ text: `Contract: ${analysis.tokenAddress}` })
    .setTimestamp();
  
  // AI ANALYSIS
  if (analysis.aiVerdict) {
    embed.addFields({
      name: '🤖 AI Analysis',
      value: `${analysis.aiVerdict.rating} - ${analysis.aiVerdict.verdict}`,
      inline: false
    });
  }
  
  // CORE METRICS (3 columns)
  const burnPct = analysis.liquidityPool.burnPercentage;
  const burnEmoji = burnPct !== undefined ? (burnPct >= 99.99 ? '✅' : burnPct >= 50 ? '⚠️' : '❌') : '❓';
  const burnText = burnPct !== undefined ? `${burnPct.toFixed(1)}%` : 'Unknown';
  
  embed.addFields(
    {
      name: '🔐 Security',
      value: `Mint: ${analysis.mintAuthority.hasAuthority ? '❌' : '✅'}\nFreeze: ${analysis.freezeAuthority.hasAuthority ? '❌' : '✅'}\nLP: ${burnEmoji} ${burnText}`,
      inline: true
    },
    {
      name: '👥 Holders',
      value: `Total: ${analysis.holderCount}\nTop 10: ${analysis.topHolderConcentration.toFixed(1)}%\nSupply: ${formatNumber(analysis.metadata.supply)}`,
      inline: true
    }
  );
  
  // PRICE DATA (if available)
  if (analysis.dexscreenerData?.pairs?.[0]) {
    const pair = analysis.dexscreenerData.pairs[0];
    const priceChange = pair.priceChange.h24 >= 0 ? '📈' : '📉';
    embed.addFields({
      name: '💰 Market',
      value: `$${parseFloat(pair.priceUsd).toFixed(8)}\nMCap: $${formatNumber(pair.marketCap || 0)}\n${priceChange} ${pair.priceChange.h24.toFixed(1)}% (24h)`,
      inline: true
    });
  }
  
  // PUMP.FUN INFO (if applicable)
  if (analysis.pumpFunData?.isPumpFun) {
    embed.addFields({
      name: '🎯 Pump.fun',
      value: `Dev: ${analysis.pumpFunData.devBought.toFixed(1)}%\nCurve: ${analysis.pumpFunData.bondingCurve.toFixed(1)}%`,
      inline: true
    });
  }
  
  // ADVANCED WARNINGS (Consolidate critical issues)
  const warnings = [];
  
  // Honeypot Detection
  if (analysis.quillcheckData) {
    const qc = analysis.quillcheckData;
    if (qc.isHoneypot) {
      warnings.push('🚨 **HONEYPOT** - Cannot sell!');
    } else if (!qc.canSell) {
      warnings.push('⚠️ Sell restrictions detected');
    } else if (qc.sellTax > 15 || (qc.sellTax - qc.buyTax > 5)) {
      warnings.push(`⚠️ High taxes: ${qc.buyTax}%/${qc.sellTax}%`);
    }
  }
  
  // Bundle Detection
  if (analysis.advancedBundleData && analysis.advancedBundleData.bundleScore >= 35) {
    const bd = analysis.advancedBundleData;
    const bundleEmoji = bd.bundleScore >= 60 ? '🚨' : '⚠️';
    warnings.push(`${bundleEmoji} Bundle: ${bd.bundleScore}/100 (${bd.bundledSupplyPercent.toFixed(1)}% in ${bd.suspiciousWallets.length} wallets)`);
  }
  
  // Network Analysis
  if (analysis.networkAnalysis && analysis.networkAnalysis.networkRiskScore >= 35) {
    const na = analysis.networkAnalysis;
    const networkEmoji = na.networkRiskScore >= 60 ? '🚨' : '⚠️';
    warnings.push(`${networkEmoji} Network risk: ${na.networkRiskScore}/100 (${na.clusteredWallets} clustered wallets)`);
  }
  
  // Whale Detection
  if (analysis.whaleDetection && analysis.whaleDetection.whaleCount > 0) {
    const wd = analysis.whaleDetection;
    const whaleEmoji = wd.whaleCount >= 5 ? '🚨' : wd.whaleCount >= 3 ? '⚠️' : '🐋';
    warnings.push(`${whaleEmoji} ${wd.whaleCount} whale${wd.whaleCount > 1 ? 's' : ''}: ${wd.totalWhaleSupplyPercent.toFixed(1)}% supply`);
  }
  
  // Critical Red Flags
  if (analysis.redFlags.length > 0) {
    const criticalFlags = analysis.redFlags.filter(f => f.severity === 'critical' || f.severity === 'high');
    criticalFlags.slice(0, 2).forEach(f => {
      warnings.push(`${f.severity === 'critical' ? '🔴' : '🟠'} ${f.title}`);
    });
  }
  
  // Add warnings field if any exist
  if (warnings.length > 0) {
    embed.addFields({
      name: '⚠️ Alerts',
      value: warnings.join('\\n').slice(0, 1024),
      inline: false
    });
  }
  
  // QUICK LINKS
  embed.addFields({
    name: '🔗 Quick Links',
    value: `[Solscan](https://solscan.io/token/${analysis.tokenAddress}) • [DexScreener](https://dexscreener.com/solana/${analysis.tokenAddress}) • [Rugcheck](https://rugcheck.xyz/tokens/${analysis.tokenAddress})\\n[GMGN](https://gmgn.ai/sol/token/${analysis.tokenAddress}) • [Birdeye](https://birdeye.so/token/${analysis.tokenAddress}?chain=solana) • [Padre](https://t.me/padre_tg_bot?start=${analysis.tokenAddress})`
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
              name: '👥 Group Tier Commands',
              value: '`/whaletrack <address>` - Smart money tracking\n`/kol <wallet>` - Check if wallet is KOL'
            },
            {
              name: '🔥 NEW Popular Commands',
              value: '`/price <address>` - Quick price lookup\n`/rugcheck <address>` - Instant rug detection\n`/liquidity <address>` - LP analysis\n`/compare <token1> <token2>` - Side-by-side comparison\n`/trending` - Top 10 tokens by volume'
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
        
        try {
          const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
          
          let hasFlags = false;
          
          const embed = new EmbedBuilder()
            .setTitle(`🔥 Dev Torture Report - ${analysis.metadata.symbol}`)
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
              ? '🎉 **VERDICT: SAFE**\n✅ Token passes dev torture checks!' 
              : '⚠️ **VERDICT: CONCERNING**\n🚨 Token has concerning dev permissions!',
            inline: false
          });
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error: any) {
          console.error('DevTorture command error:', error);
          await interaction.editReply({ 
            content: `❌ Error analyzing token: ${error.message}\n\nMake sure the address is a valid Solana token contract.` 
          });
        }
        
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
        
        if (analysis.mintAuthority.hasAuthority && !analysis.mintAuthority.isRevoked) {
          securityChecks += '❌ Mint Authority Active\n';
          dangerFlags++;
        } else {
          securityChecks += '✅ Mint Authority Revoked\n';
        }
        
        if (analysis.freezeAuthority.hasAuthority && !analysis.freezeAuthority.isRevoked) {
          securityChecks += '❌ Freeze Authority Active\n';
          dangerFlags++;
        } else {
          securityChecks += '✅ Freeze Authority Revoked\n';
        }
        
        if (analysis.liquidityPool.burnPercentage !== undefined) {
          const burnPct = analysis.liquidityPool.burnPercentage;
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
          
          let lpStatus = '';
          if (analysis.liquidityPool.burnPercentage !== undefined) {
            const burnPct = analysis.liquidityPool.burnPercentage;
            lpStatus += `• Burned: ${burnPct.toFixed(2)}%\n\n`;
            
            if (burnPct >= 99.99) {
              lpStatus += '✅ LP is locked forever - Cannot be pulled!';
            } else if (burnPct >= 80) {
              lpStatus += `⚠️ Most LP burned, but ${(100 - burnPct).toFixed(2)}% could be pulled`;
            } else {
              lpStatus += `❌ ${(100 - burnPct).toFixed(2)}% LP can be pulled - RUG RISK!`;
            }
          }
          
          if (lpStatus) {
            embed.addFields({ name: '🔥 LP Token Status', value: lpStatus });
          }
          
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
        
        const a_mint = analysis1.mintAuthority.hasAuthority ? '❌' : '✅';
        const b_mint = analysis2.mintAuthority.hasAuthority ? '❌' : '✅';
        const a_freeze = analysis1.freezeAuthority.hasAuthority ? '❌' : '✅';
        const b_freeze = analysis2.freezeAuthority.hasAuthority ? '❌' : '✅';
        
        let security = `Mint Revoked: A ${a_mint} | B ${b_mint}\n`;
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

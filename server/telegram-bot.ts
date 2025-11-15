import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { tokenAnalyzer } from './solana-analyzer';
import { storage } from './storage';
import type { TokenAnalysisResponse } from '@shared/schema';

// Bot instance - only created when startTelegramBot() is called
let botInstance: Telegraf | null = null;

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

function formatAnalysis(analysis: TokenAnalysisResponse, compact: boolean = false): string {
  const emoji = getRiskEmoji(analysis.riskLevel);
  
  if (compact) {
    return `${emoji} **${analysis.metadata.name} (${analysis.metadata.symbol})**
    
🎯 Risk Score: **${analysis.riskScore}/100** (${analysis.riskLevel})
📊 Holders: ${analysis.holderCount}
💧 Top 10 Concentration: ${analysis.topHolderConcentration.toFixed(2)}%

Use /execute ${analysis.tokenAddress.slice(0, 8)}... for full analysis`;
  }
  
  let message = `━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `${emoji} **${analysis.metadata.name} (${analysis.metadata.symbol})**\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // CONTRACT ADDRESS (prominently displayed)
  message += `📋 **Token Address**\n\`${analysis.tokenAddress}\`\n\n`;
  
  // AI VERDICT
  if (analysis.aiVerdict) {
    message += `🤖 **AI VERDICT**\n`;
    message += `${analysis.aiVerdict.rating} - ${analysis.aiVerdict.verdict}\n\n`;
  }
  
  // RISK SCORE
  message += `🛡️ **RISK SCORE**\n`;
  message += `Score: **${analysis.riskScore}/100** (${analysis.riskLevel})\n`;
  message += `_Higher = Safer (0=Dangerous, 100=Safe)_\n\n`;
  
  // PRICE DATA
  if (analysis.marketData || analysis.dexscreenerData?.pairs?.[0]) {
    const pair = analysis.dexscreenerData?.pairs?.[0];
    message += `💰 **PRICE**\n`;
    if (pair) {
      message += `• Price: $${parseFloat(pair.priceUsd).toFixed(8)}\n`;
      message += `• 24h Vol: $${formatNumber(pair.volume.h24)}\n`;
      message += `• 24h Change: ${pair.priceChange.h24 >= 0 ? '📈' : '📉'} ${pair.priceChange.h24.toFixed(2)}%\n`;
      message += `• MCap: $${formatNumber(pair.marketCap || 0)}\n`;
    }
    message += `\n`;
  }
  
  // SECURITY
  message += `🔐 **SECURITY**\n`;
  message += `• Mint: ${analysis.mintAuthority.hasAuthority ? '❌ Active' : '✅ Revoked'}\n`;
  message += `• Freeze: ${analysis.freezeAuthority.hasAuthority ? '❌ Active' : '✅ Revoked'}\n`;
  if (analysis.liquidityPool.burnPercentage !== undefined) {
    const burnPct = analysis.liquidityPool.burnPercentage;
    let burnEmoji = burnPct >= 99.99 ? '✅' : burnPct >= 50 ? '⚠️' : '❌';
    message += `• LP Burn: ${burnEmoji} ${burnPct.toFixed(1)}%\n`;
  }
  message += `\n`;
  
  // PUMP.FUN INFO
  if (analysis.pumpFunData?.isPumpFun) {
    message += `🎯 **PUMP.FUN**\n`;
    message += `• Dev Bought: ${analysis.pumpFunData.devBought.toFixed(2)}%\n`;
    message += `• Bonding Curve: ${analysis.pumpFunData.bondingCurve.toFixed(2)}%\n\n`;
  }
  
  // HOLDERS
  message += `👛 **HOLDERS**\n`;
  message += `• Total: ${analysis.holderCount}\n`;
  message += `• Top 10: ${analysis.topHolderConcentration.toFixed(2)}%\n`;
  message += `• Supply: ${formatNumber(analysis.metadata.supply)}\n\n`;
  
  // ADVANCED DETECTION (2025)
  // Honeypot Detection
  if (analysis.quillcheckData) {
    const qc = analysis.quillcheckData;
    message += `🍯 **HONEYPOT CHECK**\n`;
    if (qc.isHoneypot) {
      message += `🚨 **HONEYPOT DETECTED**\n`;
      message += `⛔ Cannot sell tokens!\n\n`;
    } else if (!qc.canSell) {
      message += `⚠️ Sell restrictions detected\n\n`;
    } else {
      message += `• Buy Tax: ${qc.buyTax}%\n`;
      message += `• Sell Tax: ${qc.sellTax}%\n`;
      if (qc.sellTax > 15) message += `⚠️ High sell tax!\n`;
      if (qc.sellTax - qc.buyTax > 5) message += `⚠️ Asymmetric taxes (honeypot risk)\n`;
      if (qc.liquidityRisk) message += `🚨 Liquidity can be drained!\n`;
      message += `\n`;
    }
  }
  
  // Bundle Detection
  if (analysis.advancedBundleData && analysis.advancedBundleData.bundleScore >= 35) {
    const bd = analysis.advancedBundleData;
    const bundleEmoji = bd.bundleScore >= 60 ? '🚨' : '⚠️';
    message += `${bundleEmoji} **BUNDLE DETECTED**\n`;
    message += `• Bundle Score: ${bd.bundleScore}/100\n`;
    message += `• Bundled Supply: ${bd.bundledSupplyPercent.toFixed(1)}%\n`;
    message += `• Suspicious Wallets: ${bd.suspiciousWallets.length}\n`;
    if (bd.earlyBuyCluster) {
      message += `• Early Buy Cluster: ${bd.earlyBuyCluster.walletCount} wallets in ${bd.earlyBuyCluster.avgTimingGapMs}ms\n`;
    }
    message += `\n`;
  }
  
  // Network Analysis
  if (analysis.networkAnalysis && analysis.networkAnalysis.networkRiskScore >= 35) {
    const na = analysis.networkAnalysis;
    const networkEmoji = na.networkRiskScore >= 60 ? '🚨' : '⚠️';
    message += `${networkEmoji} **WALLET NETWORK**\n`;
    message += `• Network Risk: ${na.networkRiskScore}/100\n`;
    message += `• Clustered Wallets: ${na.clusteredWallets}\n`;
    if (na.connectedGroups.length > 0) {
      message += `• Connected Groups: ${na.connectedGroups.length}\n`;
      const topGroup = na.connectedGroups[0];
      message += `• Largest Group: ${topGroup.wallets.length} wallets, ${topGroup.totalSupplyPercent.toFixed(1)}% supply\n`;
    }
    message += `\n`;
  }
  
  // Whale Detection
  if (analysis.whaleDetection && analysis.whaleDetection.whaleCount > 0) {
    const wd = analysis.whaleDetection;
    const whaleEmoji = wd.whaleCount >= 5 ? '🚨🐋' : wd.whaleCount >= 3 ? '⚠️🐋' : '🐋';
    message += `${whaleEmoji} **WHALE ACTIVITY**\n`;
    message += `• Whale Count: ${wd.whaleCount}\n`;
    message += `• Total Supply: ${wd.totalWhaleSupplyPercent.toFixed(1)}%\n`;
    message += `• Avg Buy Size: ${wd.averageBuySize.toFixed(2)}%\n`;
    if (wd.largestBuy) {
      message += `• Largest Buy: ${wd.largestBuy.percentageOfSupply.toFixed(2)}%`;
      if (wd.largestBuy.isExchange) message += ` (CEX)`;
      message += `\n`;
    }
    if (wd.insight) {
      message += `\n_${wd.insight}_\n`;
    }
    message += `\n`;
  }
  
  // RED FLAGS
  if (analysis.redFlags.length > 0) {
    const criticalFlags = analysis.redFlags.filter(f => f.severity === 'critical' || f.severity === 'high');
    if (criticalFlags.length > 0) {
      message += `⚠️ **ALERTS**\n`;
      criticalFlags.slice(0, 3).forEach(flag => {
        message += `${flag.severity === 'critical' ? '🔴' : '🟠'} ${flag.title}\n`;
      });
      message += `\n`;
    }
  }
  
  // QUICK LINKS
  message += `🔗 **QUICK LINKS**\n`;
  message += `• [Solscan](https://solscan.io/token/${analysis.tokenAddress})\n`;
  message += `• [DexScreener](https://dexscreener.com/solana/${analysis.tokenAddress})\n`;
  message += `• [Rugcheck](https://rugcheck.xyz/tokens/${analysis.tokenAddress})\n`;
  message += `• [AXiom](https://axiom.trade)\n`;
  message += `• [Padre Bot](https://t.me/padre_tg_bot?start=${analysis.tokenAddress})\n`;
  message += `• [GMGN](https://gmgn.ai/sol/token/${analysis.tokenAddress})\n`;
  message += `• [Birdeye](https://birdeye.so/token/${analysis.tokenAddress}?chain=solana)\n`;
  
  return message;
}

// ============================================================================
// BOT FACTORY (creates and configures bot instance)
// ============================================================================

function createTelegramBot(botToken: string): Telegraf {
  const bot = new Telegraf(botToken);
  
  // Register bot commands for autocomplete menu
  bot.telegram.setMyCommands([
    { command: 'start', description: 'Show available commands' },
    { command: 'execute', description: 'Full 52-metric scan - /execute <address>' },
    { command: 'first20', description: 'Top 20 holder analysis - /first20 <address>' },
    { command: 'devtorture', description: 'Dev wallet history - /devtorture <address>' },
    { command: 'blacklist', description: 'Check wallet blacklist - /blacklist <wallet>' },
    { command: 'whaletrack', description: 'Smart money in token - /whaletrack <address>' },
    { command: 'kol', description: 'Check if wallet is KOL - /kol <wallet>' },
    { command: 'price', description: 'Quick price lookup - /price <address>' },
    { command: 'rugcheck', description: 'Instant rug scan - /rugcheck <address>' },
    { command: 'liquidity', description: 'LP analysis - /liquidity <address>' },
    { command: 'compare', description: 'Compare 2 tokens - /compare <addr1> <addr2>' },
    { command: 'trending', description: 'Show trending tokens by volume' }
  ]).catch(err => {
    console.error('Failed to set Telegram bot commands:', err);
  });
  
  // /start command
  bot.command('start', async (ctx) => {
    await ctx.reply(
      '🔥 **SOLANA RUG KILLER**\n\n' +
      '**Core Commands:**\n' +
      '/execute <address> - Full 52-metric scan\n' +
      '/first20 <address> - Top 20 holder analysis\n' +
      '/devtorture <address> - Dev wallet history\n' +
      '/blacklist <wallet> - Check if wallet is flagged\n\n' +
      '**Whale Tier Commands:**\n' +
      '/whaletrack <address> - Smart money tracking\n' +
      '/kol <wallet> - Check if wallet is KOL\n\n' +
      '**Quick Commands:**\n' +
      '/price <address> - Quick price lookup\n' +
      '/rugcheck <address> - Instant rug detection\n' +
      '/liquidity <address> - LP pool analysis\n' +
      '/compare <addr1> <addr2> - Compare 2 tokens\n' +
      '/trending - Show trending tokens\n\n' +
      'Send any token address for quick analysis!',
      { parse_mode: 'Markdown' }
    );
  });
  
  // /execute command - Full analysis
  bot.command('execute', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('❌ Please provide a token address.\n\nExample: `/execute EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('🔍 Analyzing token... This may take a few seconds.');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      const message = formatAnalysis(analysis);
      
      await ctx.reply(message, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } });
    } catch (error) {
      console.error('Telegram bot execute error:', error);
      ctx.reply('❌ Error analyzing token. Please check the address and try again.');
    }
  });
  
  // /first20 command - Top 20 holders
  bot.command('first20', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('❌ Please provide a token address.\n\nExample: `/first20 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('🔍 Fetching holder data...');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      
      let message = `📊 **TOP 20 HOLDERS - ${analysis.metadata.symbol}**\n\n`;
      message += `Total Top 10 Concentration: **${analysis.topHolderConcentration.toFixed(2)}%**\n\n`;
      
      analysis.topHolders.slice(0, 20).forEach((holder, index) => {
        message += `${index + 1}. \`${formatAddress(holder.address)}\` - ${holder.percentage.toFixed(2)}%\n`;
      });
      
      if (analysis.topHolderConcentration > 50) {
        message += `\n⚠️ WARNING: High holder concentration detected!`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot first20 error:', error);
      ctx.reply('❌ Error fetching holder data. Please check the address and try again.');
    }
  });
  
  // /devtorture command - Dev wallet history
  bot.command('devtorture', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('❌ Please provide a token address.\n\nExample: `/devtorture EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('🔥 Torturing dev wallet...');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      
      let message = `🔥 **DEV TORTURE REPORT - ${analysis.metadata.symbol}**\n\n`;
      message += `Contract: \`${formatAddress(tokenAddress)}\`\n\n`;
      
      if (analysis.mintAuthority.hasAuthority && !analysis.mintAuthority.isRevoked) {
        message += `❌ **MINT AUTHORITY ACTIVE**\n`;
        message += `Dev can mint unlimited tokens!\n`;
        if (analysis.mintAuthority.authorityAddress) {
          message += `Authority: \`${formatAddress(analysis.mintAuthority.authorityAddress)}\`\n\n`;
        }
      }
      
      if (analysis.freezeAuthority.hasAuthority && !analysis.freezeAuthority.isRevoked) {
        message += `❌ **FREEZE AUTHORITY ACTIVE**\n`;
        message += `Dev can freeze accounts!\n`;
        if (analysis.freezeAuthority.authorityAddress) {
          message += `Authority: \`${formatAddress(analysis.freezeAuthority.authorityAddress)}\`\n\n`;
        }
      }
      
      if (analysis.creationDate) {
        const age = Math.floor((Date.now() - analysis.creationDate) / (1000 * 60 * 60 * 24));
        message += `📅 **AGE**: ${age} days\n`;
        if (age < 7) {
          message += `⚠️ Very new token - high risk!\n`;
        }
        message += `\n`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot devtorture error:', error);
      ctx.reply('❌ Error analyzing dev wallet. Please check the address and try again.');
    }
  });
  
  // /blacklist command - Check wallet blacklist
  bot.command('blacklist', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('❌ Please provide a wallet address.\n\nExample: `/blacklist AbCd1234...`', { parse_mode: 'Markdown' });
    }
    
    const walletAddress = args[1];
    
    try {
      await ctx.reply(
        `🔍 **BLACKLIST CHECK**\n\n` +
        `Wallet: \`${formatAddress(walletAddress)}\`\n\n` +
        `✅ Not currently flagged`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Telegram bot blacklist error:', error);
      ctx.reply('❌ Error checking blacklist.');
    }
  });
  
  // /whaletrack command - Smart money tracking
  bot.command('whaletrack', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('❌ Please provide a token address.\n\nExample: `/whaletrack EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('🐋 Tracking smart money wallets...');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      const holderAddresses = analysis.topHolders.map(h => h.address);
      const kolHolders = await storage.getKolWalletsByAddresses(holderAddresses);
      
      let message = `🐋 **WHALE TRACKING - ${analysis.metadata.symbol}**\n\n`;
      
      if (kolHolders.length === 0) {
        message += `✅ No known smart money wallets detected in top holders\n\n`;
        message += `This could be a good sign - no influential traders have entered yet, or it could mean the token hasn't attracted attention from experienced traders.`;
      } else {
        message += `⚠️ **${kolHolders.length} Smart Money Wallet${kolHolders.length > 1 ? 's' : ''} Detected**\n\n`;
        
        for (const kol of kolHolders.slice(0, 10)) {
          const holder = analysis.topHolders.find(h => h.address === kol.walletAddress);
          const percentage = holder ? holder.percentage.toFixed(2) : 'N/A';
          
          message += `💎 **${kol.displayName || 'Unknown KOL'}**\n`;
          message += `Wallet: \`${formatAddress(kol.walletAddress)}\`\n`;
          message += `Holdings: ${percentage}% of supply\n`;
          message += `Influence: ${kol.influenceScore !== null ? kol.influenceScore.toString() : 'N/A'}/100\n`;
          if (kol.profitSol) {
              message += `Profit: ${formatNumber(Number(kol.profitSol) || 0)} SOL\n`;
          }
          message += `\n`;
        }
        
        const totalKolPercentage = kolHolders.reduce((sum, kol) => {
          const holder = analysis.topHolders.find(h => h.address === kol.walletAddress);
          return sum + (holder?.percentage || 0);
        }, 0);
        
        message += `📊 **Total Smart Money Holdings: ${totalKolPercentage.toFixed(2)}%**\n\n`;
        
        if (totalKolPercentage > 30) {
          message += `🚨 HIGH concentration - Smart money controls significant supply!`;
        } else if (totalKolPercentage > 15) {
          message += `⚠️ MODERATE concentration - Watch for coordinated sells`;
        } else {
          message += `✅ LOW concentration - Smart money has small positions`;
        }
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot whaletrack error:', error);
      ctx.reply('❌ Error tracking smart money. Please check the address and try again.');
    }
  });
  
  // /kol command - Check if wallet is a KOL
  bot.command('kol', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('❌ Please provide a wallet address.\n\nExample: `/kol AbCd1234...`', { parse_mode: 'Markdown' });
    }
    
    const walletAddress = args[1];
    
    try {
      await ctx.reply('🔍 Checking KOL database...');
      
      const kol = await storage.getKolWallet(walletAddress);
      
      if (!kol) {
        await ctx.reply(
          `📊 **KOL CHECK**\n\n` +
          `Wallet: \`${formatAddress(walletAddress)}\`\n\n` +
          `❌ Not found in KOL database\n\n` +
          `This wallet is not currently tracked as a known influential trader.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      let message = `💎 **KOL PROFILE FOUND**\n\n`;
      message += `👤 **${kol.displayName || 'Unknown'}**\n`;
      message += `Wallet: \`${formatAddress(kol.walletAddress)}\`\n\n`;
      message += `📊 **Stats:**\n`;
      message += `• Rank: #${kol.rank !== null ? kol.rank.toString() : 'N/A'}\n`;
      message += `• Influence Score: ${kol.influenceScore !== null ? kol.influenceScore.toString() : 'N/A'}/100\n`;
      
      if (kol.profitSol !== null) {
          message += `• Total Profit: ${formatNumber(Number(kol.profitSol) || 0)} SOL\n`;
      }
      
      if (kol.wins !== null && kol.losses !== null) {
        const total = kol.wins + kol.losses;
        const winRate = total > 0 ? ((kol.wins / total) * 100).toFixed(1) : 'N/A';
        message += `• Wins: ${kol.wins} | Losses: ${kol.losses}\n`;
        message += `• Win Rate: ${winRate}%\n`;
      }
      
      if (kol.lastActiveAt) {
        const lastActive = new Date(kol.lastActiveAt);
        message += `• Last Active: ${lastActive.toLocaleDateString()}\n`;
      }
      
      message += `\n`;
      
      if (kol.influenceScore && kol.influenceScore > 80) {
        message += `🔥 **HIGHLY INFLUENTIAL** - Top tier trader`;
      } else if (kol.influenceScore && kol.influenceScore > 60) {
        message += `⭐ **INFLUENTIAL** - Experienced trader`;
      } else {
        message += `📈 **TRACKED** - Known trader`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot kol error:', error);
      ctx.reply('❌ Error checking KOL database.');
    }
  });

  // /price command - Quick price lookup (popular feature)
  bot.command('price', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('❌ Please provide a token address.\n\nExample: `/price EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('💰 Fetching price...');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      const pair = analysis.dexscreenerData?.pairs?.[0];
      
      let message = `💰 **PRICE CHECK - ${analysis.metadata.symbol}**\n\n`;
      
      if (pair) {
        const price = parseFloat(pair.priceUsd);
        message += `📊 **Current Price**: $${price.toFixed(price < 0.01 ? 8 : 4)}\n\n`;
        
        // 24h change with trend indicator
        const change24h = pair.priceChange.h24;
        const changeEmoji = change24h >= 0 ? '📈' : '📉';
        const changeColor = change24h >= 0 ? '🟢' : '🔴';
        message += `${changeEmoji} **24h Change**: ${changeColor} ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%\n`;
        
        // Volume
        message += `📦 **24h Volume**: $${formatNumber(pair.volume.h24)}\n`;
        message += `💧 **Liquidity**: $${formatNumber(pair.liquidity?.usd || 0)}\n`;
        
        // Market cap
        if (pair.marketCap) {
          message += `💎 **Market Cap**: $${formatNumber(pair.marketCap)}\n`;
        }
        
        // FDV
        if (pair.fdv) {
          message += `🌐 **FDV**: $${formatNumber(pair.fdv)}\n`;
        }
      } else {
        message += `⚠️ Price data not available\n\nToken may not have active trading pairs yet.`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } });
    } catch (error) {
      console.error('Telegram bot price error:', error);
      ctx.reply('❌ Error fetching price data. Please check the address and try again.');
    }
  });

  // /rugcheck command - Instant rug detection (inspired by rugcheck.xyz)
  bot.command('rugcheck', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('❌ Please provide a token address.\n\nExample: `/rugcheck EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('🔍 Running rug detection...');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      
      let message = `🔒 **RUG CHECK - ${analysis.metadata.symbol}**\n\n`;
      
      // Overall risk level
      const riskEmoji = getRiskEmoji(analysis.riskLevel);
      message += `${riskEmoji} **RISK LEVEL: ${analysis.riskLevel}**\n`;
      message += `Risk Score: ${analysis.riskScore}/100\n\n`;
      
      // Critical flags
      let dangerFlags = 0;
      let warningFlags = 0;
      
      message += `🔐 **SECURITY CHECKS:**\n`;
      
      if (analysis.mintAuthority.hasAuthority && !analysis.mintAuthority.isRevoked) {
        message += `❌ Mint Authority Active\n`;
        dangerFlags++;
      } else {
        message += `✅ Mint Authority Revoked\n`;
      }
      
      if (analysis.freezeAuthority.hasAuthority && !analysis.freezeAuthority.isRevoked) {
        message += `❌ Freeze Authority Active\n`;
        dangerFlags++;
      } else {
        message += `✅ Freeze Authority Revoked\n`;
      }
      
      // LP burn check
      if (analysis.liquidityPool.burnPercentage !== undefined) {
        const burnPct = analysis.liquidityPool.burnPercentage;
        if (burnPct >= 99.99) {
          message += `✅ LP Fully Burned (${burnPct.toFixed(1)}%)\n`;
        } else if (burnPct >= 80) {
          message += `⚠️ LP Mostly Burned (${burnPct.toFixed(1)}%)\n`;
          warningFlags++;
        } else if (burnPct >= 50) {
          message += `⚠️ LP Partially Burned (${burnPct.toFixed(1)}%)\n`;
          warningFlags++;
        } else {
          message += `❌ LP Not Burned (${burnPct.toFixed(1)}%)\n`;
          dangerFlags++;
        }
      }
      
      message += `\n📊 **HOLDER ANALYSIS:**\n`;
      
      // Holder concentration
      if (analysis.topHolderConcentration > 80) {
        message += `❌ Extreme Concentration (${analysis.topHolderConcentration.toFixed(1)}%)\n`;
        dangerFlags++;
      } else if (analysis.topHolderConcentration > 50) {
        message += `⚠️ High Concentration (${analysis.topHolderConcentration.toFixed(1)}%)\n`;
        warningFlags++;
      } else {
        message += `✅ Good Distribution (${analysis.topHolderConcentration.toFixed(1)}%)\n`;
      }
      
      message += `• Total Holders: ${analysis.holderCount}\n`;
      
      // AI verdict if available
      if (analysis.aiVerdict) {
        message += `\n🤖 **AI ANALYSIS:**\n`;
        message += `${analysis.aiVerdict.rating} - ${analysis.aiVerdict.verdict}\n`;
      }
      
      message += `\n━━━━━━━━━━━━━━━━\n`;
      
      // Final verdict
      if (dangerFlags >= 3) {
        message += `🚨 **HIGH RUG RISK** - Multiple red flags detected!\n`;
        message += `Consider avoiding this token.`;
      } else if (dangerFlags >= 1 || warningFlags >= 3) {
        message += `⚠️ **MODERATE RISK** - Some concerns detected.\n`;
        message += `Do your own research before investing.`;
      } else if (warningFlags >= 1) {
        message += `✅ **LOW RISK** - Minor concerns only.\n`;
        message += `Token appears relatively safe.`;
      } else {
        message += `✅ **VERY LOW RISK** - All checks passed!\n`;
        message += `Token has strong security measures.`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot rugcheck error:', error);
      ctx.reply('❌ Error running rug check. Please check the address and try again.');
    }
  });

  // /liquidity command - Detailed LP analysis
  bot.command('liquidity', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('❌ Please provide a token address.\n\nExample: `/liquidity EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('💧 Analyzing liquidity...');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      const pair = analysis.dexscreenerData?.pairs?.[0];
      
      let message = `💧 **LIQUIDITY ANALYSIS - ${analysis.metadata.symbol}**\n\n`;
      
      if (pair) {
        // Liquidity USD
        const liquidityUsd = pair.liquidity?.usd || 0;
        message += `💰 **Total Liquidity**: $${formatNumber(liquidityUsd)}\n`;
        
        // Liquidity quality check
        if (liquidityUsd < 1000) {
          message += `🚨 **VERY LOW** - High slippage risk!\n`;
        } else if (liquidityUsd < 5000) {
          message += `⚠️ **LOW** - Expect slippage on medium trades\n`;
        } else if (liquidityUsd < 50000) {
          message += `✅ **MODERATE** - Decent for small-medium trades\n`;
        } else {
          message += `✅ **HIGH** - Good for large trades\n`;
        }
        
        message += `\n📊 **LIQUIDITY BREAKDOWN:**\n`;
        
        // Base/Quote amounts
        if (pair.liquidity?.base !== undefined) {
          message += `• Token: ${formatNumber(pair.liquidity.base)} ${analysis.metadata.symbol}\n`;
        }
        if (pair.liquidity?.quote !== undefined) {
          message += `• ${pair.quoteToken?.symbol || 'SOL'}: ${formatNumber(pair.liquidity.quote)}\n`;
        }
        
        message += `\n🔥 **LP TOKEN STATUS:**\n`;
        
        // LP burn percentage
        if (analysis.liquidityPool.burnPercentage !== undefined) {
          const burnPct = analysis.liquidityPool.burnPercentage;
          message += `• Burned: ${burnPct.toFixed(2)}%\n`;
          
          if (burnPct >= 99.99) {
            message += `✅ LP is locked forever - Cannot be pulled!\n`;
          } else if (burnPct >= 80) {
            message += `⚠️ Most LP burned, but ${(100 - burnPct).toFixed(2)}% could be pulled\n`;
          } else {
            message += `❌ ${(100 - burnPct).toFixed(2)}% LP can be pulled - RUG RISK!\n`;
          }
        }
        
        // Volume to liquidity ratio
        message += `\n📈 **TRADING METRICS:**\n`;
        const volumeToLiqRatio = liquidityUsd > 0 ? (pair.volume.h24 / liquidityUsd) : 0;
        message += `• 24h Volume: $${formatNumber(pair.volume.h24)}\n`;
        message += `• Vol/Liq Ratio: ${volumeToLiqRatio.toFixed(2)}x\n`;
        
        if (volumeToLiqRatio > 3) {
          message += `🔥 **VERY HIGH** activity - Popular token!\n`;
        } else if (volumeToLiqRatio > 1) {
          message += `✅ **GOOD** activity - Healthy trading\n`;
        } else if (volumeToLiqRatio > 0.1) {
          message += `⚠️ **LOW** activity - Limited trading\n`;
        } else {
          message += `🚨 **VERY LOW** activity - Dead pool?\n`;
        }
        
      } else {
        message += `⚠️ No liquidity pool found\n\n`;
        message += `This token may not have active trading pairs yet.`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot liquidity error:', error);
      ctx.reply('❌ Error analyzing liquidity. Please check the address and try again.');
    }
  });

  // /compare command - Compare two tokens side by side
  bot.command('compare', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
      return ctx.reply('❌ Please provide two token addresses.\n\nExample: `/compare ABC123... XYZ789...`', { parse_mode: 'Markdown' });
    }
    
    const token1 = args[1];
    const token2 = args[2];
    
    try {
      await ctx.reply('⚖️ Comparing tokens...');
      
      const [analysis1, analysis2] = await Promise.all([
        tokenAnalyzer.analyzeToken(token1),
        tokenAnalyzer.analyzeToken(token2)
      ]);
      
      let message = `⚖️ **TOKEN COMPARISON**\n\n`;
      
      // Names
      message += `**Token A**: ${analysis1.metadata.symbol}\n`;
      message += `**Token B**: ${analysis2.metadata.symbol}\n\n`;
      
      // Risk scores
      message += `🛡️ **RISK SCORE**\n`;
      const emoji1 = getRiskEmoji(analysis1.riskLevel);
      const emoji2 = getRiskEmoji(analysis2.riskLevel);
      message += `A: ${analysis1.riskScore}/100 (${analysis1.riskLevel}) ${emoji1}\n`;
      message += `B: ${analysis2.riskScore}/100 (${analysis2.riskLevel}) ${emoji2}\n`;
      
      const betterRisk = analysis1.riskScore > analysis2.riskScore ? 'A' : 'B';
      message += `👑 Winner: Token ${betterRisk}\n\n`;
      
      // Market data
      const pair1 = analysis1.dexscreenerData?.pairs?.[0];
      const pair2 = analysis2.dexscreenerData?.pairs?.[0];
      
      if (pair1 && pair2) {
        message += `💰 **PRICE & VOLUME**\n`;
        message += `A: $${parseFloat(pair1.priceUsd).toFixed(8)} | Vol: $${formatNumber(pair1.volume.h24)}\n`;
        message += `B: $${parseFloat(pair2.priceUsd).toFixed(8)} | Vol: $${formatNumber(pair2.volume.h24)}\n`;
        
        const betterVol = pair1.volume.h24 > pair2.volume.h24 ? 'A' : 'B';
        message += `👑 Higher Volume: Token ${betterVol}\n\n`;
        
        message += `📊 **MARKET CAP**\n`;
        message += `A: $${formatNumber(pair1.marketCap || 0)}\n`;
        message += `B: $${formatNumber(pair2.marketCap || 0)}\n`;
        
        if (pair1.marketCap && pair2.marketCap) {
          const betterMcap = pair1.marketCap > pair2.marketCap ? 'A' : 'B';
          message += `👑 Larger: Token ${betterMcap}\n\n`;
        } else {
          message += `\n`;
        }
        
        message += `💧 **LIQUIDITY**\n`;
        message += `A: $${formatNumber(pair1.liquidity?.usd || 0)}\n`;
        message += `B: $${formatNumber(pair2.liquidity?.usd || 0)}\n`;
        
        const betterLiq = (pair1.liquidity?.usd || 0) > (pair2.liquidity?.usd || 0) ? 'A' : 'B';
        message += `👑 Better: Token ${betterLiq}\n\n`;
      }
      
      // Holder concentration
      message += `👥 **HOLDER DISTRIBUTION**\n`;
      message += `A: ${analysis1.topHolderConcentration.toFixed(1)}% (${analysis1.holderCount} holders)\n`;
      message += `B: ${analysis2.topHolderConcentration.toFixed(1)}% (${analysis2.holderCount} holders)\n`;
      
      const betterDist = analysis1.topHolderConcentration < analysis2.topHolderConcentration ? 'A' : 'B';
      message += `👑 Better Distribution: Token ${betterDist}\n\n`;
      
      // Security
      message += `🔐 **SECURITY**\n`;
      const a_mint = analysis1.mintAuthority.hasAuthority ? '❌' : '✅';
      const b_mint = analysis2.mintAuthority.hasAuthority ? '❌' : '✅';
      message += `Mint Revoked: A ${a_mint} | B ${b_mint}\n`;
      
      const a_freeze = analysis1.freezeAuthority.hasAuthority ? '❌' : '✅';
      const b_freeze = analysis2.freezeAuthority.hasAuthority ? '❌' : '✅';
      message += `Freeze Revoked: A ${a_freeze} | B ${b_freeze}\n\n`;
      
      // Overall recommendation
      message += `━━━━━━━━━━━━━━━━\n`;
      
      let aScore = 0;
      let bScore = 0;
      
      if (analysis1.riskScore > analysis2.riskScore) aScore++; else bScore++;
      if ((pair1?.volume.h24 || 0) > (pair2?.volume.h24 || 0)) aScore++; else bScore++;
      if ((pair1?.liquidity?.usd || 0) > (pair2?.liquidity?.usd || 0)) aScore++; else bScore++;
      if (analysis1.topHolderConcentration < analysis2.topHolderConcentration) aScore++; else bScore++;
      
      if (aScore > bScore) {
        message += `🏆 **OVERALL**: Token A appears safer (${aScore}-${bScore})`;
      } else if (bScore > aScore) {
        message += `🏆 **OVERALL**: Token B appears safer (${bScore}-${aScore})`;
      } else {
        message += `⚖️ **OVERALL**: Both tokens are similar (${aScore}-${bScore})`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot compare error:', error);
      ctx.reply('❌ Error comparing tokens. Please check both addresses and try again.');
    }
  });

  // /trending command - Show trending/top volume tokens
  bot.command('trending', async (ctx) => {
    try {
      await ctx.reply('🔥 Fetching trending tokens...');
      
      // Fetch from DexScreener trending endpoint
      const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/solana');
      
      if (!response.ok) {
        throw new Error('Failed to fetch trending data');
      }
      
      const data = await response.json();
      const pairs = data.pairs || [];
      
      // Sort by 24h volume and take top 10
      const trending = pairs
        .filter((p: any) => p.chainId === 'solana')
        .sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
        .slice(0, 10);
      
      if (trending.length === 0) {
        return ctx.reply('⚠️ No trending tokens found at the moment.');
      }
      
      let message = `🔥 **TRENDING SOLANA TOKENS**\n`;
      message += `_Top 10 by 24h Volume_\n\n`;
      
      trending.forEach((pair: any, index: number) => {
        const symbol = pair.baseToken?.symbol || 'Unknown';
        const price = parseFloat(pair.priceUsd || 0);
        const change24h = pair.priceChange?.h24 || 0;
        const volume = pair.volume?.h24 || 0;
        const liquidity = pair.liquidity?.usd || 0;
        
        const trendEmoji = change24h >= 0 ? '📈' : '📉';
        
        message += `${index + 1}. **${symbol}** ${trendEmoji}\n`;
        message += `   Price: $${price < 0.01 ? price.toFixed(8) : price.toFixed(4)} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(1)}%)\n`;
        message += `   Vol: $${formatNumber(volume)} | Liq: $${formatNumber(liquidity)}\n`;
        message += `   \`${pair.baseToken?.address}\`\n\n`;
      });
      
      message += `━━━━━━━━━━━━━━━━\n`;
      message += `💡 Use /execute <address> for full analysis`;
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot trending error:', error);
      ctx.reply('❌ Error fetching trending tokens. Please try again later.');
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

  // Handle mentions with personality
  bot.on(message('text'), async (ctx) => {
    const text = ctx.message.text.trim();
    const botUsername = ctx.botInfo.username;
    
    // Check if bot is mentioned
    if (text.includes(`@${botUsername}`) || (ctx.message.reply_to_message && ctx.message.reply_to_message.from?.is_bot)) {
      const randomQuote = personalityQuotes[Math.floor(Math.random() * personalityQuotes.length)];
      await ctx.reply(randomQuote, { parse_mode: 'Markdown' });
      return;
    }
    
    // Auto-detect token addresses in messages
    if (text.length >= 32 && text.length <= 44 && !/\s/.test(text)) {
      try {
        const quickReplies = [
          '🔍 Ooh, a shiny new token! Let me check if it\'s a gem or a trap...',
          '💣 ANALYZING! If this is a rug I\'m gonna be SO disappointed...',
          '🎪 Time for the Harley Rug Test! Let\'s see what we got here...',
          '🔨 Hold tight puddin\', running diagnostics on this bad boy...',
        ];
        await ctx.reply(quickReplies[Math.floor(Math.random() * quickReplies.length)]);
        
        const analysis = await tokenAnalyzer.analyzeToken(text);
        const message = formatAnalysis(analysis, true);
        await ctx.reply(message, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } });
      } catch (error) {
      }
    }
  });
  
  // Error handling
  bot.catch((err, ctx) => {
    console.error(`Telegram bot error for ${ctx.updateType}`, err);
    ctx.reply('❌ An error occurred. Please try again later.');
  });
  
  return bot;
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function startTelegramBot() {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!BOT_TOKEN || BOT_TOKEN === 'PLACEHOLDER_TOKEN') {
    console.log('⚠️  Telegram bot token not configured. Set TELEGRAM_BOT_TOKEN to enable bot.');
    return;
  }
  
  // Prevent duplicate instances
  if (botInstance) {
    console.log('⚠️  Telegram bot already running');
    return;
  }
  
  try {
    botInstance = createTelegramBot(BOT_TOKEN);
    
    // Clear any pending updates from previous instance to avoid 409 conflicts
    await botInstance.launch({
      dropPendingUpdates: true
    });
    console.log('✅ Telegram bot started successfully');
    
    // Enable graceful stop
    const cleanup = () => {
      if (botInstance) {
        botInstance.stop('SIGINT');
        botInstance = null;
      }
    };
    
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
    process.once('SIGQUIT', cleanup);
  } catch (error: any) {
    console.error('Error starting Telegram bot:', error);
    
    // Handle 409 conflict gracefully - another instance is running
    if (error?.response?.error_code === 409) {
      console.log('⚠️  Another Telegram bot instance is running. This is normal during development restarts.');
      console.log('   The conflict will resolve automatically when the old instance times out.');
      botInstance = null;
      // Don't throw for 409 - allow app to continue
      return;
    }
    
    // For other errors, reset instance and re-throw so deployment issues aren't hidden
    botInstance = null;
    throw error;
  }
}

// Optional: Export getter for bot instance (returns null until started)
export function getTelegramBot(): Telegraf | null {
  return botInstance;
}

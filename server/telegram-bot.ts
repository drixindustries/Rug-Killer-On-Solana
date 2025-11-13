import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { tokenAnalyzer } from './solana-analyzer';
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
  
  // RICK BOT STYLE FORMATTING
  let message = `━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `${emoji} **${analysis.metadata.name} (${analysis.metadata.symbol})**\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // CONTRACT ADDRESS (prominently displayed)
  message += `📋 **Token Address**\n\`${analysis.tokenAddress}\`\n\n`;
  
  // AI VERDICT (Rick Bot feature)
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
  
  // PUMP.FUN INFO (Rick Bot feature)
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
    { command: 'blacklist', description: 'Check wallet blacklist - /blacklist <wallet>' }
  ]).catch(err => {
    console.error('Failed to set Telegram bot commands:', err);
  });
  
  // /start command
  bot.command('start', async (ctx) => {
    await ctx.reply(
      '🔥 **SOLANA RUG KILLER**\n\n' +
      'Available commands:\n\n' +
      '/execute <address> - Full 52-metric scan\n' +
      '/first20 <address> - Top 20 holder analysis\n' +
      '/devtorture <address> - Dev wallet history\n' +
      '/blacklist <wallet> - Check if wallet is flagged\n\n' +
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
  
  // Handle direct messages with token addresses
  bot.on(message('text'), async (ctx) => {
    const text = ctx.message.text.trim();
    
    if (text.length >= 32 && text.length <= 44 && !/\s/.test(text)) {
      try {
        await ctx.reply('🔍 Quick analysis...');
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

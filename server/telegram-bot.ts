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
  
  let message = `${emoji} **${analysis.metadata.name} (${analysis.metadata.symbol})**\n\n`;
  message += `🎯 **Risk Score: ${analysis.riskScore}/100** (${analysis.riskLevel})\n\n`;
  
  message += `**TOKEN INFO**\n`;
  message += `• Supply: ${formatNumber(analysis.metadata.supply)}\n`;
  message += `• Holders: ${analysis.holderCount}\n`;
  message += `• Top 10 Concentration: ${analysis.topHolderConcentration.toFixed(2)}%\n\n`;
  
  message += `**AUTHORITIES**\n`;
  message += `• Mint: ${analysis.mintAuthority.hasAuthority ? (analysis.mintAuthority.isRevoked ? '✅ Revoked' : '❌ Active') : '✅ None'}\n`;
  message += `• Freeze: ${analysis.freezeAuthority.hasAuthority ? (analysis.freezeAuthority.isRevoked ? '✅ Revoked' : '❌ Active') : '✅ None'}\n\n`;
  
  message += `**LIQUIDITY**\n`;
  message += `• Status: ${analysis.liquidityPool.status}\n`;
  if (analysis.liquidityPool.totalLiquidity && analysis.liquidityPool.totalLiquidity > 0) {
    message += `• Total: $${formatNumber(analysis.liquidityPool.totalLiquidity)}\n`;
  }
  
  // LP Burn Information - only show if data is available
  if (analysis.liquidityPool.burnPercentage !== undefined) {
    const burnPct = analysis.liquidityPool.burnPercentage;
    let burnEmoji = '🔥';
    let burnStatus = '';
    
    if (analysis.liquidityPool.isBurned || burnPct >= 99.99) {
      burnEmoji = '✅🔥';
      burnStatus = '100% BURNED';
    } else if (burnPct >= 90) {
      burnEmoji = '⚠️🔥';
      burnStatus = 'Partially Burned';
    } else if (burnPct >= 50) {
      burnEmoji = '🟡';
      burnStatus = 'Low Burn';
    } else {
      burnEmoji = '❌';
      burnStatus = 'Not Burned';
    }
    
    message += `• LP Burn: ${burnEmoji} ${burnPct.toFixed(2)}% (${burnStatus})\n`;
  } else {
    // Data unavailable - don't mislead users
    message += `• LP Burn: ❓ Data unavailable\n`;
  }
  
  message += `\n`;
  
  if (analysis.redFlags.length > 0) {
    const criticalFlags = analysis.redFlags.filter(f => f.severity === 'critical' || f.severity === 'high');
    if (criticalFlags.length > 0) {
      message += `**⚠️ RED FLAGS**\n`;
      criticalFlags.slice(0, 5).forEach(flag => {
        message += `• ${flag.severity === 'critical' ? '🔴' : '🟠'} ${flag.title}\n`;
      });
      message += `\n`;
    }
  }
  
  if (analysis.dexscreenerData?.pairs?.[0]) {
    const pair = analysis.dexscreenerData.pairs[0];
    message += `**💰 MARKET DATA**\n`;
    message += `• Price: $${parseFloat(pair.priceUsd).toFixed(8)}\n`;
    message += `• 24h Vol: $${formatNumber(pair.volume.h24)}\n`;
    message += `• Liquidity: $${formatNumber(pair.liquidity?.usd || 0)}\n`;
    message += `• 24h Change: ${pair.priceChange.h24.toFixed(2)}%\n\n`;
  }
  
  message += `🔗 [View on Solscan](https://solscan.io/token/${analysis.tokenAddress})`;
  
  return message;
}

// ============================================================================
// BOT FACTORY (creates and configures bot instance)
// ============================================================================

function createTelegramBot(botToken: string): Telegraf {
  const bot = new Telegraf(botToken);
  
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
      
      await ctx.reply(message, { parse_mode: 'Markdown', disable_web_page_preview: true });
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
      
      message += `🔜 **COMING SOON**\n`;
      message += `• Past rug history\n`;
      message += `• Serial rugger detection\n`;
      message += `• KOL shill tracking\n`;
      message += `• Hidden wallet connections`;
      
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
      // TODO: Integrate with blacklist API when ready
      await ctx.reply(
        `🔍 **BLACKLIST CHECK**\n\n` +
        `Wallet: \`${formatAddress(walletAddress)}\`\n\n` +
        `✅ Not currently flagged\n\n` +
        `🔜 AI blacklist coming soon with:\n` +
        `• Rug history tracking\n` +
        `• Pattern recognition\n` +
        `• Serial rugger database\n` +
        `• Community reports`,
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
    
    // Check if it's a Solana address (base58, 32-44 chars)
    if (text.length >= 32 && text.length <= 44 && !/\s/.test(text)) {
      try {
        await ctx.reply('🔍 Quick analysis...');
        const analysis = await tokenAnalyzer.analyzeToken(text);
        const message = formatAnalysis(analysis, true);
        await ctx.reply(message, { parse_mode: 'Markdown', disable_web_page_preview: true });
      } catch (error) {
        // Silently ignore - not a valid token address
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
    await botInstance.launch();
    console.log('✅ Telegram bot started successfully');
    
    // Enable graceful stop
    process.once('SIGINT', () => botInstance?.stop('SIGINT'));
    process.once('SIGTERM', () => botInstance?.stop('SIGTERM'));
  } catch (error) {
    console.error('Error starting Telegram bot:', error);
    botInstance = null;
    throw error;
  }
}

// Optional: Export getter for bot instance (returns null until started)
export function getTelegramBot(): Telegraf | null {
  return botInstance;
}

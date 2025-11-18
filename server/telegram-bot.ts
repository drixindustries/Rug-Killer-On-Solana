import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { tokenAnalyzer } from './solana-analyzer';
import { storage } from './storage';
import type { TokenAnalysisResponse } from '../shared/schema';
import { buildCompactMessage, toPlainText, formatAddress, formatNumber, getRiskEmoji } from './bot-formatter';
import { getAlphaAlertService } from './alpha-alerts';
import { checkBlacklist, reportWallet, getBlacklistStats, getTopFlaggedWallets } from './ai-blacklist';
import { getExchangeStats } from './exchange-whitelist';
import { nameCache } from './name-cache';

// Bot instance - only created when startTelegramBot() is called
let botInstance: Telegraf | null = null;

// ============================================================================
// HELPER FUNCTIONS (module-level for reuse/testing)
// ============================================================================

function formatAnalysis(analysis: TokenAnalysisResponse, compact: boolean = false): string {
  if (compact) {
    const emoji = getRiskEmoji(analysis.riskLevel);
    return `${emoji} **${analysis.metadata.name} (${analysis.metadata.symbol})**
    
ðŸŽ¯ Risk Score: **${analysis.riskScore}/100** (${analysis.riskLevel})
ðŸ“Š Holders: ${analysis.holderCount ?? 0}
ðŸ’§ Top 10 Concentration: ${(analysis.topHolderConcentration ?? 0).toFixed(2)}%

Use /execute ${analysis.tokenAddress.slice(0, 8)}... for full analysis`;
  }
  
  // Use the shared formatter for full analysis
  const messageData = buildCompactMessage(analysis);
  return toPlainText(messageData);
}

// ============================================================================
// BOT FACTORY (creates and configures bot instance)
// ============================================================================

function createTelegramBot(botToken: string): Telegraf {
  const bot = new Telegraf(botToken);
  const lastResponded: Map<string, number> = new Map(); // key: chatId:symbol
  
  // Register bot commands for autocomplete menu
  bot.telegram.setMyCommands([
    { command: 'start', description: 'Show available commands' },
    { command: 'execute', description: 'Full 52-metric scan - /execute <address>' },
    { command: 'first20', description: 'Top 20 holder analysis - /first20 <address>' },
    { command: 'holders', description: 'Top N holders - /holders <address> [n]' },
    { command: 'devaudit', description: 'Dev wallet history - /devaudit <address>' },
    { command: 'blacklist', description: 'Check wallet blacklist - /blacklist <wallet>' },
    { command: 'whaletrack', description: 'Smart money in token - /whaletrack <address>' },
    { command: 'kol', description: 'Check if wallet is KOL - /kol <wallet>' },
    { command: 'price', description: 'Quick price lookup - /price <address>' },
    { command: 'rugcheck', description: 'Instant rug scan - /rugcheck <address>' },
    { command: 'liquidity', description: 'LP analysis - /liquidity <address>' },
    { command: 'compare', description: 'Compare 2 tokens - /compare <addr1> <addr2>' },
    { command: 'trending', description: 'Show trending tokens by volume' },
    { command: 'exchanges', description: 'Exchange presence - /exchanges <address>' },
    { command: 'pumpfun', description: 'Pump.fun view - /pumpfun <address>' },
    { command: 'chart', description: 'Chart links - /chart <address>' },
    { command: 'watch', description: 'Add to watchlist - /watch <address>' },
    { command: 'unwatch', description: 'Remove from watchlist - /unwatch <address>' },
    { command: 'watchlist', description: 'Show your watchlist' },
    { command: 'alert', description: 'Price alert - /alert <address> above|below <price>' },
    { command: 'report', description: 'Report a wallet - /report <wallet> <reason>' },
    { command: 'blackliststats', description: 'Blacklist statistics' },
    { command: 'blacklisttop', description: 'Top flagged wallets - /blacklisttop [limit]' },
    { command: 'alpha_status', description: 'Alpha status (admin)' },
    { command: 'alpha_start', description: 'Start alpha (admin)' },
    { command: 'alpha_stop', description: 'Stop alpha (admin)' },
    { command: 'alpha_add', description: 'Add alpha caller - /alpha_add <wallet> <name>' },
    { command: 'alpha_remove', description: 'Remove alpha caller - /alpha_remove <wallet>' },
    { command: 'alpha_here', description: 'Set this chat for alpha pings (admin)' },
    { command: 'alpha_clear', description: 'Clear alpha ping chat (admin)' },
    { command: 'alpha_channel', description: 'Show current alpha ping chat' }
    ,{ command: 'smart_here', description: 'Set this chat for Smart Money calls (admin)' }
    ,{ command: 'smart_clear', description: 'Clear Smart Money chat (admin)' }
    ,{ command: 'smart_channel', description: 'Show current Smart Money call chat' }
    ,{ command: 'smartwallet_add', description: 'Add smart wallet - /smartwallet_add <wallet> <name> [influence]' }
    ,{ command: 'smartwallet_remove', description: 'Deactivate smart wallet - /smartwallet_remove <wallet>' }
    ,{ command: 'smartwallet_activate', description: 'Reactivate smart wallet - /smartwallet_activate <wallet>' }
    ,{ command: 'smartwallet_list', description: 'List active smart wallets - /smartwallet_list [limit]' }
    ,{ command: 'smartwallet_view', description: 'View smart wallet details - /smartwallet_view <wallet>' }
  ]).catch((err) => {
    console.warn('âš ï¸ Failed to set Telegram bot commands (silenced):', (err as any)?.message || String(err));
  });
  
  // /start command
  bot.command('start', async (ctx) => {
    await ctx.reply(
      'ðŸ”¥ **RUG KILLER ALPHA BOT**\n\n' +
      '**Core Commands:**\n' +
      '/execute <address> - Full scan\n' +
      '/holders <address> [n] - Top N holders\n' +
      '/devaudit <address> - Dev wallet history\n' +
      '/blacklist <wallet> - Check if wallet is flagged\n\n' +
      '**Group Tier Commands:**\n' +
      '/whaletrack <address> - Smart money tracking\n' +
      '/kol <wallet> - Check if wallet is KOL\n\n' +
      '**Quick Commands:**\n' +
      '/price <address> - Quick price\n' +
      '/rugcheck <address> - Instant rug scan\n' +
      '/liquidity <address> - LP analysis\n' +
      '/compare <addr1> <addr2> - Compare tokens\n' +
      '/trending - Trending tokens\n' +
      '/exchanges <address> - Exchange presence\n' +
      '/pumpfun <address> - Pump.fun view\n' +
      '/chart <address> - Chart links\n\n' +
      '**Personal Tools:**\n' +
      '/watch <address> â€¢ /unwatch <address> â€¢ /watchlist\n' +
      '/alert <address> above|below <price>\n\n' +
      '**Admin/Community:**\n' +
      '/report <wallet> <reason>\n' +
      '/blackliststats â€¢ /blacklisttop [limit]\n' +
      'alpha_* commands (admins)\n\n' +
      'Send any token address for quick analysis!',
      { parse_mode: 'Markdown' }
    );
  });
  
  // /execute command - Full analysis
  bot.command('execute', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ');
    if (args.length < 2) {
      return ctx.reply('âŒ Please provide a token address.\n\nExample: `/execute EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('ðŸ” Analyzing token... This may take a few seconds.');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
      const message = formatAnalysis(analysis);
      
      await ctx.reply(message, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } });
    } catch (error) {
      console.error('Telegram bot execute error:', error);
      ctx.reply('âŒ Error analyzing token. Please check the address and try again.');
    }
  });
  
  // /first20 command - Top 20 holders
  bot.command('first20', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ');
    if (args.length < 2) {
      return ctx.reply('âŒ Please provide a token address.\n\nExample: `/first20 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('ðŸ” Fetching holder data...');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
      
      let message = `ðŸ“Š **TOP 20 HOLDERS - ${analysis.metadata.symbol}**\n\n`;
      message += `Total Top 10 Concentration: **${(analysis.topHolderConcentration ?? 0).toFixed(2)}%**\n\n`;
      
      analysis.topHolders.slice(0, 20).forEach((holder, index) => {
        message += `${index + 1}. \`${formatAddress(holder.address)}\` - ${holder.percentage.toFixed(2)}%\n`;
      });
      
      if ((analysis.topHolderConcentration ?? 0) > 50) {
        message += `\nâš ï¸ WARNING: High holder concentration detected!`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot first20 error:', error);
      ctx.reply('âŒ Error fetching holder data. Please check the address and try again.');
    }
  });

  // /holders command - Top N holders
  bot.command('holders', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 2) {
      return ctx.reply('âŒ Please provide a token address.\n\nExample: `/holders EPjF... 30`', { parse_mode: 'Markdown' });
    }
    const tokenAddress = args[1];
    const n = Math.min(parseInt(args[2] || '20', 10) || 20, 50);
    try {
      await ctx.reply('ðŸ“Š Fetching holders...');
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
      let message = `ðŸ“Š **TOP ${n} HOLDERS - ${analysis.metadata.symbol}**\n\n`;
      message += `Top 10 Concentration: **${(analysis.topHolderConcentration ?? 0).toFixed(2)}%**\n\n`;
      analysis.topHolders.slice(0, n).forEach((h, i) => {
        message += `${i + 1}. \`${formatAddress(h.address)}\` - ${h.percentage.toFixed(2)}%\n`;
      });
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (e) {
      ctx.reply('âŒ Error fetching holders.');
    }
  });
  
  // /devaudit command - Dev wallet history
  bot.command('devaudit', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ');
    if (args.length < 2) {
      return ctx.reply('âŒ Please provide a token address.\n\nExample: `/devaudit EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('ðŸ”¥ Torturing dev wallet...');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
      
      let message = `ðŸ”¥ **Dev Audit REPORT - ${analysis.metadata.symbol}**\n\n`;
      message += `Token: \`${tokenAddress}\`\n\n`;
      
      let hasFlags = false;
      
      // Mint Authority Check
      message += `ðŸª™ **MINT AUTHORITY**\n`;
      if (analysis.mintAuthority && analysis.mintAuthority.hasAuthority && !analysis.mintAuthority.isRevoked) {
        message += `âŒ ACTIVE - Dev can mint unlimited tokens!\n`;
        if (analysis.mintAuthority.authorityAddress) {
          message += `Authority: \`${formatAddress(analysis.mintAuthority.authorityAddress)}\`\n`;
        }
        hasFlags = true;
      } else {
        message += `âœ… REVOKED - Dev cannot mint new tokens\n`;
      }
      message += `\n`;
      
      // Freeze Authority Check
      message += `ðŸ§Š **FREEZE AUTHORITY**\n`;
      if (analysis.freezeAuthority && analysis.freezeAuthority.hasAuthority && !analysis.freezeAuthority.isRevoked) {
        message += `âŒ ACTIVE - Dev can freeze accounts!\n`;
        if (analysis.freezeAuthority.authorityAddress) {
          message += `Authority: \`${formatAddress(analysis.freezeAuthority.authorityAddress)}\`\n`;
        }
        hasFlags = true;
      } else {
        message += `âœ… REVOKED - Dev cannot freeze accounts\n`;
      }
      message += `\n`;
      
      // Token Age Check
      if (analysis.creationDate) {
        const age = Math.floor((Date.now() - analysis.creationDate) / (1000 * 60 * 60 * 24));
        message += `ðŸ“… **TOKEN AGE**\n`;
        message += `${age} days old\n`;
        if (age < 7) {
          message += `âš ï¸ Very new token - high risk!\n`;
          hasFlags = true;
        } else if (age < 30) {
          message += `âš ï¸ New token - exercise caution\n`;
        } else {
          message += `âœ… Established token\n`;
        }
        message += `\n`;
      }
      
      // Overall Verdict
      message += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
      if (!hasFlags) {
        message += `ðŸŽ‰ **VERDICT: SAFE**\n`;
        message += `âœ… Token passes Dev Audit checks!`;
      } else {
        message += `âš ï¸ **VERDICT: CONCERNING**\n`;
        message += `ðŸš¨ Token has dev permissions!`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot devaudit error:', error);
      ctx.reply('âŒ Error analyzing dev wallet. Please check the address and try again.');
    }
  });
  
  // /blacklist command - Check wallet blacklist
  bot.command('blacklist', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ');
    if (args.length < 2) {
      return ctx.reply('âŒ Please provide a wallet address.\n\nExample: `/blacklist AbCd1234...`', { parse_mode: 'Markdown' });
    }
    
    const walletAddress = args[1];
    
    try {
      const result = await checkBlacklist(walletAddress);
      let message = `ðŸ” **BLACKLIST CHECK**\n\nWallet: \`${formatAddress(walletAddress)}\`\n\n`;
      message += result.isBlacklisted ? `ðŸš¨ FLAGGED (severity ${result.severity})\n` : 'âœ… Not currently flagged\n';
      if (result.labels.length > 0) {
        message += `\nLabels:\n` + result.labels.map(l => `â€¢ ${l.type} (sev ${l.severity})`).join('\n');
      }
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot blacklist error:', error);
      ctx.reply('âŒ Error checking blacklist.');
    }
  });

  // /report command - Report suspicious wallet
  bot.command('report', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 3) {
      return ctx.reply('âŒ Usage: `/report <wallet> <reason>`', { parse_mode: 'Markdown' });
    }
    const wallet = args[1];
    const reason = args.slice(2).join(' ');
    const platformUserId = `telegram:${ctx.from?.id}`;
    try {
      await reportWallet(wallet, 'scammer', reason, platformUserId);
      await ctx.reply('âœ… Report submitted. Thank you!');
    } catch (e) {
      await ctx.reply('âŒ Could not submit report.');
    }
  });
  
  // /whaletrack command - Smart money tracking
  bot.command('whaletrack', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ');
    if (args.length < 2) {
      return ctx.reply('âŒ Please provide a token address.\n\nExample: `/whaletrack EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('ðŸ‹ Tracking smart money wallets...');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
      const holderAddresses = analysis.topHolders.map(h => h.address);
      const kolHolders = await storage.getKolWalletsByAddresses(holderAddresses);
      
      let message = `ðŸ‹ **WHALE TRACKING - ${analysis.metadata.symbol}**\n\n`;
      
      if (kolHolders.length === 0) {
        message += `âœ… No known smart money wallets detected in top holders\n\n`;
        message += `This could be a good sign - no influential traders have entered yet, or it could mean the token hasn't attracted attention from experienced traders.`;
      } else {
        message += `âš ï¸ **${kolHolders.length} Smart Money Wallet${kolHolders.length > 1 ? 's' : ''} Detected**\n\n`;
        
        for (const kol of kolHolders.slice(0, 10)) {
          const holder = analysis.topHolders.find(h => h.address === kol.walletAddress);
          const percentage = holder ? holder.percentage.toFixed(2) : 'N/A';
          
          message += `ðŸ’Ž **${kol.displayName || 'Unknown KOL'}**\n`;
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
        
        message += `ðŸ“Š **Total Smart Money Holdings: ${totalKolPercentage.toFixed(2)}%**\n\n`;
        
        if (totalKolPercentage > 30) {
          message += `ðŸš¨ HIGH concentration - Smart money controls significant supply!`;
        } else if (totalKolPercentage > 15) {
          message += `âš ï¸ MODERATE concentration - Watch for coordinated sells`;
        } else {
          message += `âœ… LOW concentration - Smart money has small positions`;
        }
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot whaletrack error:', error);
      ctx.reply('âŒ Error tracking smart money. Please check the address and try again.');
    }
  });
  
  // /kol command - Check if wallet is a KOL
  bot.command('kol', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ');
    if (args.length < 2) {
      return ctx.reply('âŒ Please provide a wallet address.\n\nExample: `/kol AbCd1234...`', { parse_mode: 'Markdown' });
    }
    
    const walletAddress = args[1];
    
    try {
      await ctx.reply('ðŸ” Checking KOL database...');
      
      const kol = await storage.getKolWallet(walletAddress);
      
      if (!kol) {
        await ctx.reply(
          `ðŸ“Š **KOL CHECK**\n\n` +
          `Wallet: \`${formatAddress(walletAddress)}\`\n\n` +
          `âŒ Not found in KOL database\n\n` +
          `This wallet is not currently tracked as a known influential trader.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      let message = `ðŸ’Ž **KOL PROFILE FOUND**\n\n`;
      message += `ðŸ‘¤ **${kol.displayName || 'Unknown'}**\n`;
      message += `Wallet: \`${formatAddress(kol.walletAddress)}\`\n\n`;
      message += `ðŸ“Š **Stats:**\n`;
      message += `â€¢ Rank: #${kol.rank !== null ? kol.rank.toString() : 'N/A'}\n`;
      message += `â€¢ Influence Score: ${kol.influenceScore !== null ? kol.influenceScore.toString() : 'N/A'}/100\n`;
      
      if (kol.profitSol !== null) {
          message += `â€¢ Total Profit: ${formatNumber(Number(kol.profitSol) || 0)} SOL\n`;
      }
      
      if (kol.wins !== null && kol.losses !== null) {
        const total = kol.wins + kol.losses;
        const winRate = total > 0 ? ((kol.wins / total) * 100).toFixed(1) : 'N/A';
        message += `â€¢ Wins: ${kol.wins} | Losses: ${kol.losses}\n`;
        message += `â€¢ Win Rate: ${winRate}%\n`;
      }
      
      if (kol.lastActiveAt) {
        const lastActive = new Date(kol.lastActiveAt);
        message += `â€¢ Last Active: ${lastActive.toLocaleDateString()}\n`;
      }
      
      message += `\n`;
      
      if (kol.influenceScore && kol.influenceScore > 80) {
        message += `ðŸ”¥ **HIGHLY INFLUENTIAL** - Top tier trader`;
      } else if (kol.influenceScore && kol.influenceScore > 60) {
        message += `â­ **INFLUENTIAL** - Experienced trader`;
      } else {
        message += `ðŸ“ˆ **TRACKED** - Known trader`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot kol error:', error);
      ctx.reply('âŒ Error checking KOL database.');
    }
  });

  // /price command - Quick price lookup (popular feature)
  bot.command('price', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ');
    if (args.length < 2) {
      return ctx.reply('âŒ Please provide a token address.\n\nExample: `/price EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('ðŸ’° Fetching price...');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
      const pair = analysis.dexscreenerData?.pairs?.[0];
      
      let message = `ðŸ’° **PRICE CHECK - ${analysis.metadata.symbol}**\n\n`;
      
      if (pair) {
        const price = parseFloat(pair.priceUsd);
        message += `ðŸ“Š **Current Price**: $${price.toFixed(price < 0.01 ? 8 : 4)}\n\n`;
        
        // 24h change with trend indicator
        const change24h = pair.priceChange.h24;
        const changeEmoji = change24h >= 0 ? 'ðŸ“ˆ' : 'ðŸ“‰';
        const changeColor = change24h >= 0 ? 'ðŸŸ¢' : 'ðŸ”´';
        message += `${changeEmoji} **24h Change**: ${changeColor} ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%\n`;
        
        // Volume
        message += `ðŸ“¦ **24h Volume**: $${formatNumber(pair.volume.h24)}\n`;
        message += `ðŸ’§ **Liquidity**: $${formatNumber(pair.liquidity?.usd || 0)}\n`;
        
        // Market cap
        if (pair.marketCap) {
          message += `ðŸ’Ž **Market Cap**: $${formatNumber(pair.marketCap)}\n`;
        }
        
        // FDV
        if (pair.fdv) {
          message += `ðŸŒ **FDV**: $${formatNumber(pair.fdv)}\n`;
        }
      } else {
        message += `âš ï¸ Price data not available\n\nToken may not have active trading pairs yet.`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } });
    } catch (error) {
      console.error('Telegram bot price error:', error);
      ctx.reply('âŒ Error fetching price data. Please check the address and try again.');
    }
  });

  // /rugcheck command - Instant rug detection (inspired by rugcheck.xyz)
  bot.command('rugcheck', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ');
    if (args.length < 2) {
      return ctx.reply('âŒ Please provide a token address.\n\nExample: `/rugcheck EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('ðŸ” Running rug detection...');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
      
      let message = `ðŸ”’ **RUG CHECK - ${analysis.metadata.symbol}**\n\n`;
      
      // Overall risk level
      const riskEmoji = getRiskEmoji(analysis.riskLevel);
      message += `${riskEmoji} **RISK LEVEL: ${analysis.riskLevel}**\n`;
      message += `Risk Score: ${analysis.riskScore}/100\n\n`;
      
      // Critical flags
      let dangerFlags = 0;
      let warningFlags = 0;
      
      message += `ðŸ” **SECURITY CHECKS:**\n`;

      if (analysis.mintAuthority && analysis.mintAuthority.hasAuthority && !analysis.mintAuthority.isRevoked) {
        message += `âŒ Mint Authority Active\n`;
        dangerFlags++;
      } else {
        message += `âœ… Mint Authority Revoked\n`;
      }

      if (analysis.freezeAuthority && analysis.freezeAuthority.hasAuthority && !analysis.freezeAuthority.isRevoked) {
        message += `âŒ Freeze Authority Active\n`;
        dangerFlags++;
      } else {
        message += `âœ… Freeze Authority Revoked\n`;
      }
      
      // LP burn check
      const burnPct = analysis.liquidityPool?.burnPercentage;
      if (burnPct !== undefined && burnPct !== null) {
        if (burnPct >= 99.99) {
          message += `âœ… LP Fully Burned (${burnPct.toFixed(1)}%)\n`;
        } else if (burnPct >= 80) {
          message += `âš ï¸ LP Mostly Burned (${burnPct.toFixed(1)}%)\n`;
          warningFlags++;
        } else if (burnPct >= 50) {
          message += `âš ï¸ LP Partially Burned (${burnPct.toFixed(1)}%)\n`;
          warningFlags++;
        } else {
          message += `âŒ LP Not Burned (${burnPct.toFixed(1)}%)\n`;
          dangerFlags++;
        }
      } else {
        message += `â“ LP Burn Status: No Data\n`;
        warningFlags++;
      }
      
      message += `\nðŸ“Š **HOLDER ANALYSIS:**\n`;
      
      // Holder concentration
      if ((analysis.topHolderConcentration ?? 0) > 80) {
        message += `âŒ Extreme Concentration (${(analysis.topHolderConcentration ?? 0).toFixed(1)}%)\n`;
        dangerFlags++;
      } else if ((analysis.topHolderConcentration ?? 0) > 50) {
        message += `âš ï¸ High Concentration (${(analysis.topHolderConcentration ?? 0).toFixed(1)}%)\n`;
        warningFlags++;
      } else {
        message += `âœ… Good Distribution (${(analysis.topHolderConcentration ?? 0).toFixed(1)}%)\n`;
      }
      
      message += `â€¢ Total Holders: ${analysis.holderCount ?? 0}\n`;
      
      // AI verdict if available
      if (analysis.aiVerdict) {
        message += `\nðŸ¤– **AI ANALYSIS:**\n`;
        message += `${analysis.aiVerdict.rating} - ${analysis.aiVerdict.verdict}\n`;
      }
      
      message += `\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
      
      // Final verdict
      if (dangerFlags >= 3) {
        message += `ðŸš¨ **HIGH RUG RISK** - Multiple red flags detected!\n`;
        message += `Consider avoiding this token.`;
      } else if (dangerFlags >= 1 || warningFlags >= 3) {
        message += `âš ï¸ **MODERATE RISK** - Some concerns detected.\n`;
        message += `Do your own research before investing.`;
      } else if (warningFlags >= 1) {
        message += `âœ… **LOW RISK** - Minor concerns only.\n`;
        message += `Token appears relatively safe.`;
      } else {
        message += `âœ… **VERY LOW RISK** - All checks passed!\n`;
        message += `Token has strong security measures.`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot rugcheck error:', error);
      ctx.reply('âŒ Error running rug check. Please check the address and try again.');
    }
  });

  // /liquidity command - Detailed LP analysis
  bot.command('liquidity', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ');
    if (args.length < 2) {
      return ctx.reply('âŒ Please provide a token address.\n\nExample: `/liquidity EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`', { parse_mode: 'Markdown' });
    }
    
    const tokenAddress = args[1];
    
    try {
      await ctx.reply('ðŸ’§ Analyzing liquidity...');
      
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
      const pair = analysis.dexscreenerData?.pairs?.[0];
      
      let message = `ðŸ’§ **LIQUIDITY ANALYSIS - ${analysis.metadata.symbol}**\n\n`;
      
      if (pair) {
        // Liquidity USD
        const liquidityUsd = pair.liquidity?.usd || 0;
        message += `ðŸ’° **Total Liquidity**: $${formatNumber(liquidityUsd)}\n`;
        
        // Liquidity quality check
        if (liquidityUsd < 1000) {
          message += `ðŸš¨ **VERY LOW** - High slippage risk!\n`;
        } else if (liquidityUsd < 5000) {
          message += `âš ï¸ **LOW** - Expect slippage on medium trades\n`;
        } else if (liquidityUsd < 50000) {
          message += `âœ… **MODERATE** - Decent for small-medium trades\n`;
        } else {
          message += `âœ… **HIGH** - Good for large trades\n`;
        }
        
        message += `\nðŸ“Š **LIQUIDITY BREAKDOWN:**\n`;
        
        // Base/Quote amounts
        if (pair.liquidity?.base !== undefined) {
          message += `â€¢ Token: ${formatNumber(pair.liquidity.base)} ${analysis.metadata?.symbol || 'TOKEN'}\n`;
        }
        if (pair.liquidity?.quote !== undefined) {
          message += `â€¢ ${pair.quoteToken?.symbol || 'SOL'}: ${formatNumber(pair.liquidity.quote)}\n`;
        }
        
        message += `\nðŸ”¥ **LP TOKEN STATUS:**\n`;
        
        // LP burn percentage
        const lpBurnPct = analysis.liquidityPool?.burnPercentage;
        if (lpBurnPct !== undefined && lpBurnPct !== null) {
          message += `â€¢ Burned: ${lpBurnPct.toFixed(2)}%\n`;
          
          if (lpBurnPct >= 99.99) {
            message += `âœ… LP is locked forever - Cannot be pulled!\n`;
          } else if (lpBurnPct >= 80) {
            message += `âš ï¸ Most LP burned, but ${(100 - lpBurnPct).toFixed(2)}% could be pulled\n`;
          } else {
            message += `âŒ ${(100 - lpBurnPct).toFixed(2)}% LP can be pulled - RUG RISK!\n`;
          }
        } else {
          message += `â“ LP burn data not available\nâš ï¸ Cannot verify if liquidity is locked\n`;
        }
        
        // Volume to liquidity ratio
        message += `\nðŸ“ˆ **TRADING METRICS:**\n`;
        const volumeToLiqRatio = liquidityUsd > 0 ? (pair.volume.h24 / liquidityUsd) : 0;
        message += `â€¢ 24h Volume: $${formatNumber(pair.volume.h24)}\n`;
        message += `â€¢ Vol/Liq Ratio: ${volumeToLiqRatio.toFixed(2)}x\n`;
        
        if (volumeToLiqRatio > 3) {
          message += `ðŸ”¥ **VERY HIGH** activity - Popular token!\n`;
        } else if (volumeToLiqRatio > 1) {
          message += `âœ… **GOOD** activity - Healthy trading\n`;
        } else if (volumeToLiqRatio > 0.1) {
          message += `âš ï¸ **LOW** activity - Limited trading\n`;
        } else {
          message += `ðŸš¨ **VERY LOW** activity - Dead pool?\n`;
        }
        
      } else {
        message += `âš ï¸ No liquidity pool found\n\n`;
        message += `This token may not have active trading pairs yet.`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot liquidity error:', error);
      ctx.reply('âŒ Error analyzing liquidity. Please check the address and try again.');
    }
  });

  // /compare command - Compare two tokens side by side
  bot.command('compare', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ');
    if (args.length < 3) {
      return ctx.reply('âŒ Please provide two token addresses.\n\nExample: `/compare ABC123... XYZ789...`', { parse_mode: 'Markdown' });
    }
    
    const token1 = args[1];
    const token2 = args[2];
    
    try {
      await ctx.reply('âš–ï¸ Comparing tokens...');
      
      const [analysis1, analysis2] = await Promise.all([
        tokenAnalyzer.analyzeToken(token1),
        tokenAnalyzer.analyzeToken(token2)
      ]);
      try { nameCache.remember(token1, analysis1?.metadata?.symbol, analysis1?.metadata?.name as any); } catch {}
      try { nameCache.remember(token2, analysis2?.metadata?.symbol, analysis2?.metadata?.name as any); } catch {}
      
      let message = `âš–ï¸ **TOKEN COMPARISON**\n\n`;
      
      // Names
      message += `**Token A**: ${analysis1.metadata.symbol}\n`;
      message += `**Token B**: ${analysis2.metadata.symbol}\n\n`;
      
      // Risk scores
      message += `ðŸ›¡ï¸ **RISK SCORE**\n`;
      const emoji1 = getRiskEmoji(analysis1.riskLevel);
      const emoji2 = getRiskEmoji(analysis2.riskLevel);
      message += `A: ${analysis1.riskScore}/100 (${analysis1.riskLevel}) ${emoji1}\n`;
      message += `B: ${analysis2.riskScore}/100 (${analysis2.riskLevel}) ${emoji2}\n`;
      
      const betterRisk = analysis1.riskScore > analysis2.riskScore ? 'A' : 'B';
      message += `ðŸ‘‘ Winner: Token ${betterRisk}\n\n`;
      
      // Market data
      const pair1 = analysis1.dexscreenerData?.pairs?.[0];
      const pair2 = analysis2.dexscreenerData?.pairs?.[0];
      
      if (pair1 && pair2) {
        message += `ðŸ’° **PRICE & VOLUME**\n`;
        message += `A: $${parseFloat(pair1.priceUsd).toFixed(8)} | Vol: $${formatNumber(pair1.volume.h24)}\n`;
        message += `B: $${parseFloat(pair2.priceUsd).toFixed(8)} | Vol: $${formatNumber(pair2.volume.h24)}\n`;
        
        const betterVol = pair1.volume.h24 > pair2.volume.h24 ? 'A' : 'B';
        message += `ðŸ‘‘ Higher Volume: Token ${betterVol}\n\n`;
        
        message += `ðŸ“Š **MARKET CAP**\n`;
        message += `A: $${formatNumber(pair1.marketCap || 0)}\n`;
        message += `B: $${formatNumber(pair2.marketCap || 0)}\n`;
        
        if (pair1.marketCap && pair2.marketCap) {
          const betterMcap = pair1.marketCap > pair2.marketCap ? 'A' : 'B';
          message += `ðŸ‘‘ Larger: Token ${betterMcap}\n\n`;
        } else {
          message += `\n`;
        }
        
        message += `ðŸ’§ **LIQUIDITY**\n`;
        message += `A: $${formatNumber(pair1.liquidity?.usd || 0)}\n`;
        message += `B: $${formatNumber(pair2.liquidity?.usd || 0)}\n`;
        
        const betterLiq = (pair1.liquidity?.usd || 0) > (pair2.liquidity?.usd || 0) ? 'A' : 'B';
        message += `ðŸ‘‘ Better: Token ${betterLiq}\n\n`;
      }
      
      // Holder concentration
      message += `ðŸ‘¥ **HOLDER DISTRIBUTION**\n`;
      message += `A: ${(analysis1.topHolderConcentration ?? 0).toFixed(1)}% (${(analysis1.holderCount ?? 0)} holders)\n`;
      message += `B: ${(analysis2.topHolderConcentration ?? 0).toFixed(1)}% (${(analysis2.holderCount ?? 0)} holders)\n`;
      
      const betterDist = analysis1.topHolderConcentration < analysis2.topHolderConcentration ? 'A' : 'B';
      message += `ðŸ‘‘ Better Distribution: Token ${betterDist}\n\n`;
      
      // Security
      message += `ðŸ” **SECURITY**\n`;
      const a_mint = analysis1.mintAuthority?.hasAuthority ? 'âŒ' : 'âœ…';
      const b_mint = analysis2.mintAuthority?.hasAuthority ? 'âŒ' : 'âœ…';
      message += `Mint Revoked: A ${a_mint} | B ${b_mint}\n`;

      const a_freeze = analysis1.freezeAuthority?.hasAuthority ? 'âŒ' : 'âœ…';
      const b_freeze = analysis2.freezeAuthority?.hasAuthority ? 'âŒ' : 'âœ…';
      message += `Freeze Revoked: A ${a_freeze} | B ${b_freeze}\n\n`;
      
      // Overall recommendation
      message += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
      
      let aScore = 0;
      let bScore = 0;
      
      if (analysis1.riskScore > analysis2.riskScore) aScore++; else bScore++;
      if ((pair1?.volume.h24 || 0) > (pair2?.volume.h24 || 0)) aScore++; else bScore++;
      if ((pair1?.liquidity?.usd || 0) > (pair2?.liquidity?.usd || 0)) aScore++; else bScore++;
      if (analysis1.topHolderConcentration < analysis2.topHolderConcentration) aScore++; else bScore++;
      
      if (aScore > bScore) {
        message += `ðŸ† **OVERALL**: Token A appears safer (${aScore}-${bScore})`;
      } else if (bScore > aScore) {
        message += `ðŸ† **OVERALL**: Token B appears safer (${bScore}-${aScore})`;
      } else {
        message += `âš–ï¸ **OVERALL**: Both tokens are similar (${aScore}-${bScore})`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot compare error:', error);
      ctx.reply('âŒ Error comparing tokens. Please check both addresses and try again.');
    }
  });

  // /trending command - Show trending/top volume tokens
  bot.command('trending', async (ctx) => {
    try {
      await ctx.reply('ðŸ”¥ Fetching trending tokens...');
      
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
        return ctx.reply('âš ï¸ No trending tokens found at the moment.');
      }
      
      let message = `ðŸ”¥ **TRENDING SOLANA TOKENS**\n`;
      message += `_Top 10 by 24h Volume_\n\n`;
      
      trending.forEach((pair: any, index: number) => {
        const symbol = pair.baseToken?.symbol || 'Unknown';
        const price = parseFloat(pair.priceUsd || 0);
        const change24h = pair.priceChange?.h24 || 0;
        const volume = pair.volume?.h24 || 0;
        const liquidity = pair.liquidity?.usd || 0;
        
        const trendEmoji = change24h >= 0 ? 'ðŸ“ˆ' : 'ðŸ“‰';
        
        message += `${index + 1}. **${symbol}** ${trendEmoji}\n`;
        message += `   Price: $${price < 0.01 ? price.toFixed(8) : price.toFixed(4)} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(1)}%)\n`;
        message += `   Vol: $${formatNumber(volume)} | Liq: $${formatNumber(liquidity)}\n`;
        message += `   \`${pair.baseToken?.address}\`\n\n`;
      });
      
      message += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
      message += `ðŸ’¡ Use /execute <address> for full analysis`;
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram bot trending error:', error);
      ctx.reply('âŒ Error fetching trending tokens. Please try again later.');
    }
  });

  // /exchanges - Exchange presence among holders
  bot.command('exchanges', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 2) {
      return ctx.reply('âŒ Usage: `/exchanges <address>`', { parse_mode: 'Markdown' });
    }
    const tokenAddress = args[1];
    try {
      await ctx.reply('ðŸ¦ Checking exchanges in holders...');
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
      const stats = getExchangeStats(analysis.topHolders.map(h => ({ address: h.address, percentage: h.percentage })));
      let message = `ðŸ¦ **EXCHANGE PRESENCE - ${analysis.metadata.symbol}**\n\n`;
      message += `Exchanges hold ${stats.totalPercentage.toFixed(2)}% across ${stats.count} wallets\n`;
      if (stats.holders.length > 0) {
        message += `\nTop Exchange Holders:\n` + stats.holders.slice(0, 10).map(h => `â€¢ \`${formatAddress(h.address)}\` â€” ${h.percentage.toFixed(2)}%`).join('\n');
      }
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (e) {
      ctx.reply('âŒ Error fetching exchange stats.');
    }
  });

  // /pumpfun - Pump.fun specific view
  bot.command('pumpfun', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 2) {
      return ctx.reply('âŒ Usage: `/pumpfun <address>`', { parse_mode: 'Markdown' });
    }
    const tokenAddress = args[1];
    try {
      await ctx.reply('ðŸŽ¯ Loading pump.fun view...');
      const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);
      try { nameCache.remember(tokenAddress, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
      const pf = analysis.pumpFunData;
      let message = `ðŸŽ¯ **PUMPFUN VIEW - ${analysis.metadata.symbol}**\n\n`;
      if (pf?.isPumpFun) {
        message += `â€¢ Bonding: ${((pf.bondingCurve || 0) * 100).toFixed(0)}%\n`;
        if (pf.devBought) message += `â€¢ Dev Bought: ${pf.devBought}%\n`;
        if (pf.mayhemMode) message += `â€¢ Mayhem Mode active\n`;
        if (pf.king) message += `â€¢ King: \`${formatAddress(pf.king.address)}\` (${pf.king.percentage.toFixed(2)}%)\n`;
        message += `\nLinks: https://pump.fun/${tokenAddress} â€¢ https://gmgn.ai/sol/token/${tokenAddress}`;
      } else {
        message += 'Not identified as a pump.fun token.';
      }
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (e) {
      ctx.reply('âŒ Error loading pump.fun data.');
    }
  });

  // /chart - Chart links
  bot.command('chart', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 2) {
      return ctx.reply('âŒ Usage: `/chart <address>`', { parse_mode: 'Markdown' });
    }
    const tokenAddress = args[1];
    await ctx.reply(`ðŸ“ˆ Chart links for \`${formatAddress(tokenAddress)}\`\nâ€¢ DexScreener: https://dexscreener.com/solana/${tokenAddress}\nâ€¢ GMGN: https://gmgn.ai/sol/token/${tokenAddress}`, { parse_mode: 'Markdown', disable_web_page_preview: true });
  });

  // Watchlist & alerts require user record; helper
  const ensureUser = async (ctx: Context) => {
    const userId = `telegram:${ctx.from?.id}`;
    try { await storage.upsertUser({ id: userId, email: null as any }); } catch {}
    return userId;
  };

  // /watch
  bot.command('watch', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 2) return ctx.reply('âŒ Usage: `/watch <address>`', { parse_mode: 'Markdown' });
    const tokenAddress = args[1];
    const userId = await ensureUser(ctx);
    try {
      await storage.addToWatchlist({ userId, tokenAddress, label: null as any, metadata: null as any });
      await ctx.reply(`âœ… Added to your watchlist: \`${formatAddress(tokenAddress)}\``, { parse_mode: 'Markdown' });
    } catch (e: any) {
      await ctx.reply(`âš ï¸ Could not add: ${(e as any)?.message || 'unknown error'}`);
    }
  });

  // /unwatch
  bot.command('unwatch', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 2) return ctx.reply('âŒ Usage: `/unwatch <address>`', { parse_mode: 'Markdown' });
    const tokenAddress = args[1];
    const userId = await ensureUser(ctx);
    try {
      await storage.removeFromWatchlist(userId, tokenAddress);
      await ctx.reply(`âœ… Removed from your watchlist: \`${formatAddress(tokenAddress)}\``, { parse_mode: 'Markdown' });
    } catch (e: any) {
      await ctx.reply(`âš ï¸ Could not remove: ${(e as any)?.message || 'unknown error'}`);
    }
  });

  // /watchlist
  bot.command('watchlist', async (ctx) => {
    const userId = await ensureUser(ctx);
    const list = await storage.getWatchlist(userId);
    if (list.length === 0) return ctx.reply('â„¹ï¸ Your watchlist is empty. Use `/watch <address>`.', { parse_mode: 'Markdown' });
    const lines = list.map((w, i) => `${i + 1}. \`${formatAddress(w.tokenAddress)}\`${w.label ? ` â€” ${w.label}` : ''}`).join('\n');
    await ctx.reply(`ðŸ“ **YOUR WATCHLIST (${list.length})**\n\n${lines}`, { parse_mode: 'Markdown' });
  });

  // /alert
  bot.command('alert', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 4) return ctx.reply('âŒ Usage: `/alert <address> above|below <price>`', { parse_mode: 'Markdown' });
    const tokenAddress = args[1];
    const direction = (args[2] || '').toLowerCase();
    const price = parseFloat(args[3]);
    if (!['above','below'].includes(direction) || !isFinite(price)) return ctx.reply('âŒ Usage: `/alert <address> above|below <price>`', { parse_mode: 'Markdown' });
    const alertType = direction === 'above' ? 'price_above' : 'price_below';
    const userId = await ensureUser(ctx);
    try {
      await storage.createPriceAlert({ userId, tokenAddress, alertType: alertType as any, targetValue: price.toString(), lookbackWindowMinutes: null as any });
      await ctx.reply(`ðŸ”” Alert set: ${direction.toUpperCase()} $${price} for \`${formatAddress(tokenAddress)}\``, { parse_mode: 'Markdown' });
    } catch (e: any) {
      await ctx.reply(`âš ï¸ Could not create alert: ${(e as any)?.message || 'unknown error'}`);
    }
  });

  // Blacklist stats/top
  bot.command('blackliststats', async (ctx) => {
    const s = await getBlacklistStats();
    let message = `ðŸ“› **BLACKLIST STATS**\n\n`;
    message += `Total: ${(s as any).total || 0}\nActive: ${(s as any).active || 0}\nAvg Severity: ${((s as any).avgSeverity || 0).toFixed(1)}\n`;
    message += `Ruggers: ${(s as any).ruggers || 0} â€¢ Scammers: ${(s as any).scammers || 0} â€¢ Honeypots: ${(s as any).honeypots || 0}`;
    await ctx.reply(message, { parse_mode: 'Markdown' });
  });

  bot.command('blacklisttop', async (ctx) => {
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    const limit = Math.min(parseInt(args[1] || '10', 10) || 10, 50);
    const top = await getTopFlaggedWallets(limit);
    if (top.length === 0) return ctx.reply('No data');
    let message = `ðŸš« **TOP FLAGGED WALLETS**\n\n`;
    message += top.map((w, i) => `${i + 1}. \`${formatAddress(w.walletAddress)}\` â€” sev ${w.severity}, rugs ${w.rugCount}`).join('\n');
    await ctx.reply(message, { parse_mode: 'Markdown' });
  });

  // Admin alpha controls
  const isAdminEnv = (userId?: number) => {
    const allow = (process.env.ALPHA_TELEGRAM_ADMIN_IDS || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    return userId ? allow.includes(String(userId)) : false;
  };

  const isChatAdminOrEnv = async (ctx: Context) => {
    const uid = ctx.from?.id;
    if (!uid) return false;
    try {
      if (ctx.chat && typeof ctx.chat.id !== 'undefined') {
        const member = await ctx.telegram.getChatMember(ctx.chat.id, uid);
        const status = (member as any)?.status;
        if (status === 'creator' || status === 'administrator') return true;
      }
    } catch {
      // Ignore, fall back to env
    }
    return isAdminEnv(uid);
  };

  bot.command('alpha_status', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    const st = getAlphaAlertService().getStatus();
    await ctx.reply(`Alpha Status: running=${st.isRunning}, callers=${st.monitoredCallers}/${st.totalCallers}, listeners=${st.activeListeners}, websockets=${st.activeWebSockets}`);
  });
  bot.command('alpha_start', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    await getAlphaAlertService().start();
    await ctx.reply('âœ… Alpha monitoring started.');
  });
  bot.command('alpha_stop', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    await getAlphaAlertService().stop();
    await ctx.reply('ðŸ›‘ Alpha monitoring stopped.');
  });
  bot.command('alpha_add', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 3) return ctx.reply('âŒ Usage: `/alpha_add <wallet> <name>`', { parse_mode: 'Markdown' });
    const wallet = args[1];
    const name = args.slice(2).join(' ');
    getAlphaAlertService().addCaller(wallet, name);
    await ctx.reply(`âœ… Added alpha caller ${name} (${formatAddress(wallet)})`, { parse_mode: 'Markdown' });
  });
  bot.command('alpha_remove', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 2) return ctx.reply('âŒ Usage: `/alpha_remove <wallet>`', { parse_mode: 'Markdown' });
    const wallet = args[1];
    getAlphaAlertService().removeCaller(wallet);
    await ctx.reply(`âœ… Removed alpha caller (${formatAddress(wallet)})`, { parse_mode: 'Markdown' });
  });

  // Alpha destination controls (Telegram)
  bot.command('alpha_here', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    const chatId = String(ctx.chat?.id);
    if (!chatId) return ctx.reply('âŒ Unable to read chat id.');
    try {
      await storage.setAlphaTarget({ platform: 'telegram', groupId: chatId, channelId: chatId });
      await ctx.reply('âœ… This chat is now set to receive alpha alerts.');
    } catch (e) {
      await ctx.reply('âŒ Failed to set alpha chat.');
    }
  });
  bot.command('alpha_clear', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    const chatId = String(ctx.chat?.id);
    if (!chatId) return ctx.reply('âŒ Unable to read chat id.');
    try {
      await storage.clearAlphaTarget('telegram', chatId);
      await ctx.reply('ðŸ§¹ Cleared alpha alert chat for this group.');
    } catch (e) {
      await ctx.reply('âŒ Failed to clear alpha chat.');
    }
  });
  bot.command('alpha_channel', async (ctx) => {
    const chatId = String(ctx.chat?.id);
    const cfg = chatId ? await storage.getAlphaTarget('telegram', chatId) : undefined;
    await ctx.reply(cfg ? `ðŸ“ This chat is configured for alpha alerts.` : 'â„¹ï¸ No alpha alert chat configured here.');
  });

  // Smart Money destination controls (Telegram)
  bot.command('smart_here', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    const chatId = String(ctx.chat?.id);
    if (!chatId) return ctx.reply('âŒ Unable to read chat id.');
    try {
      await storage.setSmartTarget({ platform: 'telegram', groupId: chatId, channelId: chatId });
      await ctx.reply('âœ… This chat is now set to receive Smart Money calls.');
    } catch (e) {
      await ctx.reply('âŒ Failed to set Smart Money chat.');
    }
  });
  bot.command('smart_clear', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    const chatId = String(ctx.chat?.id);
    if (!chatId) return ctx.reply('âŒ Unable to read chat id.');
    try {
      await storage.clearSmartTarget('telegram', chatId);
      await ctx.reply('ðŸ§¹ Cleared Smart Money call chat for this group.');
    } catch (e) {
      await ctx.reply('âŒ Failed to clear Smart Money chat.');
    }
  });
  bot.command('smart_channel', async (ctx) => {
    const chatId = String(ctx.chat?.id);
    const cfg = chatId ? await storage.getSmartTarget('telegram', chatId) : undefined;
    await ctx.reply(cfg ? `ðŸ“ This chat is configured for Smart Money calls.` : 'â„¹ï¸ No Smart Money call chat configured here.');
  });

  // Smart wallet management commands (Telegram)
  bot.command('smartwallet_add', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 3) return ctx.reply('âŒ Usage: `/smartwallet_add <wallet> <name> [influence]`', { parse_mode: 'Markdown' });
    const wallet = args[1];
    const name = args.slice(2, args.length - 1).join(' ') || args[2];
    const influence = parseInt(args[args.length - 1]) || 60;
    try {
      await storage.upsertSmartWallet({ walletAddress: wallet, displayName: name, influenceScore: influence, source: 'manual', isActive: true });
      await ctx.reply(`âœ… Smart wallet added: \`${formatAddress(wallet)}\` (${name}) with influence ${influence}`, { parse_mode: 'Markdown' });
      getAlphaAlertService().addCaller(wallet, name);
    } catch (e: any) {
      await ctx.reply(`âŒ Failed: ${e.message}`);
    }
  });
  bot.command('smartwallet_remove', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 2) return ctx.reply('âŒ Usage: `/smartwallet_remove <wallet>`', { parse_mode: 'Markdown' });
    const wallet = args[1];
    try {
      await storage.setSmartWalletActive(wallet, false);
      await ctx.reply(`âœ… Smart wallet deactivated: \`${formatAddress(wallet)}\``, { parse_mode: 'Markdown' });
      getAlphaAlertService().removeCaller(wallet);
    } catch (e: any) {
      await ctx.reply(`âŒ Failed: ${e.message}`);
    }
  });
  bot.command('smartwallet_activate', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 2) return ctx.reply('âŒ Usage: `/smartwallet_activate <wallet>`', { parse_mode: 'Markdown' });
    const wallet = args[1];
    try {
      const w = await storage.setSmartWalletActive(wallet, true);
      await ctx.reply(`âœ… Smart wallet re-activated: \`${formatAddress(wallet)}\``, { parse_mode: 'Markdown' });
      getAlphaAlertService().addCaller(wallet, w.displayName || 'Trader');
    } catch (e: any) {
      await ctx.reply(`âŒ Failed: ${e.message}`);
    }
  });
  bot.command('smartwallet_list', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    const limit = parseInt(args[1]) || 20;
    const wallets = await storage.getActiveSmartWallets(0, limit);
    if (!wallets.length) {
      await ctx.reply('No smart wallets in DB.');
    } else {
      const lines = wallets.map((w, i) => `${i + 1}. \`${formatAddress(w.walletAddress)}\` â€” ${w.displayName || 'Unknown'} (inf ${w.influenceScore})`);
      await ctx.reply(`ðŸ§  **Smart Wallets (${wallets.length})**\n\n${lines.join('\n')}`, { parse_mode: 'Markdown' });
    }
  });
  bot.command('smartwallet_view', async (ctx) => {
    if (!(await isChatAdminOrEnv(ctx))) return ctx.reply('â›” Admins only.');
    const args = (ctx.message?.text || '').split(' ').filter(Boolean);
    if (args.length < 2) return ctx.reply('âŒ Usage: `/smartwallet_view <wallet>`', { parse_mode: 'Markdown' });
    const wallet = args[1];
    const w = await storage.getSmartWallet(wallet);
    if (!w) {
      await ctx.reply(`âŒ Wallet not found in smart DB: \`${formatAddress(wallet)}\``, { parse_mode: 'Markdown' });
    } else {
      const msg = `ðŸ§  **Smart Wallet Details**\n\n` +
        `**Address:** \`${w.walletAddress}\`\n` +
        `**Name:** ${w.displayName || 'N/A'}\n` +
        `**Source:** ${w.source || 'N/A'}\n` +
        `**Influence:** ${w.influenceScore ?? 'N/A'}\n` +
        `**Win Rate:** ${w.winRate ?? 'N/A'}%\n` +
        `**Active:** ${w.isActive ? 'âœ…' : 'âŒ'}`;
      await ctx.reply(msg, { parse_mode: 'Markdown' });
    }
  });
  
  // Fun personality responses when mentioned
  const personalityQuotes = [
    "ðŸŽ­ Hiya puddin'! Need me to sniff out some rugs? Just drop that contract address and watch me work!",
    "ðŸ’£ BOOM! Someone called? Drop a token address and I'll tell ya if it's a keeper or a rug-pullin' disaster!",
    "ðŸ”¨ Harley's Rug Detector at your service! Toss me a contract and I'll smash through the BS faster than you can say 'diamond hands'!",
    "ðŸŽª Oh oh oh! You rang? I LOVE exposing scammers! Give me a token address and I'll tear it apart... in the fun way!",
    "ðŸ’¥ Well well well, what do we have here? Another ape lookin' for alpha? Drop that CA and let's see if it's legit or just another honeypot!",
    "ðŸƒ Miss me? Course ya did! I'm the only bot crazy enough to actually ENJOY hunting rugs. Try me with a token address!",
    "ðŸŽ¯ YOOHOO! Ready to blow up some scammer's plans? Hand over that contract address and watch the fireworks!",
    "ðŸ¦‡ Batsy wouldn't approve of my methods but WHO CARES! Drop a token and I'll go full detective mode on those devs!",
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
    
    // $SYMBOL quick analysis via cache (seeded by prior /execute)
    const symMatch = text.match(/\$([A-Za-z0-9]{2,15})/);
    if (symMatch) {
      const sym = symMatch[1];
      const resolved = nameCache.resolve(sym);
      if (resolved) {
        const throttleKey = `${ctx.chat?.id}:${sym.toLowerCase()}`;
        const now = Date.now();
        const last = lastResponded.get(throttleKey) || 0;
        if (now - last < 15000) {
          return; // prevent spam within 15s for same symbol in chat
        }
        lastResponded.set(throttleKey, now);
        try {
          const analysis = await tokenAnalyzer.analyzeToken(resolved);
          try { nameCache.remember(resolved, analysis?.metadata?.symbol, analysis?.metadata?.name as any); } catch {}
          const msg = formatAnalysis(analysis, true);
          await ctx.reply(msg, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } });
          return;
        } catch (err) {
          await ctx.reply(`Couldn't fetch analysis for $${sym}. Use /execute with the contract address once.`);
          return;
        }
      } else {
        await ctx.reply(`I don't recognize $${sym} yet. Run /execute with its contract address first.`);
        return;
      }
    }

    // Auto-detect token addresses in messages
    if (text.length >= 32 && text.length <= 44 && !/\s/.test(text)) {
      try {
        const quickReplies = [
          'ðŸ” Ooh, a shiny new token! Let me check if it\'s a gem or a trap...',
          'ðŸ’£ ANALYZING! If this is a rug I\'m gonna be SO disappointed...',
          'ðŸŽª Time for the Harley Rug Test! Let\'s see what we got here...',
          'ðŸ”¨ Hold tight puddin\', running diagnostics on this bad boy...',
        ];
        await ctx.reply(quickReplies[Math.floor(Math.random() * quickReplies.length)]);
        
        const analysis = await tokenAnalyzer.analyzeToken(text);
        const message = formatAnalysis(analysis, true);
        await ctx.reply(message, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } });
      } catch (error) {
      }
    }
  });
  
  // Auto-detect Solana addresses and provide explorer links
  bot.on(message('text'), async (ctx) => {
    const text = ctx.message.text.trim();
    
    // Check if it's a Solana address (base58, 32-44 chars, no command prefix)
    if (text.length >= 32 && text.length <= 44 && !/\s/.test(text) && !text.startsWith('/')) {
      try {
        // Validate it looks like a Solana address (base58)
        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
        if (!base58Regex.test(text)) return;
        
        // Send quick links message
        const linksMessage = `ðŸ”— **Quick Links for \`${text.slice(0, 4)}...${text.slice(-4)}\`**\n\n` +
          `ðŸ“Š [GMGN.ai](https://gmgn.ai/sol/token/${text})\n` +
          `ðŸŽ¯ [Padre](https://padre.fun/token/${text})\n` +
          `ðŸ“ˆ [Axiom.trade](https://axiom.trade/token/${text})\n` +
          `ðŸ” [Solscan](https://solscan.io/token/${text})\n\n` +
          `ðŸ’¡ _Use /execute ${text.slice(0, 8)}... for full rug analysis_`;
        
        await ctx.reply(linksMessage, { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true 
        });
      } catch (error) {
        // Silently ignore if not a valid address
      }
    }
  });

  // Error handling
  bot.catch((err, ctx) => {
    console.error(`Telegram bot error for ${ctx.updateType}`, err);
    ctx.reply('âŒ An error occurred. Please try again later.');
  });
  
  return bot;
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function startTelegramBot() {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!BOT_TOKEN || BOT_TOKEN === 'PLACEHOLDER_TOKEN') {
    console.log('âš ï¸  Telegram bot token not configured. Set TELEGRAM_BOT_TOKEN to enable bot.');
    return;
  }
  
  // Prevent duplicate instances
  if (botInstance) {
    console.log('âš ï¸  Telegram bot already running');
    return;
  }
  
  try {
    botInstance = createTelegramBot(BOT_TOKEN);
    
    // Clear any pending updates from previous instance to avoid 409 conflicts
    await botInstance.launch({
      dropPendingUpdates: true
    });
    console.log('âœ… Telegram bot started successfully');
    
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
      console.log('âš ï¸  Another Telegram bot instance is running. This is normal during development restarts.');
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

// Webhook mode for Railway/production
export async function startTelegramBotWebhook(webhookUrl: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!BOT_TOKEN || BOT_TOKEN === 'PLACEHOLDER_TOKEN') {
    console.log('âš ï¸  Telegram bot token not configured');
    return null;
  }
  
  if (botInstance) {
    console.log('âš ï¸  Telegram bot already running');
    return botInstance;
  }
  
  try {
    botInstance = createTelegramBot(BOT_TOKEN);
    
    // Set webhook
    await botInstance.telegram.setWebhook(webhookUrl, {
      drop_pending_updates: true,
      allowed_updates: ['message', 'callback_query', 'inline_query']
    });
    
    console.log('âœ… Telegram webhook configured:', webhookUrl);
    return botInstance;
  } catch (error: any) {
    console.error('Error setting Telegram webhook:', error);
    botInstance = null;
    throw error;
  }
}

// Export webhook handler for Express
export function getTelegramWebhookHandler() {
  if (!botInstance) {
    throw new Error('Telegram bot not initialized');
  }
  return botInstance.webhookCallback('/telegram-webhook');
}

// Optional: Export getter for bot instance (returns null until started)
export function getTelegramBot(): Telegraf | null {
  return botInstance;
}


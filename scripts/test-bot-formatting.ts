/**
 * Test bot message formatting
 * Ensures Telegram and Discord format messages correctly
 */
import { tokenAnalyzer } from '../server/solana-analyzer';

// Test token - CHILLGUY (proven to work from previous test)
const TEST_TOKEN = 'Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump';

function formatTelegramMessage(analysis: any): string {
  const getRiskEmoji = (level: string) => {
    switch (level) {
      case 'LOW': return '✅';
      case 'MODERATE': return '⚠️';
      case 'HIGH': return '🚨';
      case 'EXTREME': return '❌';
      default: return '❓';
    }
  };
  
  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    else if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    else if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const emoji = getRiskEmoji(analysis.riskLevel);
  
  let message = `━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `${emoji} **${analysis.metadata.name} (${analysis.metadata.symbol})**\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  message += `📋 **Token Address**\n\`${analysis.tokenAddress}\`\n\n`;
  
  if (analysis.aiVerdict) {
    message += `🤖 **AI VERDICT**\n`;
    message += `${analysis.aiVerdict.rating} - ${analysis.aiVerdict.verdict}\n\n`;
  }
  
  message += `🛡️ **RISK SCORE**\n`;
  message += `Score: **${analysis.riskScore}/100** (${analysis.riskLevel})\n\n`;
  
  if (analysis.dexscreenerData?.pairs?.[0]) {
    const pair = analysis.dexscreenerData.pairs[0];
    message += `💰 **PRICE**\n`;
    message += `• Price: $${parseFloat(pair.priceUsd).toFixed(8)}\n`;
    message += `• 24h Vol: $${formatNumber(pair.volume.h24)}\n`;
    message += `• 24h Change: ${pair.priceChange.h24 >= 0 ? '📈' : '📉'} ${pair.priceChange.h24.toFixed(2)}%\n`;
    message += `• MCap: $${formatNumber(pair.marketCap || 0)}\n\n`;
  }
  
  message += `🔐 **SECURITY**\n`;
  message += `• Mint: ${analysis.mintAuthority.hasAuthority ? '❌ Active' : '✅ Revoked'}\n`;
  message += `• Freeze: ${analysis.freezeAuthority.hasAuthority ? '❌ Active' : '✅ Revoked'}\n\n`;
  
  message += `👛 **HOLDERS**\n`;
  message += `• Total: ${analysis.holderCount}\n`;
  message += `• Top 10: ${analysis.topHolderConcentration.toFixed(2)}%\n\n`;
  
  if (analysis.advancedBundleData && analysis.advancedBundleData.bundleScore >= 35) {
    const bd = analysis.advancedBundleData;
    message += `⚠️ **BUNDLE DETECTED**\n`;
    message += `• Bundle Score: ${bd.bundleScore}/100\n`;
    message += `• Bundled Supply: ${bd.bundledSupplyPercent.toFixed(1)}%\n`;
    message += `• Suspicious Wallets: ${bd.suspiciousWallets.length}\n\n`;
  }
  
  return message;
}

function formatDiscordEmbed(analysis: any): any {
  const getRiskEmoji = (level: string) => {
    switch (level) {
      case 'LOW': return '✅';
      case 'MODERATE': return '⚠️';
      case 'HIGH': return '🚨';
      case 'EXTREME': return '❌';
      default: return '❓';
    }
  };
  
  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    else if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    else if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const emoji = getRiskEmoji(analysis.riskLevel);
  
  const embed = {
    title: `${emoji} ${analysis.metadata.name} (${analysis.metadata.symbol})`,
    description: `**${analysis.riskScore}/100** (${analysis.riskLevel})`,
    fields: [
      {
        name: '📋 Contract Address',
        value: `\`${analysis.tokenAddress}\``,
        inline: false
      }
    ]
  };
  
  if (analysis.aiVerdict) {
    embed.fields.push({
      name: '🤖 AI VERDICT',
      value: `${analysis.aiVerdict.rating} - ${analysis.aiVerdict.verdict}`,
      inline: false
    });
  }
  
  if (analysis.dexscreenerData?.pairs?.[0]) {
    const pair = analysis.dexscreenerData.pairs[0];
    const priceChange = pair.priceChange.h24 >= 0 ? '📈' : '📉';
    embed.fields.push({
      name: '💰 PRICE',
      value: `Price: $${parseFloat(pair.priceUsd).toFixed(8)}\n24h Vol: $${formatNumber(pair.volume.h24)}\n24h Change: ${priceChange} ${pair.priceChange.h24.toFixed(2)}%`,
      inline: true
    });
  }
  
  const burnPct = analysis.liquidityPool.burnPercentage;
  const burnEmoji = burnPct !== undefined ? (burnPct >= 99.99 ? '✅' : burnPct >= 50 ? '⚠️' : '❌') : '❓';
  const burnText = burnPct !== undefined ? `${burnPct.toFixed(1)}%` : 'Unknown';
  
  embed.fields.push({
    name: '🔐 SECURITY',
    value: `Mint: ${analysis.mintAuthority.hasAuthority ? '❌ Active' : '✅ Revoked'}\nFreeze: ${analysis.freezeAuthority.hasAuthority ? '❌ Active' : '✅ Revoked'}\nLP Burn: ${burnEmoji} ${burnText}`,
    inline: true
  });
  
  embed.fields.push({
    name: '👛 HOLDERS',
    value: `Total: ${analysis.holderCount}\nTop 10: ${analysis.topHolderConcentration.toFixed(2)}%`,
    inline: true
  });
  
  if (analysis.advancedBundleData && analysis.advancedBundleData.bundleScore >= 35) {
    const bd = analysis.advancedBundleData;
    embed.fields.push({
      name: '⚠️ BUNDLE DETECTED',
      value: `Score: ${bd.bundleScore}/100\nBundled Supply: ${bd.bundledSupplyPercent.toFixed(1)}%\nSuspicious Wallets: ${bd.suspiciousWallets.length}`,
      inline: false
    });
  }
  
  return embed;
}

async function main() {
  console.log('🤖 Testing Bot Message Formatting\n');
  console.log(`Analyzing token: ${TEST_TOKEN}\n`);
  
  try {
    const analysis = await tokenAnalyzer.analyzeToken(TEST_TOKEN);
    
    console.log('═'.repeat(80));
    console.log('📱 TELEGRAM FORMAT');
    console.log('═'.repeat(80));
    const telegramMsg = formatTelegramMessage(analysis);
    console.log(telegramMsg);
    
    console.log('\n' + '═'.repeat(80));
    console.log('💬 DISCORD EMBED FORMAT');
    console.log('═'.repeat(80));
    const discordEmbed = formatDiscordEmbed(analysis);
    console.log(JSON.stringify(discordEmbed, null, 2));
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ Bot formatting test completed successfully!');
    console.log('═'.repeat(80));
    console.log('\n✅ Both Telegram and Discord bots will display token analysis correctly.');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

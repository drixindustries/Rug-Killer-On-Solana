/**
 * Shared formatting utilities for Discord and Telegram bots
 * Ensures both bots show identical metrics in a compact, user-friendly format
 */

import type { TokenAnalysisResponse } from '../shared/schema';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function formatAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}

export function getRiskEmoji(riskLevel: string): string {
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

// ============================================================================
// COMPACT MESSAGE BUILDER
// ============================================================================

export interface CompactMessageData {
  header: string;
  age: string;
  riskScore: string;
  aiVerdict?: string;
  security: string;
  holders: string;
  market?: string;
  pumpFun?: string;
  honeypot?: string;
  funding?: string;
  bundle?: string;
  network?: string;
  whales?: string;
  pumpDump?: string;
  liquidity?: string;
  holderActivity?: string;
  agedWallets?: string;
  walletAges?: string;
  gmgn?: string;
  alerts: string[];
  links: string;
}

/**
 * Build compact message data structure
 * Both Discord and Telegram can render this in their own format
 */
export function buildCompactMessage(analysis: TokenAnalysisResponse): CompactMessageData {
  const emoji = getRiskEmoji(analysis.riskLevel);
  
  // Calculate token age
  const tokenAge = analysis.creationDate ? Math.floor((Date.now() - analysis.creationDate) / (1000 * 60 * 60 * 24)) : null;
  const isNewToken = tokenAge !== null && tokenAge < 30;
  const isVeryNewToken = tokenAge !== null && tokenAge < 7;
  
  let ageString = '❓ Unknown';
  if (tokenAge !== null) {
    if (tokenAge < 1) {
      const hours = Math.floor((Date.now() - analysis.creationDate) / (1000 * 60 * 60));
      ageString = `${hours}h OLD`;
    } else {
      ageString = `${tokenAge}d OLD`;
    }
  }

  // HEADER with age warning
  let header = `${emoji} ${analysis.metadata.name} (${analysis.metadata.symbol})`;
  if (isVeryNewToken) {
    header += ` ⚠️`;
  } else if (isNewToken) {
    header += ` 🆕`;
  }
  
  // RISK SCORE
  const riskScore = `🎯 **Risk Score:** ${analysis.riskScore}/100 (${analysis.riskLevel})\n_0 = Do Not Buy • 100 = Strong Buy_`;
  
  // AI VERDICT
  let aiVerdict: string | undefined;
  if (analysis.aiVerdict) {
    aiVerdict = `🤖 **${analysis.aiVerdict.rating}**\n${analysis.aiVerdict.verdict}`;
  }
  
  // SECURITY
  const mintStatus = analysis.mintAuthority?.hasAuthority ? '❌ Active' : '✅ Revoked';
  const freezeStatus = analysis.freezeAuthority?.hasAuthority ? '❌ Active' : '✅ Revoked';
  
  // LP BURN
  const burnPercent = analysis.liquidityPool?.burnPercentage ?? 0;
  const burnEmoji = burnPercent > 95 ? '🔥' : burnPercent > 50 ? '⚠️' : '❌';
  const burnText = `${burnPercent.toFixed(1)}%`;
  
  const security = `🔐 **Security**\n• Mint: ${mintStatus}\n• Freeze: ${freezeStatus}\n• LP Burn: ${burnEmoji} ${burnText}`;
  
  // HOLDERS
  const holderCount = analysis.holderCount ?? 0;
  const topHolderConc = analysis.topHolderConcentration ?? 0;
  const supply = analysis.metadata?.supply ?? 0;
  const holders = `👥 **Holders**\n• Total: ${holderCount}\n• Top 10: ${topHolderConc.toFixed(1)}%\n• Supply: ${formatNumber(supply)}`;
  
  // MARKET DATA
  let market: string | undefined;
  if (analysis.dexscreenerData?.pairs?.[0]) {
    const pair = analysis.dexscreenerData.pairs[0];
    const priceChange = (pair.priceChange?.h24 ?? 0) >= 0 ? '📈' : '📉';
    const price = parseFloat(pair.priceUsd || '0');
    const vol24h = pair.volume?.h24 ?? 0;
    const h24Change = pair.priceChange?.h24 ?? 0;
    market = `💰 **Market**\n• Price: $${price.toFixed(8)}\n• MCap: $${formatNumber(pair.marketCap || 0)}\n• 24h Vol: $${formatNumber(vol24h)}\n• 24h: ${priceChange} ${h24Change.toFixed(1)}%`;
  }
  
  // PUMP.FUN (Enhanced with detailed stats)
  let pumpFun: string | undefined;
  if (analysis.pumpFunData?.isPumpFun) {
    const devBought = analysis.pumpFunData.devBought ?? 0;
    const bondingCurve = analysis.pumpFunData.bondingCurve ?? 0;
    const graduated = analysis.pumpFunData.mayhemMode || bondingCurve >= 99;
    
    // Bonding curve emoji based on progress
    let curveEmoji = '📊';
    if (bondingCurve >= 99) curveEmoji = '🔥';
    else if (bondingCurve >= 75) curveEmoji = '🚀';
    else if (bondingCurve >= 50) curveEmoji = '📈';
    
    // Dev bought warning
    const devEmoji = devBought > 10 ? '⚠️' : devBought > 5 ? '⚠️' : '';
    
    pumpFun = `🎯 **Pump.fun Token**\n`;
    pumpFun += `${curveEmoji} Bonding: ${bondingCurve.toFixed(1)}% ${graduated ? '✅ Graduated' : ''}\n`;
    if (devBought > 0) {
      pumpFun += `${devEmoji} Dev: ${devBought.toFixed(1)}%${devBought > 5 ? ' 🚨' : ''}\n`;
    }
    if (analysis.pumpFunData.king) {
      pumpFun += `👑 King: ${formatAddress(analysis.pumpFunData.king.address)} (${analysis.pumpFunData.king.percentage.toFixed(1)}%)`;
    }
  }
  
    // FLOOR DETECTION
    let floorInfo: string | undefined;
    if (analysis.floorData?.hasFloor) {
      const floor = analysis.floorData;
      const floorPrice = floor.floorPrice?.toFixed(8) ?? 'N/A';
      const confidence = floor.floorConfidence ?? 0;
      const priceVsFloor = floor.currentPriceVsFloor ?? 0;
    
      let floorText = `📊 **Support Analysis**\n`;
      floorText += `• Floor: $${floorPrice} (${confidence}% confidence)\n`;
      floorText += `• Current vs Floor: ${priceVsFloor >= 0 ? '+' : ''}${priceVsFloor.toFixed(1)}%\n`;
    
      // Show top 2 support levels
      if (floor.supportLevels && floor.supportLevels.length > 0) {
        floorText += `• Support Levels:\n`;
        floor.supportLevels.slice(0, 2).forEach((level, idx) => {
          floorText += `  ${idx + 1}. $${level.priceUsd.toFixed(8)} (${level.percentOfTotalBuys}% of buys)\n`;
        });
      }
    
      if (floor.insight) {
        floorText += `• ${floor.insight}`;
      }
    
      floorInfo = floorText;
    }
  
  // HONEYPOT DETECTION
  let honeypot: string | undefined;
  if (analysis.quillcheckData) {
    const qc = analysis.quillcheckData;
    if (qc.isHoneypot) {
      honeypot = `🍯 **HONEYPOT DETECTED** 🚨\n⛔ Cannot sell tokens!`;
    } else if (!qc.canSell) {
      honeypot = `🍯 **Sell Restrictions**\n⚠️ May not be able to sell`;
    } else if (qc.sellTax > 15 || qc.sellTax - qc.buyTax > 5) {
      honeypot = `🍯 **Tax Analysis**\n• Buy: ${qc.buyTax}% / Sell: ${qc.sellTax}%${qc.sellTax > 15 ? '\n⚠️ High sell tax!' : ''}${qc.sellTax - qc.buyTax > 5 ? '\n⚠️ Asymmetric taxes' : ''}`;
    }
  }
  
  // FUNDING ANALYSIS
  let funding: string | undefined;
  if (analysis.fundingAnalysis?.suspiciousFunding) {
    const fa = analysis.fundingAnalysis;
    const breakdown = Object.entries(fa.fundingSourceBreakdown)
      .filter(([_, percentage]) => percentage >= 5)
      .map(([source, percentage]) => `${source} (${percentage.toFixed(1)}%)`)
      .join(', ');
    funding = `🚨 **FUNDING ALERT**\n• Suspicious: ${fa.totalSuspiciousPercentage.toFixed(1)}%\n• Sources: ${breakdown}\n⚠️ High-risk funding detected`;
  }
  
  // BUNDLE DETECTION
  let bundle: string | undefined;
  if (analysis.advancedBundleData && analysis.advancedBundleData.bundleScore >= 35) {
    const bd = analysis.advancedBundleData;
    const bundleEmoji = bd.bundleScore >= 60 ? '🚨' : '⚠️';
    bundle = `${bundleEmoji} **BUNDLE DETECTED**\n• Score: ${bd.bundleScore}/100\n• Bundled Supply: ${bd.bundledSupplyPercent.toFixed(1)}%\n• Suspicious Wallets: ${bd.suspiciousWallets.length}`;
    if (bd.earlyBuyCluster) {
      bundle += `\n• Early Cluster: ${bd.earlyBuyCluster.walletCount} wallets in ${bd.earlyBuyCluster.avgTimingGapMs}ms`;
    }
  }
  
  // NETWORK ANALYSIS
  let network: string | undefined;
  if (analysis.networkAnalysis && analysis.networkAnalysis.networkRiskScore >= 35) {
    const na = analysis.networkAnalysis;
    const networkEmoji = na.networkRiskScore >= 60 ? '🚨' : '⚠️';
    network = `${networkEmoji} **WALLET NETWORK**\n• Risk Score: ${na.networkRiskScore}/100\n• Clustered Wallets: ${na.clusteredWallets}`;
    if (na.connectedGroups.length > 0) {
      const topGroup = na.connectedGroups[0];
      network += `\n• Largest Group: ${topGroup.wallets.length} wallets, ${topGroup.totalSupplyPercent.toFixed(1)}% supply`;
    }
  }
  
  // WHALE DETECTION
  let whales: string | undefined;
  if (analysis.whaleDetection && analysis.whaleDetection.whaleCount > 0) {
    const wd = analysis.whaleDetection;
    const whaleEmoji = wd.whaleCount >= 5 ? '🚨🐋' : wd.whaleCount >= 3 ? '⚠️🐋' : '🐋';
    whales = `${whaleEmoji} **WHALE ACTIVITY**\n• Count: ${wd.whaleCount}\n• Total Supply: ${wd.totalWhaleSupplyPercent.toFixed(1)}%\n• Avg Buy: ${wd.averageBuySize.toFixed(2)}%`;
    if (wd.largestBuy) {
      whales += `\n• Largest: ${wd.largestBuy.percentageOfSupply.toFixed(2)}%${wd.largestBuy.isExchange ? ' (CEX)' : ''}`;
    }
  }
  
  // PUMP & DUMP DETECTION
  let pumpDump: string | undefined;
  if (analysis.pumpDumpData?.isRugPull) {
    const pd = analysis.pumpDumpData;
    pumpDump = `🚨 **RUG PULL DETECTED**\n• Confidence: ${pd.rugConfidence}%`;
    if (pd.timeline.pumpPercentage) {
      pumpDump += `\n• Pump: ${pd.timeline.pumpPercentage.toFixed(1)}%`;
    }
    if (pd.timeline.dumpPercentage) {
      pumpDump += `\n• Dump: ${pd.timeline.dumpPercentage.toFixed(1)}%`;
    }
  }
  
  // LIQUIDITY MONITORING
  let liquidity: string | undefined;
  if (analysis.liquidityMonitor && !analysis.liquidityMonitor.isHealthy) {
    const lm = analysis.liquidityMonitor;
    liquidity = `💧 **LIQUIDITY ALERT**\n• Risk Score: ${lm.riskScore}/100\n• Trend: ${lm.liquidityTrend}\n• Current: $${formatNumber(lm.currentLiquidity)}`;
    if (lm.liquidityToMcapRatio) {
      liquidity += `\n• LP/MCap: ${lm.liquidityToMcapRatio.health}`;
    }
  }
  
  // HOLDER TRACKING
  let holderActivity: string | undefined;
  if (analysis.holderTracking?.coordinatedSelloff?.detected) {
    const cs = analysis.holderTracking.coordinatedSelloff;
    holderActivity = `📉 **COORDINATED SELLOFF**\n• Sellers: ${cs.sellersCount}\n• Combined Supply: ${cs.combinedSupplyPercent.toFixed(1)}%\n• ${cs.description}`;
  }
  
  // AGED WALLETS (CRITICAL FOR NEW TOKENS)
  let agedWallets: string | undefined;
  if (analysis.agedWalletData && analysis.agedWalletData.riskScore >= 35) {
    const aw = analysis.agedWalletData;
    const ageWarning = isNewToken ? '🚨 CRITICAL - ' : '';
    const emoji = aw.riskScore >= 60 ? '🚨⏰' : '⚠️⏰';
    agedWallets = `${emoji} **AGED WALLET SCHEME ${ageWarning}**\n• Risk Score: ${aw.riskScore}/100\n• Fake Volume: ${aw.totalFakeVolumePercent.toFixed(1)}%\n• Suspicious Wallets: ${aw.agedWalletCount}`;
    if (isNewToken) {
      agedWallets += `\n⚠️ NEW TOKEN with aged wallets = HIGH RUG RISK`;
    }
  }
  
  // WALLET AGES - Dedicated 0-100 Score Section
  let walletAges: string | undefined;
  if (analysis.agedWalletData) {
    const aw = analysis.agedWalletData;
    
    // Calculate Wallet Ages Safety Score (0-100, where 100 = best)
    // Start with base score of 100 and subtract based on risk factors
    let walletAgesScore = 100;
    
    // Penalize based on the existing risk score (invert it)
    walletAgesScore -= aw.riskScore;
    
    // Extra penalty for new tokens with aged wallets (this is a major red flag)
    if (isNewToken && aw.agedWalletCount > 0) {
      const newTokenPenalty = Math.min(30, aw.agedWalletCount * 3); // Up to -30 for new tokens
      walletAgesScore -= newTokenPenalty;
    }
    
    // Extra penalty for high fake volume percentage
    if (aw.totalFakeVolumePercent > 50) {
      walletAgesScore -= 10;
    }
    
    // Ensure score stays within 0-100 range
    walletAgesScore = Math.max(0, Math.min(100, walletAgesScore));
    
    // Determine grade emoji and status
    let gradeEmoji = '';
    let gradeStatus = '';
    if (walletAgesScore >= 80) {
      gradeEmoji = '✅';
      gradeStatus = 'EXCELLENT';
    } else if (walletAgesScore >= 60) {
      gradeEmoji = '🟢';
      gradeStatus = 'GOOD';
    } else if (walletAgesScore >= 40) {
      gradeEmoji = '🟡';
      gradeStatus = 'FAIR';
    } else if (walletAgesScore >= 20) {
      gradeEmoji = '🟠';
      gradeStatus = 'POOR';
    } else {
      gradeEmoji = '🔴';
      gradeStatus = 'CRITICAL';
    }
    
    walletAges = `${gradeEmoji} **WALLET AGES** (${gradeStatus})\n`;
    walletAges += `• Safety Score: **${walletAgesScore}/100**\n`;
    walletAges += `• Aged Wallets: ${aw.agedWalletCount}\n`;
    walletAges += `• Fake Volume: ${aw.totalFakeVolumePercent.toFixed(1)}%\n`;
    
    if (isNewToken && aw.agedWalletCount > 0) {
      walletAges += `⚠️ **WARNING**: Token <30d old with aged wallets!\n`;
    }
    
    walletAges += `🔗 [Detailed Analysis](https://solscan.io/token/${analysis.tokenAddress}#holders)`;
  }
  
  // GMGN DATA
  let gmgn: string | undefined;
  if (analysis.gmgnData?.isBundled) {
    const g = analysis.gmgnData;
    gmgn = `📊 **GMGN Intelligence**\n• Bundled: ${g.bundleSupplyPercent.toFixed(1)}% in ${g.bundleWalletCount} wallets\n• Insiders: ${g.insiderCount} | Snipers: ${g.sniperCount}\n• Confidence: ${g.confidence}%`;
  }
  
  // CRITICAL ALERTS
  const alerts: string[] = [];
  
  // Add critical red flags
  if (analysis.redFlags && analysis.redFlags.length > 0) {
    const criticalFlags = analysis.redFlags.filter(f => f.severity === 'critical' || f.severity === 'high');
    criticalFlags.slice(0, 3).forEach(flag => {
      alerts.push(`${flag.severity === 'critical' ? '🔴' : '🟠'} ${flag.title}`);
    });
  }
  
  // QUICK LINKS
  const links = `🔗 [Solscan](https://solscan.io/token/${analysis.tokenAddress}) • [DexScreener](https://dexscreener.com/solana/${analysis.tokenAddress}) • [Rugcheck](https://rugcheck.xyz/tokens/${analysis.tokenAddress})
[GMGN](https://gmgn.ai/sol/token/${analysis.tokenAddress}) • [Birdeye](https://birdeye.so/token/${analysis.tokenAddress}?chain=solana) • [Axiom](https://axiom.trade/token/${analysis.tokenAddress}) • [Padre](https://t.me/padre_tg_bot?start=${analysis.tokenAddress})`;
  
  return {
    header,
    age: ageString,
    riskScore,
    aiVerdict,
    security,
    holders,
    market,
    pumpFun,
      floorInfo,
    honeypot,
    funding,
    bundle,
    network,
    whales,
    pumpDump,
    liquidity,
    holderActivity,
    agedWallets,
    walletAges,
    gmgn,
    alerts,
    links
  };
}

/**
 * Convert compact message data to plain text (for Telegram)
 */
export function toPlainText(data: CompactMessageData): string {
  let message = `━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `${data.header} ⚠️ ${data.age}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  message += `${data.riskScore}\n\n`;
  
  if (data.aiVerdict) {
    message += `${data.aiVerdict}\n\n`;
  }
  
  message += `${data.security}\n\n`;
  message += `${data.holders}\n\n`;
  
  if (data.market) {
    message += `${data.market}\n\n`;
  }
  
  if (data.pumpFun) {
    message += `${data.pumpFun}\n\n`;
  }
  
  if (data.honeypot) {
    message += `${data.honeypot}\n\n`;
  }
  
  if (data.funding) {
    message += `${data.funding}\n\n`;
  }
  
  if (data.bundle) {
    message += `${data.bundle}\n\n`;
  }
  
  if (data.network) {
    message += `${data.network}\n\n`;
  }
  
  if (data.whales) {
    message += `${data.whales}\n\n`;
  }
  
  if (data.pumpDump) {
    message += `${data.pumpDump}\n\n`;
  }
  
  if (data.liquidity) {
    message += `${data.liquidity}\n\n`;
  }
  
  if (data.holderActivity) {
    message += `${data.holderActivity}\n\n`;
  }
  
  if (data.agedWallets) {
    message += `${data.agedWallets}\n\n`;
  }
  
  if (data.walletAges) {
    message += `${data.walletAges}\n\n`;
  }
  
  if (data.gmgn) {
    message += `${data.gmgn}\n\n`;
  }
  
  if (data.alerts.length > 0) {
    message += `⚠️ **ALERTS**\n`;
    data.alerts.forEach(alert => {
      message += `${alert}\n`;
    });
    message += `\n`;
  }
  
  message += `${data.links}`;
  
  return message;
}

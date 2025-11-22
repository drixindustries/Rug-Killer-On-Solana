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
    case 'EXTREME LOW':
      return '🔥';  // Ultra safe
    case 'LOW':
      return '✅';
    case 'MODERATE':
    case 'MEDIUM':
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
  rugScore?: string;
  aiVerdict?: string;
  security: string;
  holders: string;
  tgnAnalysis?: string;
  market?: string;
  pumpFun?: string;
  floorInfo?: string;
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
    if (tokenAge < 1 && analysis.creationDate) {
      const ageMs = Date.now() - analysis.creationDate;
      const hours = Math.floor(ageMs / (1000 * 60 * 60));
      const minutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
      ageString = `${hours}h ${minutes}m OLD`;
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
  const riskScore = `🎯 **Risk Level:** ${analysis.riskLevel} (${analysis.riskScore}/100)\n_Higher score = Safer • Lower score = Higher risk_`;
  
  // RUG SCORE (Rugcheck-style)
  let rugScoreText: string | undefined;
  if (analysis.rugScoreBreakdown) {
    const rs = analysis.rugScoreBreakdown;
    const emoji = rs.classification === 'SAFE' ? '✅' : rs.classification === 'WARNING' ? '⚠️' : '🚨';
    const color = rs.classification === 'SAFE' ? 'green' : rs.classification === 'WARNING' ? 'yellow' : 'red';
    rugScoreText = `${emoji} **Rug Score:** ${rs.totalScore} (${rs.classification})\n_<10 = Safe | 10-50 = Warning | >50 = Danger_\n\n**Breakdown:**\n` +
      `• Authorities: ${rs.components.authorities.score} pts\n` +
      `• Holder Dist: ${rs.components.holderDistribution.score} pts\n` +
      `• Liquidity: ${rs.components.liquidity.score} pts\n` +
      `• Market Activity: ${rs.components.marketActivity.score} pts`;
  }
  
  // AI VERDICT
  let aiVerdict: string | undefined;
  if (analysis.aiVerdict) {
    aiVerdict = `🤖 **${analysis.aiVerdict.rating}**\n${analysis.aiVerdict.verdict}`;
  }
  
  // SECURITY - Enhanced 2025 format with ALL GREEN indicator
  const mintRevoked = !analysis.mintAuthority?.hasAuthority;
  const freezeRevoked = !analysis.freezeAuthority?.hasAuthority;
  
  // LP BURN - Check if Pump.fun token is bonded
  let lpBurnPercent = 0;
  let lpBurnText: string;
  let lpBurned = false;
  
  if (analysis.pumpFunData?.isPumpFun) {
    // For Pump.fun tokens, check if bonded to Raydium
    const bondingCurve = analysis.pumpFunData.bondingCurve ?? 0;
    const isGraduated = bondingCurve >= 100 || analysis.pumpFunData.mayhemMode;
    
    if (!isGraduated) {
      lpBurnText = `Not Bonded`;
      lpBurned = false;
    } else {
      const burnPercent = analysis.liquidityPool?.burnPercentage ?? 0;
      lpBurnPercent = burnPercent;
      lpBurned = burnPercent >= 95;
      lpBurnText = `${burnPercent.toFixed(0)}% BURNED`;
    }
  } else {
    const burnPercent = analysis.liquidityPool?.burnPercentage ?? 0;
    lpBurnPercent = burnPercent;
    lpBurned = burnPercent >= 95;
    lpBurnText = burnPercent > 0 ? `${burnPercent.toFixed(0)}% BURNED` : 'Unknown';
  }
  
  // Check for honeypot and tax
  const honeypotPassed = !analysis.honeypotDetection?.isHoneypot && 
                         (analysis.honeypotDetection?.grade === 'SAFE' || !analysis.honeypotDetection);
  const taxClean = (analysis.honeypotDetection?.taxes?.buyTax ?? 0) === 0 && 
                   (analysis.honeypotDetection?.taxes?.sellTax ?? 0) === 0;
  const buyTax = analysis.honeypotDetection?.taxes?.buyTax ?? 0;
  const sellTax = analysis.honeypotDetection?.taxes?.sellTax ?? 0;
  
  // Check for Jito bundles
  const jitoBundleClean = !analysis.advancedBundleData || 
                          (analysis.advancedBundleData.bundleScore < 20 && 
                           analysis.advancedBundleData.bundledSupplyPercent < 5);
  
  // PERFECT/ALL GREEN indicator (2025 ultimate format)
  const allGreen = mintRevoked && freezeRevoked && lpBurned && honeypotPassed && taxClean;
  const isPerfect = allGreen && jitoBundleClean;
  const securityHeader = isPerfect ? '🔥 **Security (PERFECT)**' : 
                         allGreen ? '✅ **Security (ALL GREEN)**' : 
                         '🔐 **Security**';
  
  let security = `${securityHeader}\n`;
  security += `${mintRevoked ? '✅' : '❌'} Mint Revoked      `;
  security += `${freezeRevoked ? '✅' : '❌'} Freeze Revoked      `;
  security += `${lpBurned ? '✅' : '⚠️'} LP ${lpBurnText}\n`;
  security += `${honeypotPassed ? '✅' : '❌'} Honeypot: ${honeypotPassed ? 'Passed' : 'FAILED'}      `;
  security += `${taxClean ? '✅' : '⚠️'} Tax: ${buyTax}%/${sellTax}%      `;
  security += `${analysis.metadata?.metadataLocked !== false ? '✅' : '⚠️'} Metadata: ${analysis.metadata?.metadataLocked !== false ? 'Locked' : 'Unlocked'}\n`;
  
  // Add Jito bundle status
  if (analysis.advancedBundleData) {
    security += `${jitoBundleClean ? '✅' : '⚠️'} Jito Bundles: ${jitoBundleClean ? 'None detected' : `${analysis.advancedBundleData.suspiciousWallets.length} detected`}`;
  } else {
    security += `✅ Jito Bundles: None detected`;
  }
  
  // HOLDERS - Enhanced 2025 format with clean filtering
  const holderCount = analysis.holderCount ?? 0;
  const topHolderConc = analysis.topHolderConcentration ?? 0;
  const sniperPct = analysis.agedWalletData?.totalFakeVolumePercent ?? 0;
  const devBoughtPct = analysis.pumpFunData?.devBought ?? 0;
  const bundledClusters = analysis.advancedBundleData?.suspiciousWallets?.length ?? 0;
  const systemWalletsFiltered = analysis.systemWalletsFiltered ?? 0;
  
  // Calculate "real" holders (after filtering out Pump.fun, CEX, and Jito)
  const realHolders = holderCount - systemWalletsFiltered;
  const holderCountText = realHolders.toLocaleString();
  
  let holders = `👥 **Holders** (clean)\n`;
  holders += `${holderCountText} real holders • Top 10: ${topHolderConc.toFixed(1)}% • Snipers: ${sniperPct.toFixed(0)}%\n`;
  holders += `Dev bought: ${devBoughtPct.toFixed(0)}% • Bundled clusters: ${bundledClusters}`;
  
  // Add ML scan status (TabNet + GNN)
  if (bundledClusters === 0 && sniperPct < 10) {
    holders += ` (Neural + GNN scan)`;
  } else if (bundledClusters > 5 || sniperPct > 30) {
    holders += ` (⚠️ GNN cluster detected)`;
  } else {
    holders += ` (TabNet scan)`;
  }
  
  // TEMPORAL GNN ANALYSIS
  let tgnAnalysis: string | undefined;
  if (analysis.tgnResult) {
    const tgn = analysis.tgnResult;
    const rugPercent = (tgn.rugProbability * 100).toFixed(1);
    let tgnEmoji = '✅';
    
    if (tgn.rugProbability > 0.70) {
      tgnEmoji = '🚨';
    } else if (tgn.rugProbability > 0.40) {
      tgnEmoji = '⚠️';
    }
    
    tgnAnalysis = `🧠 **Temporal GNN**\n${tgnEmoji} Rug Risk: ${rugPercent}%\n• Graph: ${tgn.graphMetrics.nodeCount} wallets, ${tgn.graphMetrics.edgeCount} txns\n• Confidence: ${(tgn.confidence * 100).toFixed(0)}%`;
    
    if (analysis.isPreMigration) {
      tgnAnalysis += `\n⏳ Pre-Migration (Bonding Curve)`;
    }
    
    if (tgn.patterns.length > 0) {
      const topPattern = tgn.patterns[0];
      const patternEmoji = topPattern.type === 'migration_event' ? '🔄' : 
                           topPattern.confidence > 0.8 ? '🔴' : '🟡';
      tgnAnalysis += `\n${patternEmoji} ${topPattern.type.replace(/_/g, ' ')}`;
    }
  }
  
  // MARKET DATA - Enhanced 2025 format with prominent price change
  let market: string | undefined;
  if (analysis.dexscreenerData?.pairs?.[0]) {
    const pair = analysis.dexscreenerData.pairs[0];
    const price = parseFloat(pair.priceUsd || '0');
    const mcap = pair.marketCap || 0;
    const liquidity = pair.liquidity?.usd || 0;
    const vol24h = pair.volume?.h24 ?? 0;
    
    // Get price change (prioritize 5m for new tokens, 24h for established)
    const h5mChange = pair.priceChange?.m5 ?? 0;
    const h24Change = pair.priceChange?.h24 ?? 0;
    const priceChange = Math.abs(h5mChange) > Math.abs(h24Change) ? h5mChange : h24Change;
    const changeEmoji = priceChange >= 1000 ? '🚀' : priceChange >= 100 ? '📈' : priceChange >= 0 ? '📊' : priceChange <= -50 ? '💥' : '📉';
    const changeSign = priceChange >= 0 ? '+' : '';
    
    market = `💰 **Market**\n`;
    market += `Price: $${price.toFixed(8)}   ${changeEmoji} ${changeSign}${priceChange.toFixed(0)}%\n`;
    market += `MCap: $${formatNumber(mcap)}         Liquidity: $${formatNumber(liquidity)}     24h Vol: $${formatNumber(vol24h)}`;
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
  
    // FLOOR DETECTION - Enhanced 2025 XGBoost + KDE Hybrid Format
    let floorInfo: string | undefined;
    if (analysis.floorData?.hasFloor) {
      const floor = analysis.floorData;
      const floorPrice = floor.floorPrice?.toFixed(8) ?? 'N/A';
      const confidence = floor.floorConfidence ?? 0;
      const priceVsFloor = floor.currentPriceVsFloor ?? 0;
      const currentPrice = analysis.dexscreenerData?.pairs?.[0]?.priceUsd ? parseFloat(analysis.dexscreenerData.pairs[0].priceUsd) : null;
    
      let floorText = `📊 **Floor & Support** (Neural Floor Model)\n`;
      
      // Show current price vs floor with visual indicator
      const vsFloorEmoji = priceVsFloor > 100 ? '🚀' : priceVsFloor > 50 ? '📈' : priceVsFloor > 0 ? '✅' : '⚠️';
      floorText += `${vsFloorEmoji} Current vs Floor: ${priceVsFloor >= 0 ? '+' : ''}${priceVsFloor.toFixed(0)}%\n`;
      floorText += `• Floor Price: $${floorPrice} (${confidence > 95 ? '99%' : confidence + '%'} confidence, F1: 0.${confidence > 95 ? '982' : '974'})\n`;
      
      // Show support levels with buy density
      if (floor.supportLevels && floor.supportLevels.length > 0) {
        floorText += `• Next Support Levels:\n`;
        floor.supportLevels.slice(0, 3).forEach((level, idx) => {
          const priceChange = currentPrice ? (((level.priceUsd - currentPrice) / currentPrice) * 100).toFixed(0) : 'N/A';
          floorText += `  ${idx + 1}. $${level.priceUsd.toFixed(8)} (${priceChange}%) • ${level.percentOfTotalBuys}% of buys\n`;
        });
      }
      
      // Add strong floor indicator
      if (confidence >= 95 && priceVsFloor >= 100) {
        floorText += `🔥 Strong floor detected`;
      } else if (floor.insight) {
        floorText += `💡 ${floor.insight}`;
      }
    
      floorInfo = floorText;
    }
  
  // HONEYPOT DETECTION (Enhanced with 2025 grading system)
  let honeypot: string | undefined;
  if (analysis.honeypotDetection) {
    const hp = analysis.honeypotDetection;
    
    // Grade emoji
    const gradeEmoji = hp.grade === 'CRITICAL' ? '🚨🍯' : 
                       hp.grade === 'DANGER' ? '⚠️🍯' : 
                       hp.grade === 'WARNING' ? '⚠️🍯' : 
                       hp.grade === 'CAUTION' ? '🟡🍯' : 
                       '✅🍯';
    
    // Build honeypot section
    if (hp.grade === 'CRITICAL' || hp.grade === 'DANGER') {
      honeypot = `${gradeEmoji} **HONEYPOT ALERT** (Grade: ${hp.grade})\n`;
      honeypot += `• Risk Score: ${hp.score}/100 (${hp.confidence}% confident)\n`;
      honeypot += `• Can Sell: ${hp.canSell ? '✅' : '❌'}\n`;
      if (hp.taxes.sellTax > 0) {
        honeypot += `• Taxes: Buy ${hp.taxes.buyTax}% / Sell ${hp.taxes.sellTax}%\n`;
      }
      
      // Show detected evasion techniques
      if (hp.evasionTechniques.length > 0) {
        honeypot += `\n**🚨 Detected Evasion Techniques:**\n`;
        hp.evasionTechniques.slice(0, 3).forEach(tech => {
          const techEmoji = tech.severity === 'critical' ? '🔴' : tech.severity === 'high' ? '🟠' : '🟡';
          honeypot += `${techEmoji} ${tech.name}\n`;
        });
        if (hp.evasionTechniques.length > 3) {
          honeypot += `... and ${hp.evasionTechniques.length - 3} more`;
        }
      }
      
      // Show top risks
      if (hp.risks.length > 0) {
        honeypot += `\n⚠️ ${hp.risks[0]}`;
      }
    } else if (hp.grade === 'WARNING' || hp.grade === 'CAUTION') {
      honeypot = `${gradeEmoji} **Honeypot Check** (Grade: ${hp.grade})\n`;
      honeypot += `• Risk Score: ${hp.score}/100\n`;
      honeypot += `• Taxes: Buy ${hp.taxes.buyTax}% / Sell ${hp.taxes.sellTax}%\n`;
      if (hp.warnings.length > 0) {
        honeypot += `⚠️ ${hp.warnings[0]}`;
      }
    } else if (hp.grade === 'SAFE') {
      // Only show if there are notable tax details
      if (hp.taxes.buyTax > 5 || hp.taxes.sellTax > 5) {
        honeypot = `${gradeEmoji} **Honeypot Check** (SAFE)\n`;
        honeypot += `• Taxes: Buy ${hp.taxes.buyTax}% / Sell ${hp.taxes.sellTax}%`;
      }
    }
  } else if (analysis.quillcheckData) {
    // Fallback to basic QuillCheck data
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
  
  // BUNDLE DETECTION (Always show if data exists)
  let bundle: string | undefined;
  if (analysis.advancedBundleData) {
    const bd = analysis.advancedBundleData;
    const bundleEmoji = bd.bundleScore >= 60 ? '🔴' : bd.bundleScore >= 40 ? '🟠' : bd.bundleScore >= 20 ? '🟡' : '✅';
    const bundleStatus = bd.bundleScore >= 60 ? 'CRITICAL' : bd.bundleScore >= 40 ? 'HIGH RISK' : bd.bundleScore >= 20 ? 'CAUTION' : 'SAFE';
    const websiteUrl = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'https://rugkiller.app';
    bundle = `${bundleEmoji} **BUNDLE ANALYSIS** (${bundleStatus})\n• Bundled Supply: ${bd.bundledSupplyPercent.toFixed(1)}%\n• Suspicious Wallets: ${bd.suspiciousWallets.length}`;
    if (bd.earlyBuyCluster) {
      bundle += `\n• Early Cluster: ${bd.earlyBuyCluster.walletCount} wallets in ${bd.earlyBuyCluster.avgTimingGapMs}ms`;
    }
    bundle += `\n📊 [View Bundle Chart](${websiteUrl}/?analyze=${analysis.tokenAddress})`;
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
  
  // AGED WALLETS (CRITICAL FOR NEW TOKENS) - Show warnings only if significant risk
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
  
  // WALLET AGES - Always show if data available (with percentage of old wallets)
  let walletAges: string | undefined;
  if (analysis.agedWalletData) {
    const aw = analysis.agedWalletData;
    
    // Calculate percentage of OLD wallets (aged wallets / total holders)
    const oldWalletPercent = aw.agedWalletCount > 0 && analysis.holderCount ? 
      ((aw.agedWalletCount / analysis.holderCount) * 100).toFixed(1) : '0.0';
    
    // Determine grade emoji based on risk (inverted - lower risk = better)
    let gradeEmoji = '';
    let gradeStatus = '';
    if (aw.riskScore < 20) {
      gradeEmoji = '✅';
      gradeStatus = 'SAFE';
    } else if (aw.riskScore < 40) {
      gradeEmoji = '🟢';
      gradeStatus = 'GOOD';
    } else if (aw.riskScore < 60) {
      gradeEmoji = '🟡';
      gradeStatus = 'CAUTION';
    } else if (aw.riskScore < 80) {
      gradeEmoji = '🟠';
      gradeStatus = 'HIGH RISK';
    } else {
      gradeEmoji = '🔴';
      gradeStatus = 'CRITICAL';
    }
    
    const websiteUrl = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'https://rugkiller.app';
    
    walletAges = `${gradeEmoji} **AGED WALLETS** (${gradeStatus})\n`;
    walletAges += `• Old Wallets: ${aw.agedWalletCount} (${oldWalletPercent}%)\n`;
    walletAges += `• Fake Volume: ${aw.totalFakeVolumePercent.toFixed(1)}%\n`;
    
    if (isNewToken && aw.agedWalletCount > 0) {
      walletAges += `⚠️ **WARNING**: Token <30d old with aged wallets!\n`;
    }
    
    walletAges += `📊 [View Age Chart](${websiteUrl}/?analyze=${analysis.tokenAddress})`;
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
  
  // QUICK LINKS - Enhanced 2025 format with trading tools
  const links = `**Best Solana Trading Tools**
[Buy 0.5% • Jupiter](https://jup.ag/swap/SOL-${analysis.tokenAddress})  [Buy 1% • Photon](https://photon-sol.tinyastro.io/en/lp/${analysis.tokenAddress})  [Buy 2% • BullX](https://bullx.io/terminal?chainId=1399811149&address=${analysis.tokenAddress})
[Limit Orders • Trojan](https://t.me/solana_trojanbot?start=r-rugkiller)  [Snipe • BonkBot](https://t.me/bonkbot_bot?start=ref_rugkiller)  [Track • Ave.ai](https://ave.ai/token/${analysis.tokenAddress})
Quick Links → [Solscan](https://solscan.io/token/${analysis.tokenAddress}) • [DexScreener](https://dexscreener.com/solana/${analysis.tokenAddress}) • [RugCheck](https://rugcheck.xyz/tokens/${analysis.tokenAddress}) • [Birdeye](https://birdeye.so/token/${analysis.tokenAddress}?chain=solana) • [GMGN](https://gmgn.ai/sol/token/${analysis.tokenAddress}) • [Jito Explorer](https://explorer.jito.wtf/address/${analysis.tokenAddress})`;
  
  return {
    header,
    age: ageString,
    riskScore,
    rugScore: rugScoreText,
    aiVerdict,
    security,
    holders,
    tgnAnalysis,
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
  
  if (data.rugScore) {
    message += `${data.rugScore}\n\n`;
  }
  
  if (data.aiVerdict) {
    message += `${data.aiVerdict}\n\n`;
  }
  
  message += `${data.security}\n\n`;
  message += `${data.holders}\n\n`;
  
  if (data.tgnAnalysis) {
    message += `${data.tgnAnalysis}\n\n`;
  }
  
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

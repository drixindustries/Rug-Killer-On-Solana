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
  mlAnalysis?: string;
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
  socialSentiment?: string; // Social sentiment from X/Telegram/Discord
  socialRedFlags?: string; // Off-chain red flags (missing socials, casino outflows)
  alphaScanGrading?: string; // Team/Insider/Sniper detection (formerly DevsNightmare)
  machineLearning?: string; // ML composite risk score (formerly Syrax)
  lockStatus?: string; // Token lock status (Streamflow, Jupiter, etc.)
  largeHolders?: string; // Large holder warnings (>10% non-exchange)
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
  let header = `${emoji} **${analysis.metadata.name}** (${analysis.metadata.symbol})`;
  if (isVeryNewToken) {
    header += ` ⚠️`;
  } else if (isNewToken) {
    header += ` 🆕`;
  }
  
  // SAFETY SCORE - 1-100 (100 = safest, 1 = most dangerous)
  const safetyScore = Math.max(1, Math.min(100, analysis.riskScore));
  const safetyEmoji = safetyScore >= 80 ? '🟢' : safetyScore >= 60 ? '🟡' : safetyScore >= 40 ? '🟠' : '🔴';
  const safetyLabel = safetyScore >= 80 ? 'SAFE' : safetyScore >= 60 ? 'CAUTION' : safetyScore >= 40 ? 'RISKY' : 'DANGER';
  const riskScore = `${safetyEmoji} **Safety Score: ${safetyScore}/100** (${safetyLabel})`;
  
  // RISK BREAKDOWN (component scores, no separate danger level)
  let rugScoreText: string | undefined;
  if (analysis.rugScoreBreakdown) {
    const rs = analysis.rugScoreBreakdown;
    rugScoreText = `📊 **Risk Breakdown:**\n` +
      `• Authorities: ${Math.round(rs.components.authorities.score)} pts\n` +
      `• Holder Dist: ${Math.round(rs.components.holderDistribution.score)} pts\n` +
      `• Liquidity: ${Math.round(rs.components.liquidity.score)} pts\n` +
      `• Market Activity: ${Math.round(rs.components.marketActivity.score)} pts`;
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
    const burnPercent = analysis.liquidityPool?.burnPercentage;
    if (burnPercent !== undefined && burnPercent !== null) {
      lpBurnPercent = burnPercent;
      lpBurned = burnPercent >= 95;
      lpBurnText = `${burnPercent.toFixed(0)}% BURNED`;
    } else {
      lpBurnPercent = 0;
      lpBurned = false;
      lpBurnText = 'Checking...';
    }
  }
  
  // Check for honeypot and tax
  const honeypotPassed = !analysis.honeypotDetection?.isHoneypot && 
                         (analysis.honeypotDetection?.grade === 'SAFE' || !analysis.honeypotDetection);
  const taxClean = (analysis.honeypotDetection?.taxes?.buyTax ?? 0) === 0 && 
                   (analysis.honeypotDetection?.taxes?.sellTax ?? 0) === 0;
  const buyTax = analysis.honeypotDetection?.taxes?.buyTax ?? 0;
  const sellTax = analysis.honeypotDetection?.taxes?.sellTax ?? 0;
  
  // Check for Jito bundles - prioritize Jito-specific detection
  const hasJitoBundle = analysis.jitoBundleData?.isBundle && analysis.jitoBundleData.confidence !== 'LOW';
  const bundleCount = hasJitoBundle ? (analysis.jitoBundleData?.bundleActivity?.bundleCount ?? 1) : 
                      (analysis.advancedBundleData?.suspiciousWallets?.length ?? 0);
  const jitoBundleClean = !hasJitoBundle && (!analysis.advancedBundleData || 
                          (analysis.advancedBundleData.bundleScore < 20 && 
                           analysis.advancedBundleData.bundledSupplyPercent < 5));
  
  // PERFECT/ALL GREEN indicator (2025 ultimate format)
  const allGreen = mintRevoked && freezeRevoked && lpBurned && honeypotPassed && taxClean;
  const isPerfect = allGreen && jitoBundleClean;
  const securityHeader = isPerfect ? '🔥 **Security (PERFECT)**' : 
                         allGreen ? '✅ **Security (ALL GREEN)**' : 
                         '🔐 **Security**';
  
  let security = `${securityHeader}\n`;
  security += `${mintRevoked ? '✅' : '❌'} Mint Revoked • ${freezeRevoked ? '✅' : '❌'} Freeze Revoked • ${lpBurned ? '✅' : '⚠️'} LP ${lpBurnText}\n`;
  security += `${honeypotPassed ? '✅' : '❌'} Honeypot: ${honeypotPassed ? 'Passed' : 'Possible'} • ${taxClean ? '✅' : '⚠️'} Tax: ${buyTax}%/${sellTax}%\n`;
  
  // Jito Bundles line with optional link to Jito explorer
  // Show Unknown when jito bundle detection is unavailable/inconclusive
  const jitoDataUnavailable = !analysis.jitoBundleData && !analysis.advancedBundleData;
  if (jitoDataUnavailable) {
    security += `❓ Jito Bundles: Unknown • ${analysis.metadata?.metadataLocked !== false ? '✅' : '⚠️'} Metadata: Locked`;
  } else if (jitoBundleClean) {
    security += `✅ Jito Bundles: None • ${analysis.metadata?.metadataLocked !== false ? '✅' : '⚠️'} Metadata: Locked`;
  } else {
    const bundleEmoji = hasJitoBundle && analysis.jitoBundleData?.confidence === 'HIGH' ? '🔴' : '📦';
    security += `${bundleEmoji} Jito Bundles: [${bundleCount} detected](https://solscan.io/account/${analysis.tokenAddress}?cluster=mainnet#transactions) • ${analysis.metadata?.metadataLocked !== false ? '✅' : '⚠️'} Metadata: Locked`;
  }
  
  // HOLDERS - Enhanced 2025 format with clean filtering
  const holderCount = analysis.holderCount ?? 0;
  const topHolderConc = analysis.topHolderConcentration ?? 0;
  const sniperPct = analysis.agedWalletData?.totalFakeVolumePercent ?? 0;
  const devBoughtPct = analysis.pumpFunData?.devBought ?? 0;
  const bundledClusters = analysis.advancedBundleData?.suspiciousWallets?.length ?? 0;
  const systemWalletsFiltered = analysis.systemWalletsFiltered ?? 0;
  // FIX: Use correct property path - agedWalletCount is directly on agedWalletData
  const agedWalletCount = analysis.agedWalletData?.agedWalletCount ?? 0;
  
  // Use the ACTUAL holder count - holderCount already has system wallets filtered out
  const holderCountText = holderCount.toLocaleString();
  
  let holders = `👥 **Holders**\n`;
  // Section 1: Total Holders (separate line and link)
  holders += `🔗 **Total Holders**: `;
  if (holderCount === 0) {
    const isPumpFun = analysis.pumpFunData?.isPumpFun;
    const ageMinutes = analysis.ageMinutes ?? 0;
    const zeroReason = isPumpFun ? 'Bonding Curve Active (pre-migration)' : (ageMinutes < 10 ? 'Awaiting first buyers' : 'Data unavailable');
    holders += `${zeroReason}\n`;
  } else {
    holders += `[${holderCountText}](https://solscan.io/token/${analysis.tokenAddress}#holders)\n`;
  }
  
  // Section 2: Top 20 Holders (separate line and link)
  holders += `🔗 **Top 20 Holders**: https://solscan.io/token/${analysis.tokenAddress}#holders\n`;
  // Inline compact summary if data is available (render all 20)
  if (analysis.top20Holders && analysis.top20Holders.length > 0) {
    // Sort by percentage desc for consistent ordering, then take top 20
    const ordered = [...analysis.top20Holders].sort((a: any, b: any) => {
      const ap = typeof a.percentage === 'number' ? a.percentage : parseFloat(a.percentage || '0') || 0;
      const bp = typeof b.percentage === 'number' ? b.percentage : parseFloat(b.percentage || '0') || 0;
      return bp - ap;
    }).slice(0, 20);
    const compact = ordered.map((h: any, idx: number) => {
      const pct = typeof h.percentage === 'number' ? `${h.percentage.toFixed(2)}%` : (h.percentage || '—');
      const tag = h.label || (h.isExchange ? 'Exchange' : h.isLP ? 'LP' : h.isBondingCurve ? 'Bonding Curve' : undefined);
      const shortAddr = h.owner ? `${h.owner.slice(0,4)}…${h.owner.slice(-4)}` : 'unknown';
      return `${idx+1}. ${shortAddr} (${pct}${tag ? `, ${tag}` : ''})`;
    }).join('\n');
    holders += compact + "\n";

    // Aggregate tag summaries across top 20
    const sumPct = (pred: (h: any) => boolean) => ordered.filter(pred).reduce((s: number, h: any) => s + (typeof h.percentage === 'number' ? h.percentage : parseFloat(h.percentage || '0') || 0), 0);
    const exchPct = sumPct(h => h.isExchange);
    const lpPct = sumPct(h => h.isLP);
    const bcPct = sumPct(h => h.isBondingCurve);
    holders += `↪️ Exchange: ${exchPct.toFixed(2)}% • LP: ${lpPct.toFixed(2)}% • Bonding Curve: ${bcPct.toFixed(2)}%\n`;
  } else {
    // Keep it concise when data isn't available
    holders += `↪️ Top 20: Unknown\n`;
  }
  
  // Summary metrics
  holders += `• Top 10: ${topHolderConc.toFixed(1)}% • Snipers: ${sniperPct.toFixed(0)}%\n`;
  holders += `${devBoughtPct > 0 ? '⚠️' : '✅'} Dev: ${devBoughtPct.toFixed(0)}% • ${bundledClusters > 0 ? '📦' : '✅'} Bundles: ${bundledClusters} • 👴 Aged: ${agedWalletCount}`;
  
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
    
    const confidence = tgn.confidence ? (tgn.confidence * 100).toFixed(0) : 'N/A';
    tgnAnalysis = `🧠 **Temporal GNN** ([What's this?](https://github.com/drixindustries/Rug-Killer-On-Solana/blob/main/docs/TEMPORAL_GNN.md))\n${tgnEmoji} Rug Risk: ${rugPercent}%\n• Graph: ${tgn.graphMetrics.nodeCount} wallets, ${tgn.graphMetrics.edgeCount} txns analyzed\n• Model Confidence: ${confidence}%`;
    
    if (analysis.isPreMigration) {
      tgnAnalysis += `\n⏳ Pre-Migration (Bonding Curve)`;
    }
    
    if (tgn.patterns.length > 0) {
      const topPattern = tgn.patterns[0];
      const patternEmoji = topPattern.type === 'migration_event' ? '🔄' : 
                           topPattern.confidence > 0.8 ? '🔴' : '🟡';
      tgnAnalysis += `\n${patternEmoji} ${topPattern.type?.replace(/_/g, ' ') || 'Unknown Pattern'}`;
    }
  }
  
  // ML DECISION TREE ANALYSIS
  let mlAnalysis: string | undefined;
  if ((analysis as any).mlScore) {
    const ml = (analysis as any).mlScore;
    const mlPercent = (ml.probability * 100).toFixed(1);
    let mlEmoji = '✅';
    
    if (ml.probability > 0.70) {
      mlEmoji = '🚨';
    } else if (ml.probability > 0.40) {
      mlEmoji = '⚠️';
    }
    
    const mlConfidence = (ml.confidence * 100).toFixed(0);
    mlAnalysis = `🤖 **ML Decision Tree** (TypeScript)\n${mlEmoji} Rug Risk: ${mlPercent}%\n• Confidence: ${mlConfidence}%\n• Model: ${ml.model}`;
    if (ml.externalWeightsApplied) {
      const genDate = ml.weightsGeneratedAt ? String(ml.weightsGeneratedAt).split('T')[0] : 'dynamic';
      mlAnalysis += `\n• Weights: ${ml.weightsVersion || 'dynamic'} @ ${genDate}`;
    } else {
      mlAnalysis += `\n• Weights: base v1.0`;
    }
    
    if (ml.topFactors && ml.topFactors.length > 0) {
      // topFactors entries have shape { factor, impact }
      const sorted = ml.topFactors.slice().sort((a: any, b: any) => Math.abs(b.impact) - Math.abs(a.impact));
      const topFactor = sorted[0];
      const factorLabel = (topFactor.factor || '').replace(/([A-Z])/g, ' $1').trim() || 'Unknown Signal';
      mlAnalysis += `\n• Top Risk: ${factorLabel} (${topFactor.impact > 0 ? '+' : ''}${topFactor.impact.toFixed(0)} pts)`;
      // Show mitigating factor (largest negative impact) if present
      const mitigations = sorted.filter(f => f.impact < 0);
      if (mitigations.length > 0) {
        const bestMitigation = mitigations[0];
        const mitLabel = (bestMitigation.factor || '').replace(/([A-Z])/g, ' $1').trim();
        mlAnalysis += `\n• Mitigation: ${mitLabel} (${bestMitigation.impact.toFixed(0)} pts)`;
      }
      // Optional second tier risk contributors
      const secondary = sorted.slice(1, 3).filter(f => f.impact > 0);
      if (secondary.length > 0) {
        const secText = secondary.map(f => `${(f.factor || '').split(' ').slice(0,4).join(' ')} (${f.impact.toFixed(0)}pts)`).join(', ');
        mlAnalysis += `\n• Other Factors: ${secText}`;
      }
    } else {
      mlAnalysis += `\n• Top Risk: Data Unavailable`;
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
      const rawFloor = typeof floor.floorPrice === 'number' && floor.floorPrice > 0 ? floor.floorPrice : null;
      const currentPrice = analysis.dexscreenerData?.pairs?.[0]?.priceUsd ? parseFloat(analysis.dexscreenerData.pairs[0].priceUsd) : null;
      const confidence = floor.floorConfidence ?? 0;
      const recomputedVsFloor = rawFloor && currentPrice ? ((currentPrice - rawFloor) / rawFloor) * 100 : null;
      const vsVal = recomputedVsFloor !== null && Number.isFinite(recomputedVsFloor) ? recomputedVsFloor : null;
      let floorText = `📊 **Floor & Support** (Neural Floor Model)\n`;
      if (rawFloor && vsVal !== null) {
        const vsClamp = Math.max(-100, Math.min(500, vsVal));
        const vsEmoji = vsClamp > 100 ? '🚀' : vsClamp > 30 ? '📈' : vsClamp > 0 ? '✅' : vsClamp > -15 ? '🟡' : '⚠️';
        floorText += `${vsEmoji} Current vs Floor: ${(vsClamp >= 0 ? '+' : '') + vsClamp.toFixed(1)}%\n`;
        floorText += `• Floor Price: $${rawFloor.toFixed(8)} (${confidence.toFixed(0)}% confidence)\n`;
      } else {
        floorText += `⚠️ Floor unavailable (insufficient reliable trades)\n`;
      }
      // Support levels normalization
      if (floor.supportLevels && floor.supportLevels.length > 0 && currentPrice) {
        floorText += `• Nearest Support Levels:\n`;
        floor.supportLevels.slice(0, 3).forEach((level, idx) => {
          const validPrice = level.priceUsd && level.priceUsd > 0 ? level.priceUsd : null;
          const relPct = validPrice ? ((validPrice / currentPrice) - 1) * 100 : null; // negative means below current price
          let pctStr = 'N/A';
          if (relPct !== null && Number.isFinite(relPct)) {
            const clamp = Math.max(-100, Math.min(300, relPct));
            pctStr = (clamp >= 0 ? '+' : '') + clamp.toFixed(1) + '%';
          }
          const priceStr = validPrice ? `$${validPrice.toFixed(8)}` : '$N/A';
          const density = typeof level.percentOfTotalBuys === 'number' ? level.percentOfTotalBuys.toFixed(0) + '% buys' : '';
          floorText += `  ${idx + 1}. ${priceStr} (${pctStr}) • ${density}\n`;
        });
      }
      // Insight / status
      if (rawFloor && vsVal !== null) {
        if (vsVal < -25) {
          floorText += `⚠️ Price is ${(Math.abs(vsVal)).toFixed(1)}% below floor potential breakdown\n`;
        } else if (vsVal > 60 && confidence > 80) {
          floorText += `🔥 Strong floor momentum\n`;
        }
      } else if (floor.insight) {
        floorText += `💡 ${floor.insight}\n`;
      }
      floorInfo = floorText.trimEnd();
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
  
  // FUNDING ANALYSIS - Enhanced Nova-style breakdown
  let funding: string | undefined;
  if (analysis.fundingAnalysis) {
    const fa = analysis.fundingAnalysis;
    
    // Separate CEX funding from swap services
    const cexSources = ['Binance', 'Coinbase', 'OKX', 'Bybit'];
    const swapSources = ['Swopshop', 'FixedFloat', 'ChangeNOW', 'SimpleSwap', 'Godex', 'StealthEX'];
    
    const cexBreakdown = Object.entries(fa.fundingSourceBreakdown)
      .filter(([source]) => cexSources.includes(source))
      .map(([source, pct]) => `${source} ${pct.toFixed(1)}%`)
      .join(', ');
    
    const swapBreakdown = Object.entries(fa.fundingSourceBreakdown)
      .filter(([source]) => swapSources.includes(source))
      .map(([source, pct]) => `${source} ${pct.toFixed(1)}%`)
      .join(', ');
    
    // Count fresh wallets
    const freshWallets = fa.walletFunding.filter(w => w.isRecentlyCreated);
    const coordPattern = fa.fundingPatterns.find(p => p.type === 'coordinated_funding');
    
    if (fa.suspiciousFunding || freshWallets.length >= 3 || cexBreakdown || swapBreakdown) {
      funding = `💸 **FUNDING SOURCES** ${fa.suspiciousFunding ? '🚨' : ''}\n`;
      
      if (cexBreakdown) {
        funding += `• CEX: ${cexBreakdown}\n`;
      }
      
      if (swapBreakdown) {
        funding += `• ⚠️ Swap Services: ${swapBreakdown}\n`;
      }
      
      if (freshWallets.length >= 3) {
        const freshPct = freshWallets.reduce((sum, w) => {
          const holder = analysis.topHolders.find(h => h.address === w.wallet);
          return sum + (holder?.percentage || 0);
        }, 0);
        funding += `• 🆕 Fresh Wallets (<7d): ${freshWallets.length} holders (${freshPct.toFixed(1)}%)\n`;
      }
      
      if (coordPattern) {
        funding += `• 🔗 Coordination: ${coordPattern.evidence.walletCount} wallets from ${coordPattern.evidence.fundingSource}\n`;
      }
      
      if (fa.suspiciousFunding) {
        funding += `⚠️ **${fa.totalSuspiciousPercentage.toFixed(1)}% from high-risk sources**`;
      }
    }
  }
  
  // JITO BUNDLE DETECTION (MEV Bundle Analysis) - Always show bundle status
  let bundle: string | undefined;
  if (analysis.jitoBundleData?.isBundle && analysis.jitoBundleData.confidence !== 'LOW') {
    const jb = analysis.jitoBundleData;
    
    // Status emoji
    const statusEmoji = {
      'FINALIZED': '✅',
      'PROCESSED': '⚡',
      'ACCEPTED': '🔄',
      'REJECTED': '❌',
      'DROPPED': '⚠️',
      'UNKNOWN': '❓'
    }[jb.status || 'UNKNOWN'];
    
    // Confidence emoji
    const confidenceEmoji = {
      'HIGH': '🔴',
      'MEDIUM': '🟡',
      'LOW': '🟢'
    }[jb.confidence];
    
    bundle = `${confidenceEmoji} **JITO BUNDLE DETECTED** ${statusEmoji}\n`;
    
    if (jb.status) {
      bundle += `• Status: ${jb.status}\n`;
    }
    
    if (jb.tipAmountSol && jb.tipAmountSol > 0) {
      bundle += `• Tip Paid: ${jb.tipAmountSol.toFixed(6)} SOL\n`;
    }
    
    if (jb.bundleActivity) {
      bundle += `• Bundles Found: ${jb.bundleActivity.bundleCount}\n`;
      if (jb.bundleActivity.totalTipAmount > 0) {
        bundle += `• Total Tips: ${(jb.bundleActivity.totalTipAmount / 1e9).toFixed(6)} SOL\n`;
      }
    }
    
    // Signal breakdown
    const signals = [];
    if (jb.signals.hasJitoTip) signals.push('Jito Tip ✅');
    if (jb.signals.highPriorityFee) signals.push('High Fee 📈');
    if (jb.signals.consecutiveTxsInSlot) signals.push('Clustered 🎯');
    
    if (signals.length > 0) {
      bundle += `• Signals: ${signals.join(', ')}\n`;
    }
    
    // Add link to view transactions on Solscan
    bundle += `\n📊 [View Transactions on Solscan](https://solscan.io/account/${analysis.tokenAddress}?cluster=mainnet#transactions)`;
    bundle += `\n_MEV bundle may indicate coordinated launch_`;
  } else if (analysis.advancedBundleData) {
    // Fallback to timing-based bundle detection
    const bd = analysis.advancedBundleData;
    const bundleEmoji = bd.bundleScore >= 60 ? '🔴' : bd.bundleScore >= 40 ? '🟠' : bd.bundleScore >= 20 ? '🟡' : '✅';
    const bundleStatus = bd.bundleScore >= 60 ? 'CRITICAL' : bd.bundleScore >= 40 ? 'HIGH RISK' : bd.bundleScore >= 20 ? 'CAUTION' : 'SAFE';
    const websiteUrl = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'https://rugkiller.app';
    bundle = `${bundleEmoji} **BUNDLE ANALYSIS** (${bundleStatus})\n• Bundled Supply: ${bd.bundledSupplyPercent.toFixed(1)}%\n• Suspicious Wallets: ${bd.suspiciousWallets.length}`;
    if (bd.earlyBuyCluster) {
      bundle += `\n• Early Cluster: ${bd.earlyBuyCluster.walletCount} wallets in ${bd.earlyBuyCluster.avgTimingGapMs}ms`;
    }
    bundle += `\n📊 [View Bundle Chart](${websiteUrl}/?analyze=${analysis.tokenAddress})`;
  } else {
    // Always show bundle status, even if no bundles detected
    bundle = `✅ **BUNDLE ANALYSIS** (SAFE)\n• Jito Bundles: None detected\n• Status: No MEV bundle activity found\n• Bundle Score: 0/100`;
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
  
  // AGED WALLETS (CRITICAL FOR NEW TOKENS) - Always show status for transparency
  let agedWallets: string | undefined;
  if (analysis.agedWalletData) {
    const aw = analysis.agedWalletData;
    const riskScore = aw.riskScore ?? 0;
    const walletCount = aw.agedWalletCount ?? 0;
    const fakeVolume = aw.totalFakeVolumePercent ?? 0;
    
    if (riskScore >= 35 || walletCount > 0) {
      // Show warning when risk is significant
      const ageWarning = isNewToken && walletCount > 0 ? '🚨 CRITICAL - ' : '';
      const emoji = riskScore >= 60 ? '🚨⏰' : riskScore >= 35 ? '⚠️⏰' : '🟡⏰';
      agedWallets = `${emoji} **AGED WALLET DETECTION ${ageWarning}**\n`;
      agedWallets += `• Risk Score: ${riskScore}/100\n`;
      agedWallets += `• Fake Volume: ${fakeVolume.toFixed(1)}%\n`;
      agedWallets += `• Old Wallets: ${walletCount}`;
      
      // Show patterns if detected
      if (aw.patterns) {
        const patternFlags: string[] = [];
        if (aw.patterns.coordinatedBuys) patternFlags.push('Coordinated');
        if (aw.patterns.sameFundingSource) patternFlags.push('Same Source');
        if (aw.patterns.similarBuyAmounts) patternFlags.push('Similar Amounts');
        if (aw.patterns.noSells) patternFlags.push('No Sells');
        if (patternFlags.length > 0) {
          agedWallets += `\n• Patterns: ${patternFlags.join(', ')}`;
        }
      }
      
      if (isNewToken && walletCount > 0) {
        agedWallets += `\n⚠️ NEW TOKEN with aged wallets = HIGH RUG RISK`;
      }
    } else {
      // Show safe status when no aged wallet risk
      agedWallets = `✅⏰ **AGED WALLETS** (SAFE)\n• Risk Score: ${riskScore}/100\n• Old Wallets: ${walletCount}\n• Fake Volume: ${fakeVolume.toFixed(1)}%`;
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
  
  // SOCIAL SENTIMENT - FinBERT-Solana fusion (from Grok's research)
  let socialSentiment: string | undefined;
  if (analysis.socialSentiment) {
    const ss = analysis.socialSentiment;
    const hypeScore = ss.hypeScore ?? 0;
    const sentimentScore = ss.sentimentScore ?? 0;
    const label = ss.sentimentLabel ?? 'NEUTRAL';
    
    // Hype score emoji
    let hypeEmoji = '📊';
    if (hypeScore >= 70) hypeEmoji = '🔥';
    else if (hypeScore >= 50) hypeEmoji = '📈';
    else if (hypeScore <= 30) hypeEmoji = '📉';
    
    // Sentiment label emoji
    const labelEmoji = label === 'BULLISH' ? '🟢' : 
                       label === 'BEARISH' ? '🔴' : 
                       label === 'MIXED' ? '🟡' : '⚪';
    
    socialSentiment = `${hypeEmoji} **Social Sentiment** (${ss.model || 'FinBERT-Solana'})\n`;
    socialSentiment += `${labelEmoji} **${label}** • Hype Score: ${hypeScore}/100\n`;
    socialSentiment += `• Sentiment: ${(sentimentScore * 100).toFixed(0)}% • Confidence: ${((ss.confidence ?? 0) * 100).toFixed(0)}%\n`;
    
    // Volume metrics
    if (ss.mentionVolume) {
      const vol = ss.mentionVolume;
      const changeEmoji = vol.change24h >= 100 ? '🚀' : vol.change24h >= 50 ? '📈' : vol.change24h <= -30 ? '📉' : '';
      socialSentiment += `• Mentions: ${vol.total} (${vol.hourly}/hr) ${changeEmoji}${vol.change24h > 0 ? '+' : ''}${vol.change24h.toFixed(0)}% 24h\n`;
    }
    
    // Platform breakdown
    const platforms: string[] = [];
    if (ss.platforms?.twitter?.mentions) platforms.push(`X: ${ss.platforms.twitter.mentions}`);
    if (ss.platforms?.telegram?.mentions) platforms.push(`TG: ${ss.platforms.telegram.mentions}`);
    if (ss.platforms?.discord?.mentions) platforms.push(`DC: ${ss.platforms.discord.mentions}`);
    if (platforms.length > 0) {
      socialSentiment += `• Platforms: ${platforms.join(' | ')}\n`;
    }
    
    // Risk signals
    const signals: string[] = [];
    if (ss.signals?.coordinatedHype) signals.push('🚨 Coordinated Hype');
    if (ss.signals?.sentimentDrop) signals.push('📉 Sentiment Drop');
    if (ss.signals?.rugKeywords) signals.push('⚠️ Rug Keywords');
    if (ss.signals?.fakeEngagement) signals.push('🤖 Fake Engagement');
    if (ss.signals?.influencerPump) signals.push('📢 Influencer Pump');
    if (signals.length > 0) {
      socialSentiment += `• Signals: ${signals.join(', ')}\n`;
    }
    
    // Fused probability (TGN + FinBERT)
    if (ss.fusedRugProbability !== undefined) {
      const fusedEmoji = ss.fusedRugProbability > 0.7 ? '🚨' : ss.fusedRugProbability > 0.4 ? '⚠️' : '✅';
      socialSentiment += `${fusedEmoji} **Fused Rug Prob:** ${(ss.fusedRugProbability * 100).toFixed(1)}%`;
      if (ss.fusionFormula) socialSentiment += ` (${ss.fusionFormula})`;
    }
    
    // Data freshness
    const freshnessEmoji = ss.dataFreshness === 'LIVE' ? '🟢' : ss.dataFreshness === 'CACHED' ? '🟡' : '🔴';
    socialSentiment += `\n${freshnessEmoji} Data: ${ss.dataFreshness}`;
  }
  
  // SOCIAL RED FLAGS - Off-chain risk detection (Nova methodology)
  let socialRedFlags: string | undefined;
  if (analysis.socialRedFlags) {
    const sr = analysis.socialRedFlags;
    
    if (sr.hasMissingSocials || sr.hasCasinoOutflows || sr.suspiciousPatterns?.length > 0) {
      const riskEmoji = sr.missingSocialsRisk === 'high' ? '🚨' : sr.missingSocialsRisk === 'medium' ? '⚠️' : '🟡';
      socialRedFlags = `${riskEmoji} **Social Red Flags**\n`;
      
      // Social presence
      const socials = sr.socialPresence;
      const missing: string[] = [];
      if (!socials.hasWebsite) missing.push('Website');
      if (!socials.hasTwitter) missing.push('X/Twitter');
      if (!socials.hasTelegram) missing.push('Telegram');
      if (!socials.hasDiscord) missing.push('Discord');
      
      if (missing.length > 0) {
        socialRedFlags += `• Missing: ${missing.join(', ')}\n`;
      }
      
      // Casino outflows
      if (sr.hasCasinoOutflows && sr.totalCasinoOutflows > 0) {
        socialRedFlags += `• 🎰 Casino Outflows: ${sr.totalCasinoOutflows.toFixed(2)} SOL\n`;
      }
      
      // Suspicious patterns
      if (sr.suspiciousPatterns && sr.suspiciousPatterns.length > 0) {
        socialRedFlags += `• Patterns: ${sr.suspiciousPatterns.slice(0, 3).join(', ')}`;
      }
    }
  }
  
  // ALPHA SCAN GRADING - Team/Insider/Sniper detection (Nova methodology)
  let alphaScanGrading: string | undefined;
  if (analysis.devsNightmareData) {
    const dn = analysis.devsNightmareData;
    
    const verdictEmoji = {
      'SAFE': '✅',
      'WARNING': '⚠️',
      'BUNDLED_SCAM': '🚨',
      'AVOID': '❌'
    }[dn.verdict] || '❓';
    
    alphaScanGrading = `${verdictEmoji} **Alpha Scan Grading** (${dn.verdict})\n`;
    alphaScanGrading += `• Team: ${dn.teamPercent.toFixed(1)}%${dn.teamPercent > 5 ? ' ⚠️' : ''}\n`;
    alphaScanGrading += `• Insiders: ${dn.insidersPercent.toFixed(1)}%${dn.insidersPercent > 7 ? ' 🚨' : ''}\n`;
    alphaScanGrading += `• Snipers: ${dn.snipersPercent.toFixed(1)}%${dn.snipersPercent > 10 ? ' ⚠️' : ''}\n`;
    
    // CEX breakdown
    if (dn.cexBreakdown) {
      const cex = dn.cexBreakdown;
      const cexEmoji = cex.isLegit ? '✅' : cex.risk === 'high' ? '🚨' : '⚠️';
      alphaScanGrading += `${cexEmoji} CEX Funding: ${cex.total.toFixed(0)}%`;
      if (cex.mexc > 20) {
        alphaScanGrading += ` (MEXC ${cex.mexc.toFixed(0)}% 🚨)`;
      }
      alphaScanGrading += `\n`;
    }
    
    // Confidence
    alphaScanGrading += `• Confidence: ${dn.confidence}%`;
  }
  
  // MACHINE LEARNING - Composite ML risk scoring
  let machineLearning: string | undefined;
  if (analysis.syraxMLData) {
    const ml = analysis.syraxMLData;
    
    const riskEmoji = ml.riskLevel === 'EXTREME' ? '🚨' : 
                      ml.riskLevel === 'HIGH' ? '🔴' : 
                      ml.riskLevel === 'MODERATE' ? '🟠' : 
                      ml.riskLevel === 'LOW' ? '🟢' : '⚪';
    
    machineLearning = `${riskEmoji} **Machine Learning** (${ml.riskLevel})\n`;
    machineLearning += `• Composite Score: ${ml.compositeScore}/100\n`;
    
    if (ml.featureImportance && ml.featureImportance.length > 0) {
      const topFeatures = ml.featureImportance.slice(0, 3);
      const featuresText = topFeatures.map(f => `${f.feature}: ${(f.importance * 100).toFixed(0)}%`).join(', ');
      machineLearning += `• Top Factors: ${featuresText}\n`;
    }
    
    if (ml.modelVersion) {
      machineLearning += `• Model: ${ml.modelVersion}`;
    }
  }
  
  // LOCK STATUS - Display pre-computed lock data from analysis
  let lockStatus: string | undefined;
  if (analysis.lockData?.isAnyLocked) {
    const lockData = analysis.lockData;
    const lockEmoji = lockData.totalLockedPercent > 50 ? '🔒' : lockData.totalLockedPercent > 20 ? '🔐' : '🔓';
    lockStatus = `${lockEmoji} **Token Locks Detected**\n• ${lockData.totalLockedPercent.toFixed(1)}% of supply locked\n• ${lockData.lockCount} lock contract(s) found\n• Reduces sell pressure risk`;
  }

  // LARGE HOLDERS - Flag potential team wallets
  let largeHolders: string | undefined;
  if (analysis.largeHolders && analysis.largeHolders.length > 0) {
    const topLargeHolders = analysis.largeHolders.slice(0, 3); // Show top 3
    largeHolders = `🚨 **Large Holder Alert**\n`;
    largeHolders += topLargeHolders.map((holder, idx) => {
      const pct = typeof holder.percentage === 'number' ? holder.percentage.toFixed(2) : holder.percentage;
      return `${idx + 1}. ${formatAddress(holder.address)} - ${pct}%`;
    }).join('\n');
    largeHolders += `\n⚠️ >10% non-exchange holders may indicate team wallets`;
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
  
  // QUICK LINKS - Enhanced 2025 format with trading tools + social links
  const socialLinks = analysis.dexscreenerData?.socialLinks;
  const socialLinksText = socialLinks ? (() => {
    const parts: string[] = [];
    if (socialLinks.website) parts.push(`[🌐 Website](${socialLinks.website})`);
    if (socialLinks.twitter) parts.push(`[🐦 Twitter](${socialLinks.twitter})`);
    if (socialLinks.discord) parts.push(`[💬 Discord](${socialLinks.discord})`);
    if (socialLinks.telegram) parts.push(`[✈️ Telegram](${socialLinks.telegram})`);
    return parts.length > 0 ? `**Social:** ${parts.join(' • ')}\n` : '';
  })() : '';

  const links = `${socialLinksText}**Best Solana Trading Tools**
[Buy 0.5% • Jupiter](https://jup.ag/swap/SOL-${analysis.tokenAddress})  [Buy 1% • Photon](https://photon-sol.tinyastro.io/en/lp/${analysis.tokenAddress})  [Buy 2% • BullX](https://bullx.io/terminal?chainId=1399811149&address=${analysis.tokenAddress})
[Limit Orders • Trojan](https://t.me/solana_trojanbot?start=r-rugkiller)  [Snipe • BonkBot](https://t.me/bonkbot_bot?start=ref_rugkiller)  [Track • Ave.ai](https://ave.ai/token/${analysis.tokenAddress})
Quick Links → [Solscan](https://solscan.io/token/${analysis.tokenAddress}) • [DexScreener](https://dexscreener.com/solana/${analysis.tokenAddress}) • [RugCheck](https://rugcheck.xyz/tokens/${analysis.tokenAddress}) • [GMGN](https://gmgn.ai/sol/token/${analysis.tokenAddress}) • [Birdeye](https://birdeye.so/token/${analysis.tokenAddress})`;
  
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
    mlAnalysis,
    socialSentiment,
    socialRedFlags,
    alphaScanGrading,
    machineLearning,
    lockStatus,
    largeHolders,
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
  
  if (data.mlAnalysis) {
    message += `${data.mlAnalysis}\n\n`;
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
  
  if (data.socialSentiment) {
    message += `${data.socialSentiment}\n\n`;
  }
  
  if (data.socialRedFlags) {
    message += `${data.socialRedFlags}\n\n`;
  }
  
  if (data.alphaScanGrading) {
    message += `${data.alphaScanGrading}\n\n`;
  }
  
  if (data.machineLearning) {
    message += `${data.machineLearning}\n\n`;
  }

  if (data.lockStatus) {
    message += `${data.lockStatus}\n\n`;
  }

  if (data.largeHolders) {
    message += `${data.largeHolders}\n\n`;
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

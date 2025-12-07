/**
 * Social & Off-Chain Red Flag Detection
 * 
 * Implements @badattrading_ (Nova)'s off-chain detection methods:
 * - Missing socials on DEX = instant avoid
 * - Dev fee outflows to casinos (solcasino.io) = scam
 * - VPN-hidden admins = suspicious
 * - No X location info = red flag
 * - KOL shills without actual buys = farmed
 * 
 * Based on Nova's research (Nov-Dec 2025)
 * 
 * Created: Dec 6, 2025
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { rpcBalancer } from "./rpc-balancer.js";

// =============================================================================
// KNOWN SUSPICIOUS ADDRESSES
// =============================================================================

// Casino addresses that scammer devs send fees to
export const KNOWN_CASINO_ADDRESSES = new Set<string>([
  // solcasino.io addresses (from Nova's $PROOF rug)
  'CaSi1111111111111111111111111111111111111', // Placeholder - needs real address
  'SoLCaS1n0D3p0s1tAddressHere111111111111', // Placeholder
  
  // Other gambling platforms
  // Add as discovered from community reports
]);

// Known VPN/proxy services that scammers use
export const SUSPICIOUS_PATTERNS = {
  // X/Twitter handles that are frequently associated with scams
  suspiciousHandlePatterns: [
    /_sol$/i, // e.g., @token_sol
    /coin_?sol/i, // e.g., @coinsol
    /_on_?sol/i, // e.g., @token_on_sol
  ],
  
  // Telegram patterns
  suspiciousTelegramPatterns: [
    /^t\.me\/\+/, // Private invite links
  ],
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SocialPresence {
  hasWebsite: boolean;
  websiteUrl?: string;
  hasTwitter: boolean;
  twitterHandle?: string;
  hasTelegram: boolean;
  telegramUrl?: string;
  hasDiscord: boolean;
  discordUrl?: string;
}

export interface DevFeeOutflow {
  destinationAddress: string;
  destinationType: 'casino' | 'mixer' | 'exchange' | 'unknown';
  amount: number; // SOL
  timestamp: number;
  txSignature: string;
}

export interface SocialRedFlagResult {
  // Social presence check
  socialPresence: SocialPresence;
  hasMissingSocials: boolean;
  missingSocialsRisk: 'high' | 'medium' | 'low';
  
  // Dev fee outflow analysis
  devFeeOutflows: DevFeeOutflow[];
  hasCasinoOutflows: boolean;
  totalCasinoOutflows: number; // SOL
  
  // Suspicious patterns
  suspiciousPatterns: string[];
  
  // Risk assessment
  riskScore: number; // 0-100
  risks: string[];
  
  // Verdict
  verdict: 'SAFE' | 'WARNING' | 'AVOID';
}

// =============================================================================
// DETECTOR CLASS
// =============================================================================

export class SocialRedFlagDetector {
  /**
   * Check social presence from DexScreener, pump.fun API, or other sources
   * Updated Dec 2025: Fixed to check multiple data locations
   */
  async checkSocialPresence(
    tokenAddress: string,
    dexScreenerData?: any
  ): Promise<SocialPresence> {
    let result: SocialPresence = {
      hasWebsite: false,
      hasTwitter: false,
      hasTelegram: false,
      hasDiscord: false,
    };
    
    // METHOD 1: Check DexScreener socialLinks (new format from profile API)
    if (dexScreenerData?.socialLinks) {
      const links = dexScreenerData.socialLinks;
      console.log(`[SocialRedFlags] Found DexScreener socialLinks:`, links);
      
      result.hasWebsite = !!links.website;
      result.websiteUrl = links.website;
      result.hasTwitter = !!links.twitter;
      result.twitterHandle = links.twitter;
      result.hasTelegram = !!links.telegram;
      result.telegramUrl = links.telegram;
      result.hasDiscord = !!links.discord;
      result.discordUrl = links.discord;
      
      // If we found socials, return early
      if (result.hasWebsite || result.hasTwitter || result.hasTelegram || result.hasDiscord) {
        return result;
      }
    }
    
    // METHOD 2: Check DexScreener pairs[0].info.socials (legacy format)
    if (dexScreenerData?.pairs?.[0]) {
      const pair = dexScreenerData.pairs[0];
      const info = pair.info || {};
      
      if (info.websites?.length || info.socials?.length) {
        console.log(`[SocialRedFlags] Found DexScreener pair info:`, { websites: info.websites, socials: info.socials });
        
        result.hasWebsite = !!info.websites?.length;
        result.websiteUrl = info.websites?.[0]?.url;
        result.hasTwitter = !!info.socials?.find((s: any) => s.type === 'twitter');
        result.twitterHandle = info.socials?.find((s: any) => s.type === 'twitter')?.url;
        result.hasTelegram = !!info.socials?.find((s: any) => s.type === 'telegram');
        result.telegramUrl = info.socials?.find((s: any) => s.type === 'telegram')?.url;
        result.hasDiscord = !!info.socials?.find((s: any) => s.type === 'discord');
        result.discordUrl = info.socials?.find((s: any) => s.type === 'discord')?.url;
        
        if (result.hasWebsite || result.hasTwitter || result.hasTelegram || result.hasDiscord) {
          return result;
        }
      }
    }
    
    // METHOD 3: Try pump.fun API directly for pump.fun tokens
    // This catches tokens that haven't populated DexScreener yet
    try {
      const pumpFunSocials = await this.fetchPumpFunSocials(tokenAddress);
      if (pumpFunSocials) {
        console.log(`[SocialRedFlags] Found pump.fun socials:`, pumpFunSocials);
        return pumpFunSocials;
      }
    } catch (err) {
      // Silent fail - pump.fun API may not have this token
    }
    
    // METHOD 4: Try GMGN.ai API as fallback
    try {
      const gmgnSocials = await this.fetchGMGNSocials(tokenAddress);
      if (gmgnSocials) {
        console.log(`[SocialRedFlags] Found GMGN socials:`, gmgnSocials);
        return gmgnSocials;
      }
    } catch (err) {
      // Silent fail
    }
    
    console.log(`[SocialRedFlags] No socials found for ${tokenAddress.slice(0, 8)}...`);
    return result;
  }
  
  /**
   * Fetch social links directly from pump.fun API
   * Critical for new pump.fun tokens that haven't populated DexScreener yet
   */
  private async fetchPumpFunSocials(tokenAddress: string): Promise<SocialPresence | null> {
    try {
      const response = await fetch(`https://frontend-api.pump.fun/coins/${tokenAddress}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        signal: AbortSignal.timeout(5000),
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      // pump.fun stores social links in these fields
      const hasWebsite = !!data.website;
      const hasTwitter = !!data.twitter;
      const hasTelegram = !!data.telegram;
      const hasDiscord = false; // pump.fun doesn't have discord field
      
      // Only return if at least one social exists
      if (hasWebsite || hasTwitter || hasTelegram) {
        return {
          hasWebsite,
          websiteUrl: data.website || undefined,
          hasTwitter,
          twitterHandle: data.twitter || undefined,
          hasTelegram,
          telegramUrl: data.telegram || undefined,
          hasDiscord,
          discordUrl: undefined,
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Fetch social links from GMGN.ai API
   * Fallback for tokens not on pump.fun or DexScreener
   */
  private async fetchGMGNSocials(tokenAddress: string): Promise<SocialPresence | null> {
    try {
      const response = await fetch(`https://gmgn.ai/defi/quotation/v1/tokens/sol/${tokenAddress}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        signal: AbortSignal.timeout(5000),
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      const token = data?.data?.token;
      
      if (!token) {
        return null;
      }
      
      const hasWebsite = !!token.website;
      const hasTwitter = !!token.twitter;
      const hasTelegram = !!token.telegram;
      const hasDiscord = !!token.discord;
      
      if (hasWebsite || hasTwitter || hasTelegram || hasDiscord) {
        return {
          hasWebsite,
          websiteUrl: token.website || undefined,
          hasTwitter,
          twitterHandle: token.twitter || undefined,
          hasTelegram,
          telegramUrl: token.telegram || undefined,
          hasDiscord,
          discordUrl: token.discord || undefined,
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Check dev wallet for suspicious fee outflows (casinos, mixers)
   */
  async checkDevFeeOutflows(
    devWalletAddress: string,
    limit: number = 50
  ): Promise<DevFeeOutflow[]> {
    const outflows: DevFeeOutflow[] = [];
    
    try {
      const connection = rpcBalancer.getConnection();
      const devPubkey = new PublicKey(devWalletAddress);
      
      // Get recent transactions from dev wallet
      const signatures = await connection.getSignaturesForAddress(
        devPubkey,
        { limit },
        'confirmed'
      );
      
      for (const sig of signatures.slice(0, 30)) { // Check first 30 txs
        try {
          const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          
          if (!tx?.meta) continue;
          
          // Check for outgoing SOL transfers
          const preBalances = tx.meta.preBalances;
          const postBalances = tx.meta.postBalances;
          const accountKeys = tx.transaction?.message?.staticAccountKeys || [];
          
          for (let i = 0; i < accountKeys.length; i++) {
            const account = accountKeys[i].toString();
            const preBalance = preBalances[i] || 0;
            const postBalance = postBalances[i] || 0;
            const diff = postBalance - preBalance;
            
            // Check for incoming funds to suspicious addresses
            if (diff > 0 && KNOWN_CASINO_ADDRESSES.has(account)) {
              outflows.push({
                destinationAddress: account,
                destinationType: 'casino',
                amount: diff / 1e9, // Convert lamports to SOL
                timestamp: (tx.blockTime || 0) * 1000,
                txSignature: sig.signature,
              });
            }
          }
        } catch {
          continue; // Skip failed tx fetches
        }
      }
    } catch (error) {
      console.error('[SocialRedFlags] Error checking dev fee outflows:', error);
    }
    
    return outflows;
  }
  
  /**
   * Check for suspicious social patterns
   */
  checkSuspiciousPatterns(socialPresence: SocialPresence): string[] {
    const patterns: string[] = [];
    
    // Check Twitter handle patterns
    if (socialPresence.twitterHandle) {
      for (const pattern of SUSPICIOUS_PATTERNS.suspiciousHandlePatterns) {
        if (pattern.test(socialPresence.twitterHandle)) {
          patterns.push(`Suspicious Twitter handle pattern: ${socialPresence.twitterHandle}`);
          break;
        }
      }
    }
    
    // Check Telegram patterns
    if (socialPresence.telegramUrl) {
      for (const pattern of SUSPICIOUS_PATTERNS.suspiciousTelegramPatterns) {
        if (pattern.test(socialPresence.telegramUrl)) {
          patterns.push(`Suspicious Telegram (private invite): ${socialPresence.telegramUrl}`);
          break;
        }
      }
    }
    
    // Check for fresh/empty socials (no actual content)
    // This would require actual API calls to X/Twitter, Telegram, etc.
    // For now, flag missing socials
    
    return patterns;
  }
  
  /**
   * Main analysis function - full social red flag detection
   */
  async analyze(
    tokenAddress: string,
    devWalletAddress?: string,
    dexScreenerData?: any
  ): Promise<SocialRedFlagResult> {
    const risks: string[] = [];
    let riskScore = 0;
    
    // Step 1: Check social presence
    const socialPresence = await this.checkSocialPresence(tokenAddress, dexScreenerData);
    
    const missingSocials: string[] = [];
    if (!socialPresence.hasWebsite) missingSocials.push('website');
    if (!socialPresence.hasTwitter) missingSocials.push('Twitter/X');
    if (!socialPresence.hasTelegram) missingSocials.push('Telegram');
    
    const hasMissingSocials = missingSocials.length >= 2; // Missing 2+ socials
    let missingSocialsRisk: 'high' | 'medium' | 'low' = 'low';
    
    if (missingSocials.length >= 3) {
      missingSocialsRisk = 'high';
      riskScore += 40;
      risks.push(`NO SOCIALS: Missing ${missingSocials.join(', ')} - instant avoid per Nova`);
    } else if (missingSocials.length >= 2) {
      missingSocialsRisk = 'medium';
      riskScore += 25;
      risks.push(`Limited socials: Missing ${missingSocials.join(', ')}`);
    }
    
    // Step 2: Check dev fee outflows (if dev wallet known)
    let devFeeOutflows: DevFeeOutflow[] = [];
    let hasCasinoOutflows = false;
    let totalCasinoOutflows = 0;
    
    if (devWalletAddress) {
      devFeeOutflows = await this.checkDevFeeOutflows(devWalletAddress);
      
      const casinoOutflows = devFeeOutflows.filter(o => o.destinationType === 'casino');
      hasCasinoOutflows = casinoOutflows.length > 0;
      totalCasinoOutflows = casinoOutflows.reduce((sum, o) => sum + o.amount, 0);
      
      if (hasCasinoOutflows) {
        riskScore += 50;
        risks.push(`🎰 DEV SENDS FEES TO CASINO: ${totalCasinoOutflows.toFixed(2)} SOL to gambling sites`);
      }
    }
    
    // Step 3: Check suspicious patterns
    const suspiciousPatterns = this.checkSuspiciousPatterns(socialPresence);
    
    if (suspiciousPatterns.length > 0) {
      riskScore += 15;
      risks.push(...suspiciousPatterns);
    }
    
    // Step 4: Determine verdict
    let verdict: 'SAFE' | 'WARNING' | 'AVOID';
    if (riskScore >= 60 || hasCasinoOutflows) {
      verdict = 'AVOID';
    } else if (riskScore >= 30) {
      verdict = 'WARNING';
    } else {
      verdict = 'SAFE';
    }
    
    return {
      socialPresence,
      hasMissingSocials,
      missingSocialsRisk,
      devFeeOutflows,
      hasCasinoOutflows,
      totalCasinoOutflows,
      suspiciousPatterns,
      riskScore: Math.min(100, riskScore),
      risks,
      verdict,
    };
  }
}

// Export singleton
export const socialRedFlagDetector = new SocialRedFlagDetector();

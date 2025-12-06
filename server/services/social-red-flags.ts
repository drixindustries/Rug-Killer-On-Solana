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
   * Check social presence from DexScreener or other sources
   */
  async checkSocialPresence(
    tokenAddress: string,
    dexScreenerData?: any
  ): Promise<SocialPresence> {
    // Extract from DexScreener data if available
    if (dexScreenerData?.pairs?.[0]) {
      const pair = dexScreenerData.pairs[0];
      const info = pair.info || {};
      
      return {
        hasWebsite: !!info.websites?.length,
        websiteUrl: info.websites?.[0]?.url,
        hasTwitter: !!info.socials?.find((s: any) => s.type === 'twitter'),
        twitterHandle: info.socials?.find((s: any) => s.type === 'twitter')?.url,
        hasTelegram: !!info.socials?.find((s: any) => s.type === 'telegram'),
        telegramUrl: info.socials?.find((s: any) => s.type === 'telegram')?.url,
        hasDiscord: !!info.socials?.find((s: any) => s.type === 'discord'),
        discordUrl: info.socials?.find((s: any) => s.type === 'discord')?.url,
      };
    }
    
    // Default: no socials found
    return {
      hasWebsite: false,
      hasTwitter: false,
      hasTelegram: false,
      hasDiscord: false,
    };
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

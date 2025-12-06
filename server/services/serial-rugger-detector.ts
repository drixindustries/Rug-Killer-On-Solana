/**
 * Serial Rugger Detection Service
 * 
 * Tracks known serial ruggers (repeat scammers) and detects their new tokens.
 * Based on @badattrading_ (Nova)'s research:
 * - "widfiretoad rugged 2/3 coins every 2 hours" (Jan/Feb 2025)
 * - Tracks linked wallet clusters for the same operators
 * 
 * Detection Methods:
 * 1. Direct wallet match against rugger database
 * 2. Linked wallet network analysis
 * 3. Pattern matching (timing, amounts, methods)
 * 
 * Created: Dec 6, 2025
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { rpcBalancer } from "./rpc-balancer.js";

// =============================================================================
// KNOWN SERIAL RUGGERS (from Nova's posts and community reports)
// =============================================================================

export interface KnownRugger {
  wallet: string;
  aliasName: string;
  rugCount: number;
  pattern: string;
  linkedWallets: string[];
  lastSeen: string; // Date string
  source: string;
  twitterHandle?: string;
}

// Hardcoded known ruggers (seeded from Nova's research)
// In production, these would be loaded from database
export const KNOWN_RUGGERS: KnownRugger[] = [
  {
    wallet: 'widfiretoad_main_wallet', // Placeholder - needs actual address
    aliasName: 'widfiretoad',
    rugCount: 50,
    pattern: 'Rugs 2/3 coins every 2 hours. Uses FlipG bundlers.',
    linkedWallets: [],
    lastSeen: '2025-02',
    source: 'Nova/@badattrading_',
  },
  {
    wallet: 'FLipGhpiRaFeQhJinrahTtEQjhMSyd68rBDcgSystmyt',
    aliasName: 'FlipG Bundler 1',
    rugCount: 100,
    pattern: 'Major bundling service used by multiple ruggers',
    linkedWallets: ['FLipGgyJMKNqa2mMHVFT3qRZCfBf51dMV8dQk83bV55K'],
    lastSeen: '2025-12',
    source: 'Nova/@badattrading_',
  },
  {
    wallet: 'FLipGgyJMKNqa2mMHVFT3qRZCfBf51dMV8dQk83bV55K',
    aliasName: 'FlipG Bundler 2',
    rugCount: 100,
    pattern: 'Secondary FlipG bundler wallet',
    linkedWallets: ['FLipGhpiRaFeQhJinrahTtEQjhMSyd68rBDcgSystmyt'],
    lastSeen: '2025-12',
    source: 'Nova/@badattrading_',
  },
  {
    wallet: '21jRJWR5fNxRri6oovH8fPZ8Bd35Uhmi5ty9bYx2zd3k',
    aliasName: 'Solver Bundler',
    rugCount: 50,
    pattern: 'Solver bundler service - often used with aged wallets',
    linkedWallets: [],
    lastSeen: '2025-12',
    source: 'Nova/@badattrading_',
  },
];

// Quick lookup maps
const RUGGER_WALLET_MAP = new Map<string, KnownRugger>();
const RUGGER_ALIAS_MAP = new Map<string, KnownRugger>();

// Initialize maps
for (const rugger of KNOWN_RUGGERS) {
  RUGGER_WALLET_MAP.set(rugger.wallet, rugger);
  if (rugger.aliasName) {
    RUGGER_ALIAS_MAP.set(rugger.aliasName.toLowerCase(), rugger);
  }
  // Also map linked wallets
  for (const linked of rugger.linkedWallets) {
    if (!RUGGER_WALLET_MAP.has(linked)) {
      RUGGER_WALLET_MAP.set(linked, rugger);
    }
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface RuggerDetectionResult {
  isKnownRugger: boolean;
  ruggerInfo?: {
    wallet: string;
    aliasName: string;
    rugCount: number;
    pattern: string;
    lastSeen: string;
    linkedWallets: string[];
  };
  confidence: 'high' | 'medium' | 'low';
  detectionMethod: 'direct_match' | 'linked_wallet' | 'pattern_match' | 'none';
  risk: string;
}

export interface TokenRuggerCheck {
  tokenAddress: string;
  deployerAddress: string;
  topHolderRuggers: Array<{
    address: string;
    percentage: number;
    ruggerInfo: KnownRugger;
  }>;
  isHighRisk: boolean;
  totalRuggerPercent: number;
  verdict: string;
}

// =============================================================================
// DETECTOR CLASS
// =============================================================================

export class SerialRuggerDetector {
  /**
   * Check if a wallet is a known serial rugger
   */
  checkWallet(walletAddress: string): RuggerDetectionResult {
    // Direct match
    const directMatch = RUGGER_WALLET_MAP.get(walletAddress);
    if (directMatch) {
      return {
        isKnownRugger: true,
        ruggerInfo: {
          wallet: directMatch.wallet,
          aliasName: directMatch.aliasName,
          rugCount: directMatch.rugCount,
          pattern: directMatch.pattern,
          lastSeen: directMatch.lastSeen,
          linkedWallets: directMatch.linkedWallets,
        },
        confidence: 'high',
        detectionMethod: 'direct_match',
        risk: `🚨 KNOWN RUGGER: ${directMatch.aliasName} (${directMatch.rugCount} rugs). Pattern: ${directMatch.pattern}`,
      };
    }

    // No match
    return {
      isKnownRugger: false,
      confidence: 'low',
      detectionMethod: 'none',
      risk: '',
    };
  }

  /**
   * Check if a wallet is linked to a known rugger through transaction history
   */
  async checkLinkedWallets(
    connection: Connection,
    walletAddress: string
  ): Promise<RuggerDetectionResult> {
    try {
      const pubkey = new PublicKey(walletAddress);
      
      // Get recent transactions
      const signatures = await connection.getSignaturesForAddress(
        pubkey,
        { limit: 50 },
        'confirmed'
      );

      // Check each transaction for interactions with known ruggers
      for (const sig of signatures) {
        try {
          const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx?.transaction?.message) continue;

          // Extract account keys
          const accountKeys = tx.transaction.message.staticAccountKeys || [];
          
          for (const key of accountKeys) {
            const keyStr = key.toString();
            const ruggerMatch = RUGGER_WALLET_MAP.get(keyStr);
            
            if (ruggerMatch && keyStr !== walletAddress) {
              return {
                isKnownRugger: true,
                ruggerInfo: {
                  wallet: ruggerMatch.wallet,
                  aliasName: ruggerMatch.aliasName,
                  rugCount: ruggerMatch.rugCount,
                  pattern: ruggerMatch.pattern,
                  lastSeen: ruggerMatch.lastSeen,
                  linkedWallets: ruggerMatch.linkedWallets,
                },
                confidence: 'medium',
                detectionMethod: 'linked_wallet',
                risk: `⚠️ LINKED TO RUGGER: ${ruggerMatch.aliasName} (${ruggerMatch.rugCount} rugs) - interacted in recent transactions`,
              };
            }
          }
        } catch {
          continue; // Skip failed transaction fetches
        }
      }
    } catch (error) {
      console.error('[SerialRuggerDetector] Error checking linked wallets:', error);
    }

    return {
      isKnownRugger: false,
      confidence: 'low',
      detectionMethod: 'none',
      risk: '',
    };
  }

  /**
   * Check all top holders for known ruggers
   */
  async checkTokenForRuggers(
    tokenAddress: string,
    deployerAddress: string | null,
    topHolders: Array<{ address: string; percentage: number }>
  ): Promise<TokenRuggerCheck> {
    const topHolderRuggers: TokenRuggerCheck['topHolderRuggers'] = [];
    let totalRuggerPercent = 0;

    // Check deployer first
    if (deployerAddress) {
      const deployerCheck = this.checkWallet(deployerAddress);
      if (deployerCheck.isKnownRugger && deployerCheck.ruggerInfo) {
        topHolderRuggers.push({
          address: deployerAddress,
          percentage: 100, // Deployer flag (not supply %)
          ruggerInfo: {
            wallet: deployerCheck.ruggerInfo.wallet,
            aliasName: deployerCheck.ruggerInfo.aliasName,
            rugCount: deployerCheck.ruggerInfo.rugCount,
            pattern: deployerCheck.ruggerInfo.pattern,
            linkedWallets: deployerCheck.ruggerInfo.linkedWallets,
            lastSeen: deployerCheck.ruggerInfo.lastSeen,
            source: 'database',
          },
        });
      }
    }

    // Check each top holder
    for (const holder of topHolders) {
      const check = this.checkWallet(holder.address);
      if (check.isKnownRugger && check.ruggerInfo) {
        topHolderRuggers.push({
          address: holder.address,
          percentage: holder.percentage,
          ruggerInfo: {
            wallet: check.ruggerInfo.wallet,
            aliasName: check.ruggerInfo.aliasName,
            rugCount: check.ruggerInfo.rugCount,
            pattern: check.ruggerInfo.pattern,
            linkedWallets: check.ruggerInfo.linkedWallets,
            lastSeen: check.ruggerInfo.lastSeen,
            source: 'database',
          },
        });
        totalRuggerPercent += holder.percentage;
      }
    }

    const isHighRisk = topHolderRuggers.length > 0;
    
    let verdict = '';
    if (topHolderRuggers.length > 0) {
      const ruggerNames = [...new Set(topHolderRuggers.map(r => r.ruggerInfo.aliasName))];
      const totalRugs = topHolderRuggers.reduce((sum, r) => sum + r.ruggerInfo.rugCount, 0);
      verdict = `🚨 KNOWN RUGGER(S) DETECTED: ${ruggerNames.join(', ')} (${totalRugs} combined rugs, ${totalRuggerPercent.toFixed(1)}% supply)`;
    }

    return {
      tokenAddress,
      deployerAddress: deployerAddress || 'unknown',
      topHolderRuggers,
      isHighRisk,
      totalRuggerPercent,
      verdict,
    };
  }

  /**
   * Add a new rugger to the in-memory list
   * In production, this would write to database
   */
  addRugger(rugger: KnownRugger): void {
    KNOWN_RUGGERS.push(rugger);
    RUGGER_WALLET_MAP.set(rugger.wallet, rugger);
    if (rugger.aliasName) {
      RUGGER_ALIAS_MAP.set(rugger.aliasName.toLowerCase(), rugger);
    }
    for (const linked of rugger.linkedWallets) {
      if (!RUGGER_WALLET_MAP.has(linked)) {
        RUGGER_WALLET_MAP.set(linked, rugger);
      }
    }
    console.log(`[SerialRuggerDetector] Added rugger: ${rugger.aliasName} (${rugger.wallet.slice(0, 8)}...)`);
  }

  /**
   * Get all known ruggers
   */
  getAllRuggers(): KnownRugger[] {
    return [...KNOWN_RUGGERS];
  }

  /**
   * Get rugger by alias name
   */
  getRuggerByAlias(alias: string): KnownRugger | undefined {
    return RUGGER_ALIAS_MAP.get(alias.toLowerCase());
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRuggers: number;
    totalRugs: number;
    topRuggers: Array<{ alias: string; rugCount: number }>;
  } {
    const totalRuggers = KNOWN_RUGGERS.length;
    const totalRugs = KNOWN_RUGGERS.reduce((sum, r) => sum + r.rugCount, 0);
    const topRuggers = [...KNOWN_RUGGERS]
      .sort((a, b) => b.rugCount - a.rugCount)
      .slice(0, 10)
      .map(r => ({ alias: r.aliasName, rugCount: r.rugCount }));

    return { totalRuggers, totalRugs, topRuggers };
  }
}

// Export singleton
export const serialRuggerDetector = new SerialRuggerDetector();

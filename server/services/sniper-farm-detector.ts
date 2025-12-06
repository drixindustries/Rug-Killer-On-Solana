/**
 * Sniper Farm Detection Service
 * 
 * Detects coordinated sniper activity:
 * - Jito bundle clustering (50+ snipes in one slot)
 * - First-in wallet analysis (dev/insider wallets)
 * - Bot wallet patterns (fresh wallets, similar timing)
 * - Coordinated buy patterns
 * 
 * Based on 2025 Grok tutorial + Nova's detection methods
 * 
 * Red flags:
 * - >3 wallets with same funding source buying in same block
 * - "First In" wallet also being the deployer
 * - Fresh wallets (<24h old) sniping at launch
 * - Jito tips from cluster wallets
 * 
 * Created: Dec 6, 2025
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { rpcBalancer } from "./rpc-balancer.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SniperWallet {
  address: string;
  buyTimestamp: number;
  buySlot: number;
  buyAmount: number; // in tokens
  buySol: number;
  walletAge: number; // days
  fundingSource: string | null;
  usedJito: boolean;
  jitoTipAmount: number;
  isFirstIn: boolean;
  isFreshWallet: boolean; // <24h old
  txSignature: string;
}

export interface SniperCluster {
  wallets: SniperWallet[];
  commonFundingSource: string | null;
  avgWalletAge: number;
  totalSupplyPercent: number;
  sameslotCount: number; // How many bought in same slot
  jitoUsagePercent: number;
  riskScore: number;
  pattern: 'jito_bundle' | 'fresh_farm' | 'insider_cluster' | 'coordinated_buy' | 'unknown';
}

export interface SniperFarmResult {
  detected: boolean;
  sniperCount: number;
  clusters: SniperCluster[];
  firstInWallet: SniperWallet | null;
  totalSniperSupplyPercent: number;
  avgSniperWalletAge: number;
  jitoSniperPercent: number;
  freshWalletPercent: number;
  risks: string[];
  riskScore: number; // 0-100
}

// ═══════════════════════════════════════════════════════════════════════════════
// JITO TIP ACCOUNTS (for bundle detection)
// ═══════════════════════════════════════════════════════════════════════════════

const JITO_TIP_ACCOUNTS = [
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLtWu15NPyHLguQDSJMttGXoG1U',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];

// ═══════════════════════════════════════════════════════════════════════════════
// SNIPER FARM DETECTOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class SniperFarmDetector {
  private connection: Connection;
  
  // Thresholds
  private readonly FRESH_WALLET_HOURS = 24;
  private readonly SNIPER_WINDOW_SLOTS = 10; // Slots after launch considered "sniping"
  private readonly MIN_CLUSTER_SIZE = 3;
  private readonly HIGH_JITO_TIP_LAMPORTS = 100000; // 0.0001 SOL
  
  constructor() {
    const rpcUrl = rpcBalancer?.select()?.getUrl() || process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Get wallet age in days
   */
  async getWalletAge(address: string): Promise<number> {
    try {
      const pubkey = new PublicKey(address);
      const signatures = await this.connection.getSignaturesForAddress(pubkey, { limit: 1 });
      
      if (signatures.length === 0) return 0;
      
      // Get oldest signature
      const allSigs = await this.connection.getSignaturesForAddress(pubkey, { limit: 1000 });
      const oldest = allSigs[allSigs.length - 1];
      
      if (oldest?.blockTime) {
        const ageMs = Date.now() - (oldest.blockTime * 1000);
        return ageMs / (1000 * 60 * 60 * 24); // Convert to days
      }
      
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Check if transaction used Jito bundle
   */
  async checkJitoUsage(txSignature: string): Promise<{ used: boolean; tipAmount: number }> {
    try {
      const tx = await this.connection.getParsedTransaction(txSignature, {
        maxSupportedTransactionVersion: 0
      });
      
      if (!tx?.meta || !tx.transaction) {
        return { used: false, tipAmount: 0 };
      }
      
      const accountKeys = tx.transaction.message.accountKeys;
      const preBalances = tx.meta.preBalances;
      const postBalances = tx.meta.postBalances;
      
      // Check for transfers to Jito tip accounts
      for (let i = 0; i < accountKeys.length; i++) {
        const key = typeof accountKeys[i] === 'string' ? accountKeys[i] : accountKeys[i].pubkey?.toString();
        
        if (JITO_TIP_ACCOUNTS.includes(key || '')) {
          const diff = (postBalances[i] || 0) - (preBalances[i] || 0);
          if (diff > 0) {
            return { used: true, tipAmount: diff };
          }
        }
      }
      
      return { used: false, tipAmount: 0 };
    } catch {
      return { used: false, tipAmount: 0 };
    }
  }

  /**
   * Analyze early buyers of a token
   */
  async analyzeEarlyBuyers(
    tokenMint: string,
    deploySlot: number,
    holders: Array<{ address: string; balance: number; percentage: number }>
  ): Promise<SniperFarmResult> {
    console.log(`[SniperFarm] Analyzing early buyers for ${tokenMint.slice(0, 8)}...`);
    
    const snipers: SniperWallet[] = [];
    const risks: string[] = [];
    
    // Get early transactions for the token
    const mintPubkey = new PublicKey(tokenMint);
    const signatures = await this.connection.getSignaturesForAddress(mintPubkey, { limit: 100 });
    
    // Sort by slot (earliest first)
    const sortedSigs = signatures.sort((a, b) => (a.slot || 0) - (b.slot || 0));
    
    // Find deploy slot if not provided
    const actualDeploySlot = deploySlot || (sortedSigs[0]?.slot || 0);
    
    // Analyze first N transactions (potential snipers)
    let firstInWallet: SniperWallet | null = null;
    
    for (let i = 0; i < Math.min(50, sortedSigs.length); i++) {
      const sig = sortedSigs[i];
      if (!sig.slot) continue;
      
      // Only consider transactions within sniper window
      if (sig.slot > actualDeploySlot + this.SNIPER_WINDOW_SLOTS) break;
      
      try {
        const tx = await this.connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0
        });
        
        if (!tx?.meta || !tx.transaction) continue;
        
        // Find the buyer (wallet that received tokens)
        const accountKeys = tx.transaction.message.accountKeys;
        
        for (const key of accountKeys) {
          const address = typeof key === 'string' ? key : key.pubkey?.toString();
          if (!address) continue;
          
          // Check if this wallet is in holders list
          const holder = holders.find(h => h.address === address);
          if (!holder) continue;
          
          // Get wallet age
          const walletAge = await this.getWalletAge(address);
          const isFresh = walletAge < (this.FRESH_WALLET_HOURS / 24);
          
          // Check Jito usage
          const jito = await this.checkJitoUsage(sig.signature);
          
          const sniper: SniperWallet = {
            address,
            buyTimestamp: (sig.blockTime || 0) * 1000,
            buySlot: sig.slot,
            buyAmount: holder.balance,
            buySol: 0, // Would need to parse tx for exact SOL
            walletAge,
            fundingSource: null, // Would need funding analysis
            usedJito: jito.used,
            jitoTipAmount: jito.tipAmount,
            isFirstIn: i === 0,
            isFreshWallet: isFresh,
            txSignature: sig.signature
          };
          
          if (i === 0) {
            firstInWallet = sniper;
          }
          
          snipers.push(sniper);
          break;
        }
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 100));
      } catch {
        continue;
      }
    }
    
    // Cluster analysis
    const clusters = this.clusterSnipers(snipers);
    
    // Calculate metrics
    const totalSniperSupply = snipers.reduce((sum, s) => {
      const holder = holders.find(h => h.address === s.address);
      return sum + (holder?.percentage || 0);
    }, 0);
    
    const avgAge = snipers.length > 0
      ? snipers.reduce((sum, s) => sum + s.walletAge, 0) / snipers.length
      : 0;
    
    const jitoCount = snipers.filter(s => s.usedJito).length;
    const jitoPercent = snipers.length > 0 ? (jitoCount / snipers.length) * 100 : 0;
    
    const freshCount = snipers.filter(s => s.isFreshWallet).length;
    const freshPercent = snipers.length > 0 ? (freshCount / snipers.length) * 100 : 0;
    
    // Generate risks
    if (freshPercent > 50) {
      risks.push(`🚨 ${freshPercent.toFixed(0)}% of snipers are fresh wallets (<24h old)`);
    }
    if (jitoPercent > 30) {
      risks.push(`⚠️ ${jitoPercent.toFixed(0)}% of snipers used Jito bundles`);
    }
    if (totalSniperSupply > 30) {
      risks.push(`🚨 Snipers control ${totalSniperSupply.toFixed(1)}% of supply`);
    }
    if (clusters.some(c => c.pattern === 'jito_bundle')) {
      risks.push(`🚨 Jito bundle cluster detected - coordinated sniping`);
    }
    if (firstInWallet?.isFreshWallet) {
      risks.push(`⚠️ First buyer is a fresh wallet - likely insider`);
    }
    
    // Calculate overall risk score
    let riskScore = 0;
    riskScore += Math.min(30, freshPercent * 0.5);
    riskScore += Math.min(20, jitoPercent * 0.3);
    riskScore += Math.min(30, totalSniperSupply);
    riskScore += clusters.length * 5;
    if (firstInWallet?.isFreshWallet) riskScore += 15;
    
    return {
      detected: snipers.length >= this.MIN_CLUSTER_SIZE,
      sniperCount: snipers.length,
      clusters,
      firstInWallet,
      totalSniperSupplyPercent: totalSniperSupply,
      avgSniperWalletAge: avgAge,
      jitoSniperPercent: jitoPercent,
      freshWalletPercent: freshPercent,
      risks,
      riskScore: Math.min(100, riskScore)
    };
  }

  /**
   * Cluster snipers by patterns
   */
  private clusterSnipers(snipers: SniperWallet[]): SniperCluster[] {
    const clusters: SniperCluster[] = [];
    
    // Cluster by same slot (Jito bundle pattern)
    const slotGroups = new Map<number, SniperWallet[]>();
    for (const sniper of snipers) {
      const group = slotGroups.get(sniper.buySlot) || [];
      group.push(sniper);
      slotGroups.set(sniper.buySlot, group);
    }
    
    for (const [slot, group] of slotGroups) {
      if (group.length >= this.MIN_CLUSTER_SIZE) {
        const jitoUsers = group.filter(s => s.usedJito).length;
        clusters.push({
          wallets: group,
          commonFundingSource: null,
          avgWalletAge: group.reduce((sum, s) => sum + s.walletAge, 0) / group.length,
          totalSupplyPercent: 0, // Would need holder data
          sameslotCount: group.length,
          jitoUsagePercent: (jitoUsers / group.length) * 100,
          riskScore: Math.min(100, group.length * 15 + jitoUsers * 10),
          pattern: jitoUsers > group.length / 2 ? 'jito_bundle' : 'coordinated_buy'
        });
      }
    }
    
    // Cluster by fresh wallets
    const freshWallets = snipers.filter(s => s.isFreshWallet);
    if (freshWallets.length >= this.MIN_CLUSTER_SIZE) {
      clusters.push({
        wallets: freshWallets,
        commonFundingSource: null,
        avgWalletAge: freshWallets.reduce((sum, s) => sum + s.walletAge, 0) / freshWallets.length,
        totalSupplyPercent: 0,
        sameslotCount: 0,
        jitoUsagePercent: (freshWallets.filter(s => s.usedJito).length / freshWallets.length) * 100,
        riskScore: Math.min(100, freshWallets.length * 12),
        pattern: 'fresh_farm'
      });
    }
    
    return clusters;
  }

  /**
   * Quick check if token has sniper farm patterns
   */
  async quickCheck(
    tokenMint: string,
    holders: Array<{ address: string; percentage: number }>
  ): Promise<{ hasSniper: boolean; riskLevel: 'low' | 'medium' | 'high' | 'critical' }> {
    // Check top 20 holders for fresh wallets
    let freshCount = 0;
    
    for (const holder of holders.slice(0, 20)) {
      const age = await this.getWalletAge(holder.address);
      if (age < 1) freshCount++;
      
      // Early exit if clearly sniped
      if (freshCount >= 5) break;
    }
    
    const freshPercent = (freshCount / Math.min(20, holders.length)) * 100;
    
    if (freshPercent > 40) {
      return { hasSniper: true, riskLevel: 'critical' };
    } else if (freshPercent > 25) {
      return { hasSniper: true, riskLevel: 'high' };
    } else if (freshPercent > 10) {
      return { hasSniper: true, riskLevel: 'medium' };
    }
    
    return { hasSniper: false, riskLevel: 'low' };
  }
}

// Export singleton
export const sniperFarmDetector = new SniperFarmDetector();

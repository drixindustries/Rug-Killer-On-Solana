/**
 * Whale Buy Detection Service
 * Detects large early buys (>1% of supply within 10 minutes of launch)
 * Updated: November 15, 2025
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { rpcBalancer } from "./rpc-balancer.ts";
import { isExchangeWallet } from "../exchange-whitelist.ts";

export interface WhaleBuy {
  wallet: string;
  timestamp: number;
  amountTokens: number;
  percentageOfSupply: number;
  priceUSD?: number;
  txSignature: string;
  isExchange: boolean;
}

export interface WhaleDetectionResult {
  whaleCount: number;
  totalWhaleSupplyPercent: number;
  whaleBuys: WhaleBuy[];
  largestBuy: WhaleBuy | null;
  averageBuySize: number;
  risks: string[];
}

export class WhaleDetectorService {
  private readonly WHALE_THRESHOLD = 0.01; // 1% of supply
  private readonly TIME_WINDOW_SECONDS = 600; // 10 minutes from launch
  
  /**
   * Detects whale buys in early transactions
   */
  async detectWhaleBuys(
    tokenAddress: string,
    totalSupply: number,
    decimals: number
  ): Promise<WhaleDetectionResult> {
    const connection = rpcBalancer.getConnection();
    const risks: string[] = [];
    const whaleBuys: WhaleBuy[] = [];
    
    try {
      const mintPubkey = new PublicKey(tokenAddress);
      
      // Get transaction signatures (first 100)
      const signatures = await connection.getSignaturesForAddress(
        mintPubkey,
        { limit: 100 },
        'confirmed'
      );
      
      if (signatures.length === 0) {
        return this.createEmptyResult();
      }
      
      // Find launch time (earliest transaction)
      const launchTime = Math.min(...signatures.map(sig => sig.blockTime || 0));
      
      // Analyze each transaction for whale buys
      for (const sig of signatures) {
        const blockTime = sig.blockTime || 0;
        
        // Only check transactions within 10 minutes of launch
        if (blockTime - launchTime > this.TIME_WINDOW_SECONDS) {
          continue;
        }
        
        try {
          const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });
          
          if (!tx || !tx.meta) continue;
          
          // Parse transaction for token transfers
          const whaleData = this.parseTransactionForWhale(
            tx,
            totalSupply,
            decimals,
            blockTime,
            sig.signature
          );
          
          if (whaleData && whaleData.percentageOfSupply >= this.WHALE_THRESHOLD * 100) {
            whaleBuys.push(whaleData);
          }
        } catch (error) {
          // Skip failed transaction fetches
          continue;
        }
      }
      
      // Filter out exchange wallets from whale analysis
      const nonExchangeWhales = whaleBuys.filter(w => !w.isExchange);
      const exchangeWhales = whaleBuys.filter(w => w.isExchange);
      
      // Calculate statistics
      const totalWhaleSupply = nonExchangeWhales.reduce(
        (sum, w) => sum + w.percentageOfSupply, 
        0
      );
      
      const averageBuySize = nonExchangeWhales.length > 0
        ? nonExchangeWhales.reduce((sum, w) => sum + w.percentageOfSupply, 0) / nonExchangeWhales.length
        : 0;
      
      const largestBuy = nonExchangeWhales.length > 0
        ? nonExchangeWhales.reduce((max, w) => 
            w.percentageOfSupply > max.percentageOfSupply ? w : max
          )
        : null;
      
      // Generate risk messages
      if (exchangeWhales.length > 0) {
        risks.push(`✅ ${exchangeWhales.length} whale buys from exchanges (positive sign)`);
      }
      
      if (nonExchangeWhales.length >= 3) {
        risks.push(`⚠️ ${nonExchangeWhales.length} non-exchange whale buys detected`);
      }
      
      if (totalWhaleSupply > 15) {
        risks.push(`🚨 Whales control ${totalWhaleSupply.toFixed(1)}% of supply`);
      }
      
      if (largestBuy && largestBuy.percentageOfSupply > 5) {
        risks.push(`🐋 Largest buy: ${largestBuy.percentageOfSupply.toFixed(2)}% of supply`);
      }
      
      return {
        whaleCount: nonExchangeWhales.length,
        totalWhaleSupplyPercent: totalWhaleSupply,
        whaleBuys: nonExchangeWhales,
        largestBuy,
        averageBuySize,
        risks
      };
      
    } catch (error) {
      console.error('Whale detection error:', error);
      return this.createEmptyResult();
    }
  }
  
  /**
   * Parse a transaction to extract whale buy information
   */
  private parseTransactionForWhale(
    tx: any,
    totalSupply: number,
    decimals: number,
    blockTime: number,
    signature: string
  ): WhaleBuy | null {
    try {
      // Look for token transfers in the transaction
      const postBalances = tx.meta?.postTokenBalances || [];
      const preBalances = tx.meta?.preTokenBalances || [];
      
      for (const postBalance of postBalances) {
        const preBalance = preBalances.find(
          (pre: any) => pre.accountIndex === postBalance.accountIndex
        );
        
        const preAmount = preBalance?.uiTokenAmount?.uiAmount || 0;
        const postAmount = postBalance?.uiTokenAmount?.uiAmount || 0;
        const diff = postAmount - preAmount;
        
        if (diff > 0) {
          const percentageOfSupply = (diff / (totalSupply / Math.pow(10, decimals))) * 100;
          
          // Get wallet address from account keys
          const walletAddress = tx.transaction?.message?.accountKeys?.[postBalance.accountIndex]?.toString() || "";
          
          return {
            wallet: walletAddress,
            timestamp: blockTime,
            amountTokens: diff,
            percentageOfSupply,
            txSignature: signature,
            isExchange: isExchangeWallet(walletAddress)
          };
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Generate smart insight message based on whale activity
   */
  generateWhaleInsight(
    whaleResult: WhaleDetectionResult,
    symbol: string,
    riskScore: number
  ): string {
    const { whaleCount, totalWhaleSupplyPercent, largestBuy } = whaleResult;
    
    if (whaleCount === 0) {
      return `✅ No whale accumulation detected for ${symbol}. Healthy distribution.`;
    }
    
    let insight = `🐋 **Whale Activity Detected in ${symbol}**\n\n`;
    
    if (whaleCount >= 5) {
      insight += `⚠️ **${whaleCount} large buyers** accumulated ${totalWhaleSupplyPercent.toFixed(1)}% of supply early.\n`;
      insight += `**Action**: High whale concentration. Monitor for coordinated dumps.\n`;
    } else if (whaleCount >= 3) {
      insight += `📊 ${whaleCount} whales hold ${totalWhaleSupplyPercent.toFixed(1)}% combined.\n`;
      insight += `**Action**: Moderate whale presence. Watch price action closely.\n`;
    } else {
      insight += `💰 ${whaleCount} whale${whaleCount > 1 ? 's' : ''} detected (${totalWhaleSupplyPercent.toFixed(1)}% supply).\n`;
      insight += `**Action**: Limited whale exposure. Proceed with caution.\n`;
    }
    
    if (largestBuy) {
      insight += `\n🔍 **Largest Buy**: ${largestBuy.percentageOfSupply.toFixed(2)}% at ${new Date(largestBuy.timestamp * 1000).toLocaleTimeString()}\n`;
      insight += `Wallet: \`${largestBuy.wallet.slice(0, 6)}...${largestBuy.wallet.slice(-4)}\`\n`;
    }
    
    // Add score-based recommendation
    if (riskScore >= 75) {
      insight += `\n✅ Despite whale presence, fundamentals are strong (Score: ${riskScore}/100).\n`;
      insight += `💡 Consider entry with 20% stop-loss. Monitor whale wallets.`;
    } else if (riskScore >= 50) {
      insight += `\n⚠️ Combined with medium risk score (${riskScore}/100), exercise caution.\n`;
      insight += `💡 Small position only. Set tight stops.`;
    } else {
      insight += `\n🚨 Low score (${riskScore}/100) + whale concentration = HIGH RISK.\n`;
      insight += `💡 Avoid or gamble tiny position only.`;
    }
    
    return insight;
  }
  
  private createEmptyResult(): WhaleDetectionResult {
    return {
      whaleCount: 0,
      totalWhaleSupplyPercent: 0,
      whaleBuys: [],
      largestBuy: null,
      averageBuySize: 0,
      risks: []
    };
  }
}

// Export singleton
export const whaleDetector = new WhaleDetectorService();

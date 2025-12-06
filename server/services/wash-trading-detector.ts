/**
 * Wash Trading Detection Service
 * 
 * Detects fake volume and circular transaction patterns:
 * - Circular SOL/token flows (A→B→C→A)
 * - Self-trading patterns
 * - Bot trading signatures
 * - Inflated volume analysis
 * 
 * Based on 2025 forensics techniques
 * 
 * Created: Dec 6, 2025
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { rpcBalancer } from "./rpc-balancer.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CircularFlow {
  path: string[]; // Wallet addresses in the circle
  totalVolume: number;
  loopCount: number; // How many times the circle repeated
  avgLoopTime: number; // Average time per loop in minutes
  confidence: number; // 0-100
}

export interface WashPattern {
  type: 'self_trade' | 'ping_pong' | 'circular' | 'bot_farm' | 'layered';
  wallets: string[];
  volume: number;
  transactionCount: number;
  timespan: number; // hours
  confidence: number;
}

export interface VolumeAnalysis {
  reportedVolume24h: number;
  estimatedRealVolume: number;
  washVolumePercent: number;
  uniqueTraders: number;
  repeatTraderPercent: number;
  avgTradesPerTrader: number;
}

export interface WashTradingResult {
  detected: boolean;
  circularFlows: CircularFlow[];
  washPatterns: WashPattern[];
  volumeAnalysis: VolumeAnalysis;
  suspiciousWallets: string[];
  totalWashVolume: number;
  washVolumePercent: number;
  risks: string[];
  riskScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WASH TRADING DETECTOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class WashTradingDetector {
  private connection: Connection;
  
  // Thresholds
  private readonly MIN_CIRCULAR_VOLUME = 10; // 10 SOL minimum for circular detection
  private readonly PING_PONG_THRESHOLD = 3; // 3+ back-and-forth = ping pong
  private readonly BOT_TIMING_THRESHOLD_MS = 5000; // <5s between trades = bot
  private readonly WASH_VOLUME_THRESHOLD = 30; // >30% wash = significant
  
  constructor() {
    const rpcUrl = rpcBalancer?.select()?.getUrl() || process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Build transaction graph for a token
   */
  async buildTransactionGraph(
    tokenMint: string,
    lookbackHours: number = 24
  ): Promise<Map<string, Map<string, { count: number; volume: number; timestamps: number[] }>>> {
    const graph = new Map<string, Map<string, { count: number; volume: number; timestamps: number[] }>>();
    
    try {
      const mintPubkey = new PublicKey(tokenMint);
      const cutoffTime = Date.now() - (lookbackHours * 60 * 60 * 1000);
      
      const signatures = await this.connection.getSignaturesForAddress(mintPubkey, { limit: 500 });
      
      for (const sig of signatures) {
        if (!sig.blockTime || sig.blockTime * 1000 < cutoffTime) continue;
        
        try {
          const tx = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });
          
          if (!tx?.meta?.preTokenBalances || !tx?.meta?.postTokenBalances) continue;
          
          // Find sender and receiver
          let sender: string | null = null;
          let receiver: string | null = null;
          let amount = 0;
          
          for (const preBal of tx.meta.preTokenBalances) {
            if (preBal.mint !== tokenMint) continue;
            
            const postBal = tx.meta.postTokenBalances.find(
              p => p.mint === tokenMint && p.owner === preBal.owner
            );
            
            const preAmount = preBal.uiTokenAmount?.uiAmount || 0;
            const postAmount = postBal?.uiTokenAmount?.uiAmount || 0;
            
            if (preAmount > postAmount && preBal.owner) {
              sender = preBal.owner;
              amount = preAmount - postAmount;
            } else if (postAmount > preAmount && preBal.owner) {
              receiver = preBal.owner;
            }
          }
          
          // Check postTokenBalances for new receivers
          for (const postBal of tx.meta.postTokenBalances) {
            if (postBal.mint !== tokenMint || !postBal.owner) continue;
            
            const preBal = tx.meta.preTokenBalances.find(
              p => p.mint === tokenMint && p.owner === postBal.owner
            );
            
            if (!preBal && postBal.uiTokenAmount?.uiAmount) {
              receiver = postBal.owner;
            }
          }
          
          if (sender && receiver && sender !== receiver) {
            // Add edge to graph
            if (!graph.has(sender)) {
              graph.set(sender, new Map());
            }
            
            const edges = graph.get(sender)!;
            const existing = edges.get(receiver) || { count: 0, volume: 0, timestamps: [] };
            existing.count++;
            existing.volume += amount;
            existing.timestamps.push(sig.blockTime * 1000);
            edges.set(receiver, existing);
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.error(`[WashTrading] Error building graph:`, error);
    }
    
    return graph;
  }

  /**
   * Detect circular flows in transaction graph
   */
  detectCircularFlows(
    graph: Map<string, Map<string, { count: number; volume: number; timestamps: number[] }>>
  ): CircularFlow[] {
    const circles: CircularFlow[] = [];
    const visited = new Set<string>();
    
    // DFS to find cycles
    const findCycles = (
      start: string,
      current: string,
      path: string[],
      totalVolume: number
    ) => {
      if (path.length > 5) return; // Limit cycle length
      
      const edges = graph.get(current);
      if (!edges) return;
      
      for (const [next, data] of edges) {
        if (next === start && path.length >= 2) {
          // Found a cycle!
          const avgTime = data.timestamps.length > 1
            ? (data.timestamps[data.timestamps.length - 1] - data.timestamps[0]) / data.timestamps.length / 60000
            : 0;
          
          circles.push({
            path: [...path, next],
            totalVolume: totalVolume + data.volume,
            loopCount: Math.min(...path.map(p => {
              const e = graph.get(p);
              return e?.get(path[(path.indexOf(p) + 1) % path.length])?.count || 1;
            })),
            avgLoopTime: avgTime,
            confidence: Math.min(100, 40 + data.count * 10 + (totalVolume > 100 ? 20 : 0))
          });
        } else if (!path.includes(next)) {
          findCycles(start, next, [...path, next], totalVolume + data.volume);
        }
      }
    };
    
    for (const [wallet] of graph) {
      if (!visited.has(wallet)) {
        findCycles(wallet, wallet, [wallet], 0);
        visited.add(wallet);
      }
    }
    
    // Dedupe and sort by confidence
    const unique = circles.filter((c, i) => {
      const key = [...c.path].sort().join(',');
      return circles.findIndex(c2 => [...c2.path].sort().join(',') === key) === i;
    });
    
    return unique.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  }

  /**
   * Detect ping-pong patterns (A↔B repeatedly)
   */
  detectPingPong(
    graph: Map<string, Map<string, { count: number; volume: number; timestamps: number[] }>>
  ): WashPattern[] {
    const patterns: WashPattern[] = [];
    const seen = new Set<string>();
    
    for (const [walletA, edgesA] of graph) {
      for (const [walletB, dataAB] of edgesA) {
        const key = [walletA, walletB].sort().join('-');
        if (seen.has(key)) continue;
        seen.add(key);
        
        // Check reverse direction
        const edgesB = graph.get(walletB);
        const dataBA = edgesB?.get(walletA);
        
        if (dataBA && dataAB.count + dataBA.count >= this.PING_PONG_THRESHOLD) {
          const allTimestamps = [...dataAB.timestamps, ...dataBA.timestamps].sort((a, b) => a - b);
          const timespan = allTimestamps.length > 1
            ? (allTimestamps[allTimestamps.length - 1] - allTimestamps[0]) / (1000 * 60 * 60)
            : 0;
          
          patterns.push({
            type: 'ping_pong',
            wallets: [walletA, walletB],
            volume: dataAB.volume + dataBA.volume,
            transactionCount: dataAB.count + dataBA.count,
            timespan,
            confidence: Math.min(100, 50 + (dataAB.count + dataBA.count) * 5)
          });
        }
      }
    }
    
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect bot trading patterns (rapid consecutive trades)
   */
  detectBotPatterns(
    graph: Map<string, Map<string, { count: number; volume: number; timestamps: number[] }>>
  ): WashPattern[] {
    const patterns: WashPattern[] = [];
    const botWallets = new Set<string>();
    
    for (const [wallet, edges] of graph) {
      const allTimestamps: number[] = [];
      let totalVolume = 0;
      let totalTxs = 0;
      
      for (const [_, data] of edges) {
        allTimestamps.push(...data.timestamps);
        totalVolume += data.volume;
        totalTxs += data.count;
      }
      
      allTimestamps.sort((a, b) => a - b);
      
      // Check for rapid trading
      let rapidCount = 0;
      for (let i = 1; i < allTimestamps.length; i++) {
        if (allTimestamps[i] - allTimestamps[i - 1] < this.BOT_TIMING_THRESHOLD_MS) {
          rapidCount++;
        }
      }
      
      if (rapidCount >= 3 || (totalTxs > 10 && rapidCount / totalTxs > 0.3)) {
        botWallets.add(wallet);
      }
    }
    
    if (botWallets.size >= 2) {
      patterns.push({
        type: 'bot_farm',
        wallets: Array.from(botWallets),
        volume: 0, // Would need to sum
        transactionCount: botWallets.size * 10, // Estimate
        timespan: 24,
        confidence: Math.min(100, 40 + botWallets.size * 10)
      });
    }
    
    return patterns;
  }

  /**
   * Analyze volume authenticity
   */
  analyzeVolume(
    graph: Map<string, Map<string, { count: number; volume: number; timestamps: number[] }>>,
    reportedVolume: number
  ): VolumeAnalysis {
    const traders = new Set<string>();
    const traderTxCount = new Map<string, number>();
    let totalGraphVolume = 0;
    
    for (const [sender, edges] of graph) {
      traders.add(sender);
      
      for (const [receiver, data] of edges) {
        traders.add(receiver);
        totalGraphVolume += data.volume;
        
        traderTxCount.set(sender, (traderTxCount.get(sender) || 0) + data.count);
      }
    }
    
    const uniqueTraders = traders.size;
    const totalTxs = Array.from(traderTxCount.values()).reduce((sum, c) => sum + c, 0);
    const avgTrades = uniqueTraders > 0 ? totalTxs / uniqueTraders : 0;
    
    // Traders with >5 trades are likely wash traders
    const repeatTraders = Array.from(traderTxCount.entries())
      .filter(([_, count]) => count > 5).length;
    const repeatPercent = uniqueTraders > 0 ? (repeatTraders / uniqueTraders) * 100 : 0;
    
    // Estimate wash volume (rough heuristic)
    const washPercent = Math.min(100, repeatPercent * 1.5 + (avgTrades > 3 ? 20 : 0));
    const estimatedReal = reportedVolume * (1 - washPercent / 100);
    
    return {
      reportedVolume24h: reportedVolume,
      estimatedRealVolume: Math.max(0, estimatedReal),
      washVolumePercent: washPercent,
      uniqueTraders,
      repeatTraderPercent: repeatPercent,
      avgTradesPerTrader: avgTrades
    };
  }

  /**
   * Full wash trading analysis
   */
  async analyze(
    tokenMint: string,
    reportedVolume24h: number = 0
  ): Promise<WashTradingResult> {
    console.log(`[WashTrading] Analyzing ${tokenMint.slice(0, 8)}...`);
    
    const risks: string[] = [];
    
    // Build transaction graph
    const graph = await this.buildTransactionGraph(tokenMint, 24);
    
    // Detect patterns
    const circularFlows = this.detectCircularFlows(graph);
    const pingPongPatterns = this.detectPingPong(graph);
    const botPatterns = this.detectBotPatterns(graph);
    
    const allPatterns = [...pingPongPatterns, ...botPatterns];
    
    // Analyze volume
    const volumeAnalysis = this.analyzeVolume(graph, reportedVolume24h);
    
    // Collect suspicious wallets
    const suspiciousWallets = new Set<string>();
    for (const flow of circularFlows) {
      flow.path.forEach(w => suspiciousWallets.add(w));
    }
    for (const pattern of allPatterns) {
      pattern.wallets.forEach(w => suspiciousWallets.add(w));
    }
    
    // Calculate total wash volume
    const washVolume = circularFlows.reduce((sum, c) => sum + c.totalVolume, 0) +
      allPatterns.reduce((sum, p) => sum + p.volume, 0);
    
    const washPercent = volumeAnalysis.washVolumePercent;
    
    // Generate risks
    if (circularFlows.length > 0) {
      risks.push(`🚨 ${circularFlows.length} circular flow patterns detected`);
    }
    if (pingPongPatterns.length > 0) {
      risks.push(`⚠️ ${pingPongPatterns.length} ping-pong trading patterns found`);
    }
    if (botPatterns.length > 0) {
      risks.push(`🤖 Bot trading farm detected (${botPatterns[0]?.wallets.length || 0} wallets)`);
    }
    if (washPercent > this.WASH_VOLUME_THRESHOLD) {
      risks.push(`🚨 ${washPercent.toFixed(0)}% of volume appears to be wash trading`);
    }
    if (volumeAnalysis.avgTradesPerTrader > 5) {
      risks.push(`⚠️ Abnormally high trades per trader (${volumeAnalysis.avgTradesPerTrader.toFixed(1)} avg)`);
    }
    
    // Calculate risk score
    let riskScore = 0;
    riskScore += circularFlows.length * 15;
    riskScore += pingPongPatterns.length * 10;
    riskScore += botPatterns.length * 20;
    riskScore += Math.min(40, washPercent);
    
    return {
      detected: circularFlows.length > 0 || allPatterns.length > 0 || washPercent > this.WASH_VOLUME_THRESHOLD,
      circularFlows,
      washPatterns: allPatterns,
      volumeAnalysis,
      suspiciousWallets: Array.from(suspiciousWallets),
      totalWashVolume: washVolume,
      washVolumePercent: washPercent,
      risks,
      riskScore: Math.min(100, riskScore)
    };
  }
}

// Export singleton
export const washTradingDetector = new WashTradingDetector();

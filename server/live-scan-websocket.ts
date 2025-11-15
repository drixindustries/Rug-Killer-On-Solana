import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { pumpFunWebhook } from './services/pumpfun-webhook';
import { db } from './db';
import { scanHistory } from '@shared/schema';
import type { TokenAnalysisResponse } from '@shared/schema';
import { desc, sql } from 'drizzle-orm';

export interface LiveScanMessage {
  type: 'scan_complete' | 'new_token' | 'status_update' | 'error';
  data: any;
  timestamp: number;
}

/**
 * WebSocket Manager for Live Scans
 * Broadcasts real-time scan results to connected clients
 */
export class LiveScanWebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private isInitialized = false;

  /**
   * Initialize WebSocket server
   */
  public initialize(server: Server): void {
    if (this.isInitialized) {
      console.log('[LiveScan WS] Already initialized');
      return;
    }

    this.wss = new WebSocketServer({ 
      server, 
      path: '/api/live-scans'
    });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    this.wss.on('error', (error: Error) => {
      console.error('[LiveScan WS] Server error:', error);
    });

    // Subscribe to Pump.fun webhook events
    this.setupPumpFunListeners();

    this.isInitialized = true;
    console.log('[LiveScan WS] WebSocket server initialized on /api/live-scans');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    console.log('[LiveScan WS] New client connected');
    this.clients.add(ws);

    // Send welcome message with current status
    this.sendToClient(ws, {
      type: 'status_update',
      data: {
        message: 'Connected to live scan feed',
        pumpFunStatus: pumpFunWebhook.getStatus(),
        clientCount: this.clients.size,
      },
      timestamp: Date.now(),
    });

    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(ws, data);
      } catch (error) {
        console.error('[LiveScan WS] Error parsing client message:', error);
      }
    });

    ws.on('close', () => {
      console.log('[LiveScan WS] Client disconnected');
      this.clients.delete(ws);
    });

    ws.on('error', (error: Error) => {
      console.error('[LiveScan WS] Client error:', error);
      this.clients.delete(ws);
    });
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(ws: WebSocket, data: any): void {
    if (data.type === 'ping') {
      this.sendToClient(ws, {
        type: 'status_update',
        data: { pong: true },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Setup Pump.fun webhook listeners
   */
  private setupPumpFunListeners(): void {
    // New token detected
    pumpFunWebhook.on('new_token', (token) => {
      this.broadcast({
        type: 'new_token',
        data: token,
        timestamp: Date.now(),
      });
    });

    // Scan completed
    pumpFunWebhook.on('scan_complete', async (result) => {
      await this.handleScanComplete(result);
    });

    // Connection status changes
    pumpFunWebhook.on('connected', () => {
      this.broadcast({
        type: 'status_update',
        data: { pumpFunConnected: true },
        timestamp: Date.now(),
      });
    });

    pumpFunWebhook.on('disconnected', () => {
      this.broadcast({
        type: 'status_update',
        data: { pumpFunConnected: false },
        timestamp: Date.now(),
      });
    });

    // Errors
    pumpFunWebhook.on('scan_error', (error) => {
      this.broadcast({
        type: 'error',
        data: error,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Handle completed scan
   */
  private async handleScanComplete(result: {
    token: any;
    analysis: TokenAnalysisResponse;
    timestamp: number;
  }): Promise<void> {
    try {
      const { token, analysis } = result;

      // Calculate grade
      const grade = this.calculateGrade(analysis.riskScore);

      // Generate professional insight
      const insight = this.generateInsight(analysis);

      // Save to database
      await db.insert(scanHistory).values({
        tokenAddress: analysis.tokenAddress,
        symbol: analysis.metadata?.symbol || token.symbol || 'UNKNOWN',
        name: analysis.metadata?.name || token.name || 'Unknown Token',
        riskScore: analysis.riskScore,
        riskLevel: analysis.riskLevel,
        grade,
        whaleCount: analysis.whaleDetection?.whaleCount || 0,
        bundleScore: analysis.advancedBundleData?.bundleScore || 0,
        honeypotDetected: analysis.quillcheckData?.isHoneypot || false,
        analysisData: analysis as any,
        insight,
        source: 'pumpfun',
        scannedAt: new Date(),
      });

      // Broadcast to all connected clients
      this.broadcast({
        type: 'scan_complete',
        data: {
          tokenAddress: analysis.tokenAddress,
          symbol: analysis.metadata?.symbol || token.symbol,
          name: analysis.metadata?.name || token.name,
          riskScore: analysis.riskScore,
          riskLevel: analysis.riskLevel,
          grade,
          whaleCount: analysis.whaleDetection?.whaleCount || 0,
          bundleScore: analysis.advancedBundleData?.bundleScore || 0,
          honeypotDetected: analysis.quillcheckData?.isHoneypot || false,
          insight,
          timestamp: result.timestamp,
        },
        timestamp: Date.now(),
      });

      console.log(`[LiveScan WS] Broadcast scan: ${analysis.metadata?.symbol} - ${grade} (${analysis.riskScore}/100)`);
    } catch (error) {
      console.error('[LiveScan WS] Error handling scan complete:', error);
    }
  }

  /**
   * Calculate grade from risk score
   */
  private calculateGrade(riskScore: number): string {
    if (riskScore >= 90) return 'Diamond';
    if (riskScore >= 75) return 'Gold';
    if (riskScore >= 60) return 'Silver';
    if (riskScore >= 40) return 'Bronze';
    return 'Red Flag';
  }

  /**
   * Generate professional insight
   */
  private generateInsight(analysis: TokenAnalysisResponse): string {
    const score = analysis.riskScore;
    const whales = analysis.whaleDetection?.whaleCount || 0;
    const honeypot = analysis.quillcheckData?.isHoneypot;
    const bundleScore = analysis.advancedBundleData?.bundleScore || 0;

    if (honeypot) {
      return '🚨 HONEYPOT DETECTED - Cannot sell tokens. Avoid at all costs.';
    }

    if (score >= 90) {
      if (whales === 0) {
        return '💎 Institutional-grade safety. LP locked, mint revoked, no whale accumulation. Strong fundamentals.';
      }
      return `💎 Excellent safety metrics with ${whales} whale buy${whales > 1 ? 's' : ''}. Monitor price action closely.`;
    }

    if (score >= 75) {
      if (bundleScore >= 60) {
        return `⚠️ High bundle activity detected (${bundleScore}/100). Proceed with caution despite solid metrics.`;
      }
      return '✅ Good risk profile. Standard precautions apply - set stop-losses and monitor liquidity.';
    }

    if (score >= 60) {
      return '🟡 Moderate risk. Some concerning metrics detected. Only invest what you can afford to lose.';
    }

    if (score >= 40) {
      return `🟠 High risk token. ${whales > 0 ? `${whales} whale accumulation detected. ` : ''}Not recommended for investment.`;
    }

    return '🔴 EXTREME RISK - Multiple red flags detected. Strong rug pull indicators. Avoid.';
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: LiveScanMessage): void {
    const payload = JSON.stringify(message);
    let sentCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
          sentCount++;
        } catch (error) {
          console.error('[LiveScan WS] Error sending to client:', error);
        }
      }
    });

    if (sentCount > 0) {
      console.log(`[LiveScan WS] Broadcast to ${sentCount} client(s)`);
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: LiveScanMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('[LiveScan WS] Error sending to client:', error);
      }
    }
  }

  /**
   * Get statistics
   */
  public getStats(): {
    clientCount: number;
    isInitialized: boolean;
    pumpFunStatus: any;
  } {
    return {
      clientCount: this.clients.size,
      isInitialized: this.isInitialized,
      pumpFunStatus: pumpFunWebhook.getStatus(),
    };
  }
}

// Singleton instance
export const liveScanWS = new LiveScanWebSocketManager();

/**
 * Get scan history from database
 */
export async function getScanHistory(limit: number = 50, offset: number = 0) {
  try {
    const scans = await db
      .select()
      .from(scanHistory)
      .orderBy(desc(scanHistory.scannedAt))
      .limit(limit)
      .offset(offset);

    return scans;
  } catch (error) {
    console.error('[LiveScan] Error fetching scan history:', error);
    return [];
  }
}

/**
 * Get scan statistics
 */
export async function getScanStats() {
  try {
    const stats = await db
      .select({
        totalScans: sql<number>`count(*)::int`,
        avgRiskScore: sql<number>`avg(${scanHistory.riskScore})::int`,
        honeypotCount: sql<number>`sum(case when ${scanHistory.honeypotDetected} then 1 else 0 end)::int`,
        whaleDetectedCount: sql<number>`sum(case when ${scanHistory.whaleCount} > 0 then 1 else 0 end)::int`,
      })
      .from(scanHistory);

    return stats[0] || {
      totalScans: 0,
      avgRiskScore: 0,
      honeypotCount: 0,
      whaleDetectedCount: 0,
    };
  } catch (error) {
    console.error('[LiveScan] Error fetching stats:', error);
    return {
      totalScans: 0,
      avgRiskScore: 0,
      honeypotCount: 0,
      whaleDetectedCount: 0,
    };
  }
}

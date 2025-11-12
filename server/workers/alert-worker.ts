import { storage } from "../storage";
import { priceService } from "../services/price-service";
import type { PriceAlert } from "@shared/schema";

/**
 * Price Alert Worker
 * Monitors active price alerts and triggers them when conditions are met
 * 
 * NOTE: This is designed to be called periodically (every 1-5 minutes)
 * In production, use BullMQ with a cron job or setInterval
 */

export interface AlertEvaluation {
  alert: PriceAlert;
  triggered: boolean;
  currentPrice: number | null;
  reason?: string;
}

export class AlertWorker {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  /**
   * Start the alert worker with periodic checks
   * @param intervalMs - Check interval in milliseconds (default: 60000 = 1 minute)
   */
  start(intervalMs: number = 60000) {
    if (this.isRunning) {
      console.log("Alert worker already running");
      return;
    }

    console.log(`Starting alert worker (checking every ${intervalMs}ms)`);
    this.isRunning = true;

    // Run immediately
    this.checkAlerts().catch(console.error);

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkAlerts().catch(console.error);
    }, intervalMs);
  }

  /**
   * Stop the alert worker
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log("Alert worker stopped");
  }

  /**
   * Check all active alerts and trigger those that meet conditions
   */
  async checkAlerts(): Promise<AlertEvaluation[]> {
    try {
      // Get all active alerts
      const alerts = await storage.getActivePriceAlerts();
      
      if (alerts.length === 0) {
        return [];
      }

      console.log(`Checking ${alerts.length} active alerts...`);

      // Evaluate each alert
      const evaluations = await Promise.all(
        alerts.map(alert => this.evaluateAlert(alert))
      );

      // Trigger alerts that meet conditions
      const triggered = evaluations.filter(e => e.triggered);
      if (triggered.length > 0) {
        console.log(`Triggered ${triggered.length} alerts`);
        
        await Promise.all(
          triggered.map(async (evaluation) => {
            if (evaluation.currentPrice !== null) {
              await storage.triggerAlert(evaluation.alert.id, evaluation.currentPrice);
              console.log(`Alert ${evaluation.alert.id} triggered: ${evaluation.reason}`);
            }
          })
        );
      }

      return evaluations;
    } catch (error) {
      console.error("Error checking alerts:", error);
      return [];
    }
  }

  /**
   * Evaluate a single alert against current price
   */
  private async evaluateAlert(alert: PriceAlert): Promise<AlertEvaluation> {
    try {
      // Get current price from cache
      const priceData = await priceService.getPrice(alert.tokenAddress);
      
      if (!priceData?.priceUsd) {
        return {
          alert,
          triggered: false,
          currentPrice: null,
          reason: "Price data unavailable",
        };
      }

      const currentPrice = priceData.priceUsd;
      const targetValue = parseFloat(alert.targetValue);

      // Update last checked price with fixed precision (avoid exponential notation)
      await storage.updatePriceAlert(alert.id, { lastPrice: currentPrice.toFixed(8) });

      // Evaluate condition based on alert type
      let triggered = false;
      let reason = "";

      switch (alert.alertType) {
        case 'price_above':
          triggered = currentPrice > targetValue;
          reason = triggered ? `Price $${currentPrice.toFixed(4)} exceeded target $${targetValue.toFixed(4)}` : "";
          break;

        case 'price_below':
          triggered = currentPrice < targetValue;
          reason = triggered ? `Price $${currentPrice.toFixed(4)} fell below target $${targetValue.toFixed(4)}` : "";
          break;

        case 'percent_change':
        case 'percent_drop':
          // For percent-based alerts, we need historical price
          // For now, use lastPrice as baseline (simplified)
          if (alert.lastPrice) {
            const lastPrice = parseFloat(alert.lastPrice);
            const percentChange = ((currentPrice - lastPrice) / lastPrice) * 100;
            
            if (alert.alertType === 'percent_change') {
              triggered = Math.abs(percentChange) >= targetValue;
              reason = triggered ? `Price changed ${percentChange.toFixed(2)}% (threshold: ${targetValue}%)` : "";
            } else {
              // percent_drop
              triggered = percentChange <= -targetValue;
              reason = triggered ? `Price dropped ${percentChange.toFixed(2)}% (threshold: -${targetValue}%)` : "";
            }
          }
          break;

        default:
          console.warn(`Unknown alert type: ${alert.alertType}`);
      }

      return {
        alert,
        triggered,
        currentPrice,
        reason,
      };
    } catch (error) {
      console.error(`Error evaluating alert ${alert.id}:`, error);
      return {
        alert,
        triggered: false,
        currentPrice: null,
        reason: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  }
}

// Singleton instance
export const alertWorker = new AlertWorker();

// Auto-start in production (disabled for development to avoid noise)
if (process.env.NODE_ENV === 'production') {
  // Check every 2 minutes in production
  alertWorker.start(120000);
}

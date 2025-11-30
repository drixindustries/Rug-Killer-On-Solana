// Smart Money Relay Service
// Provides an internal event bus for smart money detection events so scanners/webhooks
// can publish enriched wallet data and the Discord/Telegram bots can consume.

import { EventEmitter } from 'events';

export interface SmartMoneyWallet {
  address: string;
  winrate: number; // percentage 0-100
  profit: number; // realized profit USD approximation
  directive: string; // action label
}

export interface SmartMoneyEvent {
  tokenMint: string;
  symbol?: string;
  ageMinutes: number;
  walletCount: number;
  eliteWallets: SmartMoneyWallet[];
  allSample: string[]; // short addresses for context
  analysis?: {
    riskScore?: number;
    holderCount?: number;
    topConcentration?: number;
    agedWalletRisk?: number;
    suspiciousFundingPct?: number;
    bundled?: boolean;
  };
  timestamp: number;
}

class SmartMoneyRelay extends EventEmitter {
  private eventCount = 0;
  
  publish(event: SmartMoneyEvent) {
    this.eventCount++;
    console.log(`[SmartMoneyRelay] Publishing event #${this.eventCount} - Token: ${event.tokenMint.slice(0,8)}... | Elite: ${event.eliteWallets.length}`);
    this.emit('event', event);
  }
  
  onEvent(listener: (event: SmartMoneyEvent) => void) {
    this.on('event', listener);
  }
  
  getStats() {
    return {
      eventCount: this.eventCount,
      listenerCount: this.listenerCount('event')
    };
  }
}

export const smartMoneyRelay = new SmartMoneyRelay();

// Directive helper
export function getDirective(winrate: number, profit: number): string {
  if (winrate >= 90 && profit >= 2_000_000) return 'PRIORITY WATCH';
  if (winrate >= 85 && profit >= 1_500_000) return 'HIGH WATCH';
  if (winrate >= 80 && profit >= 1_000_000) return 'ACCUMULATION SIGNAL';
  if (winrate >= 75 && profit >= 500_000) return 'EARLY WATCH';
  return 'INFO';
}

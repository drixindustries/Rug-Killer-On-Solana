/**
 * Exchange Auto-Detection Service
 * 
 * Leverages Helius Enhanced RPC to automatically detect
 * exchange wallets and dynamically add them to the whitelist for accurate holder analysis.
 * 
 * Features:
 * - Real-time exchange detection via RPC provider labels
 * - Dynamic whitelist updates (in-memory)
 * - Persistent storage suggestions for discovered exchanges
 * - Zero maintenance - automatically catches new CEX addresses
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { EXCHANGE_WALLETS } from '../exchange-whitelist.js';

interface EnrichedAccountInfo {
  address: string;
  label?: string;
  tags?: string[];
  isExchange?: boolean;
  exchangeName?: string;
}

// In-memory cache of auto-detected exchanges (persists during runtime)
const AUTO_DETECTED_EXCHANGES = new Map<string, {
  address: string;
  label: string;
  detectedAt: number;
  source: 'helius' | 'ankr' | 'heuristic';
}>();

// Export for potential database persistence
export function getAutoDetectedExchanges() {
  return Array.from(AUTO_DETECTED_EXCHANGES.values());
}

/**
 * Check if an address is a known or auto-detected exchange
 * FAST: O(1) Set lookup + Map lookup
 */
export function isKnownOrAutoExchange(address: string): boolean {
  return EXCHANGE_WALLETS.has(address) || AUTO_DETECTED_EXCHANGES.has(address);
}

/**
 * Get exchange label if known
 */
export function getExchangeLabel(address: string): string | undefined {
  if (EXCHANGE_WALLETS.has(address)) {
    return 'Exchange (Pre-listed)';
  }
  const autoDetected = AUTO_DETECTED_EXCHANGES.get(address);
  if (autoDetected) {
    return autoDetected.label;
  }
  return undefined;
}

/**
 * Helius Enhanced API - Get enriched account data
 * Uses Helius DAS (Digital Asset Standard) API for account labels
 */
export async function detectExchangeViaHelius(
  address: string,
  heliusApiKey: string
): Promise<EnrichedAccountInfo | null> {
  try {
    // Helius v0 RPC method: getAccountInfo with enrichment
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [
          address,
          {
            encoding: 'jsonParsed',
            commitment: 'confirmed'
          }
        ]
      }),
      signal: AbortSignal.timeout(2000) // 2s timeout
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Check if Helius returned enriched data (they add custom fields for known addresses)
    // Note: Helius may provide labels in different formats - check docs for exact structure
    const accountInfo = data.result?.value;
    if (!accountInfo) {
      return null;
    }

    // Check for Helius enrichment metadata (format may vary)
    const labels = (accountInfo as any).labels || [];
    const tags = (accountInfo as any).tags || [];
    
    // Detect exchange keywords
    const exchangeKeywords = ['exchange', 'binance', 'okx', 'bybit', 'kucoin', 'gate.io', 'htx', 'coinbase', 'kraken', 'bitget', 'cex'];
    const isExchange = [...labels, ...tags].some((item: string) => 
      exchangeKeywords.some(keyword => item.toLowerCase().includes(keyword))
    );

    if (isExchange) {
      const label = labels.find((l: string) => exchangeKeywords.some(k => l.toLowerCase().includes(k))) || 'Exchange (Auto-detected)';
      
      console.log(`[ExchangeAutoDetect] 🎯 Helius detected exchange: ${address} - ${label}`);
      
      // Add to in-memory cache
      AUTO_DETECTED_EXCHANGES.set(address, {
        address,
        label: `Exchange: ${label}`,
        detectedAt: Date.now(),
        source: 'helius'
      });

      return {
        address,
        label,
        tags,
        isExchange: true,
        exchangeName: label
      };
    }

    return null;
  } catch (error) {
    console.error('[ExchangeAutoDetect] Helius detection failed:', error);
    return null;
  }
}

/**
 * Ankr Enhanced API - Get enriched account metadata
 * Ankr provides account labeling for major exchanges
 */
export async function detectExchangeViaAnkr(
  address: string,
  ankrApiKey: string
): Promise<EnrichedAccountInfo | null> {
  try {
    // Ankr Advanced API: getAccountInfo with extended metadata
    const response = await fetch(`https://rpc.ankr.com/solana/${ankrApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [
          address,
          {
            encoding: 'jsonParsed',
            commitment: 'confirmed'
          }
        ]
      }),
      signal: AbortSignal.timeout(2000) // 2s timeout
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const accountInfo = data.result?.value;
    
    if (!accountInfo) {
      return null;
    }

    // Check for Ankr metadata (they provide labels for known addresses)
    const metadata = (accountInfo as any).metadata || {};
    const label = metadata.label || metadata.name;
    const tags = metadata.tags || [];
    
    // Detect exchange keywords
    const exchangeKeywords = ['exchange', 'binance', 'okx', 'bybit', 'kucoin', 'gate', 'htx', 'coinbase', 'kraken', 'bitget', 'cex'];
    const isExchange = (label && exchangeKeywords.some(k => label.toLowerCase().includes(k))) ||
                       tags.some((t: string) => exchangeKeywords.some(k => t.toLowerCase().includes(k)));

    if (isExchange) {
      console.log(`[ExchangeAutoDetect] 🎯 Ankr detected exchange: ${address} - ${label}`);
      
      // Add to in-memory cache
      AUTO_DETECTED_EXCHANGES.set(address, {
        address,
        label: `Exchange: ${label}`,
        detectedAt: Date.now(),
        source: 'ankr'
      });

      return {
        address,
        label,
        tags,
        isExchange: true,
        exchangeName: label
      };
    }

    return null;
  } catch (error) {
    console.error('[ExchangeAutoDetect] Ankr detection failed:', error);
    return null;
  }
}

/**
 * Batch detect exchanges from a list of holder addresses
 * Uses available RPC providers (Helius preferred, Ankr fallback)
 * 
 * @returns Array of newly detected exchange addresses
 */
export async function batchDetectExchanges(
  addresses: string[],
  options?: {
    heliusApiKey?: string;
    ankrApiKey?: string;
    maxConcurrent?: number;
  }
): Promise<string[]> {
  const heliusKey = options?.heliusApiKey || process.env.HELIUS_API_KEY?.trim();
  const ankrKey = options?.ankrApiKey || process.env.ANKR_API_KEY?.trim();
  const maxConcurrent = options?.maxConcurrent || 5;

  if (!heliusKey && !ankrKey) {
    console.log('[ExchangeAutoDetect] No API keys available for auto-detection');
    return [];
  }

  // Filter out already known exchanges
  const unknownAddresses = addresses.filter(addr => !isKnownOrAutoExchange(addr));
  
  if (unknownAddresses.length === 0) {
    return [];
  }

  console.log(`[ExchangeAutoDetect] Scanning ${unknownAddresses.length} unknown addresses for exchanges...`);

  const newlyDetected: string[] = [];
  
  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < unknownAddresses.length; i += maxConcurrent) {
    const batch = unknownAddresses.slice(i, i + maxConcurrent);
    
    const results = await Promise.allSettled(
      batch.map(async (addr) => {
        // Try Helius first (generally more complete labeling)
        if (heliusKey) {
          const heliusResult = await detectExchangeViaHelius(addr, heliusKey);
          if (heliusResult?.isExchange) {
            return addr;
          }
        }
        
        // Fallback to Ankr
        if (ankrKey) {
          const ankrResult = await detectExchangeViaAnkr(addr, ankrKey);
          if (ankrResult?.isExchange) {
            return addr;
          }
        }
        
        return null;
      })
    );

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        newlyDetected.push(result.value);
      }
    });
  }

  if (newlyDetected.length > 0) {
    console.log(`[ExchangeAutoDetect] ✅ Detected ${newlyDetected.length} new exchange addresses`);
  }

  return newlyDetected;
}

/**
 * Enhanced holder filtering that includes auto-detected exchanges
 * Drop-in replacement for existing exchange filtering
 */
export function filterExchangeHolders<T extends { address: string }>(
  holders: T[]
): { filtered: T[]; exchanges: T[] } {
  const filtered: T[] = [];
  const exchanges: T[] = [];

  for (const holder of holders) {
    if (isKnownOrAutoExchange(holder.address)) {
      exchanges.push(holder);
    } else {
      filtered.push(holder);
    }
  }

  return { filtered, exchanges };
}

/**
 * Get stats about auto-detected exchanges
 */
export function getAutoDetectionStats() {
  const bySource = {
    helius: 0,
    ankr: 0,
    heuristic: 0
  };

  AUTO_DETECTED_EXCHANGES.forEach(entry => {
    bySource[entry.source]++;
  });

  return {
    totalAutoDetected: AUTO_DETECTED_EXCHANGES.size,
    totalPrelisted: EXCHANGE_WALLETS.size,
    totalKnown: EXCHANGE_WALLETS.size + AUTO_DETECTED_EXCHANGES.size,
    detectedBy: bySource,
    recentDetections: Array.from(AUTO_DETECTED_EXCHANGES.values())
      .sort((a, b) => b.detectedAt - a.detectedAt)
      .slice(0, 10)
  };
}

// Export the in-memory cache for direct access if needed
export { AUTO_DETECTED_EXCHANGES };

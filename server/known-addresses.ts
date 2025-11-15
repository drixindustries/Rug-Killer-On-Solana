// Known Solana addresses that should be excluded from holder concentration calculations
// These are exchanges, bundling bots, and protocol-owned addresses that don't represent individual whales

import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

export interface KnownAddress {
  address: string;
  label: string;
  type: 'exchange' | 'protocol' | 'bundler' | 'vault';
  source: string;
}

// Centralized Exchange Addresses
export const KNOWN_EXCHANGES: KnownAddress[] = [
  // Binance
  {
    address: '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9',
    label: 'Binance 2',
    type: 'exchange',
    source: 'Solscan labeled'
  },
  {
    address: '5tzL3DfsF8i36KeUCjtzWP9zqS6zWjYhR76VA4Y5CzzJ',
    label: 'Binance 1',
    type: 'exchange',
    source: 'Solscan labeled'
  },
  {
    address: 'H8sMJSCQxfKiFTCfDR3DUYexta7Kxymr2gF3LceH44uR',
    label: 'Binance 3',
    type: 'exchange',
    source: 'Solscan labeled'
  },
  // Coinbase
  {
    address: 'GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE',
    label: 'Coinbase Hot Wallet 2',
    type: 'exchange',
    source: 'Solscan labeled'
  },
  // OKX
  {
    address: 'is6MTRHEgyFLNTfYcuV4QBWLjrZBfmhVNYR6ccgr8KV',
    label: 'OKX Hot Wallet',
    type: 'exchange',
    source: 'Solscan labeled'
  },
  // Bybit
  {
    address: 'AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2',
    label: 'Bybit Hot Wallet',
    type: 'exchange',
    source: 'Solscan labeled'
  },
  // Gate.io
  {
    address: 'u6PJ8DtQuPFnfmwHbGFULQ4u4EgjDiyYKjVEsynXq2w',
    label: 'Gate.io',
    type: 'exchange',
    source: 'Solscan labeled'
  },
  // MEXC
  {
    address: 'ASTyfSima4LLAdDgoFGkgqoKowG1LZFDr9fAQrg7iaJZ',
    label: 'MEXC',
    type: 'exchange',
    source: 'Solscan labeled'
  },
  // FTX (defunct, historical holdings)
  {
    address: '6ZRCB7AAqGre6c72PRz3MHLC73VMYvJ8bi9KHf1HFpNk',
    label: 'FTX Cold Storage',
    type: 'exchange',
    source: 'Solscan labeled'
  },
  // User verified exchange
  {
    address: '4xJLmpojrDeXEnfDoeG9UdHXozY2Qn48ZyiPyRhabAN3',
    label: 'Exchange Wallet',
    type: 'exchange',
    source: 'User verified'
  },
  // Add more as they become publicly known
];

// DeFi Protocol Addresses (Staking pools, vaults, etc.)
export const KNOWN_PROTOCOLS: KnownAddress[] = [
  // Raydium
  {
    address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
    label: 'Raydium Authority V4',
    type: 'protocol',
    source: 'Solscan labeled'
  },
  // Orca
  {
    address: '3xQ5vZfpcjLhFWKHNFzJP8SJmBLqpN9Sq5q5K2JmvPuG',
    label: 'Orca Whirlpool',
    type: 'protocol',
    source: 'Solscan labeled'
  },
  // Meteora
  {
    address: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
    label: 'Meteora Pool',
    type: 'protocol',
    source: 'Solscan labeled'
  },
];

// Pump.fun Official Addresses
export const PUMPFUN_ADDRESSES: KnownAddress[] = [
  {
    address: 'Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1',
    label: 'Pump.fun Fee Receiver',
    type: 'protocol',
    source: 'Pump.fun documentation'
  },
  {
    address: 'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM',
    label: 'Pump.fun Program Authority',
    type: 'protocol',
    source: 'Pump.fun documentation'
  },
];

// Pump.fun Program ID for bonding curve derivation
export const PUMPFUN_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

// Bundler/Volume Bot Known Patterns
// These are addresses known to be used by bundling services
export const KNOWN_BUNDLERS: KnownAddress[] = [
  // Common bundling service addresses will be added as discovered
  // Typically identified by wash trading patterns and same-block purchases
];

// Combine all known addresses
export const ALL_KNOWN_ADDRESSES: KnownAddress[] = [
  ...KNOWN_EXCHANGES,
  ...KNOWN_PROTOCOLS,
  ...PUMPFUN_ADDRESSES,
  ...KNOWN_BUNDLERS,
];

// Quick lookup for address filtering
export const KNOWN_ADDRESS_SET = new Set(
  ALL_KNOWN_ADDRESSES.map(a => a.address)
);

/**
 * Check if an address is a known exchange/protocol/bundler
 */
export function isKnownAddress(address: string): boolean {
  return KNOWN_ADDRESS_SET.has(address);
}

/**
 * Get details about a known address
 */
export function getKnownAddressInfo(address: string): KnownAddress | undefined {
  return ALL_KNOWN_ADDRESSES.find(a => a.address === address);
}

// Memoization cache for bonding curve addresses
const bondingCurveCache = new Map<string, string>();
const associatedBondingCurveCache = new Map<string, string>();

/**
 * Calculate the pump.fun bonding curve address for a given token mint
 * This is a PDA (Program Derived Address) specific to each token
 * Results are memoized for performance
 */
export function getPumpFunBondingCurveAddress(mintAddress: string): string | null {
  // Check cache first
  if (bondingCurveCache.has(mintAddress)) {
    return bondingCurveCache.get(mintAddress)!;
  }
  
  try {
    const mint = new PublicKey(mintAddress);
    const pumpProgram = new PublicKey(PUMPFUN_PROGRAM_ID);
    
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('bonding-curve'),
        mint.toBuffer()
      ],
      pumpProgram
    );
    
    const address = bondingCurve.toString();
    bondingCurveCache.set(mintAddress, address);
    console.log(`[Pump.fun PDA] Calculated bonding curve for ${mintAddress}: ${address}`)
    return address;
  } catch (error) {
    console.error(`[Pump.fun PDA] Error calculating bonding curve address for ${mintAddress}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Calculate the associated bonding curve token account for a given mint
 * This account holds the actual tokens locked in the bonding curve
 * Results are memoized for performance
 */
export function getPumpFunAssociatedBondingCurveAddress(mintAddress: string): string | null {
  // Check cache first
  if (associatedBondingCurveCache.has(mintAddress)) {
    return associatedBondingCurveCache.get(mintAddress)!;
  }
  
  try {
    const mint = new PublicKey(mintAddress);
    const pumpProgram = new PublicKey(PUMPFUN_PROGRAM_ID);
    
    // First get the bonding curve PDA
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('bonding-curve'),
        mint.toBuffer()
      ],
      pumpProgram
    );
    
    // Then get the associated token account
    const [associatedBondingCurve] = PublicKey.findProgramAddressSync(
      [
        bondingCurve.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mint.toBuffer()
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    const address = associatedBondingCurve.toString();
    associatedBondingCurveCache.set(mintAddress, address);
    console.log(`[Pump.fun PDA] Calculated associated bonding curve for ${mintAddress}: ${address}`);
    return address;
  } catch (error) {
    console.error(`[Pump.fun PDA] Error calculating associated bonding curve address for ${mintAddress}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Detect potential bundled wallets by analyzing transaction timing
 * Bundlers typically execute multiple buys in the same block (0.4s window)
 */
export interface BundleDetectionResult {
  isBundled: boolean;
  bundleWallets: string[];
  bundleSize: number;
  sameBlockCount: number;
}

/**
 * Analyze holders for bundling patterns
 * Returns addresses that appear to be part of a bundle
 */
export function detectBundledWallets(
  holders: Array<{ address: string; percentage: number }>,
  transactionData?: Array<{ address: string; blockHeight: number; timestamp: number }>
): string[] {
  const bundledAddresses: string[] = [];
  
  // If we don't have transaction data, use pattern-based detection
  if (!transactionData) {
    // Pattern 1: Multiple holders with suspiciously similar percentages
    const percentageGroups = new Map<string, string[]>();
    holders.forEach(holder => {
      // Round to 2 decimals for grouping
      const roundedPct = holder.percentage.toFixed(2);
      if (!percentageGroups.has(roundedPct)) {
        percentageGroups.set(roundedPct, []);
      }
      percentageGroups.get(roundedPct)!.push(holder.address);
    });
    
    // If 3+ holders have exact same percentage, likely bundled
    percentageGroups.forEach(addresses => {
      if (addresses.length >= 3) {
        bundledAddresses.push(...addresses);
      }
    });
    
    return bundledAddresses;
  }
  
  // With transaction data, detect same-block purchases
  const blockGroups = new Map<number, string[]>();
  transactionData.forEach(tx => {
    if (!blockGroups.has(tx.blockHeight)) {
      blockGroups.set(tx.blockHeight, []);
    }
    blockGroups.get(tx.blockHeight)!.push(tx.address);
  });
  
  // Find blocks with 10+ simultaneous purchases (strong bundle signal)
  blockGroups.forEach(addresses => {
    if (addresses.length >= 10) {
      bundledAddresses.push(...addresses);
    }
  });
  
  return bundledAddresses;
}

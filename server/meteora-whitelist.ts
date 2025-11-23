/**
 * Meteora AMM/DLMM Wallet Whitelist
 * 
 * Filters Meteora's Dynamic Liquidity Market Maker (DLMM) pool addresses
 * that appear as top holders but are actually protocol vaults.
 * 
 * Meteora uses multiple pool addresses per trading pair, which can show up
 * as large holders and skew concentration metrics.
 */

// Known Meteora program and authority addresses
const CORE_METEORA_ADDRESSES = new Set([
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',   // Meteora DLMM Program
  'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB',   // Meteora Pool Authority
  'METAmTMXwdb8gYzyCPfXXFmZZw4rUsXX58PNsDg7zjL',   // Meteora Token
  'METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m',   // Meteora Vault
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',   // Meteora Metadata
  '9r461WY2DZuZaSeWftLoyy5oqWNVfwq5U3k2M9k4Z5xd',  // Meteora DLMM (from screenshot)
]);

// Pattern-based detection for Meteora DLMM pool addresses
// Meteora generates pool addresses with recognizable patterns
const METEORA_ADDRESS_PATTERNS = [
  /^LBU/,    // Main DLMM program prefix
  /^Eo7/,    // Pool authority prefix
  /^META/,   // Meteora token/vault prefix
  /^9r461/,  // DLMM pool prefix (commonly seen)
  /^metaq/,  // Metadata prefix (lowercase)
];

/**
 * Check if address matches known Meteora patterns
 */
function matchesMeteoraPattern(address: string): boolean {
  return METEORA_ADDRESS_PATTERNS.some(pattern => pattern.test(address));
}

/**
 * Check if a wallet is a Meteora AMM/DLMM pool
 * @param address Wallet address to check
 * @returns true if it's a Meteora system wallet
 */
export function isMeteoraAmm(address: string): boolean {
  // Check hardcoded addresses first (fastest)
  if (CORE_METEORA_ADDRESSES.has(address)) {
    return true;
  }
  
  // Then check pattern matching (catches new pool addresses)
  if (matchesMeteoraPattern(address)) {
    console.log(`[MeteoraWhitelist] Auto-detected AMM wallet via pattern: ${address.slice(0, 8)}...`);
    return true;
  }
  
  return false;
}

/**
 * Get statistics about Meteora whitelist
 */
export function getMeteoraWhitelistStats() {
  return {
    coreAddresses: CORE_METEORA_ADDRESSES.size,
    patterns: METEORA_ADDRESS_PATTERNS.length,
  };
}

export const METEORA_AMM_WALLETS = CORE_METEORA_ADDRESSES;

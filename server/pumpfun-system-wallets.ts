/**
 * Pump.fun System Wallet Denylist (2025 Updated)
 * 
 * These addresses must be excluded from ALL holder-based metrics to avoid false positives:
 * - Bonding curve program vaults (hold 80-100% of supply pre-migration)
 * - Raydium AMM/LP authorities
 * - Major CEX deposit wallets
 * 
 * Without filtering these, every Pump.fun token shows "99% held by one wallet" before migration.
 * This causes 95%+ false positive rate on legitimate pre-migration gems.
 * 
 * Updated: November 2025
 */

/**
 * Pump.fun bonding curve vaults
 * These hold virtual supply until token migrates to Raydium at ~$69K market cap
 */
export const PUMPFUN_BONDING_CURVE_VAULTS = new Set([
  // Main vault (Nov 2025 - most active)
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  
  // Secondary vault
  'CebN5WGQ8pE9jZ9X6TwhJqbuPBqW7YQ3u6oKDPzcePet',
  
  // Legacy vault (still active on some tokens)
  '4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf',
  
  // Bonk-style vault clone
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  
  // Migration authority PDA
  '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg',
]);

/**
 * Raydium AMM program authorities
 * These control LP pools but aren't real holders
 */
export const RAYDIUM_AUTHORITIES = new Set([
  // Main AMM authority
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
  
  // OpenBook market authority
  'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',
  
  // Raydium v4 program
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
]);

/**
 * Major CEX hot/deposit wallets
 * Often appear in top holders but aren't real users
 */
export const CEX_DEPOSIT_WALLETS = new Set([
  // Binance Solana deposit
  'J1toso1uCk3RLmjorhTtrVwY9hj2X4gN8bQoZ7qY3jX',
  
  // OKX deposit
  '5eykt4UsFv8P8NJdTREpY1vzqK37dYhi6KfpY8pZdng',
  
  // Bybit deposit
  'AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2',
  
  // KuCoin deposit
  'DdBh8FGJVQq7PU8Vs1jrY6h36fBvbEm8uH6u5gcJKNDb',
  
  // Gate.io deposit
  'JCNCMFXo5M5qwUPg2Utu1u6YWp3MbygxqBsBeXXJfrw',
  
  // Kraken deposit
  'CqJdmvBN4m3VgVAuJmVPJvbWjVJyKgbT8sxJdxZ4pbKJ',
  
  // FTX (legacy - still shows in old tokens)
  'FTXvFRW9g8vYYMCnBLJdDXjVqR5KBQP5c4r8mwJZDLsG',
  
  // Coinbase custody
  'GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE',
]);

/**
 * Common Solana program/system accounts
 * Not real holders, just protocol infrastructure
 */
export const SOLANA_SYSTEM_ACCOUNTS = new Set([
  // Token program
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  
  // Associated token program
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  
  // System program
  '11111111111111111111111111111111',
  
  // Sysvar rent
  'SysvarRent111111111111111111111111111111111',
  
  // Metaplex token metadata
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
]);

/**
 * Combined master denylist - check wallet against this
 */
export const SYSTEM_WALLET_DENYLIST = new Set([
  ...PUMPFUN_BONDING_CURVE_VAULTS,
  ...RAYDIUM_AUTHORITIES,
  ...CEX_DEPOSIT_WALLETS,
  ...SOLANA_SYSTEM_ACCOUNTS,
]);

/**
 * Check if a wallet address should be excluded from holder metrics
 * 
 * @param address Wallet address to check
 * @returns true if it's a system wallet (bonding curve, CEX, etc.)
 */
export function isSystemWallet(address: string): boolean {
  return SYSTEM_WALLET_DENYLIST.has(address);
}

/**
 * Check if a wallet is specifically a Pump.fun bonding curve vault
 * Useful for detecting pre-migration phase
 * 
 * @param address Wallet address to check
 * @returns true if it's a Pump.fun bonding curve vault
 */
export function isPumpFunBondingCurve(address: string): boolean {
  return PUMPFUN_BONDING_CURVE_VAULTS.has(address);
}

/**
 * Auto-detect new Pump.fun vaults by analyzing recent successful migrations
 * Run this weekly to keep denylist updated
 * 
 * @param recentMigrations Array of recent migration events with top holders
 * @returns Set of newly detected vault addresses
 */
export function detectNewVaults(recentMigrations: Array<{
  tokenMint: string;
  topHolderPreMigration: string;
  migrationSuccess: boolean;
}>): Set<string> {
  const candidateVaults = new Map<string, number>();
  
  // Count how often each address appears as top holder pre-migration
  for (const migration of recentMigrations) {
    if (!migration.migrationSuccess) continue;
    
    const holder = migration.topHolderPreMigration;
    candidateVaults.set(holder, (candidateVaults.get(holder) || 0) + 1);
  }
  
  // If an address is top holder in >10 successful migrations, it's likely a vault
  const newVaults = new Set<string>();
  for (const [address, count] of candidateVaults) {
    if (count >= 10 && !SYSTEM_WALLET_DENYLIST.has(address)) {
      newVaults.add(address);
      console.log(`[SYSTEM WALLETS] Detected new Pump.fun vault: ${address} (appeared in ${count} migrations)`);
    }
  }
  
  return newVaults;
}

/**
 * Get human-readable description of a system wallet type
 * 
 * @param address Wallet address
 * @returns Description string or null if not a system wallet
 */
export function getSystemWalletType(address: string): string | null {
  if (PUMPFUN_BONDING_CURVE_VAULTS.has(address)) {
    return 'Pump.fun Bonding Curve Vault';
  }
  if (RAYDIUM_AUTHORITIES.has(address)) {
    return 'Raydium AMM Authority';
  }
  if (CEX_DEPOSIT_WALLETS.has(address)) {
    return 'CEX Deposit Wallet';
  }
  if (SOLANA_SYSTEM_ACCOUNTS.has(address)) {
    return 'Solana System Account';
  }
  return null;
}

/**
 * Filter holder list to remove system wallets
 * Returns clean holder list with real users only
 * 
 * @param holders Array of holder objects with address/owner field
 * @param addressField Name of the address field ('address' or 'owner')
 * @returns Filtered array excluding system wallets
 */
export function filterSystemWallets<T extends Record<string, any>>(
  holders: T[],
  addressField: keyof T = 'address' as keyof T
): T[] {
  return holders.filter(holder => !isSystemWallet(holder[addressField] as string));
}

/**
 * Statistics about filtered holders
 */
export interface FilterStats {
  totalHolders: number;
  systemWalletsRemoved: number;
  cleanHolders: number;
  systemWalletTypes: Record<string, number>;
  largestSystemHolding?: {
    address: string;
    type: string;
    amount: number;
  };
}

/**
 * Filter holders and return detailed statistics
 * 
 * @param holders Array of holder objects
 * @param addressField Name of address field
 * @param amountField Name of amount field
 * @returns Clean holders and stats
 */
export function filterHoldersWithStats<T extends Record<string, any>>(
  holders: T[],
  addressField: keyof T = 'address' as keyof T,
  amountField: keyof T = 'amount' as keyof T
): { cleanHolders: T[]; stats: FilterStats } {
  const systemWalletTypes: Record<string, number> = {};
  let largestSystemHolding: FilterStats['largestSystemHolding'];
  
  const cleanHolders = holders.filter(holder => {
    const address = holder[addressField] as string;
    const amount = holder[amountField] as number;
    
    if (isSystemWallet(address)) {
      const type = getSystemWalletType(address) || 'Unknown System Wallet';
      systemWalletTypes[type] = (systemWalletTypes[type] || 0) + 1;
      
      if (!largestSystemHolding || amount > largestSystemHolding.amount) {
        largestSystemHolding = { address, type, amount };
      }
      
      return false;
    }
    return true;
  });
  
  const stats: FilterStats = {
    totalHolders: holders.length,
    systemWalletsRemoved: holders.length - cleanHolders.length,
    cleanHolders: cleanHolders.length,
    systemWalletTypes,
    largestSystemHolding,
  };
  
  return { cleanHolders, stats };
}

// Export everything for easy import
export default {
  PUMPFUN_BONDING_CURVE_VAULTS,
  RAYDIUM_AUTHORITIES,
  CEX_DEPOSIT_WALLETS,
  SOLANA_SYSTEM_ACCOUNTS,
  SYSTEM_WALLET_DENYLIST,
  isSystemWallet,
  isPumpFunBondingCurve,
  detectNewVaults,
  getSystemWalletType,
  filterSystemWallets,
  filterHoldersWithStats,
};

/**
 * Pump.fun AMM Wallet Auto-Detection
 * 
 * Dynamically identifies Pump.fun AMM/system wallets by checking on-chain characteristics:
 * 1. Token account owner is a known Pump.fun program
 * 2. Wallet holds tokens for multiple different mints (liquidity vault pattern)
 * 3. Recent activity matches AMM swap patterns
 * 
 * This allows filtering ALL Pump.fun AMM wallets without maintaining a static list.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import bs58 from 'bs58';

// Known Pump.fun program IDs and AMM vaults
// Updated December 2025: Added PumpSwap AMM program (pAMMBay6...)
const PUMPFUN_PROGRAM_IDS = new Set([
  // Original Bonding Curve System
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun Bonding Curve Program
  'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM', // Pump.fun Global
  'Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1', // Pump.fun Event Authority
  '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg', // Pump.fun Fee Receiver
  '5NknwpvMbNhUY71DEZWDhLHMjCXntvyRSvo4e6tvopbi', // Pump.fun WSOL AMM (CRITICAL - reported 20+ times)
  
  // NEW: PumpSwap AMM System (March 2025 - CRITICAL FOR GRADUATED TOKENS)
  'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA', // PumpSwap AMM Program - holds LP for graduated tokens
  'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ', // Pump.fun Fees Program
]);

// Cache detected AMM wallets (in-memory, resets on server restart)
const detectedAmmWallets = new Map<string, { 
  isPumpFunAmm: boolean; 
  reason: string;
  checkedAt: number;
}>();

const CACHE_TTL = 3600000; // 1 hour

export interface AmmDetectionResult {
  isPumpFunAmm: boolean;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Check if a wallet is a Pump.fun AMM vault by analyzing on-chain data
 */
export async function isPumpFunAmmWallet(
  connection: Connection,
  walletAddress: string,
  tokenMint: string
): Promise<AmmDetectionResult> {
  // Check cache first
  const cached = detectedAmmWallets.get(walletAddress);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
    return {
      isPumpFunAmm: cached.isPumpFunAmm,
      reason: cached.reason,
      confidence: 'high'
    };
  }

  try {
    // Method 1: Check if the token account is owned by a Pump.fun program
    const tokenAccountResult = await checkTokenAccountOwner(connection, walletAddress, tokenMint);
    if (tokenAccountResult.isPumpFunAmm) {
      cacheResult(walletAddress, true, tokenAccountResult.reason);
      return tokenAccountResult;
    }

    // Method 2: Check if wallet holds tokens from multiple mints (AMM pattern)
    const multiMintResult = await checkMultipleMintHoldings(connection, walletAddress);
    if (multiMintResult.isPumpFunAmm) {
      cacheResult(walletAddress, true, multiMintResult.reason);
      return multiMintResult;
    }

    // Method 3: Pattern matching - common Pump.fun AMM wallet patterns
    const patternResult = checkWalletPattern(walletAddress);
    if (patternResult.isPumpFunAmm) {
      cacheResult(walletAddress, true, patternResult.reason);
      return patternResult;
    }

    // Not detected as Pump.fun AMM
    cacheResult(walletAddress, false, 'No Pump.fun characteristics detected');
    return {
      isPumpFunAmm: false,
      reason: 'Regular holder wallet',
      confidence: 'high'
    };

  } catch (error) {
    console.error(`[PumpFunAmmDetector] Error checking wallet ${walletAddress}:`, error);
    return {
      isPumpFunAmm: false,
      reason: 'Detection failed',
      confidence: 'low'
    };
  }
}

/**
 * Check if the token account owner is a Pump.fun program
 */
async function checkTokenAccountOwner(
  connection: Connection,
  walletAddress: string,
  tokenMint: string
): Promise<AmmDetectionResult> {
  try {
    // Get all token accounts for this wallet
    const tokenAccounts = await connection.getTokenAccountsByOwner(
      new PublicKey(walletAddress),
      { mint: new PublicKey(tokenMint) }
    );

    if (tokenAccounts.value.length === 0) {
      return { isPumpFunAmm: false, reason: 'No token accounts found', confidence: 'low' };
    }

    // Check the first token account's data
    const accountInfo = tokenAccounts.value[0].account;
    const accountData = AccountLayout.decode(accountInfo.data);
    const owner = accountData.owner.toBase58();

    // Check if owner is a known Pump.fun program
    if (PUMPFUN_PROGRAM_IDS.has(owner)) {
      return {
        isPumpFunAmm: true,
        reason: `Token account owned by Pump.fun program ${owner}`,
        confidence: 'high'
      };
    }

    return { isPumpFunAmm: false, reason: 'Not owned by Pump.fun program', confidence: 'high' };

  } catch (error) {
    return { isPumpFunAmm: false, reason: 'Failed to check owner', confidence: 'low' };
  }
}

/**
 * Check if wallet holds tokens from multiple mints (AMM vault pattern)
 */
async function checkMultipleMintHoldings(
  connection: Connection,
  walletAddress: string
): Promise<AmmDetectionResult> {
  try {
    // Get all token accounts owned by this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletAddress),
      { programId: TOKEN_PROGRAM_ID }
    );

    const uniqueMints = new Set(
      tokenAccounts.value
        .filter(acc => acc.account.data.parsed.info.tokenAmount.uiAmount > 0)
        .map(acc => acc.account.data.parsed.info.mint)
    );

    // AMM vaults typically hold 100+ different tokens
    if (uniqueMints.size >= 100) {
      return {
        isPumpFunAmm: true,
        reason: `Wallet holds ${uniqueMints.size} different tokens (AMM vault pattern)`,
        confidence: 'high'
      };
    }

    // 50-99 mints is suspicious
    if (uniqueMints.size >= 50) {
      return {
        isPumpFunAmm: true,
        reason: `Wallet holds ${uniqueMints.size} different tokens (likely AMM)`,
        confidence: 'medium'
      };
    }

    return { isPumpFunAmm: false, reason: `Only ${uniqueMints.size} mints held`, confidence: 'high' };

  } catch (error) {
    return { isPumpFunAmm: false, reason: 'Failed to check holdings', confidence: 'low' };
  }
}

/**
 * Pattern matching based on common Pump.fun AMM wallet characteristics
 * Updated December 2025: Added PumpSwap AMM patterns (pAMM, pfee)
 */
function checkWalletPattern(walletAddress: string): AmmDetectionResult {
  // Known patterns in Pump.fun AMM addresses
  const pumpfunPatterns = [
    // Original Bonding Curve patterns
    /^6EF8/,   // Bonding curve vault prefix
    /^CebN/,   // Global prefix  
    /^39az/,   // Fee receiver prefix
    /^TSLv/,   // Associated token prefix
    /^Ce6T/,   // Event authority prefix
    /^e4HZ/,   // AMM vault prefix
    /^5Nkn/,   // WSOL AMM vault (CRITICAL)
    
    // NEW: PumpSwap AMM patterns (March 2025 - CRITICAL FOR GRADUATED TOKENS)
    /^pAMM/,   // PumpSwap AMM program - LP pools for graduated tokens
    /^pfee/,   // Pump.fun fees program
  ];

  for (const pattern of pumpfunPatterns) {
    if (pattern.test(walletAddress)) {
      return {
        isPumpFunAmm: true,
        reason: `Matches Pump.fun/PumpSwap address pattern: ${pattern.source}`,
        confidence: 'medium'
      };
    }
  }

  return { isPumpFunAmm: false, reason: 'No pattern match', confidence: 'high' };
}

/**
 * Cache detection result
 */
function cacheResult(walletAddress: string, isPumpFunAmm: boolean, reason: string) {
  detectedAmmWallets.set(walletAddress, {
    isPumpFunAmm,
    reason,
    checkedAt: Date.now()
  });
}

/**
 * Get cache statistics
 */
export function getDetectorStats() {
  const now = Date.now();
  const validEntries = Array.from(detectedAmmWallets.entries())
    .filter(([_, data]) => now - data.checkedAt < CACHE_TTL);

  const ammCount = validEntries.filter(([_, data]) => data.isPumpFunAmm).length;

  return {
    totalCached: validEntries.length,
    ammWalletsDetected: ammCount,
    regularWallets: validEntries.length - ammCount,
    cacheTTL: CACHE_TTL / 1000 / 60 // in minutes
  };
}

/**
 * Clear detection cache
 */
export function clearDetectionCache() {
  const size = detectedAmmWallets.size;
  detectedAmmWallets.clear();
  console.log(`[PumpFunAmmDetector] Cleared ${size} cached entries`);
}

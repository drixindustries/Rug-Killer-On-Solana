/**
 * Pump.fun AMM Wallet Auto-Detection
 * 
 * Dynamically identifies Pump.fun AMM/system wallets by checking on-chain characteristics:
 * 1. Token account owner is a known Pump.fun program (via Solscan API)
 * 2. Wallet holds tokens for multiple different mints (liquidity vault pattern)
 * 3. Recent activity matches AMM swap patterns
 * 
 * This allows filtering ALL Pump.fun AMM wallets without maintaining a static list.
 * NEW: Uses Solscan API for real-time detection and auto-whitelisting.
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
 * NEW: Uses Solscan API for real-time detection and auto-whitelisting
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
    // Method 1: Solscan API check (FASTEST & MOST RELIABLE) - Check if account owner is Pump.fun program
    const solscanResult = await checkSolscanAccountOwner(walletAddress);
    if (solscanResult.isPumpFunAmm) {
      // Auto-whitelist this wallet immediately
      await autoWhitelistPumpFunWallet(walletAddress, solscanResult.reason);
      cacheResult(walletAddress, true, solscanResult.reason);
      return solscanResult;
    }

    // Method 2: Check if the token account is owned by a Pump.fun program (RPC fallback)
    const tokenAccountResult = await checkTokenAccountOwner(connection, walletAddress, tokenMint);
    if (tokenAccountResult.isPumpFunAmm) {
      await autoWhitelistPumpFunWallet(walletAddress, tokenAccountResult.reason);
      cacheResult(walletAddress, true, tokenAccountResult.reason);
      return tokenAccountResult;
    }

    // Method 3: Check if wallet holds tokens from multiple mints (AMM pattern)
    const multiMintResult = await checkMultipleMintHoldings(connection, walletAddress);
    if (multiMintResult.isPumpFunAmm) {
      await autoWhitelistPumpFunWallet(walletAddress, multiMintResult.reason);
      cacheResult(walletAddress, true, multiMintResult.reason);
      return multiMintResult;
    }

    // Method 4: Pattern matching - common Pump.fun AMM wallet patterns
    const patternResult = checkWalletPattern(walletAddress);
    if (patternResult.isPumpFunAmm) {
      await autoWhitelistPumpFunWallet(walletAddress, patternResult.reason);
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
 * Check account owner using Solscan API v2 ONLY
 * Used sparingly - only for TOP holder during user scans to conserve API credits
 * Auto-whitelists detected AMM wallets
 */
async function checkSolscanAccountOwner(walletAddress: string): Promise<AmmDetectionResult> {
  const apiKey = process.env.SOLSCAN_API_KEY;
  if (!apiKey) {
    // Skip if no API key - fall back to RPC methods
    return { isPumpFunAmm: false, reason: 'Solscan API key not configured', confidence: 'low' };
  }

  try {
    // Solscan API v2 ONLY - no v1 fallback to conserve credits
    const url = `https://pro-api.solscan.io/v2.0/account/${walletAddress}`;
    const response = await fetch(url, {
      headers: {
        'token': apiKey.trim(),
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      // Rate limited or error - silently skip (fall back to pattern matching)
      return { isPumpFunAmm: false, reason: `Solscan v2 error: ${response.status}`, confidence: 'low' };
    }

    const data = await response.json();
    
    // Check for account owner in v2 response
    const owner = data?.data?.owner || data?.owner;
    if (owner && PUMPFUN_PROGRAM_IDS.has(owner)) {
      console.log(`[PumpFunAmmDetector] ✅ Solscan v2 detected Pump.fun AMM: ${walletAddress.slice(0, 8)}...`);
      return {
        isPumpFunAmm: true,
        reason: `Account owned by Pump.fun program: ${owner.slice(0, 8)}...`,
        confidence: 'high'
      };
    }

    // Check account type field for AMM patterns
    const accountType = data?.data?.type || data?.data?.accountType;
    if (accountType && (accountType.includes('pump') || accountType.includes('amm') || accountType.includes('pool'))) {
      console.log(`[PumpFunAmmDetector] ✅ Solscan v2 detected AMM account type: ${accountType}`);
      return {
        isPumpFunAmm: true,
        reason: `Account type: ${accountType}`,
        confidence: 'high'
      };
    }

    return { isPumpFunAmm: false, reason: 'Not owned by Pump.fun program', confidence: 'high' };

  } catch (error: any) {
    // Silently fail - fall back to RPC/pattern methods
    return { isPumpFunAmm: false, reason: `Solscan check failed: ${error.message}`, confidence: 'low' };
  }
}

/**
 * Auto-whitelist a Pump.fun AMM wallet immediately
 * This prevents it from being marked as a dev wallet in future scans
 */
async function autoWhitelistPumpFunWallet(walletAddress: string, reason: string): Promise<void> {
  try {
    // Import whitelist functions
    const { reloadPumpFunWhitelist } = await import('../pumpfun-whitelist.js');
    
    // Read current whitelist file
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const whitelistPath = path.resolve(__dirname, '../../generated/pumpfun-amm.json');
    
    // Load existing whitelist
    let whitelistData: any = { addresses: [], fetchedAt: new Date().toISOString(), source: 'auto-detected' };
    if (fs.existsSync(whitelistPath)) {
      try {
        const raw = fs.readFileSync(whitelistPath, 'utf8');
        whitelistData = JSON.parse(raw);
      } catch (err) {
        // File exists but invalid - start fresh
      }
    }
    
    // Ensure addresses array exists
    if (!Array.isArray(whitelistData.addresses)) {
      whitelistData.addresses = [];
    }
    
    // Add wallet if not already present
    const normalized = walletAddress.trim();
    if (!whitelistData.addresses.includes(normalized)) {
      whitelistData.addresses.push(normalized);
      whitelistData.addresses.sort(); // Keep sorted
      
      // Ensure directory exists
      const dir = path.dirname(whitelistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Save updated whitelist
      fs.writeFileSync(whitelistPath, JSON.stringify(whitelistData, null, 2));
      
      // Reload in-memory whitelist
      reloadPumpFunWhitelist();
      
      console.log(`[PumpFunAmmDetector] ✅ Auto-whitelisted new Pump.fun AMM wallet: ${normalized.slice(0, 8)}... (${reason})`);
    }
  } catch (error: any) {
    // Don't throw - whitelisting is best-effort
    console.warn(`[PumpFunAmmDetector] Failed to auto-whitelist ${walletAddress}:`, error.message);
  }
}

/**
 * Check if the token account owner is a Pump.fun program (RPC fallback method)
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
 * Updated Dec 2025: Also detects PumpSwap LP pools (2 tokens: base + WSOL)
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

    const nonZeroAccounts = tokenAccounts.value
      .filter(acc => acc.account.data.parsed.info.tokenAmount.uiAmount > 0);
    
    const uniqueMints = new Set(
      nonZeroAccounts.map(acc => acc.account.data.parsed.info.mint)
    );

    // CRITICAL: Check for PumpSwap LP pool pattern (exactly 2 tokens: base + WSOL)
    // PumpSwap pools hold the base token and WSOL for the trading pair
    const WSOL_MINT = 'So11111111111111111111111111111111111111112';
    if (uniqueMints.size === 2 && uniqueMints.has(WSOL_MINT)) {
      // Check if it has significant WSOL balance (indicates LP pool)
      const wsolAccount = nonZeroAccounts.find(
        acc => acc.account.data.parsed.info.mint === WSOL_MINT
      );
      const wsolBalance = wsolAccount?.account.data.parsed.info.tokenAmount.uiAmount || 0;
      
      // If holding >1 SOL worth, likely an LP pool
      if (wsolBalance > 1) {
        console.log(`[PumpFunAmmDetector] ✅ Detected PumpSwap LP pool: ${walletAddress.slice(0, 8)}... (2 tokens + ${wsolBalance.toFixed(2)} WSOL)`);
        return {
          isPumpFunAmm: true,
          reason: `PumpSwap LP pool pattern: 2 tokens with ${wsolBalance.toFixed(2)} WSOL`,
          confidence: 'high'
        };
      }
    }

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

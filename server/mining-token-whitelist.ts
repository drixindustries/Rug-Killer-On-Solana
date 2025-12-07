/**
 * Mining Token Whitelist
 * 
 * Mining tokens like $ORE, $COAL, $GODL are intentionally mintable.
 * The mint authority is controlled by a mining program (not a human)
 * and is required for the token to function.
 * 
 * These tokens should NOT be flagged for having active mint authority.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WHITELIST_PATH = path.resolve(__dirname, 'generated', 'mining-tokens.json');

interface MiningTokenEntry {
  address: string;
  name: string;
  symbol: string;
  reason: string;
  addedBy: string;
  addedAt: string;
}

interface MiningTokenWhitelist {
  tokens: MiningTokenEntry[];
  lastUpdated: string;
}

// Known mining tokens (hardcoded defaults)
const DEFAULT_MINING_TOKENS: MiningTokenEntry[] = [
  {
    address: 'oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp',
    name: 'Ore',
    symbol: 'ORE',
    reason: 'Proof-of-work mining token - mint authority is mining program',
    addedBy: 'system',
    addedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    address: 'E3yUqBNTZxV8ELvW99oRLC7z4ddbJqqR4NphwrMug9zu',
    name: 'Coal',
    symbol: 'COAL',
    reason: 'Mining token - mint authority is mining program',
    addedBy: 'system',
    addedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    address: 'DrSS5RM7zUd9qjUEdDaf31vnDUSbCrMto6mjqTrHFifN',
    name: 'GODL',
    symbol: 'GODL',
    reason: 'Mining token - mint authority is mining program',
    addedBy: 'system',
    addedAt: '2024-01-01T00:00:00.000Z'
  },
];

// In-memory whitelist
let whitelist: MiningTokenWhitelist = {
  tokens: [...DEFAULT_MINING_TOKENS],
  lastUpdated: new Date().toISOString()
};

// Load whitelist from file on startup
function loadWhitelist(): void {
  try {
    if (fs.existsSync(WHITELIST_PATH)) {
      const raw = fs.readFileSync(WHITELIST_PATH, 'utf8');
      const data = JSON.parse(raw) as MiningTokenWhitelist;
      
      // Merge with defaults (defaults take priority for same address)
      const defaultAddresses = new Set(DEFAULT_MINING_TOKENS.map(t => t.address));
      const customTokens = data.tokens.filter(t => !defaultAddresses.has(t.address));
      
      whitelist = {
        tokens: [...DEFAULT_MINING_TOKENS, ...customTokens],
        lastUpdated: data.lastUpdated
      };
      
      console.log(`[MiningWhitelist] Loaded ${whitelist.tokens.length} mining tokens (${DEFAULT_MINING_TOKENS.length} default + ${customTokens.length} custom)`);
    } else {
      console.log(`[MiningWhitelist] No custom whitelist found, using ${DEFAULT_MINING_TOKENS.length} default tokens`);
    }
  } catch (error) {
    console.error('[MiningWhitelist] Failed to load whitelist:', error);
  }
}

// Save whitelist to file
function saveWhitelist(): void {
  try {
    const dir = path.dirname(WHITELIST_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    whitelist.lastUpdated = new Date().toISOString();
    fs.writeFileSync(WHITELIST_PATH, JSON.stringify(whitelist, null, 2));
    console.log(`[MiningWhitelist] Saved ${whitelist.tokens.length} tokens to ${WHITELIST_PATH}`);
  } catch (error) {
    console.error('[MiningWhitelist] Failed to save whitelist:', error);
  }
}

// Initialize on module load
loadWhitelist();

/**
 * Check if a token is a whitelisted mining token
 */
export function isMiningToken(tokenAddress: string): boolean {
  return whitelist.tokens.some(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
}

/**
 * Get mining token info if whitelisted
 */
export function getMiningTokenInfo(tokenAddress: string): MiningTokenEntry | null {
  return whitelist.tokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase()) || null;
}

/**
 * Add a token to the mining whitelist (admin only)
 */
export function addMiningToken(
  address: string,
  name: string,
  symbol: string,
  reason: string,
  addedBy: string
): { success: boolean; message: string } {
  // Check if already exists
  if (isMiningToken(address)) {
    return { success: false, message: `Token ${symbol} (${address}) is already whitelisted` };
  }
  
  const entry: MiningTokenEntry = {
    address,
    name,
    symbol,
    reason,
    addedBy,
    addedAt: new Date().toISOString()
  };
  
  whitelist.tokens.push(entry);
  saveWhitelist();
  
  console.log(`[MiningWhitelist] ✅ Added mining token: ${symbol} (${address}) by ${addedBy}`);
  return { success: true, message: `Added ${symbol} (${address}) to mining token whitelist` };
}

/**
 * Remove a token from the mining whitelist (admin only)
 */
export function removeMiningToken(address: string, removedBy: string): { success: boolean; message: string } {
  const index = whitelist.tokens.findIndex(t => t.address.toLowerCase() === address.toLowerCase());
  
  if (index === -1) {
    return { success: false, message: `Token ${address} is not in the whitelist` };
  }
  
  const removed = whitelist.tokens.splice(index, 1)[0];
  saveWhitelist();
  
  console.log(`[MiningWhitelist] ❌ Removed mining token: ${removed.symbol} (${address}) by ${removedBy}`);
  return { success: true, message: `Removed ${removed.symbol} (${address}) from mining token whitelist` };
}

/**
 * Get all whitelisted mining tokens
 */
export function getMiningTokenList(): MiningTokenEntry[] {
  return [...whitelist.tokens];
}

/**
 * Reload whitelist from file
 */
export function reloadMiningWhitelist(): void {
  loadWhitelist();
}


import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface PumpFunWhitelistFile {
  addresses?: string[];
  fetchedAt?: string;
  source?: string;
  pageSize?: number;
  pagesFetched?: number;
  addressCount?: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, "generated", "pumpfun-amm.json");
let missingFileLogged = false;

function loadWhitelist(): PumpFunWhitelistFile {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      if (!missingFileLogged) {
        console.log(
          "[PumpFunWhitelist] pumpfun-amm.json not found (optional). Run `npm run pumpfun:sync` only if Pump.fun AMM filtering is required."
        );
        missingFileLogged = true;
      }
      return { addresses: [] };
    }

    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as PumpFunWhitelistFile;
    if (!Array.isArray(parsed.addresses)) {
      console.log(
        "[PumpFunWhitelist] Generated file missing addresses array. Falling back to empty set."
      );
      return { addresses: [] };
    }
    return parsed;
  } catch (error) {
    console.warn("[PumpFunWhitelist] Failed to read pumpfun-amm.json:", error);
    return { addresses: [] };
  }
}

// Core Pump.fun addresses that should ALWAYS be filtered
// These are the most common AMM/system addresses seen in token launches
const CORE_PUMPFUN_ADDRESSES = new Set([
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun Program (bonding curve vault)
  'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM', // Pump.fun Global
  '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg', // Pump.fun Fee Receiver
  'TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM',  // Pump.fun Associated Token Account
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',  // Associated Token Program
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',  // Token Program
  'Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1',  // Pump.fun Event Authority
  'e4HZW81GuZkgDK2YAdPF6PsToQAB6Go6dL3iQpDz2Hy',  // Pump.fun AMM/Liquidity Vault
]);

const fileContents = loadWhitelist();
const normalizedAddresses = new Set([
  ...CORE_PUMPFUN_ADDRESSES, // Always include core addresses
  ...(fileContents.addresses || [])
    .map(address => address.trim())
    .filter(address => address.length > 0)
]);

export const PUMPFUN_AMM_WALLETS = normalizedAddresses;

export function isPumpFunAmm(address: string): boolean {
  return normalizedAddresses.has(address);
}

export function getPumpFunWhitelistStats() {
  return {
    count: normalizedAddresses.size,
    fetchedAt: fileContents.fetchedAt ?? null,
    source: fileContents.source ?? "solscan",
    dataPath: DATA_PATH,
  };
}

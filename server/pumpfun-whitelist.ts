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

function loadWhitelist(): PumpFunWhitelistFile {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      console.warn(
        "[PumpFunWhitelist] pumpfun-amm.json not found. Run `npm run pumpfun:sync` to generate it."
      );
      return { addresses: [] };
    }

    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as PumpFunWhitelistFile;
    if (!Array.isArray(parsed.addresses)) {
      console.warn(
        "[PumpFunWhitelist] Generated file is missing an addresses array. Falling back to empty set."
      );
      return { addresses: [] };
    }
    return parsed;
  } catch (error) {
    console.error("[PumpFunWhitelist] Failed to read pumpfun-amm.json:", error);
    return { addresses: [] };
  }
}

const fileContents = loadWhitelist();
const normalizedAddresses = new Set(
  (fileContents.addresses || [])
    .map(address => address.trim())
    .filter(address => address.length > 0)
);

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

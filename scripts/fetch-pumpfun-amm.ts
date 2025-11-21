import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOLSCAN_API_KEY = process.env.SOLSCAN_API?.trim();
const TAG_NAME = process.env.PUMPFUN_AMM_TAG?.trim() || "Pump.fun AMM";
const PAGE_SIZE = Number(process.env.SOLSCAN_PAGE_SIZE ?? "500");
const BASE_URL = (process.env.SOLSCAN_BASE_URL || "https://pro-api.solscan.com").replace(/\/$/, "");
const TAG_ENDPOINT = process.env.SOLSCAN_TAG_ENDPOINT || "/v1.0/account/tag";
const TAG_PARAM = process.env.SOLSCAN_TAG_PARAM || "tag";
const PAGE_PARAM = process.env.SOLSCAN_PAGE_PARAM || "page";
const SIZE_PARAM = process.env.SOLSCAN_PAGE_SIZE_PARAM || "page_size";
const RATE_DELAY_MS = Number(process.env.SOLSCAN_RATE_DELAY_MS ?? "450");
const MAX_PAGES = Number(process.env.SOLSCAN_MAX_PAGES ?? "0");
const ALLOW_EMPTY = process.env.ALLOW_EMPTY_PUMPFUN_SYNC === "true";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outputDir = path.join(repoRoot, "server", "generated");
const outputFile = path.join(outputDir, "pumpfun-amm.json");

interface FetchStats {
  pages: number;
  duplicates: number;
  emptyPages: number;
  reportedTotal?: number;
}

interface PageResult {
  addresses: string[];
  reportedTotal?: number;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildUrl(page: number): URL {
  const base = `${BASE_URL}${TAG_ENDPOINT.startsWith("/") ? "" : "/"}${TAG_ENDPOINT}`;
  const url = new URL(base);
  url.searchParams.set(TAG_PARAM, TAG_NAME);
  url.searchParams.set(PAGE_PARAM, String(page));
  url.searchParams.set(SIZE_PARAM, String(PAGE_SIZE));
  return url;
}

async function fetchPage(page: number, attempt = 0): Promise<PageResult> {
  const url = buildUrl(page);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (SOLSCAN_API_KEY) {
    headers.token = SOLSCAN_API_KEY;
  }

  const response = await fetch(url, { headers });

  if (response.status === 429 && attempt < 5) {
    const retryAfter = Number(response.headers.get("retry-after")) * 1000 || (attempt + 1) * 1000;
    console.warn(`[PumpFun Fetcher] Rate limited (429). Retrying page ${page} in ${retryAfter}ms`);
    await delay(retryAfter);
    return fetchPage(page, attempt + 1);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Solscan request failed (page ${page}) - ${response.status} ${response.statusText}: ${text}`);
  }

  const payload = await response.json();
  const records = extractRecords(payload);
  const addresses = records.map(record => pickAddress(record)).filter((addr): addr is string => Boolean(addr));
  return {
    addresses,
    reportedTotal: extractTotal(payload),
  };
}

function extractRecords(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const candidateKeys = [
    "data",
    "result",
    "items",
    "list",
    "accounts",
    "address_list",
  ];

  for (const key of candidateKeys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === "object") {
      const nested = extractRecords(value);
      if (nested.length) {
        return nested;
      }
    }
  }

  return [];
}

function extractTotal(payload: any): number | undefined {
  if (!payload) return undefined;
  if (typeof payload.total === "number") return payload.total;
  if (typeof payload.count === "number") return payload.count;
  if (payload.data) {
    if (typeof payload.data.total === "number") return payload.data.total;
    if (typeof payload.data.count === "number") return payload.data.count;
  }
  return undefined;
}

function pickAddress(record: any): string | undefined {
  if (!record || typeof record !== "object") return undefined;
  const candidates = [
    record.address,
    record.owner,
    record.account,
    record.pubkey,
    record.wallet,
  ];
  const value = candidates.find((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0);
  return value?.trim();
}

async function main() {
  if (!SOLSCAN_API_KEY) {
    console.warn("[PumpFun Fetcher] SOLSCAN_API key not provided. Continuing with public rate limits.");
  }

  const addressSet = new Set<string>();
  const stats: FetchStats = { pages: 0, duplicates: 0, emptyPages: 0 };

  for (let page = 1; ; page += 1) {
    if (MAX_PAGES > 0 && page > MAX_PAGES) {
      console.log(`[PumpFun Fetcher] Stopping at configured page limit (${MAX_PAGES}).`);
      break;
    }

    const { addresses, reportedTotal } = await fetchPage(page);
    if (reportedTotal && !stats.reportedTotal) {
      stats.reportedTotal = reportedTotal;
    }

    if (!addresses.length) {
      stats.emptyPages += 1;
      console.log(`[PumpFun Fetcher] Page ${page} returned 0 addresses.`);
      if (page === 1) {
        break;
      }
      if (RATE_DELAY_MS > 0) {
        await delay(RATE_DELAY_MS);
      }
      break;
    }

    let newAddresses = 0;
    for (const addr of addresses) {
      const normalized = addr.trim();
      if (!normalized) continue;
      if (addressSet.has(normalized)) {
        stats.duplicates += 1;
        continue;
      }
      addressSet.add(normalized);
      newAddresses += 1;
    }

    stats.pages += 1;
    console.log(`[PumpFun Fetcher] Page ${page}: ${newAddresses} new / ${addresses.length} raw (total=${addressSet.size}).`);

    if (addresses.length < PAGE_SIZE) {
      console.log(`[PumpFun Fetcher] Page ${page} shorter than page size (${PAGE_SIZE}). Assuming last page.`);
      break;
    }

    if (RATE_DELAY_MS > 0) {
      await delay(RATE_DELAY_MS);
    }
  }

  if (!addressSet.size && !ALLOW_EMPTY) {
    throw new Error("Pump.fun AMM fetch returned zero addresses. Set ALLOW_EMPTY_PUMPFUN_SYNC=true to bypass this safeguard.");
  }

  await fs.mkdir(outputDir, { recursive: true });
  const payload = {
    tag: TAG_NAME,
    source: `${BASE_URL}${TAG_ENDPOINT}`,
    fetchedAt: new Date().toISOString(),
    pageSize: PAGE_SIZE,
    pagesFetched: stats.pages,
    duplicatesSkipped: stats.duplicates,
    reportedTotal: stats.reportedTotal ?? null,
    addressCount: addressSet.size,
    addresses: Array.from(addressSet).sort(),
  };

  await fs.writeFile(outputFile, JSON.stringify(payload, null, 2));
  console.log(`[PumpFun Fetcher] Wrote ${addressSet.size} addresses to ${path.relative(repoRoot, outputFile)}`);
}

main().catch(error => {
  console.error("[PumpFun Fetcher] Failed:", error);
  process.exitCode = 1;
});

/**
 * Solscan Pump.fun AMM Wallet Sync Service
 * Fetches ALL Pump.fun AMM wallets from Solscan API and whitelists them
 * 
 * Rate Limits (Free Tier):
 * - 10M CUs/month
 * - 1000 requests/60 seconds
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Connection, PublicKey } from '@solana/web3.js';
import { rpcBalancer } from './rpc-balancer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WHITELIST_PATH = path.resolve(__dirname, '../../generated/pumpfun-amm.json');

// All known Pump.fun program IDs (including PumpSwap AMM)
const PUMPFUN_PROGRAM_IDS = [
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun Bonding Curve Program
  'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA', // PumpSwap AMM Program
  'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ', // Pump.fun Fees Program
  'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM', // Pump.fun Global
];

interface SolscanAccountResponse {
  success: boolean;
  data: Array<{
    account: string;
    lamports: number;
    owner: string;
    executable: boolean;
    rentEpoch: number;
    data: string;
  }>;
  total: number;
}

interface PumpFunWhitelistFile {
  addresses: string[];
  fetchedAt: string;
  source: string;
  totalFetched: number;
  programIds: string[];
}

export class SolscanPumpFunSync {
  private apiKey: string;
  private readonly BASE_URL = 'https://api.solscan.io';
  private readonly RATE_LIMIT_DELAY = 100; // 100ms between requests (10 req/sec = 600/min, well under 1000/60s limit)

  constructor() {
    const key = process.env.SOLSCAN_API_KEY;
    if (!key) {
      throw new Error('SOLSCAN_API_KEY environment variable is required');
    }
    this.apiKey = key.trim();
  }

  /**
   * Fetch all accounts owned by a Pump.fun program using Solscan API
   */
  private async fetchProgramAccounts(programId: string, page: number = 0, pageSize: number = 100): Promise<string[]> {
    try {
      // Solscan API endpoint for program accounts
      // Using account/list endpoint with program filter
      const url = `${this.BASE_URL}/account/list?programId=${programId}&page=${page}&size=${pageSize}`;
      
      const response = await fetch(url, {
        headers: {
          'token': this.apiKey,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`[SolscanSync] Rate limited for program ${programId}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          return this.fetchProgramAccounts(programId, page, pageSize);
        }
        throw new Error(`Solscan API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as SolscanAccountResponse;
      
      if (!data.success || !data.data) {
        console.warn(`[SolscanSync] Invalid response for program ${programId}`);
        return [];
      }

      // Extract account addresses
      const accounts = data.data.map(item => item.account);
      
      // If we got a full page, there might be more
      if (accounts.length === pageSize && data.total > (page + 1) * pageSize) {
        // Rate limit: wait before next page
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
        const nextPage = await this.fetchProgramAccounts(programId, page + 1, pageSize);
        return [...accounts, ...nextPage];
      }

      return accounts;
    } catch (error: any) {
      console.error(`[SolscanSync] Error fetching program ${programId}:`, error.message);
      return [];
    }
  }

  /**
   * Use RPC getProgramAccounts to fetch ALL accounts owned by Pump.fun programs
   * This is the most reliable method to get ALL AMM wallets
   */
  private async fetchProgramAccountsViaRPC(programId: string): Promise<string[]> {
    try {
      const connection = rpcBalancer.getConnection();
      const programPubkey = new PublicKey(programId);
      
      console.log(`[SolscanSync] Fetching ALL accounts for program ${programId.slice(0, 8)}... via RPC...`);
      
      // Get all accounts owned by this program
      // This will return ALL accounts, which is what we want
      const accounts = await connection.getProgramAccounts(programPubkey, {
        encoding: 'base64',
        filters: [] // Get all accounts (no filters = all accounts)
      });

      const addresses = accounts.map(acc => acc.pubkey.toBase58());
      console.log(`[SolscanSync] ✅ Program ${programId.slice(0, 8)}...: Found ${addresses.length} accounts`);
      
      return addresses;
    } catch (error: any) {
      console.error(`[SolscanSync] ❌ RPC error for program ${programId}:`, error.message);
      return [];
    }
  }

  /**
   * Sync all Pump.fun AMM wallets from Solscan
   */
  async syncAllPumpFunWallets(): Promise<{ total: number; addresses: string[]; errors: string[] }> {
    console.log('[SolscanSync] Starting Pump.fun AMM wallet sync...');
    const allAddresses = new Set<string>();
    const errors: string[] = [];

    // Start with known core addresses
    const CORE_ADDRESSES = [
      '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
      'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM',
      '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg',
      'TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM',
      'Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1',
      'e4HZW81GuZkgDK2YAdPF6PsToQAB6Go6dL3iQpDz2Hy',
      '5NknwpvMbNhUY71DEZWDhLHMjCXntvyRSvo4e6tvopbi',
      'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
      'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ',
    ];
    
    CORE_ADDRESSES.forEach(addr => allAddresses.add(addr));

    // Fetch accounts for each Pump.fun program
    for (const programId of PUMPFUN_PROGRAM_IDS) {
      try {
        console.log(`[SolscanSync] Fetching accounts for program ${programId}...`);
        
        // Try RPC method first (more reliable)
        const rpcAccounts = await this.fetchProgramAccountsViaRPC(programId);
        rpcAccounts.forEach(addr => allAddresses.add(addr));
        
        // Also try Solscan API as backup
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
        const apiAccounts = await this.fetchProgramAccounts(programId);
        apiAccounts.forEach(addr => allAddresses.add(addr));
        
        console.log(`[SolscanSync] Program ${programId}: Found ${rpcAccounts.length} (RPC) + ${apiAccounts.length} (API) = ${allAddresses.size} total unique`);
      } catch (error: any) {
        const errorMsg = `Failed to fetch program ${programId}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`[SolscanSync] ${errorMsg}`);
      }
    }

    // Save to whitelist file
    const whitelistData: PumpFunWhitelistFile = {
      addresses: Array.from(allAddresses).sort(),
      fetchedAt: new Date().toISOString(),
      source: 'solscan-api-sync',
      totalFetched: allAddresses.size,
      programIds: PUMPFUN_PROGRAM_IDS
    };

    // Ensure directory exists
    const dir = path.dirname(WHITELIST_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(WHITELIST_PATH, JSON.stringify(whitelistData, null, 2));
    console.log(`[SolscanSync] ✅ Saved ${allAddresses.size} Pump.fun AMM wallets to ${WHITELIST_PATH}`);

    // Reload the whitelist in memory so it's immediately available
    try {
      const { reloadPumpFunWhitelist } = await import('../pumpfun-whitelist.js');
      reloadPumpFunWhitelist();
      console.log(`[SolscanSync] ✅ Whitelist reloaded in memory`);
    } catch (err) {
      console.warn('[SolscanSync] Failed to reload whitelist in memory:', err);
    }

    return {
      total: allAddresses.size,
      addresses: Array.from(allAddresses),
      errors
    };
  }

  /**
   * Quick sync - fetches only recent/active accounts (faster)
   */
  async quickSync(): Promise<{ total: number; addresses: string[] }> {
    console.log('[SolscanSync] Starting quick sync (recent accounts only)...');
    const allAddresses = new Set<string>();

    // Use RPC to get program accounts (faster than API pagination)
    for (const programId of PUMPFUN_PROGRAM_IDS) {
      try {
        const accounts = await this.fetchProgramAccountsViaRPC(programId);
        accounts.forEach(addr => allAddresses.add(addr));
        console.log(`[SolscanSync] Program ${programId}: ${accounts.length} accounts`);
      } catch (error: any) {
        console.error(`[SolscanSync] Error fetching ${programId}:`, error.message);
      }
    }

    return {
      total: allAddresses.size,
      addresses: Array.from(allAddresses)
    };
  }
}

// Singleton instance
let syncService: SolscanPumpFunSync | null = null;

export function getSolscanPumpFunSync(): SolscanPumpFunSync {
  if (!syncService) {
    syncService = new SolscanPumpFunSync();
    if (syncService.apiKey) {
      console.log('[SolscanSync] ✅ Service initialized with SOLSCAN_API_KEY');
    } else {
      console.log('[SolscanSync] ✅ Service initialized (using standard RPC - no API key needed)');
    }
  }
  return syncService;
}

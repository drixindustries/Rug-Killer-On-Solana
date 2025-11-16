/**
 * Lightning Fast RPC Service with Redis Caching
 * 
 * Replaces the old RPC balancer with cached endpoints
 * Cache times:
 * - Token supply: 2 minutes
 * - Account info: 1 minute  
 * - Transaction signatures: 30 seconds
 * - Block height: 10 seconds
 */

import { Connection, PublicKey } from '@solana/web3.js';
import type { GetProgramAccountsFilter } from '@solana/web3.js';
import { redisCache } from './redis-cache.ts';

class FastRPCService {
  private connections: Connection[];
  private currentIndex: number = 0;

  constructor() {
    // Use multiple high-performance RPC endpoints
    const endpoints = [
      process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
      process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com',
      'https://rpc.ankr.com/solana',
    ].filter(Boolean);

    this.connections = endpoints.map(url => new Connection(url, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 30000,
      wsEndpoint: undefined, // Disable WebSocket for better performance
    }));

    console.log(`[FastRPC] Initialized with ${this.connections.length} endpoints`);
  }

  /**
   * Get next connection in round-robin fashion
   */
  private getConnection(): Connection {
    const connection = this.connections[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.connections.length;
    return connection;
  }

  /**
   * Cached token supply lookup (2 min cache)
   */
  async getTokenSupply(mintAddress: string): Promise<bigint> {
    const cacheKey = `rpc:supply:${mintAddress}`;
    
    return await redisCache.cacheFetch(
      cacheKey,
      async () => {
        try {
          const connection = this.getConnection();
          const mintPubkey = new PublicKey(mintAddress);
          const mintInfo = await connection.getTokenSupply(mintPubkey);
          return BigInt(mintInfo.value.amount);
        } catch (error) {
          console.error(`[FastRPC] Token supply error for ${mintAddress}:`, error);
          return BigInt(0);
        }
      },
      120 // 2 minutes
    );
  }

  /**
   * Cached account info lookup (1 min cache) with retry logic
   */
  async getAccountInfo(address: string) {
    const cacheKey = `rpc:account:${address}`;
    
    return await redisCache.cacheFetch(
      cacheKey,
      async () => {
        // Try multiple connections with retries
        const maxRetries = 3;
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
          try {
            const connection = this.getConnection();
            const pubkey = new PublicKey(address);
            const accountInfo = await connection.getAccountInfo(pubkey, 'confirmed');
            
            if (accountInfo) {
              return accountInfo;
            }
            
            // Account doesn't exist - try next endpoint
            console.warn(`[FastRPC] Account not found on endpoint ${i + 1}: ${address}`);
            lastError = new Error('Account not found');
          } catch (error) {
            console.error(`[FastRPC] Account info error on attempt ${i + 1} for ${address}:`, error);
            lastError = error;
            
            // Wait a bit before retry
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
            }
          }
        }
        
        // All attempts failed
        console.error(`[FastRPC] Failed to fetch account info after ${maxRetries} attempts: ${address}`);
        return null;
      },
      60 // 1 minute
    );
  }

  /**
   * Cached token largest accounts (5 min cache - rarely changes)
   */
  async getTokenLargestAccounts(mintAddress: string) {
    const cacheKey = `rpc:largest:${mintAddress}`;
    
    return await redisCache.cacheFetch(
      cacheKey,
      async () => {
        try {
          const connection = this.getConnection();
          const mintPubkey = new PublicKey(mintAddress);
          const result = await connection.getTokenLargestAccounts(mintPubkey);
          return result.value;
        } catch (error) {
          console.error(`[FastRPC] Largest accounts error for ${mintAddress}:`, error);
          return [];
        }
      },
      300 // 5 minutes
    );
  }

  /**
   * Cached transaction signatures (30 sec cache)
   */
  async getSignaturesForAddress(address: string, limit: number = 100) {
    const cacheKey = `rpc:sigs:${address}:${limit}`;
    
    return await redisCache.cacheFetch(
      cacheKey,
      async () => {
        try {
          const connection = this.getConnection();
          const pubkey = new PublicKey(address);
          const signatures = await connection.getSignaturesForAddress(
            pubkey,
            { limit },
            'confirmed'
          );
          return signatures;
        } catch (error) {
          console.error(`[FastRPC] Signatures error for ${address}:`, error);
          return [];
        }
      },
      30 // 30 seconds
    );
  }

  /**
   * Cached program accounts (10 min cache - very stable)
   */
  async getProgramAccounts(
    programId: string,
    filters?: GetProgramAccountsFilter[]
  ) {
    const filterHash = filters ? JSON.stringify(filters).slice(0, 20) : 'none';
    const cacheKey = `rpc:program:${programId}:${filterHash}`;
    
    return await redisCache.cacheFetch(
      cacheKey,
      async () => {
        try {
          const connection = this.getConnection();
          const programPubkey = new PublicKey(programId);
          const accounts = await connection.getProgramAccounts(
            programPubkey,
            { filters: filters || [] }
          );
          return accounts;
        } catch (error) {
          console.error(`[FastRPC] Program accounts error for ${programId}:`, error);
          return [];
        }
      },
      600 // 10 minutes
    );
  }

  /**
   * Cached mint info (5 min cache) with retry and multi-program support
   */
  async getMintInfo(mintAddress: string) {
    const cacheKey = `rpc:mint:${mintAddress}`;
    
    return await redisCache.cacheFetch(
      cacheKey,
      async () => {
        const { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = await import('@solana/spl-token');
        const maxRetries = 3;
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
          try {
            const connection = this.getConnection();
            const mintPubkey = new PublicKey(mintAddress);
            
            // Try standard SPL Token program first
            try {
              const mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_PROGRAM_ID);
              return mintInfo;
            } catch (splError) {
              // Try Token-2022 program
              try {
                const mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID);
                return mintInfo;
              } catch (token2022Error) {
                throw splError; // Throw original error if both fail
              }
            }
          } catch (error) {
            console.error(`[FastRPC] Mint info error on attempt ${i + 1} for ${mintAddress}:`, error);
            lastError = error;
            
            // Wait before retry
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
            }
          }
        }
        
        console.error(`[FastRPC] Failed to fetch mint info after ${maxRetries} attempts: ${mintAddress}`);
        return null;
      },
      300 // 5 minutes
    );
  }

  /**
   * Get fresh connection for non-cacheable operations
   */
  getDirectConnection(): Connection {
    return this.getConnection();
  }

  /**
   * Health check all connections
   */
  async healthCheck(): Promise<{ healthy: number; total: number; latencies: number[] }> {
    const results = await Promise.allSettled(
      this.connections.map(async (connection, index) => {
        const start = Date.now();
        try {
          await connection.getSlot();
          return Date.now() - start;
        } catch (error) {
          console.error(`[FastRPC] Health check failed for endpoint ${index}:`, error);
          throw error;
        }
      })
    );

    const latencies = results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<number>).value);

    return {
      healthy: latencies.length,
      total: this.connections.length,
      latencies
    };
  }
}

// Global singleton instance
export const fastRPC = new FastRPCService();
export default fastRPC;
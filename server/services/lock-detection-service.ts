/**
 * Token Lock Detection Service
 *
 * Detects tokens locked in various locking protocols:
 * - Streamflow vesting contracts
 * - Jupiter lock program
 * - Other locking mechanisms
 */

import { Connection, PublicKey, GetProgramAccountsFilter } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { redisCache } from './redis-cache.js';
import { rpcBalancer } from './rpc-balancer.js';

export interface LockInfo {
  protocol: 'streamflow' | 'jupiter' | 'other';
  lockAddress: string;
  lockedAmount: number;
  totalSupplyPercent: number;
  unlockDate?: number; // Unix timestamp
  isLocked: boolean;
  metadata?: any; // Protocol-specific metadata
}

export interface TokenLockStatus {
  tokenAddress: string;
  totalLockedAmount: number;
  totalLockedPercent: number;
  locks: LockInfo[];
  isAnyLocked: boolean;
  lastChecked: number;
}

// Known lock program IDs
const LOCK_PROGRAMS = {
  STREAMFLOW: new PublicKey('5SEpbdjFK5FxwTvfsGMXVQmt3izYhwE8JzqYJGAMt6P'),
  STREAMFLOW_DEVNET: new PublicKey('5SEpbdjFK5FxwTvfsGMXVQmt3izYhwE8JzqYJGAMt6P'), // Same on devnet
  JUPITER_LOCK: new PublicKey('LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKdPhw'), // Jupiter lock program
};

export class LockDetectionService {
  private readonly CACHE_TTL = 3600; // 1 hour cache

  /**
   * Check if a token has any locked tokens
   */
  async checkTokenLocks(tokenAddress: string): Promise<TokenLockStatus> {
    const cacheKey = `token-locks:${tokenAddress}`;

    return redisCache.cacheFetch(
      cacheKey,
      async () => {
        try {
          console.log(`[LockDetection] Checking locks for ${tokenAddress}`);

          const connection = rpcBalancer.getConnection();
          const locks: LockInfo[] = [];

          // Check Streamflow locks
          const streamflowLocks = await this.checkStreamflowLocks(connection, tokenAddress);
          locks.push(...streamflowLocks);

          // Check Jupiter locks
          const jupiterLocks = await this.checkJupiterLocks(connection, tokenAddress);
          locks.push(...jupiterLocks);

          // Calculate totals
          const totalLockedAmount = locks.reduce((sum, lock) => sum + lock.lockedAmount, 0);

          // Get total supply for percentage calculation
          const mintPubkey = new PublicKey(tokenAddress);
          let totalSupply = 0;
          try {
            const mintInfo = await connection.getAccountInfo(mintPubkey);
            if (mintInfo?.data) {
              // Parse supply from mint account (offset 4-12 for u64 supply)
              totalSupply = Number(mintInfo.data.readBigUInt64LE(4));
            }
          } catch (error) {
            console.warn(`[LockDetection] Could not get total supply for ${tokenAddress}`);
          }

          const totalLockedPercent = totalSupply > 0 ? (totalLockedAmount / totalSupply) * 100 : 0;

          const result: TokenLockStatus = {
            tokenAddress,
            totalLockedAmount,
            totalLockedPercent,
            locks,
            isAnyLocked: locks.length > 0,
            lastChecked: Date.now(),
          };

          console.log(`[LockDetection] Found ${locks.length} locks for ${tokenAddress} (${totalLockedPercent.toFixed(2)}% locked)`);
          return result;

        } catch (error) {
          console.error('[LockDetection] Error checking token locks:', error);
          return {
            tokenAddress,
            totalLockedAmount: 0,
            totalLockedPercent: 0,
            locks: [],
            isAnyLocked: false,
            lastChecked: Date.now(),
          };
        }
      },
      this.CACHE_TTL
    );
  }

  /**
   * Check for Streamflow vesting contracts
   */
  private async checkStreamflowLocks(
    connection: Connection,
    tokenAddress: string
  ): Promise<LockInfo[]> {
    const locks: LockInfo[] = [];

    try {
      // Streamflow uses PDAs for vesting contracts
      // We need to find accounts owned by Streamflow program that hold our token

      const tokenPubkey = new PublicKey(tokenAddress);

      // Get all token accounts for this mint
      const filters: GetProgramAccountsFilter[] = [
        {
          memcmp: {
            offset: 0, // Mint address is at offset 0 in token accounts
            bytes: tokenPubkey.toBase58(),
          },
        },
        {
          dataSize: 165, // Size of token account
        },
      ];

      const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
        commitment: 'confirmed',
        filters,
      });

      // Also check TOKEN_2022_PROGRAM_ID
      const accounts2022 = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
        commitment: 'confirmed',
        filters,
      });

      const allAccounts = [...accounts, ...accounts2022];

      // Check which token accounts are owned by Streamflow program
      for (const account of allAccounts) {
        try {
          // Parse token account data
          const data = account.account.data;
          if (data.length < 72) continue;

          // Owner is at offset 32-64
          const ownerBytes = data.subarray(32, 64);
          const owner = new PublicKey(ownerBytes);

          // Check if owner is a Streamflow vesting contract
          if (await this.isStreamflowVesting(connection, owner)) {
            const amount = data.readBigUInt64LE(64); // Amount at offset 64

            locks.push({
              protocol: 'streamflow',
              lockAddress: account.pubkey.toString(),
              lockedAmount: Number(amount),
              totalSupplyPercent: 0, // Will be calculated later
              isLocked: true,
              metadata: {
                vestingContract: owner.toString(),
              },
            });
          }
        } catch (error) {
          // Skip invalid accounts
          continue;
        }
      }

    } catch (error) {
      console.warn('[LockDetection] Error checking Streamflow locks:', error);
    }

    return locks;
  }

  /**
   * Check if an address is a Streamflow vesting contract
   */
  private async isStreamflowVesting(connection: Connection, address: PublicKey): Promise<boolean> {
    try {
      const accountInfo = await connection.getAccountInfo(address);
      if (!accountInfo) return false;

      // Streamflow vesting contracts are owned by the Streamflow program
      return accountInfo.owner.equals(LOCK_PROGRAMS.STREAMFLOW);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for Jupiter lock program
   */
  private async checkJupiterLocks(
    connection: Connection,
    tokenAddress: string
  ): Promise<LockInfo[]> {
    const locks: LockInfo[] = [];

    try {
      // Jupiter lock program structure is more complex
      // For now, we'll implement a basic check
      const tokenPubkey = new PublicKey(tokenAddress);

      // Look for Jupiter lock accounts that reference our token
      // This is a simplified implementation - Jupiter's lock program has complex PDA structures

      const filters: GetProgramAccountsFilter[] = [
        {
          memcmp: {
            offset: 8, // Often tokens are stored at offset 8 in Jupiter locks
            bytes: tokenPubkey.toBase58(),
          },
        },
      ];

      const accounts = await connection.getProgramAccounts(LOCK_PROGRAMS.JUPITER_LOCK, {
        commitment: 'confirmed',
        filters,
      });

      for (const account of accounts) {
        try {
          // Parse Jupiter lock data (this would need Jupiter-specific parsing)
          // For now, we assume any account is a lock if it references our token
          locks.push({
            protocol: 'jupiter',
            lockAddress: account.pubkey.toString(),
            lockedAmount: 0, // Would need to parse from account data
            totalSupplyPercent: 0, // Will be calculated later
            isLocked: true,
            metadata: {
              rawData: account.account.data,
            },
          });
        } catch (error) {
          continue;
        }
      }

    } catch (error) {
      console.warn('[LockDetection] Error checking Jupiter locks:', error);
    }

    return locks;
  }

  /**
   * Get a quick lock summary for alerts
   */
  async getLockSummary(tokenAddress: string): Promise<{
    isAnyLocked: boolean;
    totalLockedPercent: number;
    lockCount: number;
  }> {
    try {
      const lockStatus = await this.checkTokenLocks(tokenAddress);
      return {
        isAnyLocked: lockStatus.isAnyLocked,
        totalLockedPercent: lockStatus.totalLockedPercent,
        lockCount: lockStatus.locks.length,
      };
    } catch (error) {
      console.error('[LockDetection] Error getting lock summary:', error);
      return {
        isAnyLocked: false,
        totalLockedPercent: 0,
        lockCount: 0,
      };
    }
  }
}

// Export singleton instance
export const lockDetectionService = new LockDetectionService();
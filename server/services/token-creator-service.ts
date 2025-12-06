/**
 * Token Creator Lookup Service
 *
 * Finds the creator of a token by analyzing the first mint transaction.
 * Uses on-chain transaction history to identify who initially created/minted the token.
 */

import { Connection, PublicKey, ConfirmedSignatureInfo, ParsedTransactionWithMeta } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { redisCache } from './redis-cache.js';
import { rpcBalancer } from './rpc-balancer.js';

export interface TokenCreatorInfo {
  creatorAddress: string;
  mintTransaction: string; // Transaction signature
  blockTime?: number;
  slot: number;
  programId: string; // TOKEN_PROGRAM_ID or TOKEN_2022_PROGRAM_ID
  initialMintAmount: number;
  isVerified: boolean; // Whether we could verify this is indeed the creator
}

export class TokenCreatorService {
  private readonly CACHE_TTL = 86400; // 24 hours cache

  /**
   * Find the creator of a token by looking at the first mint transaction
   */
  async findTokenCreator(tokenAddress: string): Promise<TokenCreatorInfo | null> {
    const cacheKey = `token-creator:${tokenAddress}`;

    return redisCache.cacheFetch(
      cacheKey,
      async () => {
        try {
          console.log(`[TokenCreator] Looking up creator for ${tokenAddress}`);

          const connection = rpcBalancer.getConnection();
          const mintPubkey = new PublicKey(tokenAddress);

          // Get the first transaction that involves this mint
          // We look for InitializeMint or MintTo instructions
          const signatures = await connection.getSignaturesForAddress(
            mintPubkey,
            { limit: 10 }, // Get first few transactions
            'confirmed'
          );

          if (signatures.length === 0) {
            console.log(`[TokenCreator] No transactions found for ${tokenAddress}`);
            return null;
          }

          // Analyze transactions to find the mint initialization
          for (const sig of signatures) {
            try {
              const tx = await connection.getParsedTransaction(sig.signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
              });

              if (!tx) continue;

              const creator = this.extractCreatorFromTransaction(tx, tokenAddress);
              if (creator) {
                console.log(`[TokenCreator] Found creator ${creator.creatorAddress} for ${tokenAddress}`);
                return creator;
              }
            } catch (error) {
              console.warn(`[TokenCreator] Failed to parse transaction ${sig.signature}:`, error);
              continue;
            }
          }

          console.log(`[TokenCreator] Could not find creator in transaction history for ${tokenAddress}`);
          return null;

        } catch (error) {
          console.error('[TokenCreator] Error finding token creator:', error);
          return null;
        }
      },
      this.CACHE_TTL
    );
  }

  /**
   * Extract creator information from a parsed transaction
   */
  private extractCreatorFromTransaction(
    tx: ParsedTransactionWithMeta,
    tokenAddress: string
  ): TokenCreatorInfo | null {
    if (!tx.transaction || !tx.transaction.message) {
      return null;
    }

    const instructions = tx.transaction.message.instructions;
    const accountKeys = tx.transaction.message.accountKeys;

    // Look for token program instructions
    for (let i = 0; i < instructions.length; i++) {
      const instruction = instructions[i];

      // Handle parsed instructions
      if ('parsed' in instruction) {
        const parsed = instruction.parsed;

        // Check for InitializeMint instruction
        if (parsed.type === 'initializeMint') {
          const info = parsed.info;
          if (info.mint === tokenAddress) {
            // The mint authority is typically the creator
            // For standard token creation, the fee payer or mint authority is the creator
            const feePayer = accountKeys[0].toString();
            const mintAuthority = info.mintAuthority;

            // Use mint authority if available, otherwise fee payer
            const creatorAddress = mintAuthority || feePayer;

            return {
              creatorAddress,
              mintTransaction: tx.transaction.signatures[0],
              blockTime: tx.blockTime || undefined,
              slot: tx.slot,
              programId: instruction.programId.toString(),
              initialMintAmount: 0, // InitializeMint doesn't mint tokens yet
              isVerified: true
            };
          }
        }

        // Check for MintTo instruction (first mint after creation)
        if (parsed.type === 'mintTo') {
          const info = parsed.info;
          if (info.mint === tokenAddress && info.amount) {
            // The authority (usually mint authority) is likely the creator
            const authority = info.mintAuthority || info.authority;
            const amount = parseInt(info.amount);

            // Only consider this as creator if it's a significant initial mint
            if (amount > 0) {
              return {
                creatorAddress: authority,
                mintTransaction: tx.transaction.signatures[0],
                blockTime: tx.blockTime || undefined,
                slot: tx.slot,
                programId: instruction.programId.toString(),
                initialMintAmount: amount,
                isVerified: true
              };
            }
          }
        }
      }

      // Handle raw instructions (for custom programs)
      else if ('accounts' in instruction) {
        // Check if this instruction involves our token mint
        const accounts = instruction.accounts.map(idx => accountKeys[idx]);
        const hasMint = accounts.some(acc => acc.toString() === tokenAddress);

        if (hasMint) {
          // For raw instructions, the fee payer is likely the creator
          const feePayer = accountKeys[0].toString();

          // This is less reliable, so mark as unverified
          return {
            creatorAddress: feePayer,
            mintTransaction: tx.transaction.signatures[0],
            blockTime: tx.blockTime || undefined,
            slot: tx.slot,
            programId: instruction.programId.toString(),
            initialMintAmount: 0, // Unknown for raw instructions
            isVerified: false // Raw instructions are less reliable
          };
        }
      }
    }

    return null;
  }

  /**
   * Get a quick creator summary for alerts
   */
  async getCreatorSummary(tokenAddress: string): Promise<{
    creatorAddress: string | null;
    isVerified: boolean;
    hasCreator: boolean;
  }> {
    try {
      const creatorInfo = await this.findTokenCreator(tokenAddress);
      return {
        creatorAddress: creatorInfo?.creatorAddress || null,
        isVerified: creatorInfo?.isVerified || false,
        hasCreator: !!creatorInfo
      };
    } catch (error) {
      console.error('[TokenCreator] Error getting creator summary:', error);
      return {
        creatorAddress: null,
        isVerified: false,
        hasCreator: false
      };
    }
  }
}

// Export singleton instance
export const tokenCreatorService = new TokenCreatorService();
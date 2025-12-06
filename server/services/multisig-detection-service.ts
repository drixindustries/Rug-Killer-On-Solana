/**
 * Multisig Detection Service
 *
 * Detects if a wallet address is controlled by a multisig (Squads, SPL Governance, etc.)
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { redisCache } from './redis-cache.js';
import { rpcBalancer } from './rpc-balancer.js';

// Known multisig program IDs
const MULTISIG_PROGRAMS = {
  SQUADS: new PublicKey('SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8Zik'),
  SPL_GOVERNANCE: new PublicKey('GovHgfDPyQ1GwazJTDY2avSVY8GGcpmCapmmCsymRaGe'),
  SPL_GOVERNANCE_V2: new PublicKey('GovernanceV2e111111111111111111111111111111'),
};

export interface MultisigInfo {
  isMultisig: boolean;
  program: 'squads' | 'spl-governance' | 'other' | null;
  multisigAddress: string | null;
  signers: string[];
  threshold: number;
  totalSigners: number;
}

export class MultisigDetectionService {
  private readonly CACHE_TTL = 3600; // 1 hour cache

  /**
   * Check if an address is controlled by a multisig
   */
  async checkMultisig(address: string): Promise<MultisigInfo> {
    const cacheKey = `multisig-check:${address}`;

    return redisCache.cacheFetch(
      cacheKey,
      async () => {
        try {
          console.log(`[MultisigDetection] Checking if ${address} is multisig controlled`);

          const connection = rpcBalancer.getConnection();
          const pubkey = new PublicKey(address);

          // Check Squads multisig
          const squadsInfo = await this.checkSquadsMultisig(connection, pubkey);
          if (squadsInfo.isMultisig) {
            console.log(`[MultisigDetection] Found Squads multisig for ${address}`);
            return squadsInfo;
          }

          // Check SPL Governance
          const governanceInfo = await this.checkSPLGovernance(connection, pubkey);
          if (governanceInfo.isMultisig) {
            console.log(`[MultisigDetection] Found SPL Governance multisig for ${address}`);
            return governanceInfo;
          }

          // Not a multisig
          return {
            isMultisig: false,
            program: null,
            multisigAddress: null,
            signers: [],
            threshold: 0,
            totalSigners: 0,
          };

        } catch (error) {
          console.error('[MultisigDetection] Error checking multisig:', error);
          return {
            isMultisig: false,
            program: null,
            multisigAddress: null,
            signers: [],
            threshold: 0,
            totalSigners: 0,
          };
        }
      },
      this.CACHE_TTL
    );
  }

  /**
   * Check if address is controlled by Squads multisig
   */
  private async checkSquadsMultisig(connection: Connection, address: PublicKey): Promise<MultisigInfo> {
    try {
      // Squads uses PDAs for multisig accounts
      // The address might be a derived wallet from a Squads multisig

      // For now, we'll do a basic check by looking at recent transactions
      // A more robust implementation would derive the multisig address from the wallet

      const signatures = await connection.getSignaturesForAddress(address, { limit: 5 });

      for (const sig of signatures) {
        try {
          const tx = await connection.getParsedTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });

          if (!tx?.transaction?.message?.instructions) continue;

          // Check if any instruction is from Squads program
          for (const instruction of tx.transaction.message.instructions) {
            if ('programId' in instruction) {
              if (instruction.programId.equals(MULTISIG_PROGRAMS.SQUADS)) {
                // Found Squads interaction - likely multisig controlled
                return {
                  isMultisig: true,
                  program: 'squads',
                  multisigAddress: null, // Would need more complex derivation
                  signers: [], // Would need to query the multisig account
                  threshold: 0,
                  totalSigners: 0,
                };
              }
            }
          }
        } catch (error) {
          continue;
        }
      }

    } catch (error) {
      console.warn('[MultisigDetection] Error checking Squads multisig:', error);
    }

    return {
      isMultisig: false,
      program: null,
      multisigAddress: null,
      signers: [],
      threshold: 0,
      totalSigners: 0,
    };
  }

  /**
   * Check if address is controlled by SPL Governance
   */
  private async checkSPLGovernance(connection: Connection, address: PublicKey): Promise<MultisigInfo> {
    try {
      // Similar approach for SPL Governance
      const signatures = await connection.getSignaturesForAddress(address, { limit: 5 });

      for (const sig of signatures) {
        try {
          const tx = await connection.getParsedTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });

          if (!tx?.transaction?.message?.instructions) continue;

          for (const instruction of tx.transaction.message.instructions) {
            if ('programId' in instruction) {
              if (instruction.programId.equals(MULTISIG_PROGRAMS.SPL_GOVERNANCE) ||
                  instruction.programId.equals(MULTISIG_PROGRAMS.SPL_GOVERNANCE_V2)) {
                return {
                  isMultisig: true,
                  program: 'spl-governance',
                  multisigAddress: null,
                  signers: [],
                  threshold: 0,
                  totalSigners: 0,
                };
              }
            }
          }
        } catch (error) {
          continue;
        }
      }

    } catch (error) {
      console.warn('[MultisigDetection] Error checking SPL Governance:', error);
    }

    return {
      isMultisig: false,
      program: null,
      multisigAddress: null,
      signers: [],
      threshold: 0,
      totalSigners: 0,
    };
  }

  /**
   * Get a quick multisig summary for alerts
   */
  async getMultisigSummary(address: string): Promise<{
    isMultisig: boolean;
    program: string | null;
  }> {
    try {
      const multisigInfo = await this.checkMultisig(address);
      return {
        isMultisig: multisigInfo.isMultisig,
        program: multisigInfo.program,
      };
    } catch (error) {
      console.error('[MultisigDetection] Error getting multisig summary:', error);
      return {
        isMultisig: false,
        program: null,
      };
    }
  }
}

// Export singleton instance
export const multisigDetectionService = new MultisigDetectionService();
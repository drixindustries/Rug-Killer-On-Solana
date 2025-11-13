import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export class LPChecker {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async isLPBurned(poolAddress: string): Promise<boolean> {
    try {
      const poolPubkey = new PublicKey(poolAddress);
      
      const accounts = await this.connection.getTokenLargestAccounts(poolPubkey);
      
      if (!accounts || !accounts.value || accounts.value.length === 0) {
        return false;
      }

      return accounts.value.every(acc => acc.uiAmount === 0 || acc.uiAmount === null);
    } catch (error) {
      console.error(`[LP Checker] Error checking LP burn for ${poolAddress}:`, error);
      return false;
    }
  }

  async isMintRenounced(mintAddress: string): Promise<boolean> {
    try {
      const mintPubkey = new PublicKey(mintAddress);
      
      const mintInfo = await this.connection.getAccountInfo(mintPubkey);
      
      if (!mintInfo) {
        console.error(`[LP Checker] Mint account not found: ${mintAddress}`);
        return false;
      }

      const ownerIsTokenProgram = mintInfo.owner.equals(TOKEN_PROGRAM_ID);
      
      return ownerIsTokenProgram;
    } catch (error) {
      console.error(`[LP Checker] Error checking mint renounced for ${mintAddress}:`, error);
      return false;
    }
  }

  async checkLPStatus(poolAddress: string, mintAddress: string): Promise<{
    lpBurned: boolean;
    mintRenounced: boolean;
    rugScore: number;
    warnings: string[];
  }> {
    const lpBurned = await this.isLPBurned(poolAddress);
    const mintRenounced = await this.isMintRenounced(mintAddress);
    
    let rugScore = 0;
    const warnings: string[] = [];

    if (!lpBurned) {
      rugScore += 40;
      warnings.push("LP NOT BURNED");
    }
    
    if (!mintRenounced) {
      rugScore += 30;
      warnings.push("MINT NOT RENOUNCED");
    }

    return {
      lpBurned,
      mintRenounced,
      rugScore,
      warnings,
    };
  }
}

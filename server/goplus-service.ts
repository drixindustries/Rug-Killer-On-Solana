import type { GoPlusSecurityData } from "../shared/schema";
import { multisigDetectionService } from './services/multisig-detection-service.js';

const GOPLUS_API_URL = "https://api.gopluslabs.io/api/v1";

export class GoPlusSecurityService {
  async getTokenSecurity(tokenAddress: string): Promise<GoPlusSecurityData | null> {
    try {
      const response = await fetch(
        `${GOPLUS_API_URL}/token_security/solana?contract_addresses=${tokenAddress}`,
        {
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        console.error(`GoPlus API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      
      if (data.code !== 1) {
        console.error("GoPlus API returned error:", data.message);
        return null;
      }

      if (!data.result || data.result === null) {
        console.log(`GoPlus: No security data available for token ${tokenAddress}`);
        return null;
      }

      let tokenData = data.result[tokenAddress];
      
      if (!tokenData) {
        console.log(`GoPlus: Token ${tokenAddress} not found in result map`);
        return null;
      }

      if (Array.isArray(tokenData)) {
        tokenData = tokenData[0];
      }

      if (!tokenData) {
        console.error("GoPlus: Token data array is empty");
        return null;
      }

      return await this.parseGoPlusResponse(tokenData);
    } catch (error) {
      console.error("GoPlus API error:", error);
      return null;
    }
  }

  private async parseGoPlusResponse(result: any): Promise<GoPlusSecurityData> {
    const securityRisks: string[] = [];
    
    if (result.is_mintable === '1') {
      const mintAuthority = result.mint_authority || 'Unknown';

      // Check if mint authority is multisig-controlled
      let mintableWarning = `Mintable - Authority can create unlimited tokens (${mintAuthority})`;

      if (mintAuthority !== 'Unknown') {
        try {
          const multisigInfo = await multisigDetectionService.getMultisigSummary(mintAuthority);
          if (multisigInfo.isMultisig) {
            mintableWarning += ` ⚠️ Authority is multisig-controlled (${multisigInfo.program}) - Higher security but slower response to issues`;
          } else {
            mintableWarning += ` 🚨 Authority is EOA wallet - High rug risk, can mint instantly`;
          }
        } catch (error) {
          console.warn('[GoPlus] Error checking multisig for mint authority:', error);
          mintableWarning += ` ⚠️ Could not verify authority type`;
        }
      } else {
        mintableWarning += ` 🚨 Unknown authority - Cannot verify control`;
      }

      securityRisks.push(mintableWarning);
    }
    
    if (result.is_freezable === '1') {
      securityRisks.push(`Freezable - Accounts can be frozen (${result.freeze_authority || 'Unknown'})`);
    }
    
    if (result.is_scam === '1') {
      securityRisks.push('SCAM - Flagged as malicious by GoPlus');
    }
    
    const buyTax = parseFloat(result.buy_tax || '0');
    const sellTax = parseFloat(result.sell_tax || '0');
    
    if (buyTax > 10) {
      securityRisks.push(`High buy tax: ${buyTax}%`);
    }
    
    if (sellTax > 10) {
      securityRisks.push(`High sell tax: ${sellTax}% (possible honeypot)`);
    }
    
    if (result.can_take_back_ownership === '1') {
      securityRisks.push('Owner can reclaim ownership after renouncement');
    }
    
    if (result.is_open_source === '0') {
      securityRisks.push('Contract not verified/open source');
    }
    
    if (result.is_true_token === '0') {
      securityRisks.push('Not recognized as a legitimate token');
    }
    
    if (result.transfer_fee_enable === '1') {
      securityRisks.push('Transfer fees enabled');
    }

    return {
      is_mintable: result.is_mintable || '0',
      is_freezable: result.is_freezable || '0',
      is_scam: result.is_scam || '0',
      buy_tax: result.buy_tax || '0',
      sell_tax: result.sell_tax || '0',
      transfer_fee_enable: result.transfer_fee_enable || '0',
      can_take_back_ownership: result.can_take_back_ownership || '0',
      is_open_source: result.is_open_source || '0',
      is_true_token: result.is_true_token || '0',
      holder_count: result.holder_count || '0',
      total_supply: result.total_supply || '0',
      liquidity: result.liquidity || '0',
      securityRisks,
    };
  }
}

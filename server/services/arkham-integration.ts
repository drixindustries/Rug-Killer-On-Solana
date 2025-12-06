/**
 * Arkham Intelligence Integration
 * 
 * Entity tagging and exchange flow detection:
 * - Wallet entity identification (exchanges, protocols, individuals)
 * - Exchange deposit/withdrawal tracking
 * - Cross-chain flow analysis
 * - Known entity database
 * 
 * Uses Arkham's public API and labeling conventions
 * https://platform.arkhamintelligence.com
 * 
 * Created: Dec 6, 2025
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ARKHAM ENTITY DATABASE (Known Solana Entities - 2025)
// ═══════════════════════════════════════════════════════════════════════════════

export const ARKHAM_ENTITIES: Record<string, {
  name: string;
  type: 'exchange' | 'protocol' | 'fund' | 'individual' | 'contract' | 'bridge';
  risk: 'low' | 'medium' | 'high';
  description?: string;
}> = {
  // Major Exchanges
  '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9': {
    name: 'Binance Hot Wallet',
    type: 'exchange',
    risk: 'low',
    description: 'Main Binance Solana hot wallet'
  },
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM': {
    name: 'Binance Deposit',
    type: 'exchange',
    risk: 'low'
  },
  'H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm': {
    name: 'Coinbase Prime',
    type: 'exchange',
    risk: 'low'
  },
  '5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhYrPSqtJNmcD': {
    name: 'OKX Hot Wallet',
    type: 'exchange',
    risk: 'low'
  },
  'BmFdpraQhkiDQE6SnfG5omcA1VwzqfXrwtNYBwWTymy6': {
    name: 'KuCoin',
    type: 'exchange',
    risk: 'low'
  },
  
  // DEX Protocols
  'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB': {
    name: 'Jupiter Aggregator',
    type: 'protocol',
    risk: 'low',
    description: 'Jupiter DEX aggregator v4'
  },
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': {
    name: 'Raydium AMM',
    type: 'protocol',
    risk: 'low'
  },
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': {
    name: 'Pump.fun',
    type: 'protocol',
    risk: 'medium',
    description: 'Pump.fun bonding curve program'
  },
  
  // Bridges
  'worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth': {
    name: 'Wormhole Bridge',
    type: 'bridge',
    risk: 'medium'
  },
  
  // High Risk Services
  'GKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV': {
    name: 'Swopshop',
    type: 'protocol',
    risk: 'high',
    description: 'Anonymous swap service - frequently used by scammers'
  },
  'FixedQr9u8vFu5BgKKJfFr1yH8mKqLnKm2G4qE7X1Pzw': {
    name: 'FixedFloat',
    type: 'protocol',
    risk: 'high',
    description: 'Instant exchange - high scammer usage'
  },
  
  // Jito
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe': {
    name: 'Jito Tips',
    type: 'protocol',
    risk: 'low',
    description: 'Jito MEV tip account'
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EntityInfo {
  address: string;
  name: string | null;
  type: 'exchange' | 'protocol' | 'fund' | 'individual' | 'contract' | 'bridge' | 'unknown';
  risk: 'low' | 'medium' | 'high' | 'unknown';
  description?: string;
  confidence: number; // 0-100
  source: 'arkham_db' | 'on_chain' | 'heuristic';
}

export interface ExchangeFlow {
  direction: 'deposit' | 'withdrawal';
  exchange: string;
  amount: number;
  timestamp: number;
  txSignature: string;
  fromWallet?: string;
  toWallet?: string;
}

export interface ArkhamAnalysisResult {
  entities: EntityInfo[];
  exchangeFlows: ExchangeFlow[];
  totalExchangeDeposits: number;
  totalExchangeWithdrawals: number;
  highRiskConnections: EntityInfo[];
  entitySummary: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARKHAM INTEGRATION CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ArkhamIntegration {
  private readonly API_URL = 'https://api.arkhamintelligence.com';
  private readonly API_KEY = process.env.ARKHAM_API_KEY; // Optional
  
  /**
   * Look up entity from local database
   */
  lookupEntity(address: string): EntityInfo {
    const entity = ARKHAM_ENTITIES[address];
    
    if (entity) {
      return {
        address,
        name: entity.name,
        type: entity.type,
        risk: entity.risk,
        description: entity.description,
        confidence: 95,
        source: 'arkham_db'
      };
    }
    
    return {
      address,
      name: null,
      type: 'unknown',
      risk: 'unknown',
      confidence: 0,
      source: 'arkham_db'
    };
  }

  /**
   * Query Arkham API for entity info (if API key available)
   */
  async queryArkham(address: string): Promise<EntityInfo | null> {
    if (!this.API_KEY) {
      return null;
    }
    
    try {
      const response = await fetch(
        `${this.API_URL}/intelligence/address/${address}`,
        {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      if (data.entity) {
        return {
          address,
          name: data.entity.name || data.entity.label,
          type: this.mapArkhamType(data.entity.type),
          risk: this.mapArkhamRisk(data.entity.riskScore),
          description: data.entity.description,
          confidence: data.entity.confidence || 80,
          source: 'arkham_db'
        };
      }
      
      return null;
    } catch (error) {
      console.error(`[Arkham] API error for ${address}:`, error);
      return null;
    }
  }

  /**
   * Map Arkham entity type to our types
   */
  private mapArkhamType(type: string): EntityInfo['type'] {
    const typeMap: Record<string, EntityInfo['type']> = {
      'exchange': 'exchange',
      'cex': 'exchange',
      'dex': 'protocol',
      'defi': 'protocol',
      'protocol': 'protocol',
      'fund': 'fund',
      'vc': 'fund',
      'individual': 'individual',
      'contract': 'contract',
      'bridge': 'bridge'
    };
    
    return typeMap[type?.toLowerCase()] || 'unknown';
  }

  /**
   * Map Arkham risk score to level
   */
  private mapArkhamRisk(score: number | undefined): EntityInfo['risk'] {
    if (score === undefined) return 'unknown';
    if (score >= 70) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Identify multiple entities
   */
  async identifyEntities(addresses: string[]): Promise<EntityInfo[]> {
    const results: EntityInfo[] = [];
    
    for (const address of addresses) {
      // First check local DB
      let entity = this.lookupEntity(address);
      
      // If not found locally and we have API key, try API
      if (entity.type === 'unknown' && this.API_KEY) {
        const apiResult = await this.queryArkham(address);
        if (apiResult) {
          entity = apiResult;
        }
      }
      
      results.push(entity);
    }
    
    return results;
  }

  /**
   * Detect exchange flows from transaction history
   */
  detectExchangeFlows(
    transactions: Array<{
      signature: string;
      from: string;
      to: string;
      amount: number;
      timestamp: number;
    }>
  ): ExchangeFlow[] {
    const flows: ExchangeFlow[] = [];
    
    for (const tx of transactions) {
      const fromEntity = this.lookupEntity(tx.from);
      const toEntity = this.lookupEntity(tx.to);
      
      if (toEntity.type === 'exchange') {
        flows.push({
          direction: 'deposit',
          exchange: toEntity.name || 'Unknown Exchange',
          amount: tx.amount,
          timestamp: tx.timestamp,
          txSignature: tx.signature,
          fromWallet: tx.from,
          toWallet: tx.to
        });
      }
      
      if (fromEntity.type === 'exchange') {
        flows.push({
          direction: 'withdrawal',
          exchange: fromEntity.name || 'Unknown Exchange',
          amount: tx.amount,
          timestamp: tx.timestamp,
          txSignature: tx.signature,
          fromWallet: tx.from,
          toWallet: tx.to
        });
      }
    }
    
    return flows;
  }

  /**
   * Full analysis of wallets
   */
  async analyze(
    wallets: string[],
    transactions?: Array<{
      signature: string;
      from: string;
      to: string;
      amount: number;
      timestamp: number;
    }>
  ): Promise<ArkhamAnalysisResult> {
    console.log(`[Arkham] Analyzing ${wallets.length} wallets...`);
    
    // Identify all entities
    const entities = await this.identifyEntities(wallets);
    
    // Detect exchange flows if transactions provided
    const exchangeFlows = transactions ? this.detectExchangeFlows(transactions) : [];
    
    // Calculate totals
    const deposits = exchangeFlows.filter(f => f.direction === 'deposit');
    const withdrawals = exchangeFlows.filter(f => f.direction === 'withdrawal');
    
    const totalDeposits = deposits.reduce((sum, f) => sum + f.amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, f) => sum + f.amount, 0);
    
    // Find high risk connections
    const highRisk = entities.filter(e => e.risk === 'high');
    
    // Generate summary
    let summary = `Analyzed ${wallets.length} wallets:\n`;
    
    const exchanges = entities.filter(e => e.type === 'exchange');
    const protocols = entities.filter(e => e.type === 'protocol');
    const bridges = entities.filter(e => e.type === 'bridge');
    
    if (exchanges.length > 0) {
      summary += `• ${exchanges.length} exchange connections (${exchanges.map(e => e.name).join(', ')})\n`;
    }
    if (protocols.length > 0) {
      summary += `• ${protocols.length} protocol interactions\n`;
    }
    if (bridges.length > 0) {
      summary += `• ${bridges.length} bridge connections\n`;
    }
    if (highRisk.length > 0) {
      summary += `• ⚠️ ${highRisk.length} HIGH RISK connections (${highRisk.map(e => e.name).join(', ')})\n`;
    }
    if (deposits.length > 0) {
      summary += `• ${deposits.length} exchange deposits (${totalDeposits.toFixed(2)} SOL)\n`;
    }
    
    return {
      entities,
      exchangeFlows,
      totalExchangeDeposits: totalDeposits,
      totalExchangeWithdrawals: totalWithdrawals,
      highRiskConnections: highRisk,
      entitySummary: summary
    };
  }

  /**
   * Quick check if wallet is known entity
   */
  isKnownEntity(address: string): boolean {
    return ARKHAM_ENTITIES[address] !== undefined;
  }

  /**
   * Get risk level for an address
   */
  getRiskLevel(address: string): 'low' | 'medium' | 'high' | 'unknown' {
    const entity = ARKHAM_ENTITIES[address];
    return entity?.risk || 'unknown';
  }
}

// Export singleton
export const arkhamIntegration = new ArkhamIntegration();

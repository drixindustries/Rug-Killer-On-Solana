/**
 * Ankr Direct HTTP Client
 * 
 * Bypasses @solana/web3.js Connection class to avoid superstruct union validation bug
 * Makes direct JSON-RPC calls to Ankr without going through web3.js
 * 
 * Why this exists:
 * - Ankr's RPC responses trigger a superstruct validation bug in @solana/web3.js
 * - The bug is in the library itself, not fixable with custom fetch wrappers
 * - Solution: Direct HTTP calls, manual JSON-RPC, return raw data
 * 
 * GitHub issue: https://github.com/ianstormtaylor/superstruct/issues/580
 */

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any[];
}

interface JsonRpcResponse<T = any> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class AnkrDirectClient {
  private rpcUrl: string;
  private requestId = 1;

  constructor(apiKey: string) {
    this.rpcUrl = `https://rpc.ankr.com/solana/${apiKey}`;
  }

  /**
   * Make a direct JSON-RPC call to Ankr
   */
  private async call<T = any>(method: string, params?: any[]): Promise<T> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params: params || [],
    };

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json: JsonRpcResponse<T> = await response.json();

    if (json.error) {
      throw new Error(`RPC Error ${json.error.code}: ${json.error.message}`);
    }

    if (json.result === undefined) {
      throw new Error('No result in response');
    }

    return json.result;
  }

  /**
   * Get current slot (for health checks)
   */
  async getSlot(): Promise<number> {
    return this.call<number>('getSlot', [{ commitment: 'confirmed' }]);
  }

  /**
   * Get epoch info (for health checks)
   */
  async getEpochInfo(): Promise<any> {
    return this.call('getEpochInfo', [{ commitment: 'confirmed' }]);
  }

  /**
   * Get account info
   */
  async getAccountInfo(pubkey: string): Promise<any> {
    return this.call('getAccountInfo', [
      pubkey,
      { encoding: 'jsonParsed', commitment: 'confirmed' }
    ]);
  }

  /**
   * Get multiple accounts
   */
  async getMultipleAccounts(pubkeys: string[]): Promise<any> {
    return this.call('getMultipleAccounts', [
      pubkeys,
      { encoding: 'jsonParsed', commitment: 'confirmed' }
    ]);
  }

  /**
   * Get token accounts by owner
   */
  async getTokenAccountsByOwner(owner: string, filter: any): Promise<any> {
    return this.call('getTokenAccountsByOwner', [
      owner,
      filter,
      { encoding: 'jsonParsed', commitment: 'confirmed' }
    ]);
  }

  /**
   * Get token supply
   */
  async getTokenSupply(mint: string): Promise<any> {
    return this.call('getTokenSupply', [
      mint,
      { commitment: 'confirmed' }
    ]);
  }

  /**
   * Get signatures for address
   */
  async getSignaturesForAddress(address: string, options?: any): Promise<any> {
    return this.call('getSignaturesForAddress', [
      address,
      { ...options, commitment: 'confirmed' }
    ]);
  }

  /**
   * Get transaction
   */
  async getTransaction(signature: string): Promise<any> {
    return this.call('getTransaction', [
      signature,
      {
        encoding: 'jsonParsed',
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      }
    ]);
  }

  /**
   * Get balance
   */
  async getBalance(pubkey: string): Promise<number> {
    const result = await this.call<{ value: number }>('getBalance', [
      pubkey,
      { commitment: 'confirmed' }
    ]);
    return result.value;
  }

  /**
   * Get program accounts
   */
  async getProgramAccounts(programId: string, config?: any): Promise<any> {
    return this.call('getProgramAccounts', [
      programId,
      { ...config, commitment: 'confirmed' }
    ]);
  }

  /**
   * Get latest blockhash (for sending transactions)
   */
  async getLatestBlockhash(): Promise<any> {
    return this.call('getLatestBlockhash', [{ commitment: 'confirmed' }]);
  }

  /**
   * Send transaction
   */
  async sendTransaction(signedTransaction: string): Promise<string> {
    return this.call<string>('sendTransaction', [
      signedTransaction,
      { encoding: 'base64', skipPreflight: false }
    ]);
  }

  /**
   * Get RPC URL for logging
   */
  getRpcUrl(): string {
    return this.rpcUrl.substring(0, 60) + '...';
  }
}

/**
 * Create Ankr client instance
 */
export function createAnkrClient(apiKey: string): AnkrDirectClient {
  return new AnkrDirectClient(apiKey);
}

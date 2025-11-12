import nock from 'nock';
import {
  DEXSCREENER_DATA_PUMP,
  RUGCHECK_DATA_PUMP,
  RUGCHECK_DATA_WITH_BUNDLES,
  GOPLUS_DATA_SAFE,
  GOPLUS_DATA_RISKY,
} from '../fixtures/solana/token-fixtures';

/**
 * Mock Solana RPC responses
 */
export function mockSolanaRPC() {
  // Mock getAccountInfo for token accounts
  nock('https://api.mainnet-beta.solana.com')
    .persist()
    .post('/', (body: any) => {
      return body.method === 'getAccountInfo';
    })
    .reply(200, {
      jsonrpc: '2.0',
      result: {
        value: {
          data: ['', 'base64'],
          executable: false,
          lamports: 2039280,
          owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          rentEpoch: 361,
        },
      },
      id: 1,
    });

  // Mock getProgramAccounts for holder count
  nock('https://api.mainnet-beta.solana.com')
    .persist()
    .post('/', (body: any) => {
      return body.method === 'getProgramAccounts';
    })
    .reply(200, {
      jsonrpc: '2.0',
      result: new Array(1557).fill(null).map((_, i) => ({
        account: {
          data: ['', 'base64'],
          executable: false,
          lamports: 2039280,
          owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          rentEpoch: 361,
        },
        pubkey: `Holder${i}AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`,
      })),
      id: 1,
    });
}

/**
 * Mock DexScreener API
 */
export function mockDexScreener(tokenAddress: string, variant: 'pump' | 'bundle' = 'pump') {
  const data = variant === 'pump' ? DEXSCREENER_DATA_PUMP : DEXSCREENER_DATA_PUMP;
  
  nock('https://api.dexscreener.com')
    .get(`/latest/dex/tokens/${tokenAddress}`)
    .reply(200, data);
}

/**
 * Mock Rugcheck API
 */
export function mockRugcheck(tokenAddress: string, variant: 'safe' | 'bundles' = 'safe') {
  const data = variant === 'safe' ? RUGCHECK_DATA_PUMP : RUGCHECK_DATA_WITH_BUNDLES;
  
  nock('https://api.rugcheck.xyz')
    .get(`/v1/tokens/${tokenAddress}/report`)
    .reply(200, data);
}

/**
 * Mock GoPlus Security API
 */
export function mockGoPlus(tokenAddress: string, variant: 'safe' | 'risky' = 'safe') {
  const data = variant === 'safe' ? GOPLUS_DATA_SAFE : GOPLUS_DATA_RISKY;
  
  nock('https://api.gopluslabs.io')
    .get(`/api/v1/token_security/solana`)
    .query({ contract_addresses: tokenAddress })
    .reply(200, data);
}

/**
 * Mock all external APIs for a complete token analysis
 */
export function mockCompleteAnalysis(
  tokenAddress: string,
  variant: 'safe' | 'bundles' | 'risky' = 'safe'
) {
  mockSolanaRPC();
  mockDexScreener(tokenAddress, variant === 'bundles' ? 'bundle' : 'pump');
  mockRugcheck(tokenAddress, variant === 'bundles' ? 'bundles' : 'safe');
  mockGoPlus(tokenAddress, variant === 'risky' ? 'risky' : 'safe');
}

/**
 * Clear all mocks
 */
export function clearAllMocks() {
  nock.cleanAll();
}

/**
 * Builder pattern for creating custom mock responses
 */
export class MockBuilder {
  private mocks: Array<() => void> = [];

  withDexScreener(tokenAddress: string, data: any) {
    this.mocks.push(() => {
      nock('https://api.dexscreener.com')
        .get(`/latest/dex/tokens/${tokenAddress}`)
        .reply(200, data);
    });
    return this;
  }

  withRugcheck(tokenAddress: string, data: any) {
    this.mocks.push(() => {
      nock('https://api.rugcheck.xyz')
        .get(`/v1/tokens/${tokenAddress}/report`)
        .reply(200, data);
    });
    return this;
  }

  withGoPlus(tokenAddress: string, data: any) {
    this.mocks.push(() => {
      nock('https://api.gopluslabs.io')
        .get(`/api/v1/token_security/solana`)
        .query({ contract_addresses: tokenAddress })
        .reply(200, data);
    });
    return this;
  }

  build() {
    this.mocks.forEach(mock => mock());
  }
}

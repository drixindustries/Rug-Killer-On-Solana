/**
 * Deterministic Solana token fixtures for testing
 * Based on real token data but simplified for testing
 */

export const PUMP_FUN_TOKEN = {
  address: 'FRVCEaJuS8cuBTWR1JwVu35pBsKmHmt9n4LjSiF4pump',
  name: 'Test Pump.fun Token',
  symbol: 'TESTPUMP',
  decimals: 6,
  supply: 1000000000,
  mintAuthority: null,
  freezeAuthority: null,
};

export const BUNDLE_TOKEN = {
  address: '2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt',
  name: 'Solana Rug Killer',
  symbol: 'RUGK',
  decimals: 6,
  supply: 1000000000,
  mintAuthority: null,
  freezeAuthority: null,
};

export const REGULAR_TOKEN = {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  supply: 42000000000,
  mintAuthority: null,
  freezeAuthority: null,
};

export const HOLDERS_PUMP_FUN = [
  {
    address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
    balance: 99260000000,
    percentage: 99.26,
  },
  {
    address: '3ZzBb3QwNnvJBuLXVvLWjcNw7GhKdFp1rk1x7oDH2pump',
    balance: 500000000,
    percentage: 0.5,
  },
  {
    address: '7XaWhbL3HBcmjzZ3K8H4vU5qQjYMxZYQpump12345678',
    balance: 240000000,
    percentage: 0.24,
  },
];

export const HOLDERS_WITH_BUNDLES = [
  {
    address: 'Whale1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    balance: 100000000,
    percentage: 10.0,
    isBundled: false,
  },
  {
    address: 'Bundle1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    balance: 20000000,
    percentage: 2.0,
    isBundled: true,
  },
  {
    address: 'Bundle2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    balance: 10000000,
    percentage: 1.0,
    isBundled: true,
  },
  {
    address: 'Bundle3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    balance: 8900000,
    percentage: 0.89,
    isBundled: true,
  },
  {
    address: 'Regular1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    balance: 5000000,
    percentage: 0.5,
    isBundled: false,
  },
];

export const DEXSCREENER_DATA_PUMP = {
  schemaVersion: '1.0.0',
  pairs: [
    {
      chainId: 'solana',
      dexId: 'raydium',
      url: 'https://dexscreener.com/solana/test',
      pairAddress: 'TestPairAddress123456789',
      baseToken: {
        address: 'FRVCEaJuS8cuBTWR1JwVu35pBsKmHmt9n4LjSiF4pump',
        name: 'Test Pump.fun Token',
        symbol: 'TESTPUMP',
      },
      quoteToken: {
        address: 'So11111111111111111111111111111111111111112',
        name: 'Wrapped SOL',
        symbol: 'SOL',
      },
      priceNative: '0.00001234',
      priceUsd: '0.00234',
      txns: {
        m5: { buys: 10, sells: 5 },
        h1: { buys: 100, sells: 50 },
        h6: { buys: 500, sells: 250 },
        h24: { buys: 2000, sells: 1000 },
      },
      volume: {
        h24: 50000,
        h6: 20000,
        h1: 5000,
        m5: 1000,
      },
      priceChange: {
        h24: 15.5,
        h6: 10.2,
        h1: 5.1,
        m5: 2.3,
      },
      liquidity: {
        usd: 15000,
        base: 6410256410,
        quote: 150,
      },
      fdv: 2340000,
      marketCap: 2340000,
      pairCreatedAt: Date.now() - 86400000,
    },
  ],
};

export const RUGCHECK_DATA_PUMP = {
  mint: 'FRVCEaJuS8cuBTWR1JwVu35pBsKmHmt9n4LjSiF4pump',
  score: 8500,
  risks: [],
  topHolders: HOLDERS_PUMP_FUN.map(h => ({
    address: h.address,
    pct: h.percentage,
  })),
  markets: [
    {
      lp: 'TestLPAddress123456789',
      marketType: 'pump_fun',
      lpLockedPct: 99.26,
      lpBurn: null,
    },
  ],
  fileMeta: {
    name: 'Test Pump.fun Token',
    symbol: 'TESTPUMP',
  },
};

export const RUGCHECK_DATA_WITH_BUNDLES = {
  mint: '2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt',
  score: 7500,
  risks: [
    {
      name: 'Bundled wallets detected',
      description: '3 wallets appear to be bundled',
      level: 'warn',
      score: 500,
    },
  ],
  topHolders: HOLDERS_WITH_BUNDLES.map(h => ({
    address: h.address,
    pct: h.percentage,
  })),
  markets: [
    {
      lp: 'BundleTestLP123456789',
      marketType: 'raydium',
      lpLockedPct: 0,
      lpBurn: 95.5,
    },
  ],
  fileMeta: {
    name: 'Solana Rug Killer',
    symbol: 'RUGK',
  },
};

export const GOPLUS_DATA_SAFE = {
  code: 1,
  message: 'OK',
  result: {
    FRVCEaJuS8cuBTWR1JwVu35pBsKmHmt9n4LjSiF4pump: {
      is_honeypot: '0',
      is_blacklisted: '0',
      is_open_source: '1',
      buy_tax: '0',
      sell_tax: '0',
      can_take_back_ownership: '0',
      owner_change_balance: '0',
      hidden_owner: '0',
      selfdestruct: '0',
      is_true_token: '1',
    },
  },
};

export const GOPLUS_DATA_RISKY = {
  code: 1,
  message: 'OK',
  result: {
    '2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt': {
      is_honeypot: '1',
      is_blacklisted: '0',
      is_open_source: '1',
      buy_tax: '0',
      sell_tax: '25',
      can_take_back_ownership: '1',
      owner_change_balance: '1',
      hidden_owner: '0',
      selfdestruct: '0',
      is_true_token: '1',
    },
  },
};

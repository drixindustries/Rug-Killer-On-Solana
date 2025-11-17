import assert from 'assert';
import { SolanaTokenAnalyzer } from '../../server/solana-analyzer.ts';

// Provide a valid Solana public key (USDC) for parsing to avoid errors
const TEST_TOKEN = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export async function run() {
  // Instantiate analyzer
  const analyzer = new SolanaTokenAnalyzer();

  // Monkey-patch dexScreener service to return deterministic data
  // @ts-ignore private access
  analyzer.dexScreener = {
    async getTokenData(_address: string) {
      return {
        schemaVersion: '1.0',
        pairs: [
          {
            chainId: 'solana',
            dexId: 'raydium',
            pairAddress: 'PairAddressMock',
            baseToken: { address: TEST_TOKEN, name: 'Test Token', symbol: 'TEST' },
            quoteToken: { address: 'So11111111111111111111111111111111111111112', name: 'SOL', symbol: 'SOL' },
            priceUsd: '0.005',
            priceNative: '0.0001',
            txns: {
              m5: { buys: 5, sells: 3 },
              h1: { buys: 20, sells: 10 },
              h6: { buys: 35, sells: 18 },
              h24: { buys: 60, sells: 30 }, // Ensures floor detection engages (buys > 10)
            },
            volume: { h24: 12000, h6: 4000, h1: 1500, m5: 200 },
            priceChange: { m5: 1.2, h1: 3.5, h6: -2.1, h24: 8.5 },
            liquidity: { usd: 25000, base: 1000000, quote: 50 },
            fdv: 500000,
            marketCap: 450000,
            pairCreatedAt: Date.now() - 3600_000,
          },
        ],
      };
    },
  };

  // Run analysis (skip on-chain to avoid RPC dependency)
  const result = await analyzer.analyzeToken(TEST_TOKEN, { skipOnChain: true });

  assert.ok(result.floorData, 'floorData should be present');
  assert.strictEqual(result.floorData?.hasFloor, true, 'hasFloor should be true');
  assert.ok((result.floorData?.floorConfidence ?? 0) > 0, 'floorConfidence should be > 0');
  assert.ok((result.floorData?.supportLevels?.length ?? 0) >= 1, 'supportLevels should contain at least one level');
  assert.ok(typeof result.floorData?.insight === 'string', 'insight should be a string');

  // Validate price vs floor semantics
  if (result.floorData?.floorPrice && result.marketData?.priceUsd) {
    const delta = result.floorData.currentPriceVsFloor;
    assert.ok(typeof delta === 'number', 'currentPriceVsFloor should be numeric');
  }
}

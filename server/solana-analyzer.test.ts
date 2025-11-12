import { SolanaTokenAnalyzer } from './solana-analyzer';
import { PublicKey } from '@solana/web3.js';
import {
  mockCompleteAnalysis,
  mockDexScreener,
  mockRugcheck,
  mockGoPlus,
  mockSolanaRPC,
  clearAllMocks,
  MockBuilder,
} from '../tests/utils/solana-mocks';
import {
  PUMP_FUN_TOKEN,
  BUNDLE_TOKEN,
  REGULAR_TOKEN,
  HOLDERS_PUMP_FUN,
  HOLDERS_WITH_BUNDLES,
  DEXSCREENER_DATA_PUMP,
  RUGCHECK_DATA_PUMP,
  RUGCHECK_DATA_WITH_BUNDLES,
  GOPLUS_DATA_SAFE,
  GOPLUS_DATA_RISKY,
} from '../tests/fixtures/solana/token-fixtures';

// Mock external dependencies
jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      getAccountInfo: jest.fn(),
      getProgramAccounts: jest.fn(),
      getTokenLargestAccounts: jest.fn(),
      getSignaturesForAddress: jest.fn(),
    })),
  };
});

jest.mock('@solana/spl-token', () => ({
  getMint: jest.fn(),
  TOKEN_PROGRAM_ID: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
}));

describe('SolanaTokenAnalyzer', () => {
  let analyzer: SolanaTokenAnalyzer;

  beforeEach(() => {
    clearAllMocks();
    analyzer = new SolanaTokenAnalyzer();
  });

  afterEach(() => {
    clearAllMocks();
  });

  describe('analyzeToken', () => {
    it('should correctly analyze pump.fun token with locked liquidity', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      // Mock mint info
      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      // Mock holder data
      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_PUMP_FUN.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      // Mock holder count
      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue(
        new Array(1557).fill(null).map((_, i) => ({
          account: {
            data: Buffer.alloc(165),
          },
          pubkey: new PublicKey(`Holder${i}AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`),
        }))
      );

      // Mock transactions
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      // Mock external APIs
      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      mockRugcheck(PUMP_FUN_TOKEN.address, 'safe');
      mockGoPlus(PUMP_FUN_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      expect(result.tokenAddress).toBe(PUMP_FUN_TOKEN.address);
      expect(result.mintAuthority.isRevoked).toBe(true);
      expect(result.freezeAuthority.isRevoked).toBe(true);
      expect(result.liquidityPool.isLocked).toBe(true);
      expect(result.liquidityPool.burnPercentage).toBeGreaterThanOrEqual(90);
      expect(result.liquidityPool.status).toBe('SAFE');
      expect(result.riskLevel).toBe('LOW');
    });

    it('should detect bundled wallets and calculate bundle percentage', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      // Mock mint info
      getMint.mockResolvedValue({
        address: new PublicKey(BUNDLE_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(BUNDLE_TOKEN.supply),
        decimals: BUNDLE_TOKEN.decimals,
        isInitialized: true,
      });

      // Mock holder data with bundles
      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_WITH_BUNDLES.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      // Mock external APIs
      mockDexScreener(BUNDLE_TOKEN.address, 'bundle');
      mockRugcheck(BUNDLE_TOKEN.address, 'bundles');
      mockGoPlus(BUNDLE_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(BUNDLE_TOKEN.address);

      expect(result.holderFiltering.bundledDetection).toBeDefined();
      expect(result.holderFiltering.totals.bundled).toBeGreaterThan(0);
      expect(result.holderFiltering.bundledDetection?.bundleSupplyPct).toBeGreaterThan(0);
      expect(result.holderFiltering.bundledDetection?.confidence).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(result.holderFiltering.bundledDetection?.confidence);
    });

    it('should filter out LP addresses from holder concentration', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_PUMP_FUN.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      mockRugcheck(PUMP_FUN_TOKEN.address, 'safe');
      mockGoPlus(PUMP_FUN_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      expect(result.holderFiltering.totals.lp).toBeGreaterThan(0);
      expect(result.liquidityPool.lpAddresses).toBeDefined();
      expect(result.liquidityPool.lpAddresses?.length).toBeGreaterThan(0);
      
      // Verify LP addresses were excluded from top holders
      const lpAddresses = result.liquidityPool.lpAddresses || [];
      const topHolderAddresses = result.topHolders.map(h => h.address);
      lpAddresses.forEach(lpAddr => {
        expect(topHolderAddresses).not.toContain(lpAddr);
      });
    });

    it('should filter out known exchange addresses', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      // Add a known exchange address to holders
      const holdersWithExchange = [
        ...HOLDERS_PUMP_FUN,
        {
          address: '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', // Binance from known-addresses
          balance: 50000000,
          percentage: 5.0,
        },
      ];

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: holdersWithExchange.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      mockRugcheck(PUMP_FUN_TOKEN.address, 'safe');
      mockGoPlus(PUMP_FUN_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      // Verify exchange address was excluded
      const topHolderAddresses = result.topHolders.map(h => h.address);
      expect(topHolderAddresses).not.toContain('5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9');
      
      // Verify it was added to excluded addresses
      const excludedExchanges = result.holderFiltering.excluded.filter(e => e.type === 'exchange');
      expect(excludedExchanges.length).toBeGreaterThan(0);
    });

    it('should detect pump_fun market type', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: [],
      });
      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      mockRugcheck(PUMP_FUN_TOKEN.address, 'safe');
      mockGoPlus(PUMP_FUN_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      // Pump.fun tokens should have locked liquidity, not burned
      expect(result.liquidityPool.isLocked).toBe(true);
      expect(result.rugcheckData?.markets?.[0]?.marketType).toBe('pump_fun');
    });

    it('should detect pump_fun_amm market type', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: [],
      });
      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      // Custom rugcheck data with pump_fun_amm market type
      const rugcheckDataPumpAMM = {
        ...RUGCHECK_DATA_PUMP,
        markets: [
          {
            ...RUGCHECK_DATA_PUMP.markets[0],
            marketType: 'pump_fun_amm',
          },
        ],
      };

      new MockBuilder()
        .withDexScreener(PUMP_FUN_TOKEN.address, DEXSCREENER_DATA_PUMP)
        .withRugcheck(PUMP_FUN_TOKEN.address, rugcheckDataPumpAMM)
        .withGoPlus(PUMP_FUN_TOKEN.address, GOPLUS_DATA_SAFE)
        .build();

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      // pump_fun_amm should also be detected as pump.fun variant
      expect(result.liquidityPool.isLocked).toBe(true);
      expect(result.rugcheckData?.markets?.[0]?.marketType).toBe('pump_fun_amm');
    });

    it('should handle error when mint account is invalid', async () => {
      const { getMint } = require('@solana/spl-token');

      getMint.mockRejectedValue(new Error('Invalid mint address'));

      const result = await analyzer.analyzeToken('InvalidAddress123456789');

      expect(result.riskScore).toBe(100);
      expect(result.riskLevel).toBe('EXTREME');
      expect(result.redFlags).toHaveLength(1);
      expect(result.redFlags[0].title).toBe('Analysis Failed');
      expect(result.redFlags[0].description).toContain('Invalid mint address');
    });

    it('should handle RPC rate limit errors gracefully', async () => {
      const { getMint } = require('@solana/spl-token');

      getMint.mockRejectedValue(new Error('429 Too Many Requests'));

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      expect(result.riskScore).toBe(100);
      expect(result.riskLevel).toBe('EXTREME');
      expect(result.redFlags[0].description).toContain('429 Too Many Requests');
    });

    it('should fallback to Rugcheck data when on-chain holder fetch fails', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      // Simulate on-chain holder fetch failure
      Connection.prototype.getTokenLargestAccounts = jest.fn().mockRejectedValue(
        new Error('RPC call failed')
      );

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      mockRugcheck(PUMP_FUN_TOKEN.address, 'safe');
      mockGoPlus(PUMP_FUN_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      // Should have holders from Rugcheck fallback
      expect(result.topHolders.length).toBeGreaterThan(0);
      expect(result.holderCount).toBeGreaterThan(0);
    });
  });

  describe('Risk Scoring', () => {
    it('should calculate low risk score for safe token', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null, // Revoked
        freezeAuthority: null, // Revoked
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_PUMP_FUN.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue(
        new Array(2000).fill(null).map(() => ({
          account: { data: Buffer.alloc(165) },
          pubkey: new PublicKey('Test1234567890123456789012345678901234567'),
        }))
      );
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      mockRugcheck(PUMP_FUN_TOKEN.address, 'safe');
      mockGoPlus(PUMP_FUN_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      expect(result.riskScore).toBeLessThan(30);
      expect(result.riskLevel).toBe('LOW');
    });

    it('should calculate high risk score for token with mint authority', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(BUNDLE_TOKEN.address),
        mintAuthority: new PublicKey('DevAuthority1234567890123456789012345678'), // Not revoked
        freezeAuthority: null,
        supply: BigInt(BUNDLE_TOKEN.supply),
        decimals: BUNDLE_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_WITH_BUNDLES.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(BUNDLE_TOKEN.address, 'bundle');
      mockRugcheck(BUNDLE_TOKEN.address, 'bundles');
      mockGoPlus(BUNDLE_TOKEN.address, 'risky');

      const result = await analyzer.analyzeToken(BUNDLE_TOKEN.address);

      expect(result.riskScore).toBeGreaterThanOrEqual(30);
      expect(result.mintAuthority.hasAuthority).toBe(true);
      expect(result.redFlags.some(f => f.type === 'mint_authority')).toBe(true);
    });

    it('should add critical risk flag for extreme holder concentration', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      // Create holders with extreme concentration (one whale owns 85%)
      const extremeHolders = [
        {
          address: 'ExtremeWhale1234567890123456789012345678',
          balance: 850000000,
          percentage: 85.0,
        },
        {
          address: 'SmallHolder11234567890123456789012345678',
          balance: 150000000,
          percentage: 15.0,
        },
      ];

      getMint.mockResolvedValue({
        address: new PublicKey(BUNDLE_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(1000000000),
        decimals: 6,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: extremeHolders.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(BUNDLE_TOKEN.address, 'bundle');
      
      // Rugcheck with no LP data to ensure holder concentration is accurate
      const rugcheckNoLP = {
        ...RUGCHECK_DATA_WITH_BUNDLES,
        markets: [],
      };
      
      new MockBuilder()
        .withDexScreener(BUNDLE_TOKEN.address, DEXSCREENER_DATA_PUMP)
        .withRugcheck(BUNDLE_TOKEN.address, rugcheckNoLP)
        .withGoPlus(BUNDLE_TOKEN.address, GOPLUS_DATA_SAFE)
        .build();

      const result = await analyzer.analyzeToken(BUNDLE_TOKEN.address);

      const concentrationFlag = result.redFlags.find(f => f.type === 'holder_concentration');
      expect(concentrationFlag).toBeDefined();
      expect(concentrationFlag?.severity).toBe('critical');
      expect(result.riskScore).toBeGreaterThanOrEqual(30);
    });

    it('should add medium risk flag for low holder count', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_PUMP_FUN.slice(0, 3).map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      // Only 50 holders total
      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue(
        new Array(50).fill(null).map(() => ({
          account: { data: Buffer.alloc(165) },
          pubkey: new PublicKey('Test1234567890123456789012345678901234567'),
        }))
      );
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      mockRugcheck(PUMP_FUN_TOKEN.address, 'safe');
      mockGoPlus(PUMP_FUN_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      const lowHoldersFlag = result.redFlags.find(
        f => f.title === 'Low Holder Count'
      );
      expect(lowHoldersFlag).toBeDefined();
      expect(lowHoldersFlag?.severity).toBe('medium');
    });
  });

  describe('Liquidity Analysis', () => {
    it('should detect locked liquidity for pump.fun tokens', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({ value: [] });
      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      mockRugcheck(PUMP_FUN_TOKEN.address, 'safe');
      mockGoPlus(PUMP_FUN_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      expect(result.liquidityPool.isLocked).toBe(true);
      expect(result.liquidityPool.burnPercentage).toBeGreaterThanOrEqual(90);
      expect(result.liquidityPool.status).toBe('SAFE');
    });

    it('should detect burned liquidity for regular tokens', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(BUNDLE_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(BUNDLE_TOKEN.supply),
        decimals: BUNDLE_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({ value: [] });
      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(BUNDLE_TOKEN.address, 'bundle');
      mockRugcheck(BUNDLE_TOKEN.address, 'bundles');
      mockGoPlus(BUNDLE_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(BUNDLE_TOKEN.address);

      expect(result.liquidityPool.isBurned).toBe(true);
      expect(result.liquidityPool.burnPercentage).toBeGreaterThanOrEqual(95);
    });

    it('should mark risky liquidity when burn percentage is low', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(BUNDLE_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(BUNDLE_TOKEN.supply),
        decimals: BUNDLE_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({ value: [] });
      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      // Custom rugcheck with low burn percentage
      const rugcheckLowBurn = {
        ...RUGCHECK_DATA_WITH_BUNDLES,
        markets: [
          {
            ...RUGCHECK_DATA_WITH_BUNDLES.markets[0],
            lpBurn: 25, // Low burn percentage
            lp: null,
          },
        ],
      };

      new MockBuilder()
        .withDexScreener(BUNDLE_TOKEN.address, DEXSCREENER_DATA_PUMP)
        .withRugcheck(BUNDLE_TOKEN.address, rugcheckLowBurn)
        .withGoPlus(BUNDLE_TOKEN.address, GOPLUS_DATA_SAFE)
        .build();

      const result = await analyzer.analyzeToken(BUNDLE_TOKEN.address);

      expect(result.liquidityPool.status).toBe('RISKY');
      expect(result.liquidityPool.burnPercentage).toBe(25);
      
      const liquidityFlag = result.redFlags.find(f => f.type === 'low_liquidity');
      expect(liquidityFlag).toBeDefined();
    });

    it('should handle missing liquidity data gracefully', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({ value: [] });
      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      // No rugcheck data, no DexScreener data
      new MockBuilder()
        .withDexScreener(PUMP_FUN_TOKEN.address, { pairs: [] })
        .withRugcheck(PUMP_FUN_TOKEN.address, { ...RUGCHECK_DATA_PUMP, markets: [] })
        .withGoPlus(PUMP_FUN_TOKEN.address, GOPLUS_DATA_SAFE)
        .build();

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      expect(result.liquidityPool.status).toBe('UNKNOWN');
    });
  });

  describe('Bundle Detection', () => {
    it('should calculate bundle supply percentage correctly', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(BUNDLE_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(BUNDLE_TOKEN.supply),
        decimals: BUNDLE_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_WITH_BUNDLES.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(BUNDLE_TOKEN.address, 'bundle');
      mockRugcheck(BUNDLE_TOKEN.address, 'bundles');
      mockGoPlus(BUNDLE_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(BUNDLE_TOKEN.address);

      const bundleDetection = result.holderFiltering.bundledDetection;
      expect(bundleDetection).toBeDefined();
      
      // Bundle1, Bundle2, Bundle3 from HOLDERS_WITH_BUNDLES all have ~2%, ~1%, ~0.89%
      // Total should be around 3.89%
      expect(bundleDetection?.bundleSupplyPct).toBeGreaterThan(0);
      expect(bundleDetection?.bundleSupplyPct).toBeLessThanOrEqual(100);
    });

    it('should set high confidence for large bundle groups', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      // Create a large bundle (6 wallets with same percentage)
      const largeBundle = [
        { address: 'Bundle1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', balance: 20000000, percentage: 2.0 },
        { address: 'Bundle2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', balance: 20000000, percentage: 2.0 },
        { address: 'Bundle3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', balance: 20000000, percentage: 2.0 },
        { address: 'Bundle4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', balance: 20000000, percentage: 2.0 },
        { address: 'Bundle5AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', balance: 20000000, percentage: 2.0 },
        { address: 'Bundle6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', balance: 20000000, percentage: 2.0 },
        { address: 'Regular1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', balance: 880000000, percentage: 88.0 },
      ];

      getMint.mockResolvedValue({
        address: new PublicKey(BUNDLE_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(1000000000),
        decimals: 6,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: largeBundle.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(BUNDLE_TOKEN.address, 'bundle');
      mockRugcheck(BUNDLE_TOKEN.address, 'bundles');
      mockGoPlus(BUNDLE_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(BUNDLE_TOKEN.address);

      expect(result.holderFiltering.bundledDetection?.confidence).toBe('high');
      expect(result.holderFiltering.totals.bundled).toBeGreaterThanOrEqual(5);
    });

    it('should set medium confidence for moderate bundle groups', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(BUNDLE_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(BUNDLE_TOKEN.supply),
        decimals: BUNDLE_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_WITH_BUNDLES.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(BUNDLE_TOKEN.address, 'bundle');
      mockRugcheck(BUNDLE_TOKEN.address, 'bundles');
      mockGoPlus(BUNDLE_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(BUNDLE_TOKEN.address);

      // HOLDERS_WITH_BUNDLES has 3 bundled wallets, should be medium confidence
      expect(result.holderFiltering.bundledDetection?.confidence).toBe('medium');
    });

    it('should not set bundled detection when no bundles detected', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_PUMP_FUN.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      mockRugcheck(PUMP_FUN_TOKEN.address, 'safe');
      mockGoPlus(PUMP_FUN_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      expect(result.holderFiltering.bundledDetection).toBeUndefined();
      expect(result.holderFiltering.totals.bundled).toBe(0);
    });
  });

  describe('Market Data', () => {
    it('should build market data from DexScreener primary pair', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({ value: [] });
      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      mockRugcheck(PUMP_FUN_TOKEN.address, 'safe');
      mockGoPlus(PUMP_FUN_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      expect(result.marketData).toBeDefined();
      expect(result.marketData?.source).toBe('dexscreener');
      expect(result.marketData?.priceUsd).toBeDefined();
      expect(result.marketData?.liquidityUsd).toBeDefined();
      expect(result.marketData?.volume24h).toBeDefined();
    });

    it('should handle missing market data gracefully', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({ value: [] });
      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      // Empty DexScreener data
      new MockBuilder()
        .withDexScreener(PUMP_FUN_TOKEN.address, { pairs: [] })
        .withRugcheck(PUMP_FUN_TOKEN.address, RUGCHECK_DATA_PUMP)
        .withGoPlus(PUMP_FUN_TOKEN.address, GOPLUS_DATA_SAFE)
        .build();

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      expect(result.marketData).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle DexScreener API failure', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({ value: [] });
      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      // Mock failed DexScreener call
      const nock = require('nock');
      nock('https://api.dexscreener.com')
        .get(`/latest/dex/tokens/${PUMP_FUN_TOKEN.address}`)
        .reply(500, { error: 'Internal Server Error' });

      mockRugcheck(PUMP_FUN_TOKEN.address, 'safe');
      mockGoPlus(PUMP_FUN_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      // Should still complete analysis without DexScreener data
      expect(result.dexscreenerData).toBeUndefined();
      expect(result.riskScore).toBeDefined();
    });

    it('should handle Rugcheck API failure', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_PUMP_FUN.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      
      // Mock failed Rugcheck call
      const nock = require('nock');
      nock('https://api.rugcheck.xyz')
        .get(`/v1/tokens/${PUMP_FUN_TOKEN.address}/report`)
        .reply(404, { error: 'Not found' });

      mockGoPlus(PUMP_FUN_TOKEN.address, 'safe');

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      // Should still complete with on-chain holder data
      expect(result.rugcheckData).toBeUndefined();
      expect(result.topHolders.length).toBeGreaterThan(0);
    });

    it('should handle GoPlus API failure', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({ value: [] });
      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      mockRugcheck(PUMP_FUN_TOKEN.address, 'safe');
      
      // Mock failed GoPlus call
      const nock = require('nock');
      nock('https://api.gopluslabs.io')
        .get('/api/v1/token_security/solana')
        .query({ contract_addresses: PUMP_FUN_TOKEN.address })
        .reply(500, { error: 'Service unavailable' });

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      // Should still complete without GoPlus data
      expect(result.goplusData).toBeUndefined();
      expect(result.riskScore).toBeDefined();
    });

    it('should handle all external API failures gracefully', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_PUMP_FUN.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      // Mock all external APIs to fail
      const nock = require('nock');
      nock('https://api.dexscreener.com')
        .get(`/latest/dex/tokens/${PUMP_FUN_TOKEN.address}`)
        .reply(500);
      nock('https://api.rugcheck.xyz')
        .get(`/v1/tokens/${PUMP_FUN_TOKEN.address}/report`)
        .reply(500);
      nock('https://api.gopluslabs.io')
        .get('/api/v1/token_security/solana')
        .query(true)
        .reply(500);

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      // Should still provide basic analysis from on-chain data
      expect(result.tokenAddress).toBe(PUMP_FUN_TOKEN.address);
      expect(result.topHolders.length).toBeGreaterThan(0);
      expect(result.riskScore).toBeDefined();
      expect(result.riskLevel).toBeDefined();
    });
  });

  describe('API Resilience Tests', () => {
    it('should handle Rugcheck API 429 rate limit response gracefully', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_PUMP_FUN.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      // Mock successful DexScreener and GoPlus
      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      mockGoPlus(PUMP_FUN_TOKEN.address, 'safe');

      // Mock Rugcheck API 429 rate limit
      const nock = require('nock');
      nock('https://api.rugcheck.xyz')
        .get(`/v1/tokens/${PUMP_FUN_TOKEN.address}/report`)
        .reply(429, {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: 60,
        });

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      // Should complete analysis without Rugcheck data
      expect(result.tokenAddress).toBe(PUMP_FUN_TOKEN.address);
      expect(result.rugcheckData).toBeUndefined();
      expect(result.riskScore).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      // Should still have data from other sources
      expect(result.dexscreenerData).toBeDefined();
      expect(result.goplusData).toBeDefined();
      expect(result.topHolders.length).toBeGreaterThan(0);
    });

    it('should handle GoPlus API timeout scenario gracefully', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_PUMP_FUN.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      // Mock successful DexScreener and Rugcheck
      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');
      mockRugcheck(PUMP_FUN_TOKEN.address, 'safe');

      // Mock GoPlus API timeout (using delay to simulate timeout)
      const nock = require('nock');
      nock('https://api.gopluslabs.io')
        .get('/api/v1/token_security/solana')
        .query({ contract_addresses: PUMP_FUN_TOKEN.address })
        .delayConnection(30000)
        .reply(200, GOPLUS_DATA_SAFE);

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      // Should complete analysis without waiting for GoPlus timeout
      expect(result.tokenAddress).toBe(PUMP_FUN_TOKEN.address);
      expect(result.riskScore).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      // Should have data from other sources
      expect(result.dexscreenerData).toBeDefined();
      expect(result.rugcheckData).toBeDefined();
      expect(result.topHolders.length).toBeGreaterThan(0);
    });

    it('should handle combined API failures with graceful degradation', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_PUMP_FUN.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue(
        new Array(1557).fill(null).map((_, i) => ({
          account: {
            data: Buffer.alloc(165),
          },
          pubkey: new PublicKey(`Holder${i}AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`),
        }))
      );

      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      // Mock different failure scenarios for different APIs
      const nock = require('nock');
      
      // Rugcheck: 429 rate limit
      nock('https://api.rugcheck.xyz')
        .get(`/v1/tokens/${PUMP_FUN_TOKEN.address}/report`)
        .reply(429, { error: 'Rate limit exceeded' });

      // GoPlus: Network error
      nock('https://api.gopluslabs.io')
        .get('/api/v1/token_security/solana')
        .query({ contract_addresses: PUMP_FUN_TOKEN.address })
        .replyWithError({ code: 'ECONNREFUSED', message: 'Connection refused' });

      // DexScreener: Server error
      nock('https://api.dexscreener.com')
        .get(`/latest/dex/tokens/${PUMP_FUN_TOKEN.address}`)
        .reply(503, { error: 'Service temporarily unavailable' });

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      // Should still provide analysis based on on-chain data only
      expect(result.tokenAddress).toBe(PUMP_FUN_TOKEN.address);
      expect(result.topHolders.length).toBeGreaterThan(0);
      expect(result.holderCount).toBe(1557);
      expect(result.riskScore).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      
      // External API data should be undefined due to failures
      expect(result.rugcheckData).toBeUndefined();
      expect(result.goplusData).toBeUndefined();
      expect(result.dexscreenerData).toBeUndefined();
      
      // Should still have valid mint authority analysis from on-chain data
      expect(result.mintAuthority.isRevoked).toBe(true);
      expect(result.freezeAuthority.isRevoked).toBe(true);
    });

    it('should handle partial API success with some failures', async () => {
      const { getMint } = require('@solana/spl-token');
      const { Connection } = require('@solana/web3.js');

      getMint.mockResolvedValue({
        address: new PublicKey(PUMP_FUN_TOKEN.address),
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(PUMP_FUN_TOKEN.supply),
        decimals: PUMP_FUN_TOKEN.decimals,
        isInitialized: true,
      });

      Connection.prototype.getTokenLargestAccounts = jest.fn().mockResolvedValue({
        value: HOLDERS_PUMP_FUN.map(h => ({
          address: new PublicKey(h.address),
          amount: BigInt(h.balance),
        })),
      });

      Connection.prototype.getProgramAccounts = jest.fn().mockResolvedValue([]);
      Connection.prototype.getSignaturesForAddress = jest.fn().mockResolvedValue([]);

      // Mock partial success: DexScreener succeeds, others fail
      mockDexScreener(PUMP_FUN_TOKEN.address, 'pump');

      const nock = require('nock');
      nock('https://api.rugcheck.xyz')
        .get(`/v1/tokens/${PUMP_FUN_TOKEN.address}/report`)
        .reply(500, { error: 'Internal server error' });

      nock('https://api.gopluslabs.io')
        .get('/api/v1/token_security/solana')
        .query({ contract_addresses: PUMP_FUN_TOKEN.address })
        .reply(429, { error: 'Too many requests' });

      const result = await analyzer.analyzeToken(PUMP_FUN_TOKEN.address);

      // Should have analysis with partial external data
      expect(result.tokenAddress).toBe(PUMP_FUN_TOKEN.address);
      expect(result.dexscreenerData).toBeDefined();
      expect(result.rugcheckData).toBeUndefined();
      expect(result.goplusData).toBeUndefined();
      expect(result.riskScore).toBeDefined();
      expect(result.riskLevel).toBeDefined();
    });
  });
});

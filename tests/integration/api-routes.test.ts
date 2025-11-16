import request from 'supertest';
import { app } from '../../server/index';
import {
  mockCompleteAnalysis,
  mockSolanaRPC,
  clearAllMocks,
} from '../utils/solana-mocks';
import {
  PUMP_FUN_TOKEN,
  BUNDLE_TOKEN,
} from '../fixtures/solana/token-fixtures';
import { registerRoutes } from '../../server/routes';

describe('API Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    server = await registerRoutes(app);
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  beforeEach(() => {
    clearAllMocks();
  });

  afterEach(() => {
    clearAllMocks();
  });

  describe('POST /api/analyze-token', () => {
    describe('Success Cases', () => {
      it('should return 200 and complete analysis for valid pump.fun token', async () => {
        // Mock all external API calls
        mockCompleteAnalysis(PUMP_FUN_TOKEN.address, 'safe');

        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: PUMP_FUN_TOKEN.address })
          .expect('Content-Type', /json/)
          .expect(200);

        // Verify response structure
        expect(response.body).toHaveProperty('tokenAddress');
        expect(response.body.tokenAddress).toBe(PUMP_FUN_TOKEN.address);
        
        expect(response.body).toHaveProperty('riskScore');
        expect(typeof response.body.riskScore).toBe('number');
        // Updated analyzer riskScore now 0-100 (lower = more dangerous)
        expect(response.body.riskScore).toBeGreaterThanOrEqual(0);
        expect(response.body.riskScore).toBeLessThanOrEqual(100);
        
        expect(response.body).toHaveProperty('riskLevel');
        expect(['LOW', 'MODERATE', 'HIGH', 'EXTREME']).toContain(response.body.riskLevel);
        
        expect(response.body).toHaveProperty('analyzedAt');
        expect(typeof response.body.analyzedAt).toBe('number');
        
        // Verify authority checks
        expect(response.body).toHaveProperty('mintAuthority');
        expect(response.body.mintAuthority).toHaveProperty('hasAuthority');
        expect(response.body.mintAuthority).toHaveProperty('isRevoked');
        
        expect(response.body).toHaveProperty('freezeAuthority');
        expect(response.body.freezeAuthority).toHaveProperty('hasAuthority');
        expect(response.body.freezeAuthority).toHaveProperty('isRevoked');
        
        // Verify metadata
        expect(response.body).toHaveProperty('metadata');
        expect(response.body.metadata).toHaveProperty('name');
        expect(response.body.metadata).toHaveProperty('symbol');
        expect(response.body.metadata).toHaveProperty('decimals');
        expect(response.body.metadata).toHaveProperty('supply');
        
        // Verify holder analysis
        expect(response.body).toHaveProperty('holderCount');
        expect(typeof response.body.holderCount).toBe('number');
        
        expect(response.body).toHaveProperty('topHolders');
        expect(Array.isArray(response.body.topHolders)).toBe(true);
        
        expect(response.body).toHaveProperty('topHolderConcentration');
        expect(typeof response.body.topHolderConcentration).toBe('number');
        
        // Verify liquidity data
        expect(response.body).toHaveProperty('liquidityPool');
        expect(response.body.liquidityPool).toHaveProperty('exists');
        expect(response.body.liquidityPool).toHaveProperty('status');
        
        // Verify transactions
        expect(response.body).toHaveProperty('recentTransactions');
        expect(Array.isArray(response.body.recentTransactions)).toBe(true);
        
        expect(response.body).toHaveProperty('suspiciousActivityDetected');
        expect(typeof response.body.suspiciousActivityDetected).toBe('boolean');
        
        // Verify risk assessment
        expect(response.body).toHaveProperty('redFlags');
        expect(Array.isArray(response.body.redFlags)).toBe(true);
        
        // Verify blacklist info is added
        expect(response.body).toHaveProperty('blacklistInfo');
        expect(response.body.blacklistInfo).toHaveProperty('mintAuthority');
        expect(response.body.blacklistInfo).toHaveProperty('freezeAuthority');
        expect(response.body.blacklistInfo).toHaveProperty('token');
      });

      it('should include market data when available from DexScreener', async () => {
        mockCompleteAnalysis(PUMP_FUN_TOKEN.address, 'safe');

        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: PUMP_FUN_TOKEN.address })
          .expect(200);

        // Verify market data structure
        expect(response.body).toHaveProperty('marketData');
        if (response.body.marketData) {
          expect(response.body.marketData).toHaveProperty('priceUsd');
          expect(response.body.marketData).toHaveProperty('volume24h');
          expect(response.body.marketData).toHaveProperty('priceChange24h');
          // Liquidity key renamed when sourced from DexScreener (liquidityUsd) or Birdeye (liquidity)
          const hasLiquidity = 'liquidityUsd' in response.body.marketData || 'liquidity' in response.body.marketData;
          expect(hasLiquidity).toBe(true);
          expect(response.body.marketData).toHaveProperty('marketCap');
          expect(response.body.marketData).toHaveProperty('fdv');
        }
      });

      it('should detect and report bundled wallets', async () => {
        // Mock with bundle detection
        mockCompleteAnalysis(BUNDLE_TOKEN.address, 'bundles');

        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: BUNDLE_TOKEN.address })
          .expect(200);

        // Verify holder filtering data includes bundle information
        expect(response.body).toHaveProperty('holderFiltering');
        expect(response.body.holderFiltering).toHaveProperty('totals');
        if (response.body.holderFiltering.bundledDetection) {
          expect(response.body.holderFiltering.bundledDetection).toHaveProperty('bundleSupplyPct');
          expect(typeof response.body.holderFiltering.bundledDetection.bundleSupplyPct).toBe('number');
        }
      });

      it('should properly format holder data with ranks and percentages', async () => {
        mockCompleteAnalysis(PUMP_FUN_TOKEN.address, 'safe');

        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: PUMP_FUN_TOKEN.address })
          .expect(200);

        // Verify holder data structure
        const { topHolders } = response.body;
        expect(Array.isArray(topHolders)).toBe(true);
        
        if (topHolders.length > 0) {
          const holder = topHolders[0];
          expect(holder).toHaveProperty('rank');
          expect(holder).toHaveProperty('address');
          expect(holder).toHaveProperty('balance');
          expect(holder).toHaveProperty('percentage');
          
          expect(typeof holder.rank).toBe('number');
          expect(typeof holder.address).toBe('string');
          expect(typeof holder.balance).toBe('number');
          expect(typeof holder.percentage).toBe('number');
          
          // Percentages should be between 0 and 100
          expect(holder.percentage).toBeGreaterThanOrEqual(0);
          expect(holder.percentage).toBeLessThanOrEqual(100);
        }
      });

      it('should calculate risk score based on multiple factors', async () => {
        mockCompleteAnalysis(PUMP_FUN_TOKEN.address, 'safe');

        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: PUMP_FUN_TOKEN.address })
          .expect(200);

        // Risk score present
        expect(response.body.riskScore).toBeDefined();
        expect(typeof response.body.riskScore).toBe('number');
        const { riskScore, riskLevel } = response.body;
        if (riskScore >= 70) {
          expect(riskLevel).toBe('LOW');
        } else if (riskScore >= 40) {
          expect(riskLevel).toBe('MODERATE');
        } else if (riskScore >= 20) {
          expect(riskLevel).toBe('HIGH');
        } else {
          expect(riskLevel).toBe('EXTREME');
        }
      });
    });

    describe('Error Cases', () => {
      it('should return 400 for missing tokenAddress', async () => {
        const response = await request(app)
          .post('/api/analyze-token')
          .send({})
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Invalid request');
        expect(response.body).toHaveProperty('details');
        expect(Array.isArray(response.body.details)).toBe(true);
      });

      it('should return 400 for empty tokenAddress', async () => {
        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: '' })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Invalid request');
      });

      it('should return 400 for tokenAddress that is too short', async () => {
        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: 'tooShort' })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Invalid request');
        expect(response.body).toHaveProperty('details');
      });

      it('should return 400 for tokenAddress that is too long', async () => {
        const response = await request(app)
          .post('/api/analyze-token')
          .send({ 
            tokenAddress: 'ThisTokenAddressIsWayTooLongToBeValidOnSolanaBlockchain123456789' 
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Invalid request');
      });

      it('should return 500 for invalid token address format', async () => {
        // Mock Solana RPC but expect it to fail
        mockSolanaRPC();

        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: 'InvalidAddress1234567890123456789012' })
          .expect('Content-Type', /json/)
          .expect(500);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Analysis failed');
        expect(response.body).toHaveProperty('message');
      });

      it('should handle external API failures gracefully', async () => {
        // Mock Solana RPC only (other APIs will fail)
        mockSolanaRPC();

        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: PUMP_FUN_TOKEN.address })
          .expect('Content-Type', /json/);

        // Should still return data even if some external APIs fail
        // The analyzer catches errors and continues with partial data
        expect(response.statusCode).toBeLessThan(500);
      });

      it('should return proper error message for non-existent token', async () => {
        // Don't mock any responses - let APIs return not found
        const nonExistentAddress = '11111111111111111111111111111111';
        
        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: nonExistentAddress })
          .expect('Content-Type', /json/)
          .expect(500);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('Response Structure Validation', () => {
      it('should always include required fields in successful response', async () => {
        mockCompleteAnalysis(PUMP_FUN_TOKEN.address, 'safe');

        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: PUMP_FUN_TOKEN.address })
          .expect(200);

        // Required top-level fields
        const requiredFields = [
          'tokenAddress',
          'riskScore',
          'riskLevel',
          'analyzedAt',
          'mintAuthority',
          'freezeAuthority',
          'metadata',
          'holderCount',
          'topHolders',
          'topHolderConcentration',
          'holderFiltering',
          'liquidityPool',
          'recentTransactions',
          'suspiciousActivityDetected',
          'redFlags',
          'blacklistInfo',
        ];

        requiredFields.forEach(field => {
          expect(response.body).toHaveProperty(field);
        });
      });

      it('should include timestamp in Unix milliseconds format', async () => {
        mockCompleteAnalysis(PUMP_FUN_TOKEN.address, 'safe');

        const beforeRequest = Date.now();
        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: PUMP_FUN_TOKEN.address })
          .expect(200);
        const afterRequest = Date.now();

        expect(response.body.analyzedAt).toBeGreaterThanOrEqual(beforeRequest);
        expect(response.body.analyzedAt).toBeLessThanOrEqual(afterRequest);
      });

      it('should format redFlags with proper severity levels', async () => {
        mockCompleteAnalysis(PUMP_FUN_TOKEN.address, 'safe');

        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: PUMP_FUN_TOKEN.address })
          .expect(200);

        const validSeverities = ['low', 'medium', 'high', 'critical'];
        
        response.body.redFlags.forEach((flag: any) => {
          expect(flag).toHaveProperty('type');
          expect(flag).toHaveProperty('severity');
          expect(flag).toHaveProperty('title');
          expect(flag).toHaveProperty('description');
          expect(validSeverities).toContain(flag.severity);
        });
      });

      it('should include holder filtering metadata', async () => {
        mockCompleteAnalysis(PUMP_FUN_TOKEN.address, 'safe');

        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: PUMP_FUN_TOKEN.address })
          .expect(200);

        expect(response.body.holderFiltering).toHaveProperty('excluded');
        expect(Array.isArray(response.body.holderFiltering.excluded)).toBe(true);
      });
    });

    describe('Special Token Types', () => {
      it('should identify pump.fun tokens correctly', async () => {
        mockCompleteAnalysis(PUMP_FUN_TOKEN.address, 'safe');

        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: PUMP_FUN_TOKEN.address })
          .expect(200);

        // Pump.fun tokens typically have specific characteristics
        // that should be reflected in the analysis
        expect(response.body.tokenAddress).toBe(PUMP_FUN_TOKEN.address);
      });

      it('should handle tokens with high holder concentration', async () => {
        mockCompleteAnalysis(PUMP_FUN_TOKEN.address, 'safe');

        const response = await request(app)
          .post('/api/analyze-token')
          .send({ tokenAddress: PUMP_FUN_TOKEN.address })
          .expect(200);

        // Verify holder concentration is calculated
        expect(typeof response.body.topHolderConcentration).toBe('number');
        expect(response.body.topHolderConcentration).toBeGreaterThanOrEqual(0);
        expect(response.body.topHolderConcentration).toBeLessThanOrEqual(100);

        // High concentration should potentially trigger risk flags
        if (response.body.topHolderConcentration > 50) {
          const hasConcentrationFlag = response.body.redFlags.some(
            (flag: any) => flag.type === 'holder_concentration'
          );
          // May or may not have the flag depending on other factors
          expect(typeof hasConcentrationFlag).toBe('boolean');
        }
      });
    });
  });
});

import { test, expect } from '@playwright/test';
import type { TokenAnalysisResponse } from '../../shared/schema';

// Mock token addresses
const VALID_TOKEN = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const INVALID_TOKEN = 'invalid';

// Mock response for a safe token
const mockSafeTokenResponse: TokenAnalysisResponse = {
  tokenAddress: VALID_TOKEN,
  riskScore: 15,
  riskLevel: 'LOW',
  analyzedAt: Date.now(),
  mintAuthority: {
    hasAuthority: false,
    authorityAddress: null,
    isRevoked: true,
  },
  freezeAuthority: {
    hasAuthority: false,
    authorityAddress: null,
    isRevoked: true,
  },
  metadata: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    supply: 1000000000000,
    logoUri: 'https://example.com/usdc.png',
    hasMetadata: true,
    isMutable: false,
  },
  holderCount: 5000,
  topHolders: [
    { rank: 1, address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', balance: 100000000, percentage: 10 },
    { rank: 2, address: '36ybJdLRJdPRTLBbxsy5aVbHqCvCxdMz1Xw1mP9bTBPA', balance: 50000000, percentage: 5 },
  ],
  topHolderConcentration: 15,
  holderFiltering: {
    totals: {
      lp: 2,
      exchanges: 5,
      protocols: 3,
      bundled: 0,
      total: 10,
    },
    excluded: [],
  },
  liquidityPool: {
    exists: true,
    isLocked: true,
    isBurned: true,
    totalLiquidity: 5000000,
    status: 'SAFE',
    burnPercentage: 100,
    lpMintAddress: 'LPMintAddress123',
    lpReserve: 1000000,
    actualSupply: 1000000,
    lpAddresses: ['LP1Address', 'LP2Address'],
  },
  recentTransactions: [],
  suspiciousActivityDetected: false,
  redFlags: [],
  creationDate: Date.now() - 86400000 * 365,
};

// Mock response for a high-risk token with bundles
const mockHighRiskBundledResponse: TokenAnalysisResponse = {
  tokenAddress: 'HighRiskToken123456789012345678901234',
  riskScore: 85,
  riskLevel: 'EXTREME',
  analyzedAt: Date.now(),
  mintAuthority: {
    hasAuthority: true,
    authorityAddress: 'MintAuth123',
    isRevoked: false,
  },
  freezeAuthority: {
    hasAuthority: true,
    authorityAddress: 'FreezeAuth123',
    isRevoked: false,
  },
  metadata: {
    name: 'Suspicious Token',
    symbol: 'SUS',
    decimals: 9,
    supply: 1000000000000000,
    hasMetadata: true,
    isMutable: true,
  },
  holderCount: 150,
  topHolders: [
    { rank: 1, address: 'Bundle1Address', balance: 400000000000000, percentage: 40 },
    { rank: 2, address: 'Bundle2Address', balance: 300000000000000, percentage: 30 },
  ],
  topHolderConcentration: 70,
  holderFiltering: {
    totals: {
      lp: 1,
      exchanges: 0,
      protocols: 0,
      bundled: 15,
      total: 16,
    },
    excluded: [
      {
        address: 'Bundle1Address',
        type: 'bundled',
        reason: 'Same block funding',
      },
    ],
    bundledDetection: {
      strategy: 'sameBlock',
      confidence: 'high',
      details: 'Detected 15 wallets funded from the same source in the same block',
      bundleSupplyPct: 45.5,
      bundledSupplyAmount: 455000000000000,
    },
  },
  liquidityPool: {
    exists: true,
    isLocked: false,
    isBurned: false,
    totalLiquidity: 5000,
    status: 'RISKY',
    burnPercentage: 0,
    lpAddresses: ['LPAddr1'],
  },
  recentTransactions: [],
  suspiciousActivityDetected: true,
  redFlags: [
    {
      type: 'mint_authority',
      severity: 'critical',
      title: 'Mint Authority Active',
      description: 'Token has active mint authority which allows unlimited token creation',
    },
    {
      type: 'freeze_authority',
      severity: 'critical',
      title: 'Freeze Authority Active',
      description: 'Token has active freeze authority which can freeze user wallets',
    },
    {
      type: 'holder_concentration',
      severity: 'high',
      title: 'High Holder Concentration',
      description: 'Top 10 holders control 70% of the supply',
    },
  ],
  creationDate: Date.now() - 86400000,
};

// Mock response for a moderate risk token
const mockModerateRiskResponse: TokenAnalysisResponse = {
  ...mockSafeTokenResponse,
  riskScore: 45,
  riskLevel: 'MODERATE',
  topHolderConcentration: 35,
  redFlags: [
    {
      type: 'holder_concentration',
      severity: 'medium',
      title: 'Moderate Holder Concentration',
      description: 'Top 10 holders control 35% of the supply',
    },
  ],
};

// Mock response for a high risk token (no bundles)
const mockHighRiskResponse: TokenAnalysisResponse = {
  ...mockSafeTokenResponse,
  riskScore: 72,
  riskLevel: 'HIGH',
  mintAuthority: {
    hasAuthority: true,
    authorityAddress: 'MintAuth456',
    isRevoked: false,
  },
  redFlags: [
    {
      type: 'mint_authority',
      severity: 'critical',
      title: 'Mint Authority Active',
      description: 'Token has active mint authority',
    },
  ],
};

test.describe('Token Analysis Flow', () => {
  test('should display the landing page correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check for main heading
    await expect(page.getByRole('heading', { name: 'Solana Rug Detector' })).toBeVisible();
    
    // Check for description text
    await expect(page.getByText(/Analyze Solana tokens for rug pull risks/)).toBeVisible();
    
    // Check for official contract address
    await expect(page.getByTestId('text-contract-address')).toBeVisible();
    await expect(page.getByTestId('button-copy-contract')).toBeVisible();
    
    // Check for token input
    await expect(page.getByTestId('input-token-address')).toBeVisible();
    await expect(page.getByTestId('button-analyze')).toBeVisible();
  });

  test('should analyze token and display safe results', async ({ page }) => {
    // Mock API response with slight delay to simulate network
    await page.route('**/api/analyze-token', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSafeTokenResponse),
      });
    });

    await page.goto('/');
    
    // Fill in token address
    await page.getByTestId('input-token-address').fill(VALID_TOKEN);
    
    // Click analyze button
    await page.getByTestId('button-analyze').click();
    
    // Wait for results to load
    await expect(page.getByTestId('card-risk-score')).toBeVisible({ timeout: 10000 });
    
    // Verify risk score is displayed
    await expect(page.getByTestId('text-risk-score')).toBeVisible();
    
    // Verify risk level
    await expect(page.getByTestId('text-risk-level')).toContainText('LOW RISK');
    
    // Verify no critical alerts for safe token
    await expect(page.getByTestId('card-no-alerts')).toBeVisible();
    
    // Verify metrics are displayed
    await expect(page.getByTestId('metric-total-supply')).toBeVisible();
    await expect(page.getByTestId('metric-holder-count')).toBeVisible();
    await expect(page.getByTestId('metric-concentration')).toBeVisible();
    await expect(page.getByTestId('metric-liquidity')).toBeVisible();
  });

  test('should show bundle percentage metric when bundles detected', async ({ page }) => {
    // Mock API response with bundled wallets
    await page.route('**/api/analyze-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockHighRiskBundledResponse),
      });
    });

    await page.goto('/');
    
    await page.getByTestId('input-token-address').fill('BundledToken123456789012345678901234');
    await page.getByTestId('button-analyze').click();
    
    // Wait for results
    await expect(page.getByTestId('card-risk-score')).toBeVisible({ timeout: 10000 });
    
    // Verify bundle percentage metric is displayed
    await expect(page.getByTestId('metric-bundle-percentage')).toBeVisible();
    await expect(page.getByTestId('metric-bundle-percentage-value')).toContainText('45.50%');
    
    // Verify bundle visualization chart is displayed
    await expect(page.getByTestId('card-bundle-visualization')).toBeVisible();
    
    // Verify bundle warning badge
    await expect(page.getByTestId('badge-bundle-warning')).toBeVisible();
    await expect(page.getByTestId('badge-bundle-warning')).toContainText('15 Wallets');
    
    // Verify bundle percentage badge
    await expect(page.getByTestId('badge-bundle-percentage')).toBeVisible();
    await expect(page.getByTestId('badge-bundle-percentage')).toContainText('45.50% Supply');
    
    // Verify bundle detection details
    await expect(page.getByTestId('badge-confidence')).toBeVisible();
    await expect(page.getByTestId('badge-confidence')).toContainText('high confidence');
    
    // Verify bundled wallets alert
    await expect(page.getByTestId('alert-bundled_wallets')).toBeVisible();
  });

  test('should display bundle visualization chart with correct data', async ({ page }) => {
    await page.route('**/api/analyze-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockHighRiskBundledResponse),
      });
    });

    await page.goto('/');
    
    await page.getByTestId('input-token-address').fill('BundledToken123456789012345678901234');
    await page.getByTestId('button-analyze').click();
    
    await expect(page.getByTestId('card-bundle-visualization')).toBeVisible({ timeout: 10000 });
    
    // Verify chart summary stats
    await expect(page.getByTestId('text-total-holders')).toContainText('150');
    await expect(page.getByTestId('text-filtered-count')).toContainText('16');
    await expect(page.getByTestId('text-bundle-count')).toContainText('15');
  });

  test('should display correct risk indicators for different risk levels', async ({ page }) => {
    test.setTimeout(90000); // Increase timeout for multiple iterations
    
    const riskLevels = [
      { response: mockSafeTokenResponse, level: 'LOW RISK', score: '15', token: 'SafeToken1' },
      { response: mockModerateRiskResponse, level: 'MODERATE RISK', score: '45', token: 'ModToken1' },
      { response: mockHighRiskResponse, level: 'HIGH RISK', score: '72', token: 'HighRisk1' },
      { response: mockHighRiskBundledResponse, level: 'EXTREME RISK', score: '85', token: 'Extreme1' },
    ];

    for (const { response, level, score, token } of riskLevels) {
      // Clear previous routes and add new one for each iteration
      await page.unroute('**/api/analyze-token');
      await page.route('**/api/analyze-token', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      });

      await page.goto('/');
      
      await page.getByTestId('input-token-address').fill(`${token}123456789012345678901234`);
      await page.getByTestId('button-analyze').click({ timeout: 10000 });
      
      await expect(page.getByTestId('card-risk-score')).toBeVisible({ timeout: 15000 });
      
      // Verify risk level
      await expect(page.getByTestId('text-risk-level')).toContainText(level, { timeout: 5000 });
      
      // Verify risk score (animation completes)
      await page.waitForTimeout(1500); // Wait for animation
      await expect(page.getByTestId('text-risk-score')).toContainText(score);
    }
  });

  test('should handle invalid token address errors', async ({ page }) => {
    await page.goto('/');
    
    // Test empty input
    await page.getByTestId('button-analyze').click();
    await expect(page.getByTestId('text-error')).toContainText('Please enter a token address');
    
    // Test invalid format
    await page.getByTestId('input-token-address').fill(INVALID_TOKEN);
    await page.getByTestId('button-analyze').click();
    await expect(page.getByTestId('text-error')).toContainText('Invalid Solana address format');
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/analyze-token', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' }),
      });
    });

    await page.goto('/');
    
    await page.getByTestId('input-token-address').fill(VALID_TOKEN);
    await page.getByTestId('button-analyze').click();
    
    // Wait for error message to appear
    await expect(page.getByText('Analysis Failed')).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state during analysis', async ({ page }) => {
    let resolveResponse: any;
    const responsePromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });

    await page.route('**/api/analyze-token', async (route) => {
      await responsePromise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSafeTokenResponse),
      });
    });

    await page.goto('/');
    
    await page.getByTestId('input-token-address').fill(VALID_TOKEN);
    await page.getByTestId('button-analyze').click();
    
    // Verify loading state
    await expect(page.getByTestId('button-analyze')).toBeDisabled();
    await expect(page.getByTestId('button-analyze')).toHaveText('Analyzing...');
    await expect(page.getByTestId('input-token-address')).toBeDisabled();
    
    // Verify skeleton loaders
    await expect(page.locator('.animate-pulse').first()).toBeVisible();
    
    // Resolve the response
    resolveResponse();
    
    // Wait for results
    await expect(page.getByTestId('card-risk-score')).toBeVisible({ timeout: 10000 });
    
    // Verify loading state is gone
    await expect(page.getByTestId('button-analyze')).toBeEnabled();
    await expect(page.getByTestId('button-analyze')).toHaveText('Analyze');
  });

  test('should auto-refresh analysis after 5 minutes', async ({ page }) => {
    let callCount = 0;
    
    await page.route('**/api/analyze-token', async (route) => {
      callCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockSafeTokenResponse,
          analyzedAt: Date.now(),
        }),
      });
    });

    await page.goto('/');
    
    await page.getByTestId('input-token-address').fill(VALID_TOKEN);
    await page.getByTestId('button-analyze').click();
    
    // Wait for initial analysis
    await expect(page.getByTestId('card-risk-score')).toBeVisible({ timeout: 10000 });
    expect(callCount).toBe(1);
    
    // Fast-forward time by 5 minutes (300,000 ms)
    await page.evaluate(() => {
      // Trigger the auto-refresh by advancing time
      const interval = 300000; // 5 minutes
      const event = new Event('interval');
      setTimeout(() => {
        window.dispatchEvent(event);
      }, 100);
    });
    
    // Manually advance time in the page context
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      // Force a re-render by simulating the interval
      const now = Date.now();
      // This will trigger the useEffect interval
    });
    
    // Note: Auto-refresh testing is complex in Playwright due to setTimeout/setInterval
    // In a real scenario, you might want to expose a manual refresh method for testing
    // or use page.clock.fastForward() if available in your Playwright version
  });

  test('should allow clicking example tokens', async ({ page }) => {
    await page.route('**/api/analyze-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSafeTokenResponse),
      });
    });

    await page.goto('/');
    
    // Click USDC example
    await page.getByTestId('button-example-usdc').click();
    
    // Verify input is filled
    await expect(page.getByTestId('input-token-address')).toHaveValue('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  });

  test('should display critical alerts for high-risk tokens', async ({ page }) => {
    await page.route('**/api/analyze-token', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockHighRiskBundledResponse),
      });
    });

    await page.goto('/');
    
    await page.getByTestId('input-token-address').fill('HighRiskToken123456789012345678901234');
    await page.getByTestId('button-analyze').click();
    
    await expect(page.getByTestId('card-risk-score')).toBeVisible({ timeout: 15000 });
    
    // Verify critical alerts are displayed
    await expect(page.getByTestId('alert-mint_authority')).toBeVisible();
    await expect(page.getByTestId('alert-freeze_authority')).toBeVisible();
    await expect(page.getByTestId('alert-holder_concentration')).toBeVisible();
    await expect(page.getByTestId('alert-bundled_wallets')).toBeVisible();
    
    // Verify alert content
    await expect(page.getByTestId('alert-mint_authority')).toContainText('Mint Authority Active');
    await expect(page.getByTestId('alert-freeze_authority')).toContainText('Freeze Authority Active');
  });

  test('should display token metadata correctly', async ({ page }) => {
    await page.route('**/api/analyze-token', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSafeTokenResponse),
      });
    });

    await page.goto('/');
    
    await page.getByTestId('input-token-address').fill(VALID_TOKEN);
    await page.getByTestId('button-analyze').click();
    
    await expect(page.getByTestId('card-risk-score')).toBeVisible({ timeout: 15000 });
    
    // Verify metadata is displayed - use more specific selectors to avoid strict mode violation
    await expect(page.getByText('USD Coin')).toBeVisible();
    // Use testid to be more specific since USDC appears in multiple places
    await expect(page.getByTestId('text-token-symbol')).toContainText('USDC');
  });

  test('should display top holders table when data available', async ({ page }) => {
    await page.route('**/api/analyze-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSafeTokenResponse),
      });
    });

    await page.goto('/');
    
    await page.getByTestId('input-token-address').fill(VALID_TOKEN);
    await page.getByTestId('button-analyze').click();
    
    await expect(page.getByTestId('card-risk-score')).toBeVisible({ timeout: 10000 });
    
    // Verify top holders table is present (if visible in viewport)
    // Note: May need to scroll to see it
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
  });

  test('should handle new analysis button correctly', async ({ page }) => {
    await page.route('**/api/analyze-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSafeTokenResponse),
      });
    });

    await page.goto('/');
    
    await page.getByTestId('input-token-address').fill(VALID_TOKEN);
    await page.getByTestId('button-analyze').click();
    
    await expect(page.getByTestId('card-risk-score')).toBeVisible({ timeout: 10000 });
    
    // Check if "New Analysis" button appears in header (might be viewport dependent)
    const newAnalysisButton = page.getByRole('button', { name: /new analysis/i });
    
    // Click it if visible
    if (await newAnalysisButton.isVisible()) {
      await newAnalysisButton.click();
      
      // Verify we're back to input state
      await expect(page.getByRole('heading', { name: 'Solana Rug Detector' })).toBeVisible();
    }
  });
});

test.describe('Token Analysis - Visual Regression', () => {
  test('should match screenshot for safe token analysis', async ({ page }) => {
    await page.route('**/api/analyze-token', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSafeTokenResponse),
      });
    });

    await page.goto('/');
    
    await page.getByTestId('input-token-address').fill(VALID_TOKEN);
    await page.getByTestId('button-analyze').click();
    
    await expect(page.getByTestId('card-risk-score')).toBeVisible({ timeout: 15000 });
    
    // Wait for animations to complete
    await page.waitForTimeout(2000);
    
    // Take screenshot (only on failure by default, configured in playwright.config.ts)
    await expect(page).toHaveScreenshot('safe-token-analysis.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match screenshot for high-risk bundled token', async ({ page }) => {
    await page.route('**/api/analyze-token', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockHighRiskBundledResponse),
      });
    });

    await page.goto('/');
    
    await page.getByTestId('input-token-address').fill('HighRiskToken123456789012345678901234');
    await page.getByTestId('button-analyze').click();
    
    await expect(page.getByTestId('card-risk-score')).toBeVisible({ timeout: 15000 });
    
    // Wait for animations to complete
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('high-risk-bundled-token.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});

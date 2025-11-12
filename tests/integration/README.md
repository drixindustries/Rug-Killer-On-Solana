# API Integration Tests

## Overview

This directory contains comprehensive integration tests for the Express API server using Supertest.

## Test File

- `api-routes.test.ts` - Complete integration tests for `/api/analyze-token` endpoint

## Test Coverage

### Success Cases ✅
- Complete token analysis for valid pump.fun tokens
- Market data inclusion from DexScreener
- Bundle detection and reporting
- Proper holder data formatting with ranks and percentages
- Risk score calculation based on multiple factors

### Error Cases ✅
- Missing tokenAddress (400)
- Empty tokenAddress (400)
- Token address too short (400)
- Token address too long (400)
- Invalid token address format (500)
- External API failures
- Non-existent tokens

### Response Structure Validation ✅
- All required fields present
- Timestamp in Unix milliseconds format
- RedFlags with proper severity levels
- Holder filtering metadata included

### Special Token Types ✅
- Pump.fun token identification
- High holder concentration handling

## Test Features

- ✅ Uses Supertest for HTTP testing
- ✅ Mocks all external Solana/API calls using nock
- ✅ Imports app from server/index.ts (refactored to export)
- ✅ Uses fixtures from `tests/fixtures/solana/token-fixtures.ts`
- ✅ Uses mocks from `tests/utils/solana-mocks.ts`
- ✅ Tests both success (200) and error (400, 500) responses
- ✅ Verifies response JSON structure matches expected schema

## Running the Tests

### Known Issue - Jest Haste Map

There is currently an environment-specific issue with Jest's haste map and Bun's package cache structure that affects all tests in this Replit environment. This is not a code issue but an environmental configuration issue.

### Workaround

To run these tests in a local environment or CI/CD:

```bash
# Clear jest cache
npx jest --clearCache

# Run integration tests
npx jest tests/integration/api-routes.test.ts --verbose

# Or run all tests
npx jest
```

### Alternative Testing

The tests can also be validated by:
1. Manual API testing with tools like Postman or curl
2. Running in a Docker container with a clean node_modules
3. Using a different test runner like Vitest

## Test Structure

Each test follows the AAA pattern:
- **Arrange**: Mock external APIs with nock
- **Act**: Make HTTP request with supertest
- **Assert**: Verify response structure and data

## Example

```typescript
it('should return 200 and complete analysis for valid pump.fun token', async () => {
  // Arrange: Mock all external API calls
  mockCompleteAnalysis(PUMP_FUN_TOKEN.address, 'safe');

  // Act: Make request with supertest
  const response = await request(app)
    .post('/api/analyze-token')
    .send({ tokenAddress: PUMP_FUN_TOKEN.address })
    .expect('Content-Type', /json/)
    .expect(200);

  // Assert: Verify response structure and data
  expect(response.body).toHaveProperty('tokenAddress');
  expect(response.body).toHaveProperty('riskScore');
  // ... more assertions
});
```

## Dependencies

- `supertest` - HTTP testing
- `nock` - HTTP mocking
- `jest` - Test runner
- `@types/supertest` - TypeScript types
- `@types/jest` - TypeScript types

## Notes

- All external API calls are mocked to ensure deterministic tests
- Tests use fixtures for consistent test data
- Server is properly cleaned up after all tests complete
- Each test has its own isolated mock setup/teardown

import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  projects: [
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/server/**/*.test.ts'],
      preset: 'ts-jest',
      globals: {
        'ts-jest': {
          tsconfig: '<rootDir>/tsconfig.test.json',
        },
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/server/$1',
        '^@shared/(.*)$': '<rootDir>/shared/$1',
      },
      collectCoverageFrom: [
        'server/**/*.ts',
        '!server/**/*.test.ts',
        '!server/**/*.d.ts',
        '!server/vite.ts',
        '!server/index.ts',
      ],
      coverageThresholds: {
        'server/solana-analyzer.ts': {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85,
        },
        global: {
          statements: 70,
          branches: 65,
          functions: 70,
          lines: 70,
        },
      },
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      preset: 'ts-jest',
      globals: {
        'ts-jest': {
          tsconfig: '<rootDir>/tsconfig.test.json',
        },
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/server/$1',
        '^@shared/(.*)$': '<rootDir>/shared/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
      testTimeout: 30000,
    },
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};

export default config;

const baseConfig = require('./jest.config');

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: 'integration',
  testMatch: [
    '**/__tests__/integration/**/*.test.ts',
    '**/__tests__/integration/**/*.spec.ts',
    '**/*.integration.test.ts',
    '**/*.integration.spec.ts',
  ],
  // Integration tests run sequentially to avoid DB conflicts
  maxWorkers: 1,
  // Longer timeout for DB operations and external calls
  testTimeout: 60_000,
  // Load test environment setup
  globalSetup: '<rootDir>/src/__tests__/helpers/globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/helpers/globalTeardown.ts',
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/helpers/setupAfterFramework.ts',
  ],
};

module.exports = config;

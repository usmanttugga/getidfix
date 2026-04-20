const baseConfig = require('./jest.config');

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: 'unit',
  testMatch: [
    '**/__tests__/unit/**/*.test.ts',
    '**/__tests__/unit/**/*.spec.ts',
    // Also pick up co-located unit tests (not in integration/ or e2e/)
    '**/*.unit.test.ts',
    '**/*.unit.spec.ts',
  ],
  // Unit tests should not need a real database or Redis
  testEnvironment: 'node',
  // Fast timeout for unit tests
  testTimeout: 10_000,
};

module.exports = config;

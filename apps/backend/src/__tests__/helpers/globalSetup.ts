/**
 * Jest global setup — runs once before all integration tests.
 * Ensures the test database is migrated and ready.
 */
export default async function globalSetup(): Promise<void> {
  // Set test environment variables if not already set
  process.env.NODE_ENV = 'test';

  // The test database URL should be set in the environment before running tests.
  // Example: TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/getidfix_test
  if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
    console.warn(
      '[Test Setup] WARNING: No DATABASE_URL or TEST_DATABASE_URL set. ' +
        'Integration tests will fail without a database connection.'
    );
  }

  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }

  console.log('[Test Setup] Global setup complete.');
}

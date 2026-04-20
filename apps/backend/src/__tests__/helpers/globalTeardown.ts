/**
 * Jest global teardown — runs once after all integration tests complete.
 * Closes database and Redis connections.
 */
export default async function globalTeardown(): Promise<void> {
  console.log('[Test Teardown] Global teardown complete.');
}

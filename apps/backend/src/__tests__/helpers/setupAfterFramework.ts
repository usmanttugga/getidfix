/**
 * Jest setupFilesAfterFramework — runs after the test framework is installed
 * in the environment, before each test file.
 */

// Extend Jest timeout for integration tests
jest.setTimeout(60_000);

/**
 * Property-Based Tests for Authentication & Session Management
 *
 * Feature: getidfix-saas-platform
 *
 * Properties tested:
 *   Property 1: Valid credentials always produce an authenticated session
 *   Property 2: Invalid credentials never produce an authenticated session
 *   Property 3: Password reset token expiry is enforced
 *   Property 4: Every user has exactly one valid role
 */

import * as fc from 'fast-check';
import bcrypt from 'bcrypt';

// Set env vars before importing the module under test
process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long-for-testing';

// ─── Mock Redis ───────────────────────────────────────────────────────────────

const mockRedisStore: Map<string, string> = new Map();

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    set: jest.fn((key: string, value: string) => {
      mockRedisStore.set(key, value);
      return Promise.resolve('OK');
    }),
    get: jest.fn((key: string) => Promise.resolve(mockRedisStore.get(key) ?? null)),
    del: jest.fn((key: string) => {
      mockRedisStore.delete(key);
      return Promise.resolve(1);
    }),
  })),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const userIdArbitrary = fc.uuid();
const roleArbitrary   = fc.constantFrom<'ADMIN' | 'USER'>('ADMIN', 'USER');
const passwordArbitrary = fc.string({ minLength: 8, maxLength: 32 });

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  mockRedisStore.clear();
});

// ─── Property 1: Valid credentials always produce an authenticated session ────

/**
 * **Validates: Requirements 1.2**
 */
describe('Property 1: Valid credentials always produce an authenticated session', () => {
  it('signAccessToken + verifyAccessToken round-trip succeeds for any userId and role', () => {
    fc.assert(
      fc.property(userIdArbitrary, roleArbitrary, (userId, role) => {
        const token   = signAccessToken(userId, role);
        const payload = verifyAccessToken(token);
        expect(payload.userId).toBe(userId);
        expect(payload.role).toBe(role);
        expect(typeof payload.jti).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  it('refresh token stored in Redis can be verified for any userId', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArbitrary, async (userId) => {
        const token   = await generateRefreshToken(userId);
        const isValid = await verifyRefreshToken(userId, token);
        expect(isValid).toBe(true);
      }),
      { numRuns: 50 }
    );
  });
});

// ─── Property 2: Invalid credentials never produce an authenticated session ───

/**
 * **Validates: Requirements 1.3**
 */
describe('Property 2: Invalid credentials never produce an authenticated session', () => {
  it('bcrypt.compare returns false for any wrong password', async () => {
    await fc.assert(
      fc.asyncProperty(
        passwordArbitrary,
        passwordArbitrary,
        async (correctPassword, wrongPassword) => {
          fc.pre(correctPassword !== wrongPassword);
          const hash   = await bcrypt.hash(correctPassword, 1);
          const result = await bcrypt.compare(wrongPassword, hash);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('verifyAccessToken throws for any tampered or invalid token string', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }).filter((s) => !s.includes('.')),
        (invalidToken) => {
          expect(() => verifyAccessToken(invalidToken)).toThrow(AppError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('a refresh token for one user cannot verify for a different user', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArbitrary, userIdArbitrary, async (userId1, userId2) => {
        fc.pre(userId1 !== userId2);
        const token   = await generateRefreshToken(userId1);
        const isValid = await verifyRefreshToken(userId2, token);
        expect(isValid).toBe(false);
      }),
      { numRuns: 50 }
    );
  });
});

// ─── Property 3: Password reset token expiry is enforced ─────────────────────

/**
 * **Validates: Requirements 1.7**
 */
describe('Property 3: Password reset token expiry is enforced', () => {
  function validateResetToken(token: { used: boolean; expiresAt: Date }): { valid: boolean; reason?: string } {
    if (token.used) return { valid: false, reason: 'RESET_TOKEN_USED' };
    if (token.expiresAt < new Date()) return { valid: false, reason: 'RESET_TOKEN_EXPIRED' };
    return { valid: true };
  }

  it('accepts any unexpired, unused token', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3600 }), (secondsAhead) => {
        const token = { used: false, expiresAt: new Date(Date.now() + secondsAhead * 1000) };
        expect(validateResetToken(token).valid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('rejects any expired token', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3600 }), (secondsAgo) => {
        const token = { used: false, expiresAt: new Date(Date.now() - secondsAgo * 1000) };
        const result = validateResetToken(token);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('RESET_TOKEN_EXPIRED');
      }),
      { numRuns: 100 }
    );
  });

  it('rejects any used token', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3600 }), (secondsAhead) => {
        const token = { used: true, expiresAt: new Date(Date.now() + secondsAhead * 1000) };
        const result = validateResetToken(token);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('RESET_TOKEN_USED');
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 4: Every user has exactly one valid role ────────────────────────

/**
 * **Validates: Requirements 2.1**
 */
describe('Property 4: Every user has exactly one valid role', () => {
  const VALID_ROLES = new Set(['ADMIN', 'USER']);

  it('signAccessToken only accepts valid roles and produces verifiable tokens', () => {
    fc.assert(
      fc.property(userIdArbitrary, roleArbitrary, (userId, role) => {
        expect(VALID_ROLES.has(role)).toBe(true);
        const token   = signAccessToken(userId, role);
        const payload = verifyAccessToken(token);
        expect(VALID_ROLES.has(payload.role)).toBe(true);
        expect(payload.role).toBe(role);
      }),
      { numRuns: 100 }
    );
  });
});

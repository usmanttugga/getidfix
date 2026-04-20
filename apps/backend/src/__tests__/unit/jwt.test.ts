/**
 * Unit tests for JWT token utilities (HS256).
 */

import jwt from 'jsonwebtoken';

// Set env vars before importing the module under test
process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long-for-testing';

// Mock Redis
const mockRedis = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
};

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn(() => mockRedis),
}));

import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  blockAccessToken,
  isAccessTokenBlocked,
} from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler';

// ─── signAccessToken ──────────────────────────────────────────────────────────

describe('signAccessToken', () => {
  it('returns a non-empty JWT string', () => {
    const token = signAccessToken('user-123', 'USER');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('produces a token with three dot-separated parts', () => {
    const token = signAccessToken('user-123', 'USER');
    expect(token.split('.')).toHaveLength(3);
  });

  it('encodes userId and role in the payload', () => {
    const token = signAccessToken('user-abc', 'ADMIN');
    const decoded = jwt.decode(token) as Record<string, unknown>;
    expect(decoded.userId).toBe('user-abc');
    expect(decoded.role).toBe('ADMIN');
  });

  it('includes a jti in the payload', () => {
    const token = signAccessToken('user-abc', 'USER');
    const decoded = jwt.decode(token) as Record<string, unknown>;
    expect(typeof decoded.jti).toBe('string');
    expect((decoded.jti as string).length).toBeGreaterThan(0);
  });

  it('sets expiry to approximately 15 minutes from now', () => {
    const before = Math.floor(Date.now() / 1000);
    const token = signAccessToken('user-abc', 'USER');
    const after = Math.floor(Date.now() / 1000);
    const decoded = jwt.decode(token) as Record<string, unknown>;
    const exp = decoded.exp as number;
    expect(exp).toBeGreaterThanOrEqual(before + 14 * 60);
    expect(exp).toBeLessThanOrEqual(after + 16 * 60);
  });

  it('generates different jti values for each call', () => {
    const t1 = signAccessToken('user-abc', 'USER');
    const t2 = signAccessToken('user-abc', 'USER');
    const d1 = jwt.decode(t1) as Record<string, unknown>;
    const d2 = jwt.decode(t2) as Record<string, unknown>;
    expect(d1.jti).not.toBe(d2.jti);
  });
});

// ─── verifyAccessToken ────────────────────────────────────────────────────────

describe('verifyAccessToken', () => {
  it('returns the correct payload for a valid token', () => {
    const token = signAccessToken('user-xyz', 'ADMIN');
    const payload = verifyAccessToken(token);
    expect(payload.userId).toBe('user-xyz');
    expect(payload.role).toBe('ADMIN');
    expect(typeof payload.jti).toBe('string');
  });

  it('throws AppError TOKEN_INVALID for a tampered token', () => {
    const token = signAccessToken('user-xyz', 'USER');
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyAccessToken(tampered)).toThrow(AppError);
  });

  it('throws AppError TOKEN_INVALID for a completely invalid string', () => {
    expect(() => verifyAccessToken('not.a.jwt')).toThrow(AppError);
  });

  it('throws AppError TOKEN_EXPIRED for an expired token', () => {
    const expiredToken = jwt.sign(
      { userId: 'user-exp', role: 'USER' },
      'test-secret-key-at-least-32-characters-long-for-testing',
      { algorithm: 'HS256', expiresIn: -1, jwtid: 'test-jti' }
    );
    try {
      verifyAccessToken(expiredToken);
      fail('Should have thrown');
    } catch (err) {
      expect((err as AppError).code).toBe('TOKEN_EXPIRED');
    }
  });
});

// ─── generateRefreshToken ─────────────────────────────────────────────────────

describe('generateRefreshToken', () => {
  beforeEach(() => {
    mockRedis.set.mockClear();
    mockRedis.get.mockClear();
    mockRedis.del.mockClear();
  });

  it('returns a non-empty string', async () => {
    const token = await generateRefreshToken('user-123');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('stores the token in Redis with the correct key', async () => {
    await generateRefreshToken('user-456');
    expect(mockRedis.set).toHaveBeenCalledWith(
      'refresh:user-456',
      expect.any(String),
      'EX',
      7 * 24 * 60 * 60
    );
  });

  it('generates different tokens on each call', async () => {
    const t1 = await generateRefreshToken('user-789');
    const t2 = await generateRefreshToken('user-789');
    expect(t1).not.toBe(t2);
  });
});

// ─── verifyRefreshToken ───────────────────────────────────────────────────────

describe('verifyRefreshToken', () => {
  it('returns true when the stored token matches', async () => {
    mockRedis.get = jest.fn().mockResolvedValue('my-refresh-token');
    const result = await verifyRefreshToken('user-123', 'my-refresh-token');
    expect(result).toBe(true);
  });

  it('returns false when the stored token does not match', async () => {
    mockRedis.get = jest.fn().mockResolvedValue('different-token');
    const result = await verifyRefreshToken('user-123', 'my-refresh-token');
    expect(result).toBe(false);
  });

  it('returns false when no token is stored in Redis', async () => {
    mockRedis.get = jest.fn().mockResolvedValue(null);
    const result = await verifyRefreshToken('user-123', 'any-token');
    expect(result).toBe(false);
  });
});

// ─── revokeRefreshToken ───────────────────────────────────────────────────────

describe('revokeRefreshToken', () => {
  it('deletes the refresh token key from Redis', async () => {
    mockRedis.del.mockClear();
    await revokeRefreshToken('user-123');
    expect(mockRedis.del).toHaveBeenCalledWith('refresh:user-123');
  });
});

// ─── blockAccessToken ─────────────────────────────────────────────────────────

describe('blockAccessToken', () => {
  it('stores the jti in the Redis blocklist with correct TTL', async () => {
    mockRedis.set = jest.fn().mockResolvedValue('OK');
    const futureExp = Math.floor(Date.now() / 1000) + 900;
    await blockAccessToken('test-jti', futureExp);
    expect(mockRedis.set).toHaveBeenCalledWith('blocklist:test-jti', '1', 'EX', expect.any(Number));
  });

  it('does not store anything if the token is already expired', async () => {
    mockRedis.set = jest.fn().mockResolvedValue('OK');
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    await blockAccessToken('expired-jti', pastExp);
    const calls = (mockRedis.set as jest.Mock).mock.calls.filter((c: unknown[]) => c[0] === 'blocklist:expired-jti');
    expect(calls).toHaveLength(0);
  });
});

// ─── isAccessTokenBlocked ─────────────────────────────────────────────────────

describe('isAccessTokenBlocked', () => {
  it('returns true when the jti is in the blocklist', async () => {
    mockRedis.get = jest.fn().mockResolvedValue('1');
    const result = await isAccessTokenBlocked('blocked-jti');
    expect(result).toBe(true);
  });

  it('returns false when the jti is not in the blocklist', async () => {
    mockRedis.get = jest.fn().mockResolvedValue(null);
    const result = await isAccessTokenBlocked('clean-jti');
    expect(result).toBe(false);
  });
});

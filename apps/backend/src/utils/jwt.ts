import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../config/redis';
import { REDIS_KEYS } from '../config/redisKeys';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  userId: string;
  role: 'ADMIN' | 'USER';
  jti: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

// ─── Access Token ─────────────────────────────────────────────────────────────

export function signAccessToken(userId: string, role: 'ADMIN' | 'USER'): string {
  const jti = uuidv4();
  const options: SignOptions = { algorithm: 'HS256', expiresIn: '15m', jwtid: jti };
  return jwt.sign({ userId, role }, getSecret(), options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as JwtPayload & AccessTokenPayload;

    if (!decoded.userId || !decoded.role || !decoded.jti) {
      throw new AppError('Invalid token payload', 401, ERROR_CODES.TOKEN_INVALID);
    }

    return { userId: decoded.userId, role: decoded.role, jti: decoded.jti };
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('Access token has expired', 401, ERROR_CODES.TOKEN_EXPIRED);
    }
    throw new AppError('Invalid access token', 401, ERROR_CODES.TOKEN_INVALID);
  }
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = uuidv4();
  const redis = getRedisClient();
  await redis.set(REDIS_KEYS.REFRESH_TOKEN(userId), token, 'EX', REFRESH_TOKEN_TTL);
  return token;
}

export async function verifyRefreshToken(userId: string, token: string): Promise<boolean> {
  const redis = getRedisClient();
  const stored = await redis.get(REDIS_KEYS.REFRESH_TOKEN(userId));
  return stored === token;
}

export async function revokeRefreshToken(userId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(REDIS_KEYS.REFRESH_TOKEN(userId));
}

// ─── Access Token Blocklist ───────────────────────────────────────────────────

export async function blockAccessToken(jti: string, expiresAt: number): Promise<void> {
  const redis = getRedisClient();
  const ttl = expiresAt - Math.floor(Date.now() / 1000);
  if (ttl > 0) {
    await redis.set(REDIS_KEYS.ACCESS_BLOCKLIST(jti), '1', 'EX', ttl);
  }
}

export async function isAccessTokenBlocked(jti: string): Promise<boolean> {
  const redis = getRedisClient();
  const result = await redis.get(REDIS_KEYS.ACCESS_BLOCKLIST(jti));
  return result !== null;
}

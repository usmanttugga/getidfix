import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, isAccessTokenBlocked } from '../utils/jwt';
import { AppError, ERROR_CODES } from './errorHandler';
import { getPrismaClient } from '../config/prisma';

// ─── Authenticate Middleware ──────────────────────────────────────────────────

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required.', 401, ERROR_CODES.UNAUTHORIZED);
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    const blocked = await isAccessTokenBlocked(payload.jti);
    if (blocked) {
      throw new AppError('This session has been revoked. Please log in again.', 401, ERROR_CODES.TOKEN_REVOKED);
    }

    // Check user status in DB — catches suspended users even with valid tokens
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, status: true },
    });
    if (!user) {
      throw new AppError('User not found.', 401, ERROR_CODES.UNAUTHORIZED);
    }
    if (user.status === 'SUSPENDED') {
      throw new AppError('Your account has been suspended. Please contact support.', 403, ERROR_CODES.ACCOUNT_SUSPENDED);
    }

    req.user = { id: payload.userId, role: payload.role, jti: payload.jti };
    next();
  } catch (err) {
    next(err);
  }
}

// ─── requireAdmin Middleware ──────────────────────────────────────────────────

export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, ERROR_CODES.UNAUTHORIZED);
    }
    if (req.user.role !== 'ADMIN') {
      throw new AppError('Access denied. Admin role required.', 403, ERROR_CODES.FORBIDDEN);
    }
    next();
  } catch (err) {
    next(err);
  }
}

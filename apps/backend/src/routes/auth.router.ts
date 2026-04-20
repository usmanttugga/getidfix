import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getPrismaClient } from '../config/prisma';
import { authenticate } from '../middleware/auth';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';
import {
  signAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  blockAccessToken,
} from '../utils/jwt';
import { sendPasswordResetEmail } from '../services/email.service';
import { createVirtualAccount } from '../services/flutterwave.service';

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  email:     z.string().email('Invalid email address'),
  phone:     z.string().regex(/^(070|080|081|090|091)\d{8}$/, 'Enter a valid 11-digit Nigerian phone number'),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  userId:       z.string().min(1),
  refreshToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token:       z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// ─── POST /register ───────────────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const { firstName, lastName, email, phone, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('An account with this email already exists.', 409, ERROR_CODES.EMAIL_ALREADY_EXISTS);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, passwordHash, firstName, lastName, phone, role: 'USER', status: 'ACTIVE' },
      });
      await tx.wallet.create({ data: { userId: newUser.id, balance: 0 } });
      return newUser;
    });

    // Create Flutterwave virtual account (best-effort — don't fail registration if this fails)
    try {
      const va = await createVirtualAccount({ email, firstName, lastName, phone, userId: user.id });
      await prisma.wallet.update({
        where: { userId: user.id },
        data: {
          virtualAccountNumber: va.accountNumber,
          virtualAccountBank:   va.bankName,
          virtualAccountName:   va.accountName,
          virtualAccountRef:    va.orderRef,
        },
      });
    } catch (vaErr) {
      console.error('[Flutterwave] Virtual account creation failed for user', user.id, vaErr);
    }

    const accessToken  = signAccessToken(user.id, user.role);
    const refreshToken = await generateRefreshToken(user.id);

    res.status(201).json({
      status: 'success',
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /login ──────────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid email or password.', 401, ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError('Your account has been suspended. Please contact support.', 403, ERROR_CODES.ACCOUNT_SUSPENDED);
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppError('Invalid email or password.', 401, ERROR_CODES.INVALID_CREDENTIALS);
    }

    const accessToken  = signAccessToken(user.id, user.role);
    const refreshToken = await generateRefreshToken(user.id);

    res.status(200).json({
      status: 'success',
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: userId, jti } = req.user!;
    await revokeRefreshToken(userId);

    const token = req.headers.authorization!.slice(7);
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      await blockAccessToken(jti, decoded.exp);
    }

    res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /refresh ────────────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const { userId, refreshToken } = refreshSchema.parse(req.body);

    const isValid = await verifyRefreshToken(userId, refreshToken);
    if (!isValid) {
      throw new AppError('Invalid or expired refresh token. Please log in again.', 401, ERROR_CODES.TOKEN_INVALID);
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
    if (!user) throw new AppError('User not found.', 401, ERROR_CODES.UNAUTHORIZED);
    if (user.status === 'SUSPENDED') throw new AppError('Your account has been suspended.', 403, ERROR_CODES.ACCOUNT_SUSPENDED);

    const accessToken = signAccessToken(user.id, user.role);
    res.status(200).json({ status: 'success', data: { accessToken } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /forgot-password ────────────────────────────────────────────────────

router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, firstName: true, email: true } });

    if (user) {
      const rawToken  = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          userId:    user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          used:      false,
        },
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
      sendPasswordResetEmail(user.email, user.firstName, resetUrl).catch(() => {});
    }

    res.status(200).json({
      status: 'success',
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /reset-password ─────────────────────────────────────────────────────

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const { token: rawToken, newPassword } = resetPasswordSchema.parse(req.body);

    const tokenHash  = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken) {
      throw new AppError('Invalid password reset token.', 400, ERROR_CODES.RESET_TOKEN_INVALID);
    }
    if (resetToken.used) {
      throw new AppError('This password reset link has already been used.', 400, ERROR_CODES.RESET_TOKEN_USED);
    }
    if (resetToken.expiresAt < new Date()) {
      throw new AppError('This password reset link has expired. Please request a new one.', 400, ERROR_CODES.RESET_TOKEN_EXPIRED);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } }),
    ]);

    res.status(200).json({ status: 'success', message: 'Your password has been reset successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;

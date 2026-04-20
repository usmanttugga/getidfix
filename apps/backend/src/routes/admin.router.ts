import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../config/prisma';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';
import { refundWallet } from '../services/wallet.service';
import { createNotification } from '../services/notification.service';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ─── GET /admin/dashboard ─────────────────────────────────────────────────────

router.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, pendingRequests, todayRequests, todayCreditsAgg, totalFundedAgg, totalUsageAgg, totalRefundsAgg] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.serviceRequest.count({ where: { status: 'PENDING' } }),
      prisma.serviceRequest.count({ where: { createdAt: { gte: today } } }),
      prisma.walletTransaction.aggregate({
        where: { type: 'CREDIT', createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      // Total funded = all CREDIT transactions ever
      prisma.walletTransaction.aggregate({
        where: { type: 'CREDIT' },
        _sum: { amount: true },
      }),
      // Total usage = all DEBIT transactions ever
      prisma.walletTransaction.aggregate({
        where: { type: 'DEBIT' },
        _sum: { amount: true },
      }),
      // Total refunds = all REFUND transactions ever
      prisma.walletTransaction.aggregate({
        where: { type: 'REFUND' },
        _sum: { amount: true },
      }),
    ]);

    const totalFunded  = Number(totalFundedAgg._sum.amount ?? 0);
    const totalDebits  = Number(totalUsageAgg._sum.amount ?? 0);
    const totalRefunds = Number(totalRefundsAgg._sum.amount ?? 0);
    // Net usage = debits minus refunds (refunds reduce the effective usage)
    const totalUsage   = totalDebits - totalRefunds;

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        pendingRequests,
        todayRequests,
        todayCredits: Number(todayCreditsAgg._sum.amount ?? 0),
        totalFunded,
        totalUsage,
        totalWalletBalance: totalFunded - totalUsage,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /admin/requests ──────────────────────────────────────────────────────

router.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const page      = parseInt(req.query.page as string) || 1;
    const limit     = parseInt(req.query.limit as string) || 20;
    const skip      = (page - 1) * limit;
    const status    = req.query.status as string | undefined;
    const serviceId = req.query.serviceId as string | undefined;

    const where: Record<string, unknown> = {};
    if (status)    where.status    = status;
    if (serviceId) where.serviceId = serviceId;

    const [requests, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user:    { select: { firstName: true, lastName: true, email: true } },
          service: { select: { name: true, category: true } },
        },
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    res.status(200).json({ status: 'success', data: { requests, total, page, limit } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /admin/requests/:id ──────────────────────────────────────────────────

router.get('/requests/:id', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const request = await prisma.serviceRequest.findUnique({
      where: { id: req.params.id },
      include: {
        user:    { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        service: { select: { name: true, category: true, price: true } },
      },
    });

    if (!request) throw new AppError('Request not found.', 404, ERROR_CODES.NOT_FOUND);

    res.status(200).json({ status: 'success', data: request });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /admin/requests/:id ────────────────────────────────────────────────

const respondSchema = z.object({
  action:       z.enum(['complete', 'reject', 'reject_no_refund']),
  responseText: z.string().min(1, 'Response text is required'),
  fileUrl:      z.string().url().optional(),
});

router.patch('/requests/:id', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const { action, responseText, fileUrl } = respondSchema.parse(req.body);

    const request = await prisma.serviceRequest.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, firstName: true } }, service: { select: { name: true } } },
    });

    if (!request) throw new AppError('Request not found.', 404, ERROR_CODES.NOT_FOUND);
    if (request.status !== 'PENDING') {
      throw new AppError('This request has already been processed.', 400, ERROR_CODES.BAD_REQUEST);
    }

    const adminResponse = { text: responseText, fileUrl: fileUrl ?? null, respondedAt: new Date().toISOString() };

    if (action === 'complete') {
      await prisma.$transaction(async (tx) => {
        await tx.serviceRequest.update({
          where: { id: request.id },
          data: { status: 'COMPLETED', adminResponse },
        });

        await createNotification(
          tx as unknown as Parameters<typeof createNotification>[0],
          request.userId,
          `${request.service.name} — Completed`,
          `Your request has been completed. ${responseText}`
        );
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.serviceRequest.update({
          where: { id: request.id },
          data: { status: 'REJECTED', adminResponse },
        });

        if (action === 'reject') {
          await refundWallet(
            tx as unknown as Parameters<typeof refundWallet>[0],
            request.userId,
            Number(request.amount),
            `Refund for rejected ${request.service.name}`,
            `refund-${request.id}`
          );

          await createNotification(
            tx as unknown as Parameters<typeof createNotification>[0],
            request.userId,
            `${request.service.name} — Rejected`,
            `Your request was rejected and ₦${Number(request.amount).toLocaleString()} has been refunded. Reason: ${responseText}`
          );
        } else {
          // reject_no_refund — no wallet credit
          await createNotification(
            tx as unknown as Parameters<typeof createNotification>[0],
            request.userId,
            `${request.service.name} — Rejected`,
            `Your request was rejected. Reason: ${responseText}`
          );
        }
      });
    }

    const updated = await prisma.serviceRequest.findUnique({ where: { id: request.id } });
    res.status(200).json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

// ─── POST /admin/users ────────────────────────────────────────────────────────

const createUserSchema = z.object({
  email:     z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  phone:     z.string().min(10, 'Phone number is required').optional(),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
  role:      z.enum(['USER', 'ADMIN']).default('USER'),
});

router.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const { email, firstName, lastName, phone, password, role } = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('A user with this email already exists.', 409, ERROR_CODES.BAD_REQUEST);

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, firstName, lastName, phone, passwordHash, role, status: 'ACTIVE' },
      });
      await tx.wallet.create({ data: { userId: newUser.id, balance: 0 } });
      return newUser;
    });

    res.status(201).json({
      status: 'success',
      data: {
        id: user.id, email: user.email, firstName: user.firstName,
        lastName: user.lastName, phone: user.phone, role: user.role, status: user.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /admin/users ─────────────────────────────────────────────────────────

router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const page   = parseInt(req.query.page as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 20;
    const skip   = (page - 1) * limit;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = { role: 'USER' };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, email: true, firstName: true, lastName: true,
          phone: true, status: true, createdAt: true,
          wallet: { select: { balance: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({ status: 'success', data: { users, total, page, limit } });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /admin/users/:id ───────────────────────────────────────────────────

const updateUserSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

router.patch('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const { status } = updateUserSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError('User not found.', 404, ERROR_CODES.USER_NOT_FOUND);

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status },
      select: { id: true, email: true, firstName: true, lastName: true, status: true },
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

// ─── POST /admin/users/:id/fund ───────────────────────────────────────────────

const fundUserSchema = z.object({
  amount:      z.number().min(1, 'Amount must be at least ₦1'),
  description: z.string().optional(),
});

router.post('/users/:id/fund', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const { amount, description } = fundUserSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { wallet: true },
    });
    if (!user)        throw new AppError('User not found.', 404, ERROR_CODES.USER_NOT_FOUND);
    if (!user.wallet) throw new AppError('User wallet not found.', 404, ERROR_CODES.WALLET_NOT_FOUND);

    const { creditWallet } = await import('../services/wallet.service');
    const { v4: uuidv4 }   = await import('uuid');

    const newBalance = await prisma.$transaction(async (tx) => {
      return creditWallet(
        tx as unknown as Parameters<typeof creditWallet>[0],
        user.id,
        amount,
        description || `Admin wallet funding of ₦${amount.toLocaleString()}`,
        `admin-fund-${uuidv4()}`
      );
    });

    await createNotification(
      prisma as unknown as Parameters<typeof createNotification>[0],
      user.id,
      'Wallet Funded',
      `Your wallet has been credited with ₦${amount.toLocaleString()} by admin. New balance: ₦${Number(newBalance).toLocaleString()}.`
    );

    res.status(200).json({
      status: 'success',
      data: { newBalance: Number(newBalance), message: `Successfully credited ₦${amount.toLocaleString()} to ${user.firstName}'s wallet.` },
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /admin/users/:id ──────────────────────────────────────────────────

router.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError('User not found.', 404, ERROR_CODES.USER_NOT_FOUND);
    if (user.role === 'ADMIN') {
      throw new AppError('Admin accounts cannot be deleted.', 403, ERROR_CODES.FORBIDDEN);
    }

    await prisma.user.delete({ where: { id: req.params.id } });

    res.status(200).json({ status: 'success', data: { message: 'User deleted successfully.' } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /admin/services ──────────────────────────────────────────────────────

router.get('/services', async (_req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const services = await prisma.service.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    res.status(200).json({ status: 'success', data: services });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /admin/services/:id ────────────────────────────────────────────────
// Only for price updates — isEnabled must use /availability endpoint

const updateServiceSchema = z.object({
  price: z.number().min(0.01, 'Price must be greater than 0'),
});

router.patch('/services/:id', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const { price } = updateServiceSchema.parse(req.body);

    const service = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!service) throw new AppError('Service not found.', 404, ERROR_CODES.SERVICE_NOT_FOUND);

    const updated = await prisma.service.update({
      where: { id: req.params.id },
      data: { price },
    });
    res.status(200).json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /admin/services/:id/availability ───────────────────────────────────
// Dedicated endpoint — only updates isEnabled, never touches price

const availabilitySchema = z.object({
  isEnabled: z.boolean(),
});

router.patch('/services/:id/availability', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const { isEnabled } = availabilitySchema.parse(req.body);

    const service = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!service) throw new AppError('Service not found.', 404, ERROR_CODES.SERVICE_NOT_FOUND);

    const updated = await prisma.service.update({
      where: { id: req.params.id },
      data: { isEnabled },
    });
    res.status(200).json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;

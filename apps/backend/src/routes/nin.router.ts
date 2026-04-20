import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '../config/prisma';
import { authenticate } from '../middleware/auth';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';
import { debitWallet } from '../services/wallet.service';
import { createNotification } from '../services/notification.service';

const router = Router();

const ninVerifySchema = z.object({
  nin:      z.string().regex(/^\d{11}$/, 'NIN must be exactly 11 numeric digits').optional(),
  phone:    z.string().optional(),
  vnin:     z.string().optional(),
  method:   z.enum(['nin', 'phone', 'dob', 'vnin']),
  slipType: z.enum(['basic', 'premium', 'regular', 'standard', 'vnin']).optional(),
  firstName: z.string().optional(),
  lastName:  z.string().optional(),
  gender:    z.string().optional(),
  dob:       z.string().optional(),
});

// ─── NIMC Stub ────────────────────────────────────────────────────────────────

async function callNimcApi(_nin: string) {
  // Stub: return mock identity data
  return {
    fullName: 'John Doe',
    dob:      '1990-01-01',
    gender:   'Male',
    photo:    null,
  };
}

// ─── POST /nin/verify ─────────────────────────────────────────────────────────

router.post('/verify', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const body   = ninVerifySchema.parse(req.body);
    const userId = req.user!.id;

    // Resolve service slug based on slip type
    const slipType   = body.slipType || 'basic';
    const serviceSlug = `nin-verification-${slipType}`;

    const service = await prisma.service.findUnique({ where: { slug: serviceSlug } });
    if (!service) throw new AppError('Service not found.', 404, ERROR_CODES.SERVICE_NOT_FOUND);
    if (!service.isEnabled) throw new AppError('This NIN Verification type is currently disabled.', 400, ERROR_CODES.SERVICE_DISABLED);

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new AppError('Wallet not found.', 404, ERROR_CODES.WALLET_NOT_FOUND);

    const price = Number(service.price);
    if (wallet.balance.lessThan(price)) {
      throw new AppError('Insufficient wallet balance.', 400, ERROR_CODES.INSUFFICIENT_BALANCE);
    }

    // Call NIMC API stub — do NOT debit if this fails
    let nimcResult;
    try {
      nimcResult = await callNimcApi(body.nin || body.phone || body.vnin || '');
    } catch {
      throw new AppError('NIMC API is currently unavailable. Please try again later.', 502, ERROR_CODES.EXTERNAL_API_ERROR);
    }

    const reference = uuidv4();

    await prisma.$transaction(async (tx) => {
      await debitWallet(
        tx as unknown as Parameters<typeof debitWallet>[0],
        userId,
        price,
        `NIN Verification (${slipType} slip)`,
        `debit-${reference}`
      );

      await tx.serviceRequest.create({
        data: {
          userId,
          serviceId: service.id,
          reference,
          status:   'COMPLETED',
          formData: { ...body },
          adminResponse: { result: nimcResult, respondedAt: new Date().toISOString() },
          amount:   service.price,
        },
      });

      await createNotification(
        tx as unknown as Parameters<typeof createNotification>[0],
        userId,
        'NIN Verification Complete',
        `Your NIN verification was successful. Reference: ${reference}`
      );
    });

    res.status(200).json({
      status: 'success',
      data: { result: nimcResult, reference, amount: price },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

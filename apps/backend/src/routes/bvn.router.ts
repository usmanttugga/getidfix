import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '../config/prisma';
import { authenticate } from '../middleware/auth';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';
import { debitWallet } from '../services/wallet.service';
import { createNotification } from '../services/notification.service';
import { verifyBvn } from '../services/lumiid.service';

const router = Router();

const bvnVerifySchema = z.object({
  bvn: z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 numeric digits'),
});

// ─── POST /bvn/verify ─────────────────────────────────────────────────────────

router.post('/verify', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const parseResult = bvnVerifySchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError('Validation failed.', 422, ERROR_CODES.VALIDATION_ERROR, parseResult.error.errors);
    }
    const body   = parseResult.data;
    const userId = req.user!.id;

    const service = await prisma.service.findUnique({ where: { slug: 'bvn-verification' } });
    if (!service) throw new AppError('Service not found.', 404, ERROR_CODES.SERVICE_NOT_FOUND);
    if (!service.isEnabled) throw new AppError('This BVN Verification service is currently disabled.', 400, ERROR_CODES.SERVICE_DISABLED);

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new AppError('Wallet not found.', 404, ERROR_CODES.WALLET_NOT_FOUND);

    const price = Number(service.price);
    if (wallet.balance.lessThan(price)) {
      throw new AppError('Insufficient wallet balance.', 400, ERROR_CODES.INSUFFICIENT_BALANCE);
    }

    // Call LumiID API — do NOT debit if this fails
    const data = await verifyBvn(body.bvn);
    const bvnResult = {
      fullName:   `${data.firstname || ''} ${data.lastname || ''}`.trim(),
      firstName:  data.firstname  || '',
      lastName:   data.lastname   || '',
      middleName: '',
      dob:        data.birthdate  || '',
      gender:     '',
      phone:      data.phone      || '',
      photo:      null,
      bvn:        body.bvn,
    };

    const reference = uuidv4();

    await prisma.$transaction(async (tx) => {
      await debitWallet(
        tx as unknown as Parameters<typeof debitWallet>[0],
        userId,
        price,
        'BVN Verification',
        `debit-${reference}`
      );

      await tx.serviceRequest.create({
        data: {
          userId,
          serviceId: service.id,
          reference,
          status:   'COMPLETED',
          formData: { ...body },
          adminResponse: { result: bvnResult, respondedAt: new Date().toISOString() },
          amount:   service.price,
        },
      });

      await createNotification(
        tx as unknown as Parameters<typeof createNotification>[0],
        userId,
        'BVN Verification Complete',
        `Your BVN verification was successful. Reference: ${reference}`
      );
    });

    res.status(200).json({
      status: 'success',
      data: { result: bvnResult, reference, amount: price },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

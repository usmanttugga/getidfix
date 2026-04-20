import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '../config/prisma';
import { authenticate } from '../middleware/auth';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';
import { debitWallet } from '../services/wallet.service';
import { createNotification } from '../services/notification.service';

const router = Router();

const airtimeSchema = z.object({
  phone:   z.string().regex(/^(070|080|081|090|091)\d{8}$/, 'Invalid Nigerian phone number'),
  network: z.enum(['MTN', 'Airtel', 'Glo', '9mobile']),
  amount:  z.number().min(50, 'Minimum airtime amount is ₦50').max(50000, 'Maximum airtime amount is ₦50,000'),
});

// ─── VTU Stub ─────────────────────────────────────────────────────────────────

async function callVtuApi(_phone: string, _network: string, _amount: number) {
  return { success: true, reference: uuidv4() };
}

// ─── POST /airtime/purchase ───────────────────────────────────────────────────

router.post('/purchase', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const { phone, network, amount } = airtimeSchema.parse(req.body);
    const userId = req.user!.id;

    const service = await prisma.service.findUnique({ where: { slug: 'buy-airtime' } });
    if (!service) throw new AppError('Service not found.', 404, ERROR_CODES.SERVICE_NOT_FOUND);
    if (!service.isEnabled) throw new AppError('Airtime purchase is currently disabled.', 400, ERROR_CODES.SERVICE_DISABLED);

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new AppError('Wallet not found.', 404, ERROR_CODES.WALLET_NOT_FOUND);

    if (wallet.balance.lessThan(amount)) {
      throw new AppError('Insufficient wallet balance.', 400, ERROR_CODES.INSUFFICIENT_BALANCE);
    }

    // Call VTU stub — do NOT debit if this fails
    let vtuResult;
    try {
      vtuResult = await callVtuApi(phone, network, amount);
    } catch {
      throw new AppError('VTU API is currently unavailable. Please try again later.', 502, ERROR_CODES.EXTERNAL_API_ERROR);
    }

    const reference = vtuResult.reference;

    await prisma.$transaction(async (tx) => {
      await debitWallet(
        tx as unknown as Parameters<typeof debitWallet>[0],
        userId,
        amount,
        `${network} Airtime — ${phone}`,
        `debit-${reference}`
      );

      await tx.serviceRequest.create({
        data: {
          userId,
          serviceId: service.id,
          reference,
          status:   'COMPLETED',
          formData: { phone, network, amount },
          amount,
        },
      });

      await createNotification(
        tx as unknown as Parameters<typeof createNotification>[0],
        userId,
        'Airtime Purchase Successful',
        `₦${amount} ${network} airtime sent to ${phone}. Reference: ${reference}`
      );
    });

    res.status(200).json({
      status: 'success',
      data: { reference, network, phone, amount },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

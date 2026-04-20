import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '../config/prisma';
import { authenticate } from '../middleware/auth';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';
import { debitWallet } from '../services/wallet.service';
import { createNotification } from '../services/notification.service';

const router = Router();

// ─── Static Data Plans ────────────────────────────────────────────────────────

const DATA_PLANS: Record<string, Array<{ id: string; name: string; price: number; validity: string }>> = {
  MTN: [
    { id: 'mtn-1gb',  name: '1GB',  price: 300,  validity: '30 days' },
    { id: 'mtn-2gb',  name: '2GB',  price: 500,  validity: '30 days' },
    { id: 'mtn-5gb',  name: '5GB',  price: 1000, validity: '30 days' },
  ],
  Airtel: [
    { id: 'airt-1gb', name: '1GB',  price: 300,  validity: '30 days' },
    { id: 'airt-2gb', name: '2GB',  price: 500,  validity: '30 days' },
  ],
  Glo: [
    { id: 'glo-1gb',  name: '1GB',  price: 250,  validity: '30 days' },
    { id: 'glo-2gb',  name: '2GB',  price: 450,  validity: '30 days' },
  ],
  '9mobile': [
    { id: '9mob-1gb', name: '1GB',  price: 300,  validity: '30 days' },
    { id: '9mob-2gb', name: '2GB',  price: 500,  validity: '30 days' },
  ],
};

const purchaseSchema = z.object({
  phone:   z.string().regex(/^(070|080|081|090|091)\d{8}$/, 'Invalid Nigerian phone number'),
  network: z.enum(['MTN', 'Airtel', 'Glo', '9mobile']),
  planId:  z.string().min(1),
});

// ─── VTU Stub ─────────────────────────────────────────────────────────────────

async function callVtuDataApi(_phone: string, _network: string, _planId: string) {
  return { success: true, reference: uuidv4() };
}

// ─── GET /data/plans ──────────────────────────────────────────────────────────

router.get('/plans', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ status: 'success', data: DATA_PLANS });
  } catch (err) {
    next(err);
  }
});

// ─── POST /data/purchase ──────────────────────────────────────────────────────

router.post('/purchase', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const { phone, network, planId } = purchaseSchema.parse(req.body);
    const userId = req.user!.id;

    const networkPlans = DATA_PLANS[network];
    if (!networkPlans) throw new AppError('Invalid network.', 400, ERROR_CODES.VALIDATION_ERROR);

    const plan = networkPlans.find((p) => p.id === planId);
    if (!plan) throw new AppError('Invalid plan ID.', 400, ERROR_CODES.VALIDATION_ERROR);

    const service = await prisma.service.findUnique({ where: { slug: 'buy-data' } });
    if (!service) throw new AppError('Service not found.', 404, ERROR_CODES.SERVICE_NOT_FOUND);
    if (!service.isEnabled) throw new AppError('Data purchase is currently disabled.', 400, ERROR_CODES.SERVICE_DISABLED);

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new AppError('Wallet not found.', 404, ERROR_CODES.WALLET_NOT_FOUND);

    if (wallet.balance.lessThan(plan.price)) {
      throw new AppError('Insufficient wallet balance.', 400, ERROR_CODES.INSUFFICIENT_BALANCE);
    }

    let vtuResult;
    try {
      vtuResult = await callVtuDataApi(phone, network, planId);
    } catch {
      throw new AppError('VTU API is currently unavailable. Please try again later.', 502, ERROR_CODES.EXTERNAL_API_ERROR);
    }

    const reference = vtuResult.reference;

    await prisma.$transaction(async (tx) => {
      await debitWallet(
        tx as unknown as Parameters<typeof debitWallet>[0],
        userId,
        plan.price,
        `${network} ${plan.name} Data — ${phone}`,
        `debit-${reference}`
      );

      await tx.serviceRequest.create({
        data: {
          userId,
          serviceId: service.id,
          reference,
          status:   'COMPLETED',
          formData: { phone, network, planId, planName: plan.name },
          amount:   plan.price,
        },
      });

      await createNotification(
        tx as unknown as Parameters<typeof createNotification>[0],
        userId,
        'Data Purchase Successful',
        `${network} ${plan.name} data sent to ${phone}. Reference: ${reference}`
      );
    });

    res.status(200).json({
      status: 'success',
      data: { reference, network, phone, plan },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

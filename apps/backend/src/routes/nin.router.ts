import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import axios from 'axios';
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

// ─── VerifyMe API ─────────────────────────────────────────────────────────────

const VERIFYME_BASE = 'https://vapi.verifyme.ng/v1/verifications/identities';

function verifyMeHeaders() {
  return {
    Authorization: `Bearer ${process.env.VERIFYME_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function callNimcApi(method: string, params: {
  nin?: string; phone?: string; vnin?: string;
  firstName?: string; lastName?: string; dob?: string;
}) {
  let url = '';
  let body: Record<string, string> = {};

  const ref = params.nin || params.phone || params.vnin || 'test';

  if (method === 'nin') {
    url = `${VERIFYME_BASE}/nin/${ref}`;
    body = {
      ...(params.firstName && { firstname: params.firstName }),
      ...(params.lastName  && { lastname:  params.lastName  }),
      ...(params.dob       && { dob:       params.dob       }),
    };
  } else if (method === 'phone') {
    url = `${VERIFYME_BASE}/nin_phone/${ref}`;
  } else if (method === 'vnin') {
    url = `${VERIFYME_BASE}/vnin/${ref}`;
  } else if (method === 'dob') {
    // Bio data — use NIN endpoint with name + dob matching
    url = `${VERIFYME_BASE}/nin/${ref}`;
    body = {
      ...(params.firstName && { firstname: params.firstName }),
      ...(params.lastName  && { lastname:  params.lastName  }),
      ...(params.dob       && { dob:       params.dob       }),
    };
  }

  const response = await axios.post(url, body, { headers: verifyMeHeaders() });
  const data = response.data?.data;
  if (!data) throw new Error('No data returned from VerifyMe');

  return {
    fullName:  `${data.firstname || ''} ${data.middlename || ''} ${data.lastname || ''}`.trim(),
    firstName: data.firstname  || '',
    lastName:  data.lastname   || '',
    middleName:data.middlename || '',
    dob:       data.birthdate  || '',
    gender:    data.gender     || '',
    phone:     data.phone      || '',
    photo:     data.photo      || null,
    nin:       String(data.nin || ''),
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

    // Call VerifyMe API — do NOT debit if this fails
    let nimcResult;
    try {
      nimcResult = await callNimcApi(body.method, {
        nin:       body.nin,
        phone:     body.phone,
        vnin:      body.vnin,
        firstName: body.firstName,
        lastName:  body.lastName,
        dob:       body.dob,
      });
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      throw new AppError(
        apiMsg || 'NIN verification failed. Please check the details and try again.',
        502,
        ERROR_CODES.EXTERNAL_API_ERROR
      );
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

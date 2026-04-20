import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '../config/prisma';
import { getRedisClient } from '../config/redis';
import { REDIS_KEYS } from '../config/redisKeys';
import { authenticate } from '../middleware/auth';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';
import { creditWallet } from '../services/wallet.service';
import { createNotification } from '../services/notification.service';

const router = Router();

const fundSchema = z.object({
  amount: z.number().min(100, 'Minimum amount is ₦100').max(1000000, 'Maximum amount is ₦1,000,000'),
});

// ─── GET /wallet ──────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const userId = req.user!.id;

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new AppError('Wallet not found.', 404, ERROR_CODES.WALLET_NOT_FOUND);

    const transactions = await prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.status(200).json({
      status: 'success',
      data: { balance: wallet.balance, transactions, virtualAccount: {
        accountNumber: wallet.virtualAccountNumber || null,
        bankName:      wallet.virtualAccountBank   || null,
        accountName:   wallet.virtualAccountName   || null,
      }},
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /wallet/fund ────────────────────────────────────────────────────────

router.post('/fund', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const userId = req.user!.id;
    const { amount } = fundSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) throw new AppError('User not found.', 404, ERROR_CODES.USER_NOT_FOUND);

    const reference = uuidv4();
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      { amount: amount * 100, email: user.email, reference },
      { headers: { Authorization: `Bearer ${paystackKey}`, 'Content-Type': 'application/json' } }
    );

    const { authorization_url } = response.data.data;

    res.status(200).json({
      status: 'success',
      data: { authorizationUrl: authorization_url, reference },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /wallet/webhook ─────────────────────────────────────────────────────

router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  const redis  = getRedisClient();
  try {
    const paystackKey = process.env.PAYSTACK_SECRET_KEY || '';
    const signature   = req.headers['x-paystack-signature'] as string;
    const body        = JSON.stringify(req.body);

    const hash = crypto.createHmac('sha512', paystackKey).update(body).digest('hex');
    if (hash !== signature) {
      throw new AppError('Invalid webhook signature.', 400, 'WEBHOOK_INVALID');
    }

    const event = req.body;
    if (event.event !== 'charge.success') {
      res.status(200).json({ status: 'success' });
      return;
    }

    const { reference, amount, customer } = event.data;
    const idempotencyKey = REDIS_KEYS.WALLET_IDEMPOTENCY(reference);

    const alreadyProcessed = await redis.get(idempotencyKey);
    if (alreadyProcessed) {
      res.status(200).json({ status: 'success', message: 'Already processed.' });
      return;
    }

    // Mark as processing
    await redis.set(idempotencyKey, 'processed', 'EX', 24 * 60 * 60);

    const user = await prisma.user.findFirst({ where: { email: customer.email }, select: { id: true } });
    if (!user) {
      res.status(200).json({ status: 'success' });
      return;
    }

    const amountNaira = amount / 100;

    await prisma.$transaction(async (tx) => {
      await creditWallet(tx as unknown as Parameters<typeof creditWallet>[0], user.id, amountNaira, `Wallet funding via Paystack`, reference);
      await createNotification(tx as unknown as Parameters<typeof createNotification>[0], user.id, 'Wallet Funded', `Your wallet has been credited with ₦${amountNaira.toLocaleString()}.`);
    });

    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /wallet/flw-webhook ─────────────────────────────────────────────────
// Flutterwave webhook — credits wallet when a virtual account transfer is received

router.post('/flw-webhook', async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  const redis  = getRedisClient();
  try {
    // Flutterwave sends a secret hash in the verif-hash header
    // This should match FLW_SECRET_HASH (a separate value you set on the Flutterwave dashboard)
    const secretHash = process.env.FLW_SECRET_HASH || '';
    const signature  = req.headers['verif-hash'] as string;

    if (secretHash && (!signature || signature !== secretHash)) {
      console.error('[FLW Webhook] Invalid signature. Got:', signature);
      res.status(401).json({ status: 'error', message: 'Invalid signature' });
      return;
    }

    const event = req.body;
    console.log('[FLW Webhook] Received event:', event?.event, 'status:', event?.data?.status, 'type:', event?.data?.['event.type'] || event?.data?.payment_type);

    // Accept charge.completed with successful status (covers BANK_TRANSFER_TRANSACTION)
    if (event.event !== 'charge.completed' || event.data?.status !== 'successful') {
      res.status(200).json({ status: 'success' });
      return;
    }

    const data     = event.data;
    const tx_ref   = data.tx_ref || data.txRef;
    const flw_ref  = data.flw_ref || data.flwRef;
    const amount   = data.amount;
    const customer = data.customer;

    // Use flw_ref as idempotency key (more reliable than tx_ref for bank transfers)
    const idempotencyKey = REDIS_KEYS.WALLET_IDEMPOTENCY(flw_ref || tx_ref);

    const alreadyProcessed = await redis.get(idempotencyKey);
    if (alreadyProcessed) {
      res.status(200).json({ status: 'success', message: 'Already processed.' });
      return;
    }

    await redis.set(idempotencyKey, 'processed', 'EX', 24 * 60 * 60);

    // Find user: first by virtual account ref match, then by account number, then by email
    let userId: string | undefined;

    // Try matching by virtual account ref (tx_ref contains the order_ref we stored)
    const walletByRef = await prisma.wallet.findFirst({
      where: { virtualAccountRef: tx_ref },
      select: { userId: true },
    });
    userId = walletByRef?.userId;

    // Try matching by account number from the webhook payload
    if (!userId && data.virtual_account_number) {
      const walletByAcct = await prisma.wallet.findFirst({
        where: { virtualAccountNumber: data.virtual_account_number },
        select: { userId: true },
      });
      userId = walletByAcct?.userId;
    }

    // Fallback: match by customer email
    if (!userId && customer?.email) {
      const user = await prisma.user.findFirst({
        where: { email: customer.email },
        select: { id: true },
      });
      userId = user?.id;
    }

    if (!userId) {
      console.error('[FLW Webhook] Could not find user for tx_ref:', tx_ref, 'email:', customer?.email);
      res.status(200).json({ status: 'success' });
      return;
    }

    const amountNum = Number(amount);
    const reference = flw_ref || tx_ref;

    await prisma.$transaction(async (tx) => {
      await creditWallet(
        tx as unknown as Parameters<typeof creditWallet>[0],
        userId!,
        amountNum,
        `Wallet funding via bank transfer`,
        reference
      );
      await createNotification(
        tx as unknown as Parameters<typeof createNotification>[0],
        userId!,
        'Wallet Funded',
        `Your wallet has been credited with ₦${amountNum.toLocaleString()} via bank transfer.`
      );
    });

    console.log('[FLW Webhook] Wallet credited for user:', userId, 'amount:', amountNum);
    res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('[FLW Webhook] Error:', err);
    next(err);
  }
});

export default router;

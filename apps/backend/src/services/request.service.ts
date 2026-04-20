import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';
import { debitWallet } from './wallet.service';

const prisma = new PrismaClient();

// ─── submitRequest ────────────────────────────────────────────────────────────

export async function submitRequest(
  userId: string,
  serviceSlug: string,
  formData: Record<string, unknown>
) {
  const service = await prisma.service.findUnique({ where: { slug: serviceSlug } });
  if (!service) throw new AppError('Service not found.', 404, ERROR_CODES.SERVICE_NOT_FOUND);
  if (!service.isEnabled) throw new AppError(`The service "${service.name}" is currently disabled.`, 400, ERROR_CODES.SERVICE_DISABLED);

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new AppError('Wallet not found.', 404, ERROR_CODES.WALLET_NOT_FOUND);

  const price = Number(service.price);
  if (wallet.balance.lessThan(price)) {
    throw new AppError('Insufficient wallet balance.', 400, ERROR_CODES.INSUFFICIENT_BALANCE);
  }

  const reference = uuidv4();

  const serviceRequest = await prisma.$transaction(async (tx) => {
    await debitWallet(
      tx as unknown as Parameters<typeof debitWallet>[0],
      userId,
      price,
      `Payment for ${service.name}`,
      `debit-${reference}`
    );

    return tx.serviceRequest.create({
      data: {
        userId,
        serviceId: service.id,
        reference,
        status: 'PENDING',
        formData: formData as object,
        amount: service.price,
      },
      include: { service: { select: { name: true, slug: true, category: true } } },
    });
  });

  return serviceRequest;
}

// ─── listRequests ─────────────────────────────────────────────────────────────

export async function listRequests(userId: string, page = 1, limit = 10) {
  const skip  = (page - 1) * limit;
  const where = { userId };

  const [requests, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { service: { select: { name: true, slug: true, category: true } } },
    }),
    prisma.serviceRequest.count({ where }),
  ]);

  return { requests, total, page, limit };
}

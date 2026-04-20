import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';

type PrismaTx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// ─── debitWallet ──────────────────────────────────────────────────────────────

export async function debitWallet(
  tx: PrismaTx,
  userId: string,
  amount: number,
  description: string,
  reference: string
): Promise<Decimal> {
  const wallet = await tx.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new AppError('Wallet not found.', 404, ERROR_CODES.WALLET_NOT_FOUND);

  const amountDecimal = new Decimal(amount);
  if (wallet.balance.lessThan(amountDecimal)) {
    throw new AppError('Insufficient wallet balance.', 400, ERROR_CODES.INSUFFICIENT_BALANCE);
  }

  const newBalance = wallet.balance.minus(amountDecimal);

  await tx.wallet.update({ where: { userId }, data: { balance: newBalance } });

  await tx.walletTransaction.create({
    data: {
      userId,
      type: 'DEBIT' as const,
      amount: amountDecimal,
      balanceAfter: newBalance,
      reference,
      description,
    },
  });

  return newBalance;
}

// ─── creditWallet ─────────────────────────────────────────────────────────────

export async function creditWallet(
  tx: PrismaTx,
  userId: string,
  amount: number,
  description: string,
  reference: string
): Promise<Decimal> {
  const wallet = await tx.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new AppError('Wallet not found.', 404, ERROR_CODES.WALLET_NOT_FOUND);

  const amountDecimal = new Decimal(amount);
  const newBalance    = wallet.balance.plus(amountDecimal);

  await tx.wallet.update({ where: { userId }, data: { balance: newBalance } });

  await tx.walletTransaction.create({
    data: {
      userId,
      type: 'CREDIT' as const,
      amount: amountDecimal,
      balanceAfter: newBalance,
      reference,
      description,
    },
  });

  return newBalance;
}

// ─── refundWallet ─────────────────────────────────────────────────────────────

export async function refundWallet(
  tx: PrismaTx,
  userId: string,
  amount: number,
  description: string,
  reference: string
): Promise<Decimal> {
  const wallet = await tx.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new AppError('Wallet not found.', 404, ERROR_CODES.WALLET_NOT_FOUND);

  const amountDecimal = new Decimal(amount);
  const newBalance    = wallet.balance.plus(amountDecimal);

  await tx.wallet.update({ where: { userId }, data: { balance: newBalance } });

  await tx.walletTransaction.create({
    data: {
      userId,
      type: 'REFUND' as const,
      amount: amountDecimal,
      balanceAfter: newBalance,
      reference,
      description,
    },
  });

  return newBalance;
}

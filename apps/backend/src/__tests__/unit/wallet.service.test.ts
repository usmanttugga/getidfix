/**
 * Unit tests for wallet.service.ts
 *
 * Tests:
 * - debitWallet throws INSUFFICIENT_BALANCE when balance < amount
 * - creditWallet increases balance correctly
 * - refundWallet increases balance correctly
 * - All operations create a WalletTransaction record
 */

import { Decimal } from '@prisma/client/runtime/library';
import { debitWallet, creditWallet, refundWallet } from '../../services/wallet.service';
import { AppError, ERROR_CODES } from '../../middleware/errorHandler';

// ─── Mock Prisma Transaction Client ──────────────────────────────────────────

function createMockTx(initialBalance: number) {
  let balance = new Decimal(initialBalance);
  const transactions: Array<{ type: string; amount: Decimal; balanceAfter: Decimal; reference: string; description: string }> = [];

  const tx = {
    wallet: {
      findUnique: jest.fn().mockImplementation(() =>
        Promise.resolve({ id: 'wallet-1', userId: 'user-1', balance })
      ),
      update: jest.fn().mockImplementation(({ data }: { data: { balance: Decimal } }) => {
        balance = new Decimal(data.balance);
        return Promise.resolve({ id: 'wallet-1', userId: 'user-1', balance });
      }),
    },
    walletTransaction: {
      create: jest.fn().mockImplementation(({ data }: { data: { type: string; amount: Decimal; balanceAfter: Decimal; reference: string; description: string } }) => {
        transactions.push(data);
        return Promise.resolve({ id: 'tx-1', ...data });
      }),
    },
    _getBalance: () => balance,
    _getTransactions: () => transactions,
  };

  return tx;
}

// ─── debitWallet ──────────────────────────────────────────────────────────────

describe('debitWallet', () => {
  it('throws INSUFFICIENT_BALANCE when balance < amount', async () => {
    const tx = createMockTx(100);

    await expect(
      debitWallet(tx as never, 'user-1', 200, 'Test debit', 'ref-1')
    ).rejects.toThrow(AppError);

    try {
      await debitWallet(tx as never, 'user-1', 200, 'Test debit', 'ref-1');
    } catch (err) {
      expect((err as AppError).code).toBe(ERROR_CODES.INSUFFICIENT_BALANCE);
    }
  });

  it('throws INSUFFICIENT_BALANCE when balance equals 0 and amount > 0', async () => {
    const tx = createMockTx(0);

    await expect(
      debitWallet(tx as never, 'user-1', 1, 'Test debit', 'ref-1')
    ).rejects.toThrow(AppError);
  });

  it('decreases balance by the correct amount', async () => {
    const tx = createMockTx(500);

    const newBalance = await debitWallet(tx as never, 'user-1', 200, 'Test debit', 'ref-1');

    expect(newBalance.toNumber()).toBe(300);
    expect(tx._getBalance().toNumber()).toBe(300);
  });

  it('creates a DEBIT WalletTransaction record', async () => {
    const tx = createMockTx(500);

    await debitWallet(tx as never, 'user-1', 150, 'Service payment', 'ref-debit-1');

    expect(tx.walletTransaction.create).toHaveBeenCalledTimes(1);
    const callArg = tx.walletTransaction.create.mock.calls[0][0];
    expect(callArg.data.type).toBe('DEBIT');
    expect(callArg.data.amount.toNumber()).toBe(150);
    expect(callArg.data.balanceAfter.toNumber()).toBe(350);
    expect(callArg.data.reference).toBe('ref-debit-1');
    expect(callArg.data.description).toBe('Service payment');
  });

  it('allows debit when balance exactly equals amount', async () => {
    const tx = createMockTx(100);

    const newBalance = await debitWallet(tx as never, 'user-1', 100, 'Exact debit', 'ref-exact');

    expect(newBalance.toNumber()).toBe(0);
  });
});

// ─── creditWallet ─────────────────────────────────────────────────────────────

describe('creditWallet', () => {
  it('increases balance by the correct amount', async () => {
    const tx = createMockTx(100);

    const newBalance = await creditWallet(tx as never, 'user-1', 500, 'Wallet funding', 'ref-credit-1');

    expect(newBalance.toNumber()).toBe(600);
    expect(tx._getBalance().toNumber()).toBe(600);
  });

  it('creates a CREDIT WalletTransaction record', async () => {
    const tx = createMockTx(0);

    await creditWallet(tx as never, 'user-1', 1000, 'Paystack funding', 'ref-credit-2');

    expect(tx.walletTransaction.create).toHaveBeenCalledTimes(1);
    const callArg = tx.walletTransaction.create.mock.calls[0][0];
    expect(callArg.data.type).toBe('CREDIT');
    expect(callArg.data.amount.toNumber()).toBe(1000);
    expect(callArg.data.balanceAfter.toNumber()).toBe(1000);
    expect(callArg.data.reference).toBe('ref-credit-2');
  });

  it('works correctly when crediting a zero balance wallet', async () => {
    const tx = createMockTx(0);

    const newBalance = await creditWallet(tx as never, 'user-1', 250, 'First credit', 'ref-first');

    expect(newBalance.toNumber()).toBe(250);
  });
});

// ─── refundWallet ─────────────────────────────────────────────────────────────

describe('refundWallet', () => {
  it('increases balance by the refund amount', async () => {
    const tx = createMockTx(200);

    const newBalance = await refundWallet(tx as never, 'user-1', 500, 'Service refund', 'ref-refund-1');

    expect(newBalance.toNumber()).toBe(700);
    expect(tx._getBalance().toNumber()).toBe(700);
  });

  it('creates a REFUND WalletTransaction record', async () => {
    const tx = createMockTx(100);

    await refundWallet(tx as never, 'user-1', 300, 'Rejected request refund', 'ref-refund-2');

    expect(tx.walletTransaction.create).toHaveBeenCalledTimes(1);
    const callArg = tx.walletTransaction.create.mock.calls[0][0];
    expect(callArg.data.type).toBe('REFUND');
    expect(callArg.data.amount.toNumber()).toBe(300);
    expect(callArg.data.balanceAfter.toNumber()).toBe(400);
    expect(callArg.data.reference).toBe('ref-refund-2');
    expect(callArg.data.description).toBe('Rejected request refund');
  });

  it('restores balance to original amount after debit + refund', async () => {
    const initialBalance = 1000;
    const debitTx  = createMockTx(initialBalance);
    const refundTx = createMockTx(0); // after debit

    // Simulate debit
    await debitWallet(debitTx as never, 'user-1', 500, 'Service payment', 'ref-d');
    const afterDebit = debitTx._getBalance().toNumber();
    expect(afterDebit).toBe(500);

    // Simulate refund
    refundTx.wallet.findUnique.mockResolvedValue({ id: 'wallet-1', userId: 'user-1', balance: new Decimal(afterDebit) });
    const afterRefund = await refundWallet(refundTx as never, 'user-1', 500, 'Refund', 'ref-r');
    expect(afterRefund.toNumber()).toBe(1000);
  });
});

// ─── Wallet not found ─────────────────────────────────────────────────────────

describe('wallet not found', () => {
  it('debitWallet throws WALLET_NOT_FOUND when wallet does not exist', async () => {
    const tx = {
      wallet: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
      walletTransaction: { create: jest.fn() },
    };

    await expect(
      debitWallet(tx as never, 'nonexistent-user', 100, 'Test', 'ref-1')
    ).rejects.toThrow(AppError);

    try {
      await debitWallet(tx as never, 'nonexistent-user', 100, 'Test', 'ref-1');
    } catch (err) {
      expect((err as AppError).code).toBe(ERROR_CODES.WALLET_NOT_FOUND);
    }
  });

  it('creditWallet throws WALLET_NOT_FOUND when wallet does not exist', async () => {
    const tx = {
      wallet: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
      walletTransaction: { create: jest.fn() },
    };

    await expect(
      creditWallet(tx as never, 'nonexistent-user', 100, 'Test', 'ref-1')
    ).rejects.toThrow(AppError);
  });
});

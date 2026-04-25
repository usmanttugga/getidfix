/**
 * Script to fix missing virtual accounts for existing users
 * Run with: npx ts-node scripts/fix-virtual-accounts.ts
 */

import { getPrismaClient } from '../src/config/prisma';
import { createVirtualAccount } from '../src/services/flutterwave.service';

async function fixVirtualAccounts() {
  const prisma = getPrismaClient();
  
  try {
    // Find all users without virtual accounts
    const usersWithoutVA = await prisma.wallet.findMany({
      where: {
        OR: [
          { virtualAccountNumber: null },
          { virtualAccountNumber: '' },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    console.log(`Found ${usersWithoutVA.length} wallets without virtual accounts`);

    for (const wallet of usersWithoutVA) {
      const user = wallet.user;
      console.log(`Creating virtual account for ${user.firstName} ${user.lastName} (${user.email})...`);

      try {
        const va = await createVirtualAccount({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone || undefined,
          userId: user.id,
        });

        await prisma.wallet.update({
          where: { userId: user.id },
          data: {
            virtualAccountNumber: va.accountNumber,
            virtualAccountBank: va.bankName,
            virtualAccountName: va.accountName,
            virtualAccountRef: va.orderRef,
          },
        });

        console.log(`✓ Created virtual account ${va.accountNumber} for ${user.firstName}`);
      } catch (err) {
        console.error(`✗ Failed to create virtual account for ${user.email}:`, err);
      }
    }

    console.log('\nDone!');
  } catch (err) {
    console.error('Script failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

fixVirtualAccounts();

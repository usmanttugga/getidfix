import { PrismaClient } from '@prisma/client';

type PrismaTx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// ─── createNotification ───────────────────────────────────────────────────────

export async function createNotification(
  prisma: PrismaTx,
  userId: string,
  title: string,
  body: string
) {
  return prisma.notification.create({
    data: { userId, title, body, isRead: false },
  });
}

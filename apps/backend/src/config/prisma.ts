import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// ─── Prisma Client Singleton ──────────────────────────────────────────────────

declare global {
  // Prevent multiple instances in development (hot-reload)
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

let prismaClient: PrismaClient;

/**
 * Returns the Prisma client singleton.
 * In development, reuses the global instance to survive hot-reloads.
 */
export function getPrismaClient(): PrismaClient {
  if (prismaClient) {
    return prismaClient;
  }

  if (process.env.NODE_ENV === 'development' && global.__prismaClient) {
    prismaClient = global.__prismaClient;
    return prismaClient;
  }

  prismaClient = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });

  if (process.env.NODE_ENV === 'development') {
    global.__prismaClient = prismaClient;
  }

  return prismaClient;
}

/**
 * Gracefully disconnects the Prisma client.
 * Should be called on application shutdown.
 */
export async function disconnectPrisma(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    logger.info('[Prisma] Disconnected from database.');
  }
}

export default getPrismaClient;

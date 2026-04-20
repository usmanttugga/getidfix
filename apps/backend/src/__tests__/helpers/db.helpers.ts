import { PrismaClient } from '@prisma/client';

// ─── Prisma Test Client ───────────────────────────────────────────────────────

let prismaTestClient: PrismaClient | null = null;

/**
 * Returns a shared Prisma client for tests.
 * Uses the TEST_DATABASE_URL environment variable.
 */
export function getTestPrismaClient(): PrismaClient {
  if (!prismaTestClient) {
    prismaTestClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
      log: process.env.PRISMA_LOG === 'true' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaTestClient;
}

/**
 * Disconnects the test Prisma client.
 * Call this in afterAll() hooks.
 */
export async function disconnectTestPrisma(): Promise<void> {
  if (prismaTestClient) {
    await prismaTestClient.$disconnect();
    prismaTestClient = null;
  }
}

// ─── Database Reset Utilities ─────────────────────────────────────────────────

/**
 * Truncates all application tables in the correct order (respecting FK constraints).
 * Use this in beforeEach() to ensure a clean state for each test.
 */
export async function resetDatabase(prisma?: PrismaClient): Promise<void> {
  const client = prisma || getTestPrismaClient();

  // Disable FK checks, truncate all tables, re-enable FK checks
  await client.$transaction([
    client.$executeRaw`SET session_replication_role = 'replica'`,
    client.$executeRaw`TRUNCATE TABLE "password_reset_tokens" CASCADE`,
    client.$executeRaw`TRUNCATE TABLE "audit_logs" CASCADE`,
    client.$executeRaw`TRUNCATE TABLE "notifications" CASCADE`,
    client.$executeRaw`TRUNCATE TABLE "wallet_ledger" CASCADE`,
    client.$executeRaw`TRUNCATE TABLE "transactions" CASCADE`,
    client.$executeRaw`TRUNCATE TABLE "wallets" CASCADE`,
    client.$executeRaw`TRUNCATE TABLE "services" CASCADE`,
    client.$executeRaw`TRUNCATE TABLE "users" CASCADE`,
    client.$executeRaw`SET session_replication_role = 'origin'`,
  ]);
}

/**
 * Seeds the test database with the minimum required data for tests.
 * Creates a default admin user and all 13 services.
 */
export async function seedTestDatabase(prisma?: PrismaClient): Promise<void> {
  const client = prisma || getTestPrismaClient();
  const bcrypt = await import('bcrypt');

  // Create admin user
  await client.user.create({
    data: {
      email: 'admin@test.getidfix.com',
      passwordHash: await bcrypt.hash('Admin@123456', 10),
      firstName: 'Test',
      lastName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      wallet: {
        create: { balance: 0 },
      },
    },
  });

  // Create a regular test user
  await client.user.create({
    data: {
      email: 'user@test.getidfix.com',
      passwordHash: await bcrypt.hash('User@123456', 10),
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      status: 'ACTIVE',
      wallet: {
        create: { balance: 10_000 }, // ₦10,000 starting balance
      },
    },
  });
}

// ─── Test Data Factories ──────────────────────────────────────────────────────

/**
 * Creates a test user with a wallet.
 */
export async function createTestUser(
  prisma: PrismaClient,
  overrides: {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: 'ADMIN' | 'USER';
    status?: 'ACTIVE' | 'SUSPENDED';
    walletBalance?: number;
  } = {}
) {
  const bcrypt = await import('bcrypt');
  const { v4: uuidv4 } = await import('uuid');

  const email = overrides.email || `test-${uuidv4()}@getidfix.com`;

  return prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash('Test@123456', 10),
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'User',
      role: overrides.role || 'USER',
      status: overrides.status || 'ACTIVE',
      wallet: {
        create: {
          balance: overrides.walletBalance ?? 5_000,
        },
      },
    },
    include: {
      wallet: true,
    },
  });
}

/**
 * Creates a test service.
 */
export async function createTestService(
  prisma: PrismaClient,
  overrides: {
    name?: string;
    slug?: string;
    category?: 'NIN' | 'BVN' | 'AIRTIME' | 'DATA';
    price?: number;
    isEnabled?: boolean;
  } = {}
) {
  const { v4: uuidv4 } = await import('uuid');
  const slug = overrides.slug || `test-service-${uuidv4()}`;

  return prisma.service.create({
    data: {
      name: overrides.name || `Test Service ${slug}`,
      slug,
      category: overrides.category || 'NIN',
      price: overrides.price ?? 500,
      isEnabled: overrides.isEnabled ?? true,
    },
  });
}

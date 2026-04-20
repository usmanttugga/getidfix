import { PrismaClient, ServiceCategory } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;

interface ServiceSeed {
  name: string;
  slug: string;
  category: ServiceCategory;
  price: number;
}

const SERVICES: ServiceSeed[] = [
  // NIN Verification (automated - NIMC API)
  { name: 'NIN Verification',                    slug: 'nin-verification',                    category: ServiceCategory.NIN,    price: 500  },
  { name: 'NIN Verification - VNIN',             slug: 'nin-verification-vnin',               category: ServiceCategory.NIN,    price: 500  },

  // NIN Validation sub-services
  { name: 'NIN Validation - No Record Found',    slug: 'nin-validation-no-record',            category: ServiceCategory.NIN,    price: 300  },
  { name: 'NIN Validation - Bank',               slug: 'nin-validation-bank',                 category: ServiceCategory.NIN,    price: 300  },
  { name: 'NIN Validation - Photograph Error',   slug: 'nin-validation-photograph',           category: ServiceCategory.NIN,    price: 300  },
  { name: 'NIN Validation - SIM',                slug: 'nin-validation-sim',                  category: ServiceCategory.NIN,    price: 300  },
  { name: 'NIN Validation - Modification',       slug: 'nin-validation-modification',         category: ServiceCategory.NIN,    price: 300  },
  { name: 'NIN Validation - Immigration',        slug: 'nin-validation-immigration',          category: ServiceCategory.NIN,    price: 300  },

  // IPE Clearance sub-services
  { name: 'IPE Clearance - Normal',              slug: 'ipe-clearance-normal',                category: ServiceCategory.NIN,    price: 800  },
  { name: 'IPE Clearance - Modification',        slug: 'ipe-clearance-modification',          category: ServiceCategory.NIN,    price: 800  },
  { name: 'IPE Clearance - Other Error',         slug: 'ipe-clearance-other-error',           category: ServiceCategory.NIN,    price: 800  },

  // NIN Modification sub-services
  { name: 'NIN Modification - Name',             slug: 'nin-modification-name',               category: ServiceCategory.NIN,    price: 1000 },
  { name: 'NIN Modification - Phone Number',     slug: 'nin-modification-phone',              category: ServiceCategory.NIN,    price: 800  },
  { name: 'NIN Modification - Address',          slug: 'nin-modification-address',            category: ServiceCategory.NIN,    price: 800  },
  { name: 'NIN Modification - Date of Birth',    slug: 'nin-modification-dob',                category: ServiceCategory.NIN,    price: 1500 },

  // NIN Self Service sub-services
  { name: 'NIN Self Service - Delinking',        slug: 'nin-self-service-delinking',          category: ServiceCategory.NIN,    price: 150  },
  { name: 'NIN Self Service - Email Retrieval',  slug: 'nin-self-service-email-retrieval',    category: ServiceCategory.NIN,    price: 150  },
  { name: 'NIN Self Service - Email & Delinking',slug: 'nin-self-service-email-delinking',    category: ServiceCategory.NIN,    price: 200  },
  { name: 'NIN Self Service - DOB Attestation',  slug: 'nin-self-service-dob-attestation',    category: ServiceCategory.NIN,    price: 500  },

  // NIN Personalization
  { name: 'NIN Personalization',                 slug: 'nin-personalization',                 category: ServiceCategory.NIN,    price: 1200 },

  // BVN Services
  { name: 'BVN Verification',                    slug: 'bvn-verification',                    category: ServiceCategory.BVN,    price: 500  },
  { name: 'BVN Retrieval',                       slug: 'bvn-retrieval',                       category: ServiceCategory.BVN,    price: 400  },
  { name: 'BVN Modification',                    slug: 'bvn-modification',                    category: ServiceCategory.BVN,    price: 1000 },
  { name: 'BVN User',                            slug: 'bvn-user',                            category: ServiceCategory.BVN,    price: 300  },

  // Utility Services
  { name: 'Buy Airtime',                         slug: 'buy-airtime',                         category: ServiceCategory.AIRTIME, price: 0   },
  { name: 'Buy Data',                            slug: 'buy-data',                            category: ServiceCategory.DATA,    price: 0   },
];

async function main(): Promise<void> {
  console.log('[Seed] Starting database seed...');

  const adminEmail = 'admin@getidfix.com';
  const passwordHash = await bcrypt.hash('Admin@123456', BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: 'ADMIN', status: 'ACTIVE' },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
      wallet: { create: { balance: 0 } },
    },
  });

  console.log(`[Seed] Admin user: ${admin.email}`);

  // Ensure admin wallet exists
  const existingWallet = await prisma.wallet.findUnique({ where: { userId: admin.id } });
  if (!existingWallet) {
    await prisma.wallet.create({ data: { userId: admin.id, balance: 0 } });
  }

  for (const svc of SERVICES) {
    await prisma.service.upsert({
      where: { slug: svc.slug },
      update: { name: svc.name, category: svc.category, price: svc.price, isEnabled: true },
      create: { name: svc.name, slug: svc.slug, category: svc.category, price: svc.price, isEnabled: true },
    });
    console.log(`[Seed] Service: ${svc.name} — ₦${svc.price}`);
  }

  console.log('\n[Seed] ✅ Seed completed!');
  console.log('[Seed] Admin: admin@getidfix.com / Admin@123456');
}

main()
  .catch((err) => { console.error('[Seed] ❌ Failed:', err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

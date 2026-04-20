import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../config/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

const SUPPORT_KEYS = ['companyName', 'supportEmail', 'supportPhone'];

// ─── GET /settings/support (public — users can read) ─────────────────────────

router.get('/support', async (_req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const settings = await prisma.appSetting.findMany({
      where: { key: { in: SUPPORT_KEYS } },
    });
    const data = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /settings/support (admin only) ────────────────────────────────────

const supportSchema = z.object({
  companyName:  z.string().min(1).optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().min(7).optional(),
});

router.patch('/support', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const body = supportSchema.parse(req.body);

    await Promise.all(
      Object.entries(body).map(([key, value]) =>
        prisma.appSetting.upsert({
          where:  { key },
          update: { value: value as string },
          create: { key, value: value as string },
        })
      )
    );

    const settings = await prisma.appSetting.findMany({
      where: { key: { in: SUPPORT_KEYS } },
    });
    const data = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
});

export default router;

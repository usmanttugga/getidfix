import { Router, Request, Response, NextFunction } from 'express';
import { getPrismaClient } from '../config/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// ─── GET /services ────────────────────────────────────────────────────────────

router.get('/', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const services = await prisma.service.findMany({
      where: { isEnabled: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Group by category
    const grouped = services.reduce<Record<string, typeof services>>((acc, svc) => {
      if (!acc[svc.category]) acc[svc.category] = [];
      acc[svc.category].push(svc);
      return acc;
    }, {});

    res.status(200).json({ status: 'success', data: { services, grouped } });
  } catch (err) {
    next(err);
  }
});

export default router;

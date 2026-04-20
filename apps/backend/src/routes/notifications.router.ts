import { Router, Request, Response, NextFunction } from 'express';
import { getPrismaClient } from '../config/prisma';
import { authenticate } from '../middleware/auth';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';

const router = Router();

// ─── GET /notifications ───────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const userId = req.user!.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    });

    const unreadCount = notifications.filter((n: { isRead: boolean }) => !n.isRead).length;

    res.status(200).json({ status: 'success', data: { notifications, unreadCount } });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /notifications/:id/read ───────────────────────────────────────────

router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const userId = req.user!.id;
    const { id }  = req.params;

    const notification = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new AppError('Notification not found.', 404, ERROR_CODES.NOT_FOUND);

    await prisma.notification.update({ where: { id }, data: { isRead: true } });

    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });

    res.status(200).json({ status: 'success', data: { unreadCount } });
  } catch (err) {
    next(err);
  }
});

export default router;

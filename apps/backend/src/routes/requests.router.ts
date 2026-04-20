import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { submitRequest, listRequests } from '../services/request.service';

const router = Router();

const submitSchema = z.object({
  serviceSlug: z.string().min(1),
  formData:    z.record(z.unknown()),
});

// ─── POST /requests ───────────────────────────────────────────────────────────

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { serviceSlug, formData } = submitSchema.parse(req.body);
    const request = await submitRequest(req.user!.id, serviceSlug, formData);
    res.status(201).json({ status: 'success', data: request });
  } catch (err) {
    next(err);
  }
});

// ─── GET /requests ────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await listRequests(req.user!.id, page, limit);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

export default router;

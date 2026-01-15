import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import * as configService from '../services/configService.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get(
  '/config',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = await configService.getSystemConfig();
      res.json({ config });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/config/distance',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { distance } = req.body;

      if (!distance || typeof distance !== 'object') {
        res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Distance configuration required' },
        });
        return;
      }

      const errors = configService.validateDistanceConfig(distance);
      if (errors.length > 0) {
        res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: errors.join(', ') },
        });
        return;
      }

      const config = await configService.updateDistanceConfig(distance, req.user!.email);

      res.json({ config });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/config/history',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await configService.getConfigHistory(limit, offset);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

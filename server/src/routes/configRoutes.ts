import { Router, Request, Response, NextFunction } from 'express';
import * as configService from '../services/configService.js';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = await configService.getSystemConfig();
    res.json({ distance: config.distance });
  } catch (error) {
    next(error);
  }
});

export default router;

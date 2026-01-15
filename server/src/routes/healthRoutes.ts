import { Router } from 'express';
import mongoose from 'mongoose';
import { redis } from '../config/redis.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/ready', async (_req, res) => {
  const checks = {
    mongodb: mongoose.connection.readyState === 1,
    redis: redis.status === 'ready',
  };

  const allHealthy = Object.values(checks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not ready',
    checks,
  });
});

export default router;

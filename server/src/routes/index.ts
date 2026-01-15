import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import gameRoutes from './gameRoutes.js';
import playerRoutes from './playerRoutes.js';
import adminRoutes from './adminRoutes.js';
import configRoutes from './configRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/games', gameRoutes);
router.use('/players', playerRoutes);
router.use('/admin', adminRoutes);
router.use('/config', configRoutes);

export default router;

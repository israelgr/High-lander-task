import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import gameRoutes from './gameRoutes.js';
import playerRoutes from './playerRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/games', gameRoutes);
router.use('/players', playerRoutes);

export default router;

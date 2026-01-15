import { Router } from 'express';
import * as playerService from '../services/playerService.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/players - Get authenticated user's player (deprecated, use /api/auth/register)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const player = await playerService.getPlayerById(req.user!.playerId);
    if (!player) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Player not found' },
      });
    }
    res.status(200).json({ player });
  } catch (error) {
    next(error);
  }
});

// GET /api/players/:playerId - Only allow access to own player
router.get('/:playerId', authenticate, async (req, res, next) => {
  try {
    if (req.params.playerId !== req.user!.playerId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Cannot access other players' },
      });
    }

    const player = await playerService.getPlayerById(req.params.playerId);
    if (!player) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Player not found' },
      });
    }
    res.json({ player });
  } catch (error) {
    next(error);
  }
});

export default router;

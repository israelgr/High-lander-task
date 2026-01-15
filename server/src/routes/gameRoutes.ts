import { Router } from 'express';
import * as gameService from '../services/gameService.js';
import * as routingService from '../services/routingService.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/games - List available games (public)
router.get('/', async (_req, res, next) => {
  try {
    const games = await gameService.getAvailableGames();
    res.json({ games });
  } catch (error) {
    next(error);
  }
});

// GET /api/games/:gameId - Get game details (auth required, must be participant)
router.get('/:gameId', authenticate, async (req, res, next) => {
  try {
    const game = await gameService.getGameById(req.params.gameId!);
    if (!game) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Game not found' },
      });
    }

    const isParticipant = game.players.some((p) => p.id === req.user!.playerId);
    if (!isParticipant) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You are not a participant in this game',
        },
      });
    }

    res.json({ game });
  } catch (error) {
    next(error);
  }
});

// POST /api/games/route - Calculate route (auth required)
router.post('/route', authenticate, async (req, res, next) => {
  try {
    const { start, end } = req.body;

    if (!start?.latitude || !start?.longitude || !end?.latitude || !end?.longitude) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Start and end coordinates are required',
        },
      });
    }

    const route = await routingService.getRoute(start, end);
    res.json({ route });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import * as gameService from '../services/gameService.js';
import * as routingService from '../services/routingService.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const games = await gameService.getAvailableGames();
    res.json({ games });
  } catch (error) {
    next(error);
  }
});

router.get('/:gameId', async (req, res, next) => {
  try {
    const game = await gameService.getGameById(req.params.gameId!);
    if (!game) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Game not found' } });
    }
    res.json({ game });
  } catch (error) {
    next(error);
  }
});

router.post('/route', async (req, res, next) => {
  try {
    const { start, end } = req.body;

    if (!start?.latitude || !start?.longitude || !end?.latitude || !end?.longitude) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Start and end coordinates are required' },
      });
    }

    const route = await routingService.getRoute(start, end);
    res.json({ route });
  } catch (error) {
    next(error);
  }
});

export default router;

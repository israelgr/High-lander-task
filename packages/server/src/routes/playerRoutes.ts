import { Router } from 'express';
import * as playerService from '../services/playerService.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Username is required' },
      });
    }

    const player = await playerService.getOrCreatePlayer(username.trim());
    res.status(201).json({ player });
  } catch (error) {
    next(error);
  }
});

router.get('/:playerId', async (req, res, next) => {
  try {
    const player = await playerService.getPlayerById(req.params.playerId!);
    if (!player) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Player not found' } });
    }
    res.json({ player });
  } catch (error) {
    next(error);
  }
});

export default router;

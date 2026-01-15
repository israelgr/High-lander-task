import { Router } from 'express';
import * as authService from '../services/authService.js';
import { AuthError } from '../services/authService.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { UserModel } from '../models/User.js';
import { PlayerModel } from '../models/Player.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, username } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: { code: 'INVALID_EMAIL', message: 'Valid email is required' },
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters',
        },
      });
    }

    if (
      !username ||
      typeof username !== 'string' ||
      username.length < 2 ||
      username.length > 20
    ) {
      return res.status(400).json({
        error: {
          code: 'INVALID_USERNAME',
          message: 'Username must be 2-20 characters',
        },
      });
    }

    const { user, tokens } = await authService.register({
      email,
      password,
      username,
    });

    res.status(201).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        playerId: user.playerId.toString(),
      },
      tokens,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        error: { code: error.code, message: error.message },
      });
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Email and password are required',
        },
      });
    }

    const { user, tokens } = await authService.login({ email, password });

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        playerId: user.playerId.toString(),
      },
      tokens,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        error: { code: error.code, message: error.message },
      });
    }
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Refresh token is required',
        },
      });
    }

    const tokens = await authService.refreshTokens(refreshToken);
    res.json({ tokens });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        error: { code: error.code, message: error.message },
      });
    }
    next(error);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken, logoutAll } = req.body;

    await authService.logout(req.user!.userId, logoutAll ? undefined : refreshToken);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user!.userId);
    const player = await PlayerModel.findById(req.user!.playerId);

    if (!user || !player) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        playerId: player._id.toString(),
      },
      player: {
        id: player._id.toString(),
        username: player.username,
        avatarUrl: player.avatarUrl,
        stats: player.stats,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

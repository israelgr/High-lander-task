import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService.js';
import { UserModel } from '../models/User.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        playerId: string;
        email: string;
        isAdmin?: boolean;
      };
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: { code: 'NO_TOKEN', message: 'Authentication required' },
      });
      return;
    }

    const token = authHeader.substring(7);
    const payload = authService.verifyAccessToken(token);

    req.user = {
      userId: payload.userId,
      playerId: payload.playerId,
      email: payload.email,
    };

    next();
  } catch {
    res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    });
  }
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const payload = authService.verifyAccessToken(token);
      req.user = {
        userId: payload.userId,
        playerId: payload.playerId,
        email: payload.email,
      };
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }

  next();
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: { code: 'NO_AUTH', message: 'Authentication required' },
    });
    return;
  }

  try {
    const user = await UserModel.findById(req.user.userId);

    if (!user || !user.isAdmin) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      });
      return;
    }

    req.user.isAdmin = true;
    next();
  } catch {
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to verify admin status' },
    });
  }
}

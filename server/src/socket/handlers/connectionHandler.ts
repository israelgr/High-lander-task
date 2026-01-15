import { Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@high-lander/shared';
import * as playerService from '../../services/playerService.js';
import { redis } from '../../config/redis.js';

type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function setupConnectionHandler(socket: GameSocket): void {
  // Auto-authenticate using JWT data from middleware
  (async () => {
    try {
      const playerId = socket.data.playerId;
      if (!playerId) {
        socket.emit('connection:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'JWT authentication required',
        });
        socket.disconnect();
        return;
      }

      const player = await playerService.getPlayerById(playerId);
      if (!player) {
        socket.emit('connection:error', {
          code: 'PLAYER_NOT_FOUND',
          message: 'Player not found',
        });
        socket.disconnect();
        return;
      }

      socket.data.username = player.username;
      await redis.set(`socket:${socket.id}:player`, playerId);

      socket.emit('connection:authenticated', { playerId });
      console.log(`Player authenticated: ${player.username} (${playerId})`);
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('connection:error', {
        code: 'AUTH_FAILED',
        message: 'Failed to authenticate player',
      });
      socket.disconnect();
    }
  })();

  // Keep player:authenticate for backwards compatibility (deprecated)
  socket.on('player:authenticate', async () => {
    console.warn('DEPRECATED: player:authenticate event. Use JWT auth instead.');
    socket.emit('connection:authenticated', { playerId: socket.data.playerId });
  });

  socket.on('disconnect', async () => {
    const playerId = socket.data.playerId;
    const gameId = socket.data.gameId;

    if (playerId) {
      await redis.del(`socket:${socket.id}:player`);
    }

    if (gameId && playerId) {
      await redis.del(`socket:${socket.id}:game`);
      await redis.hdel(`game:${gameId}:player:${playerId}`, 'socketId');

      socket.to(`game:${gameId}`).emit('game:player_left', { playerId });
    }

    console.log(`Socket disconnected: ${socket.id}`);
  });
}

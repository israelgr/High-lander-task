import { Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@high-lander/shared';
import * as playerService from '../../services/playerService.js';
import { redis } from '../../config/redis.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function setupConnectionHandler(socket: GameSocket): void {
  socket.on('player:authenticate', async ({ playerId, username }) => {
    try {
      const player = await playerService.getOrCreatePlayer(username);

      socket.data.playerId = player.id;
      socket.data.username = player.username;

      await redis.set(`socket:${socket.id}:player`, player.id);

      socket.emit('connection:authenticated', { playerId: player.id });
      console.log(`Player authenticated: ${player.username} (${player.id})`);
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('connection:error', {
        code: 'AUTH_FAILED',
        message: 'Failed to authenticate player',
      });
    }
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

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { createMockSocket, MockSocket, triggerSocketHandler } from '../../__tests__/helpers/socketHelper.js';
import { createMockPlayer } from '../../__tests__/fixtures/players.js';

// Mock dependencies
vi.mock('../../services/playerService.js');
vi.mock('../../config/redis.js', () => ({
  redis: {
    set: vi.fn(),
    del: vi.fn(),
    hdel: vi.fn(),
  },
}));

import * as playerService from '../../services/playerService.js';
import { redis } from '../../config/redis.js';
import { setupConnectionHandler } from './connectionHandler.js';

describe('connectionHandler', () => {
  let socket: MockSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = createMockSocket();
    (redis.set as Mock).mockResolvedValue('OK');
    (redis.del as Mock).mockResolvedValue(1);
    (redis.hdel as Mock).mockResolvedValue(1);
  });

  describe('auto-authentication', () => {
    it('should authenticate player with valid playerId in socket data', async () => {
      const playerId = 'test-player-id';
      const player = createMockPlayer({ id: playerId });
      socket.data.playerId = playerId;
      (playerService.getPlayerById as Mock).mockResolvedValue(player);

      setupConnectionHandler(socket as any);
      // Wait for async handler to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(playerService.getPlayerById).toHaveBeenCalledWith(playerId);
      expect(redis.set).toHaveBeenCalledWith(
        `socket:${socket.id}:player`,
        playerId
      );
      expect(socket.emit).toHaveBeenCalledWith('connection:authenticated', { playerId });
      expect(socket.data.username).toBe(player.username);
    });

    it('should emit error and disconnect when playerId not in socket data', async () => {
      socket.data.playerId = undefined;

      setupConnectionHandler(socket as any);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(socket.emit).toHaveBeenCalledWith('connection:error', {
        code: 'NOT_AUTHENTICATED',
        message: 'JWT authentication required',
      });
      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('should emit error and disconnect when player not found', async () => {
      socket.data.playerId = 'nonexistent-player';
      (playerService.getPlayerById as Mock).mockResolvedValue(null);

      setupConnectionHandler(socket as any);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(socket.emit).toHaveBeenCalledWith('connection:error', {
        code: 'PLAYER_NOT_FOUND',
        message: 'Player not found',
      });
      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('should handle authentication error gracefully', async () => {
      socket.data.playerId = 'test-player-id';
      (playerService.getPlayerById as Mock).mockRejectedValue(new Error('DB error'));

      setupConnectionHandler(socket as any);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(socket.emit).toHaveBeenCalledWith('connection:error', {
        code: 'AUTH_FAILED',
        message: 'Failed to authenticate player',
      });
      expect(socket.disconnect).toHaveBeenCalled();
    });
  });

  describe('player:authenticate (deprecated)', () => {
    it('should emit authenticated event for backwards compatibility', async () => {
      const playerId = 'test-player-id';
      socket.data.playerId = playerId;
      (playerService.getPlayerById as Mock).mockResolvedValue(createMockPlayer({ id: playerId }));

      setupConnectionHandler(socket as any);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Clear previous emit calls
      socket.emit.mockClear();

      // Trigger deprecated event
      await triggerSocketHandler(socket, 'player:authenticate', {});

      expect(socket.emit).toHaveBeenCalledWith('connection:authenticated', { playerId });
    });
  });

  describe('disconnect', () => {
    it('should cleanup Redis when player disconnects', async () => {
      const playerId = 'test-player-id';
      socket.data.playerId = playerId;
      (playerService.getPlayerById as Mock).mockResolvedValue(createMockPlayer({ id: playerId }));

      setupConnectionHandler(socket as any);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Clear mocks
      vi.clearAllMocks();

      // Trigger disconnect
      await triggerSocketHandler(socket, 'disconnect', undefined);

      expect(redis.del).toHaveBeenCalledWith(`socket:${socket.id}:player`);
    });

    it('should cleanup game data and notify room on disconnect if in game', async () => {
      const playerId = 'test-player-id';
      const gameId = 'test-game-id';
      socket.data.playerId = playerId;
      socket.data.gameId = gameId;
      (playerService.getPlayerById as Mock).mockResolvedValue(createMockPlayer({ id: playerId }));

      setupConnectionHandler(socket as any);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Clear mocks
      vi.clearAllMocks();

      // Trigger disconnect
      await triggerSocketHandler(socket, 'disconnect', undefined);

      expect(redis.del).toHaveBeenCalledWith(`socket:${socket.id}:player`);
      expect(redis.del).toHaveBeenCalledWith(`socket:${socket.id}:game`);
      expect(redis.hdel).toHaveBeenCalledWith(`game:${gameId}:player:${playerId}`, 'socketId');
      expect(socket.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect((socket.to(`game:${gameId}`) as { emit: ReturnType<typeof vi.fn> }).emit).toHaveBeenCalledWith('game:player_left', { playerId });
    });

    it('should not cleanup game data if not in game', async () => {
      socket.data.playerId = undefined;
      socket.data.gameId = undefined;

      setupConnectionHandler(socket as any);

      // Trigger disconnect
      await triggerSocketHandler(socket, 'disconnect', undefined);

      expect(redis.hdel).not.toHaveBeenCalled();
      expect(socket.to).not.toHaveBeenCalled();
    });
  });
});

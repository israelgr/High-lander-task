import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { createMockSocket, createMockIO, MockSocket, MockIO, triggerSocketHandler } from '../../__tests__/helpers/socketHelper.js';
import { createMockGame } from '../../__tests__/fixtures/games.js';
import { SAN_FRANCISCO } from '../../__tests__/fixtures/coordinates.js';

// Mock dependencies
vi.mock('../../services/gameService.js');
vi.mock('../../config/redis.js', () => ({
  redis: {
    set: vi.fn(),
    del: vi.fn(),
    hset: vi.fn(),
    hget: vi.fn(),
  },
}));

import * as gameService from '../../services/gameService.js';
import { redis } from '../../config/redis.js';
import { setupGameHandler } from './gameHandler.js';

describe('gameHandler', () => {
  let socket: MockSocket;
  let io: MockIO;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = createMockSocket();
    io = createMockIO();

    (redis.set as Mock).mockResolvedValue('OK');
    (redis.del as Mock).mockResolvedValue(1);
    (redis.hset as Mock).mockResolvedValue(1);
    (redis.hget as Mock).mockResolvedValue(null);
  });

  describe('game:create', () => {
    it('should create game when authenticated', async () => {
      const playerId = 'test-player-id';
      const username = 'testuser';
      const mockGame = createMockGame({ hostPlayerId: playerId });

      socket.data.playerId = playerId;
      socket.data.username = username;
      (gameService.createGame as Mock).mockResolvedValue(mockGame);

      setupGameHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'game:create', { config: {} });

      expect(gameService.createGame).toHaveBeenCalledWith(playerId, username, {});
      expect(socket.join).toHaveBeenCalledWith(`game:${mockGame.id}`);
      expect(redis.set).toHaveBeenCalledWith(`socket:${socket.id}:game`, mockGame.id);
      expect(redis.hset).toHaveBeenCalledWith(`game:${mockGame.id}:player:${playerId}`, 'socketId', socket.id);
      expect(socket.emit).toHaveBeenCalledWith('game:created', { game: mockGame });
      expect(socket.data.gameId).toBe(mockGame.id);
    });

    it('should emit error when not authenticated', async () => {
      socket.data.playerId = undefined;
      socket.data.username = undefined;

      setupGameHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'game:create', { config: {} });

      expect(gameService.createGame).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'NOT_AUTHENTICATED',
        message: 'Please authenticate first',
      });
    });

    it('should emit error when creation fails', async () => {
      socket.data.playerId = 'test-player-id';
      socket.data.username = 'testuser';
      (gameService.createGame as Mock).mockRejectedValue(new Error('DB error'));

      setupGameHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'game:create', { config: {} });

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'CREATE_FAILED',
        message: 'Failed to create game',
      });
    });
  });

  describe('game:join', () => {
    it('should join game when authenticated and game exists', async () => {
      const playerId = 'test-player-id';
      const username = 'testuser';
      const mockGame = createMockGame({
        players: [{ id: playerId, username, status: 'waiting', joinedAt: Date.now() }],
      });

      socket.data.playerId = playerId;
      socket.data.username = username;
      (gameService.getGameByCode as Mock).mockResolvedValue(mockGame);
      (gameService.joinGame as Mock).mockResolvedValue(mockGame);

      setupGameHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'game:join', { gameCode: 'ABC123' });

      expect(gameService.getGameByCode).toHaveBeenCalledWith('ABC123');
      expect(gameService.joinGame).toHaveBeenCalledWith(mockGame.id, playerId, username);
      expect(socket.join).toHaveBeenCalledWith(`game:${mockGame.id}`);
      expect(socket.emit).toHaveBeenCalledWith('game:joined', { game: mockGame });
    });

    it('should emit error when game not found', async () => {
      socket.data.playerId = 'test-player-id';
      socket.data.username = 'testuser';
      (gameService.getGameByCode as Mock).mockResolvedValue(null);

      setupGameHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'game:join', { gameCode: 'INVALID' });

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'GAME_NOT_FOUND',
        message: 'Game not found',
      });
    });

    it('should emit error when join fails', async () => {
      const mockGame = createMockGame();
      socket.data.playerId = 'test-player-id';
      socket.data.username = 'testuser';
      (gameService.getGameByCode as Mock).mockResolvedValue(mockGame);
      (gameService.joinGame as Mock).mockResolvedValue(null);

      setupGameHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'game:join', { gameCode: 'ABC123' });

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'JOIN_FAILED',
        message: 'Cannot join this game',
      });
    });

    it('should notify other players when joining', async () => {
      const playerId = 'test-player-id';
      const username = 'testuser';
      const mockGame = createMockGame({
        players: [{ id: playerId, username, status: 'waiting', joinedAt: Date.now() }],
      });

      socket.data.playerId = playerId;
      socket.data.username = username;
      (gameService.getGameByCode as Mock).mockResolvedValue(mockGame);
      (gameService.joinGame as Mock).mockResolvedValue(mockGame);

      setupGameHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'game:join', { gameCode: 'ABC123' });

      expect(socket.to).toHaveBeenCalledWith(`game:${mockGame.id}`);
      expect((socket.to(`game:${mockGame.id}`) as { emit: ReturnType<typeof vi.fn> }).emit).toHaveBeenCalledWith(
        'game:player_joined',
        expect.objectContaining({ player: expect.any(Object) })
      );
    });
  });

  describe('game:leave', () => {
    it('should leave game and cleanup', async () => {
      const playerId = 'test-player-id';
      const gameId = 'test-game-id';

      socket.data.playerId = playerId;
      socket.data.gameId = gameId;
      (gameService.leaveGame as Mock).mockResolvedValue({});

      setupGameHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'game:leave', undefined);

      expect(gameService.leaveGame).toHaveBeenCalledWith(gameId, playerId);
      expect(socket.leave).toHaveBeenCalledWith(`game:${gameId}`);
      expect(redis.del).toHaveBeenCalledWith(`socket:${socket.id}:game`);
      expect(socket.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(socket.data.gameId).toBeUndefined();
    });

    it('should do nothing when not in game', async () => {
      socket.data.playerId = undefined;
      socket.data.gameId = undefined;

      setupGameHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'game:leave', undefined);

      expect(gameService.leaveGame).not.toHaveBeenCalled();
    });
  });

  describe('game:start', () => {
    it('should emit error when not host', async () => {
      const playerId = 'test-player-id';
      const gameId = 'test-game-id';
      const mockGame = createMockGame({ hostPlayerId: 'other-player' });

      socket.data.playerId = playerId;
      socket.data.gameId = gameId;
      (gameService.getGameById as Mock).mockResolvedValue(mockGame);

      setupGameHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'game:start', undefined);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'NOT_HOST',
        message: 'Only the host can start the game',
      });
    });

    it('should use default mock position when no position shared', async () => {
      const playerId = 'test-player-id';
      const gameId = 'test-game-id';
      const mockGame = createMockGame({ id: gameId, hostPlayerId: playerId, status: 'active' });
      const DEFAULT_MOCK_POSITION = { latitude: 32.0853, longitude: 34.7818 };

      socket.data.playerId = playerId;
      socket.data.gameId = gameId;
      (gameService.getGameById as Mock).mockResolvedValue(mockGame);
      (redis.hget as Mock).mockResolvedValue(null);
      (gameService.startGame as Mock).mockResolvedValue(mockGame);

      vi.useFakeTimers();

      setupGameHandler(socket as any, io as any);
      const eventPromise = triggerSocketHandler(socket, 'game:start', undefined);

      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(1000);
      }

      vi.useRealTimers();
      await eventPromise;

      // Should use default mock position instead of emitting error
      expect(gameService.startGame).toHaveBeenCalledWith(gameId, DEFAULT_MOCK_POSITION);
      expect(socket.emit).not.toHaveBeenCalledWith('error', expect.objectContaining({ code: 'NO_POSITION' }));
    }, 15000);

    it('should start game when host with position', async () => {
      const playerId = 'test-player-id';
      const gameId = 'test-game-id';
      const mockGame = createMockGame({ id: gameId, hostPlayerId: playerId, status: 'active' });

      socket.data.playerId = playerId;
      socket.data.gameId = gameId;
      (gameService.getGameById as Mock).mockResolvedValue(mockGame);
      (redis.hget as Mock).mockResolvedValue(JSON.stringify(SAN_FRANCISCO));
      (gameService.startGame as Mock).mockResolvedValue(mockGame);

      // Use fake timers before setting up handler
      vi.useFakeTimers();

      setupGameHandler(socket as any, io as any);

      // Trigger the event
      const eventPromise = triggerSocketHandler(socket, 'game:start', undefined);

      // Advance through the countdown (GAME_CONSTANTS.COUNTDOWN_SECONDS * 1000 + buffer)
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(1000);
      }

      vi.useRealTimers();

      await eventPromise;

      expect(gameService.startGame).toHaveBeenCalledWith(gameId, SAN_FRANCISCO);
      expect((io.to(`game:${gameId}`) as { emit: ReturnType<typeof vi.fn> }).emit).toHaveBeenCalledWith('game:started', { game: mockGame });
    }, 15000);

    it('should do nothing when not in game', async () => {
      socket.data.playerId = undefined;
      socket.data.gameId = undefined;

      setupGameHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'game:start', undefined);

      expect(gameService.getGameById).not.toHaveBeenCalled();
    });
  });
});

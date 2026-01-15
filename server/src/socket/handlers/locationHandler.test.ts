import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { createMockSocket, createMockIO, MockSocket, MockIO, triggerSocketHandler } from '../../__tests__/helpers/socketHelper.js';
import { createMockGame, createMockGoal } from '../../__tests__/fixtures/games.js';
import { SAN_FRANCISCO, TEL_AVIV } from '../../__tests__/fixtures/coordinates.js';

// Mock dependencies
vi.mock('../../services/gameService.js');
vi.mock('../../utils/distance.js');

import * as gameService from '../../services/gameService.js';
import { calculateDistance } from '../../utils/distance.js';
import { setupLocationHandler } from './locationHandler.js';

describe('locationHandler', () => {
  let socket: MockSocket;
  let io: MockIO;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = createMockSocket();
    io = createMockIO();

    (gameService.updatePlayerPosition as Mock).mockResolvedValue(undefined);
    (gameService.getPlayerPositions as Mock).mockResolvedValue(new Map());
  });

  describe('location:update', () => {
    it('should update player position and broadcast', async () => {
      const playerId = 'test-player-id';
      const gameId = 'test-game-id';
      const goal = createMockGoal();
      const mockGame = createMockGame({
        id: gameId,
        status: 'active',
        goal,
        players: [{ id: playerId, username: 'testuser', status: 'playing', joinedAt: Date.now() }],
      });

      socket.data.playerId = playerId;
      socket.data.gameId = gameId;
      (gameService.getGameById as Mock).mockResolvedValue(mockGame);
      (gameService.getPlayerPositions as Mock).mockResolvedValue(
        new Map([[playerId, SAN_FRANCISCO]])
      );
      (calculateDistance as Mock).mockReturnValue(1000);

      setupLocationHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'location:update', { position: SAN_FRANCISCO });

      expect(gameService.updatePlayerPosition).toHaveBeenCalledWith(
        gameId,
        playerId,
        { latitude: SAN_FRANCISCO.latitude, longitude: SAN_FRANCISCO.longitude }
      );
      expect(io.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect((io.to(`game:${gameId}`) as { emit: ReturnType<typeof vi.fn> }).emit).toHaveBeenCalledWith(
        'players:positions',
        expect.arrayContaining([
          expect.objectContaining({
            playerId,
            position: SAN_FRANCISCO,
            distanceToGoal: expect.any(Number),
          }),
        ])
      );
    });

    it('should do nothing when not in game', async () => {
      socket.data.playerId = undefined;
      socket.data.gameId = undefined;

      setupLocationHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'location:update', { position: SAN_FRANCISCO });

      expect(gameService.updatePlayerPosition).not.toHaveBeenCalled();
    });

    it('should not broadcast when game is not active', async () => {
      const playerId = 'test-player-id';
      const gameId = 'test-game-id';
      const mockGame = createMockGame({ id: gameId, status: 'waiting' });

      socket.data.playerId = playerId;
      socket.data.gameId = gameId;
      (gameService.getGameById as Mock).mockResolvedValue(mockGame);

      setupLocationHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'location:update', { position: SAN_FRANCISCO });

      expect(gameService.updatePlayerPosition).toHaveBeenCalled();
      expect(io.to).not.toHaveBeenCalled();
    });

    it('should only include playing players in broadcast', async () => {
      const playerId = 'test-player-id';
      const gameId = 'test-game-id';
      const mockGame = createMockGame({
        id: gameId,
        status: 'active',
        goal: createMockGoal(),
        players: [
          { id: playerId, username: 'player1', status: 'playing', joinedAt: Date.now() },
          { id: 'disconnected-player', username: 'player2', status: 'disconnected', joinedAt: Date.now() },
        ],
      });

      socket.data.playerId = playerId;
      socket.data.gameId = gameId;
      (gameService.getGameById as Mock).mockResolvedValue(mockGame);
      (gameService.getPlayerPositions as Mock).mockResolvedValue(
        new Map([[playerId, SAN_FRANCISCO]])
      );
      (calculateDistance as Mock).mockReturnValue(500);

      setupLocationHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'location:update', { position: SAN_FRANCISCO });

      // Only active player should be in the broadcast
      expect(gameService.getPlayerPositions).toHaveBeenCalledWith(gameId, [playerId]);
    });
  });

  describe('goal:reached', () => {
    it('should emit error when not close enough to goal', async () => {
      const playerId = 'test-player-id';
      const gameId = 'test-game-id';
      const mockGame = createMockGame({
        id: gameId,
        status: 'active',
        goal: createMockGoal({ position: TEL_AVIV }),
        config: { proximityThreshold: 50, maxPlayers: 10, goalRadiusMin: 500, goalRadiusMax: 2000 },
      });

      socket.data.playerId = playerId;
      socket.data.username = 'testuser';
      socket.data.gameId = gameId;
      (gameService.getGameById as Mock).mockResolvedValue(mockGame);
      (calculateDistance as Mock).mockReturnValue(100); // 100m away, threshold is 50m

      setupLocationHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'goal:reached', { position: SAN_FRANCISCO });

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'NOT_AT_GOAL',
        message: expect.stringContaining('100m away'),
      });
    });

    it('should process goal reach and broadcast to room', async () => {
      const playerId = 'test-player-id';
      const username = 'testuser';
      const gameId = 'test-game-id';
      const startedAt = Date.now() - 60000; // Started 60s ago
      const mockGame = createMockGame({
        id: gameId,
        status: 'active',
        startedAt,
        goal: createMockGoal({ position: TEL_AVIV }),
        config: { proximityThreshold: 50, maxPlayers: 10, goalRadiusMin: 500, goalRadiusMax: 2000 },
        players: [{ id: playerId, username, status: 'playing', joinedAt: Date.now() }],
      });

      socket.data.playerId = playerId;
      socket.data.username = username;
      socket.data.gameId = gameId;
      (gameService.getGameById as Mock).mockResolvedValue(mockGame);
      (calculateDistance as Mock).mockReturnValue(30); // Within threshold
      (gameService.playerReachedGoal as Mock).mockResolvedValue({
        game: { ...mockGame, status: 'active' },
        rank: 1,
      });

      setupLocationHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'goal:reached', { position: TEL_AVIV });

      expect(gameService.playerReachedGoal).toHaveBeenCalledWith(gameId, playerId);
      expect(io.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect((io.to(`game:${gameId}`) as { emit: ReturnType<typeof vi.fn> }).emit).toHaveBeenCalledWith('player:reached_goal', {
        playerId,
        playerName: username,
        finishTime: expect.any(Number),
        rank: 1,
      });
    });

    it('should broadcast winner event for rank 1', async () => {
      const playerId = 'test-player-id';
      const username = 'testuser';
      const gameId = 'test-game-id';
      const mockGame = createMockGame({
        id: gameId,
        status: 'active',
        startedAt: Date.now() - 60000,
        goal: createMockGoal({ position: TEL_AVIV }),
        config: { proximityThreshold: 50, maxPlayers: 10, goalRadiusMin: 500, goalRadiusMax: 2000 },
      });

      socket.data.playerId = playerId;
      socket.data.username = username;
      socket.data.gameId = gameId;
      (gameService.getGameById as Mock).mockResolvedValue(mockGame);
      (calculateDistance as Mock).mockReturnValue(30);
      (gameService.playerReachedGoal as Mock).mockResolvedValue({
        game: { ...mockGame, winnerId: playerId },
        rank: 1,
      });

      setupLocationHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'goal:reached', { position: TEL_AVIV });

      expect((io.to(`game:${gameId}`) as { emit: ReturnType<typeof vi.fn> }).emit).toHaveBeenCalledWith('game:winner', {
        winnerId: playerId,
        winnerName: username,
        finishTime: expect.any(Number),
      });
    });

    it('should broadcast game:finished when all players done', async () => {
      const playerId = 'test-player-id';
      const username = 'testuser';
      const gameId = 'test-game-id';
      const startedAt = Date.now() - 60000;
      const finishedAt = Date.now();
      const mockGame = createMockGame({
        id: gameId,
        status: 'active',
        startedAt,
        goal: createMockGoal({ position: TEL_AVIV }),
        config: { proximityThreshold: 50, maxPlayers: 10, goalRadiusMin: 500, goalRadiusMax: 2000 },
        players: [
          { id: playerId, username, status: 'playing', joinedAt: Date.now() },
        ],
      });

      const finishedGame = {
        ...mockGame,
        status: 'finished',
        finishedAt,
        players: [
          { id: playerId, username, status: 'finished', rank: 1, joinedAt: startedAt, finishedAt },
        ],
      };

      socket.data.playerId = playerId;
      socket.data.username = username;
      socket.data.gameId = gameId;
      (gameService.getGameById as Mock).mockResolvedValue(mockGame);
      (calculateDistance as Mock).mockReturnValue(30);
      (gameService.playerReachedGoal as Mock).mockResolvedValue({
        game: finishedGame,
        rank: 1,
      });

      setupLocationHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'goal:reached', { position: TEL_AVIV });

      expect((io.to(`game:${gameId}`) as { emit: ReturnType<typeof vi.fn> }).emit).toHaveBeenCalledWith('game:finished', {
        result: expect.objectContaining({
          gameId,
          rankings: expect.any(Array),
          stats: expect.any(Object),
        }),
      });
    });

    it('should do nothing when not in game', async () => {
      socket.data.playerId = undefined;
      socket.data.gameId = undefined;

      setupLocationHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'goal:reached', { position: SAN_FRANCISCO });

      expect(gameService.getGameById).not.toHaveBeenCalled();
    });

    it('should do nothing when game is not active', async () => {
      const playerId = 'test-player-id';
      const gameId = 'test-game-id';
      const mockGame = createMockGame({ id: gameId, status: 'waiting' });

      socket.data.playerId = playerId;
      socket.data.username = 'testuser';
      socket.data.gameId = gameId;
      (gameService.getGameById as Mock).mockResolvedValue(mockGame);

      setupLocationHandler(socket as any, io as any);
      await triggerSocketHandler(socket, 'goal:reached', { position: SAN_FRANCISCO });

      expect(gameService.playerReachedGoal).not.toHaveBeenCalled();
    });
  });
});

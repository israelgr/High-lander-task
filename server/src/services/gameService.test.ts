import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import mongoose from 'mongoose';
import { DEFAULT_GAME_CONFIG } from '@high-lander/shared';
import { SAN_FRANCISCO, TEL_AVIV } from '../__tests__/fixtures/coordinates.js';

// Mock modules first (no factory for mongoose models)
vi.mock('../models/Game.js');
vi.mock('../utils/gameCode.js');
vi.mock('./goalGeneratorService.js');
vi.mock('./configService.js');

// Redis needs a factory since it exports an instance
vi.mock('../config/redis.js', () => ({
  redis: {
    hset: vi.fn(),
    hget: vi.fn(),
    geoadd: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    get: vi.fn(),
  },
}));

// Import after mocking
import { GameModel } from '../models/Game.js';
import { generateGameCode } from '../utils/gameCode.js';
import { generateGoal } from './goalGeneratorService.js';
import * as configService from './configService.js';
import { redis } from '../config/redis.js';
import * as gameService from './gameService.js';

describe('gameService', () => {
  const mockSave = vi.fn().mockResolvedValue(undefined);

  // Define mockGameDoc helper
  const createMockGameDoc = (overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    code: 'ABC123',
    hostPlayerId: 'host-id',
    status: 'waiting',
    config: { ...DEFAULT_GAME_CONFIG },
    players: [
      {
        playerId: 'host-id',
        username: 'host',
        status: 'waiting',
        joinedAt: new Date(),
      },
    ],
    goal: undefined,
    winnerId: undefined,
    startedAt: undefined,
    finishedAt: undefined,
    createdAt: new Date(),
    save: mockSave,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);

    // Setup GameModel constructor mock
    (GameModel as unknown as Mock).mockImplementation((data) => ({
      _id: new mongoose.Types.ObjectId(),
      code: data.code,
      hostPlayerId: data.hostPlayerId,
      status: data.status,
      config: data.config,
      players: data.players,
      createdAt: new Date(),
      save: mockSave,
    }));

    // Setup static methods
    (GameModel.findById as Mock).mockReset();
    (GameModel.findOne as Mock).mockReset();
    (GameModel.find as Mock).mockReset();
    (GameModel.findOneAndUpdate as Mock).mockReset();

    // Setup generateGameCode mock
    (generateGameCode as Mock).mockReturnValue('XYZ789');

    // Setup configService mock
    (configService.getDistanceConfig as Mock).mockResolvedValue({
      goalRadiusMin: 500,
      goalRadiusMax: 2000,
      goalReachThreshold: 50,
    });

    // Setup generateGoal mock
    (generateGoal as Mock).mockResolvedValue({
      position: { latitude: 32.1, longitude: 34.8 },
      generatedAt: Date.now(),
      generatedFromPosition: { latitude: 32.0853, longitude: 34.7818 },
    });

    // Setup redis mock
    (redis.hset as Mock).mockResolvedValue(1);
    (redis.hget as Mock).mockResolvedValue(null);
    (redis.geoadd as Mock).mockResolvedValue(1);
    (redis.set as Mock).mockResolvedValue('OK');
    (redis.del as Mock).mockResolvedValue(1);
  });

  describe('createGame', () => {
    it('should create game with host as first player', async () => {
      const result = await gameService.createGame('host-id', 'hostname');

      expect(GameModel).toHaveBeenCalledWith(
        expect.objectContaining({
          hostPlayerId: 'host-id',
          status: 'waiting',
          players: expect.arrayContaining([
            expect.objectContaining({
              playerId: 'host-id',
              username: 'hostname',
              status: 'waiting',
            }),
          ]),
        })
      );
      expect(mockSave).toHaveBeenCalled();
    });

    it('should generate a game code', async () => {
      await gameService.createGame('host-id', 'hostname');

      expect(generateGameCode).toHaveBeenCalled();
    });

    it('should use config from configService when no config provided', async () => {
      await gameService.createGame('host-id', 'hostname');

      expect(configService.getDistanceConfig).toHaveBeenCalled();
      expect(GameModel).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            goalRadiusMin: 500, // from mocked configService
            goalRadiusMax: 2000, // from mocked configService
          }),
        })
      );
    });

    it('should merge partial config with configService values', async () => {
      await gameService.createGame('host-id', 'hostname', { maxPlayers: 5 });

      expect(GameModel).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            maxPlayers: 5,
            goalRadiusMin: 500, // from mocked configService
          }),
        })
      );
    });

    it('should return created game with status waiting', async () => {
      const result = await gameService.createGame('host-id', 'hostname');

      expect(result.status).toBe('waiting');
      expect(result.hostPlayerId).toBe('host-id');
    });
  });

  describe('getGameByCode', () => {
    it('should find game by exact code', async () => {
      const mockDoc = createMockGameDoc();
      (GameModel.findOne as Mock).mockResolvedValue(mockDoc);

      const result = await gameService.getGameByCode('ABC123');

      expect(result).not.toBeNull();
      expect(result?.code).toBe('ABC123');
    });

    it('should be case-insensitive (convert to uppercase)', async () => {
      const mockDoc = createMockGameDoc();
      (GameModel.findOne as Mock).mockResolvedValue(mockDoc);

      await gameService.getGameByCode('abc123');

      expect(GameModel.findOne).toHaveBeenCalledWith({ code: 'ABC123' });
    });

    it('should return null when game not found', async () => {
      (GameModel.findOne as Mock).mockResolvedValue(null);

      const result = await gameService.getGameByCode('NOTFND');

      expect(result).toBeNull();
    });
  });

  describe('getGameById', () => {
    it('should return game when found', async () => {
      const mockDoc = createMockGameDoc();
      (GameModel.findById as Mock).mockResolvedValue(mockDoc);

      const result = await gameService.getGameById(mockDoc._id.toString());

      expect(result).not.toBeNull();
      expect(result?.code).toBe('ABC123');
    });

    it('should return null when not found', async () => {
      (GameModel.findById as Mock).mockResolvedValue(null);

      const result = await gameService.getGameById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('getAvailableGames', () => {
    it('should return waiting games sorted by createdAt descending', async () => {
      const mockDocs = [
        createMockGameDoc({ createdAt: new Date('2024-01-02') }),
        createMockGameDoc({ createdAt: new Date('2024-01-01') }),
      ];

      (GameModel.find as Mock).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(mockDocs),
        }),
      });

      const result = await gameService.getAvailableGames();

      expect(result).toHaveLength(2);
      expect(GameModel.find).toHaveBeenCalledWith({ status: 'waiting' });
    });

    it('should return empty array when no games available', async () => {
      (GameModel.find as Mock).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await gameService.getAvailableGames();

      expect(result).toEqual([]);
    });

    it('should limit results to 20 games', async () => {
      const mockSort = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      });
      (GameModel.find as Mock).mockReturnValue({ sort: mockSort });

      await gameService.getAvailableGames();

      expect(mockSort().limit).toHaveBeenCalledWith(20);
    });
  });

  describe('joinGame', () => {
    it('should add player to waiting game', async () => {
      const mockDoc = createMockGameDoc();
      const updatedDoc = {
        ...mockDoc,
        players: [
          ...mockDoc.players,
          { playerId: 'new-player', username: 'newplayer', status: 'waiting', joinedAt: new Date() },
        ],
      };
      (GameModel.findOneAndUpdate as Mock).mockResolvedValue(updatedDoc);

      const result = await gameService.joinGame('game-id', 'new-player', 'newplayer');

      expect(result).not.toBeNull();
      expect(result?.players).toHaveLength(2);
    });

    it('should return null when game not found', async () => {
      (GameModel.findOneAndUpdate as Mock).mockResolvedValue(null);

      const result = await gameService.joinGame('invalid-id', 'player-id', 'username');

      expect(result).toBeNull();
    });

    it('should validate query includes correct conditions', async () => {
      const mockDoc = createMockGameDoc();
      (GameModel.findOneAndUpdate as Mock).mockResolvedValue(mockDoc);

      await gameService.joinGame('game-id', 'player-id', 'username');

      expect(GameModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'game-id',
          status: 'waiting',
          'players.playerId': { $ne: 'player-id' },
        }),
        expect.objectContaining({
          $push: expect.objectContaining({
            players: expect.objectContaining({
              playerId: 'player-id',
              username: 'username',
              status: 'waiting',
            }),
          }),
        }),
        { new: true }
      );
    });

    it('should return null when player already in game', async () => {
      (GameModel.findOneAndUpdate as Mock).mockResolvedValue(null);

      const result = await gameService.joinGame('game-id', 'host-id', 'host');

      expect(result).toBeNull();
    });

    it('should return null when game is full', async () => {
      (GameModel.findOneAndUpdate as Mock).mockResolvedValue(null);

      const result = await gameService.joinGame('full-game-id', 'new-player', 'newplayer');

      expect(result).toBeNull();
    });
  });

  describe('leaveGame', () => {
    it('should remove player from game', async () => {
      const updatedDoc = createMockGameDoc({ players: [] });
      (GameModel.findOneAndUpdate as Mock).mockResolvedValue(updatedDoc);

      const result = await gameService.leaveGame('game-id', 'host-id');

      expect(result?.players).toHaveLength(0);
      expect(GameModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'game-id' },
        { $pull: { players: { playerId: 'host-id' } } },
        { new: true }
      );
    });

    it('should return null when game not found', async () => {
      (GameModel.findOneAndUpdate as Mock).mockResolvedValue(null);

      const result = await gameService.leaveGame('invalid-id', 'player-id');

      expect(result).toBeNull();
    });
  });

  describe('startGame', () => {
    it('should start game and generate goal', async () => {
      const gameDoc = createMockGameDoc({
        status: 'waiting',
        players: [{ playerId: 'host-id', username: 'host', status: 'waiting', joinedAt: new Date() }],
      });
      (GameModel.findById as Mock).mockResolvedValue(gameDoc);

      const result = await gameService.startGame('game-id', TEL_AVIV);

      expect(result).not.toBeNull();
      expect(generateGoal).toHaveBeenCalledWith(TEL_AVIV, gameDoc.config);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should set all players to playing status', async () => {
      const gameDoc = createMockGameDoc({
        status: 'waiting',
        players: [
          { playerId: 'p1', username: 'u1', status: 'waiting', joinedAt: new Date() },
          { playerId: 'p2', username: 'u2', status: 'waiting', joinedAt: new Date() },
        ],
      });
      (GameModel.findById as Mock).mockResolvedValue(gameDoc);

      const result = await gameService.startGame('game-id', TEL_AVIV);

      expect(result?.players.every(p => p.status === 'playing')).toBe(true);
    });

    it('should store game state in Redis', async () => {
      const gameDoc = createMockGameDoc({
        status: 'waiting',
      });
      (GameModel.findById as Mock).mockResolvedValue(gameDoc);

      await gameService.startGame('game-id', TEL_AVIV);

      expect(redis.hset).toHaveBeenCalledWith(
        expect.stringContaining('game:'),
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    it('should return null for non-waiting game', async () => {
      const activeGameDoc = createMockGameDoc({ status: 'active' });
      (GameModel.findById as Mock).mockResolvedValue(activeGameDoc);

      const result = await gameService.startGame('game-id', TEL_AVIV);

      expect(result).toBeNull();
    });

    it('should return null when game not found', async () => {
      (GameModel.findById as Mock).mockResolvedValue(null);

      const result = await gameService.startGame('invalid-id', TEL_AVIV);

      expect(result).toBeNull();
    });

    it('should set game status to active', async () => {
      const gameDoc = createMockGameDoc({
        status: 'waiting',
      });
      (GameModel.findById as Mock).mockResolvedValue(gameDoc);

      const result = await gameService.startGame('game-id', TEL_AVIV);

      expect(result?.status).toBe('active');
    });
  });

  describe('playerReachedGoal', () => {
    it('should assign rank 1 and set winner for first finisher', async () => {
      const gameDoc = createMockGameDoc({
        status: 'active',
        players: [{ playerId: 'p1', username: 'u1', status: 'playing', joinedAt: new Date() }],
      });
      (GameModel.findById as Mock).mockResolvedValue(gameDoc);

      const result = await gameService.playerReachedGoal('game-id', 'p1');

      expect(result).not.toBeNull();
      expect(result?.rank).toBe(1);
      expect(result?.game.winnerId).toBe('p1');
    });

    it('should assign correct rank for subsequent finishers', async () => {
      const gameDoc = createMockGameDoc({
        status: 'active',
        players: [
          { playerId: 'p1', username: 'u1', status: 'finished', rank: 1, joinedAt: new Date() },
          { playerId: 'p2', username: 'u2', status: 'playing', joinedAt: new Date() },
        ],
        winnerId: 'p1',
      });
      (GameModel.findById as Mock).mockResolvedValue(gameDoc);

      const result = await gameService.playerReachedGoal('game-id', 'p2');

      expect(result?.rank).toBe(2);
      expect(result?.game.winnerId).toBe('p1');
    });

    it('should finish game when all players done', async () => {
      const gameDoc = createMockGameDoc({
        status: 'active',
        players: [
          { playerId: 'p1', username: 'u1', status: 'finished', rank: 1, joinedAt: new Date() },
          { playerId: 'p2', username: 'u2', status: 'playing', joinedAt: new Date() },
        ],
      });
      (GameModel.findById as Mock).mockResolvedValue(gameDoc);

      const result = await gameService.playerReachedGoal('game-id', 'p2');

      expect(result?.game.status).toBe('finished');
    });

    it('should consider disconnected players as done', async () => {
      const gameDoc = createMockGameDoc({
        status: 'active',
        players: [
          { playerId: 'p1', username: 'u1', status: 'disconnected', joinedAt: new Date() },
          { playerId: 'p2', username: 'u2', status: 'playing', joinedAt: new Date() },
        ],
      });
      (GameModel.findById as Mock).mockResolvedValue(gameDoc);

      const result = await gameService.playerReachedGoal('game-id', 'p2');

      expect(result?.game.status).toBe('finished');
    });

    it('should return null for non-active game', async () => {
      const gameDoc = createMockGameDoc({ status: 'waiting' });
      (GameModel.findById as Mock).mockResolvedValue(gameDoc);

      const result = await gameService.playerReachedGoal('game-id', 'p1');

      expect(result).toBeNull();
    });

    it('should return null if player not in game', async () => {
      const gameDoc = createMockGameDoc({
        status: 'active',
      });
      (GameModel.findById as Mock).mockResolvedValue(gameDoc);

      const result = await gameService.playerReachedGoal('game-id', 'nonexistent-player');

      expect(result).toBeNull();
    });

    it('should return null when game not found', async () => {
      (GameModel.findById as Mock).mockResolvedValue(null);

      const result = await gameService.playerReachedGoal('invalid-id', 'p1');

      expect(result).toBeNull();
    });
  });

  describe('updatePlayerPosition', () => {
    it('should store position with geoadd', async () => {
      await gameService.updatePlayerPosition('game-id', 'player-id', SAN_FRANCISCO);

      expect(redis.geoadd).toHaveBeenCalledWith(
        'game:game-id:locations',
        SAN_FRANCISCO.longitude,
        SAN_FRANCISCO.latitude,
        'player-id'
      );
    });

    it('should store position in hash with timestamp', async () => {
      await gameService.updatePlayerPosition('game-id', 'player-id', SAN_FRANCISCO);

      expect(redis.hset).toHaveBeenCalledWith(
        'game:game-id:player:player-id',
        expect.objectContaining({
          currentPosition: JSON.stringify(SAN_FRANCISCO),
          lastUpdate: expect.any(String),
        })
      );
    });
  });

  describe('getPlayerPositions', () => {
    it('should return map of player positions', async () => {
      (redis.hget as Mock)
        .mockResolvedValueOnce(JSON.stringify(SAN_FRANCISCO))
        .mockResolvedValueOnce(JSON.stringify(TEL_AVIV));

      const result = await gameService.getPlayerPositions('game-id', ['p1', 'p2']);

      expect(result.size).toBe(2);
      expect(result.get('p1')).toEqual(SAN_FRANCISCO);
      expect(result.get('p2')).toEqual(TEL_AVIV);
    });

    it('should handle missing positions gracefully', async () => {
      (redis.hget as Mock)
        .mockResolvedValueOnce(JSON.stringify(SAN_FRANCISCO))
        .mockResolvedValueOnce(null);

      const result = await gameService.getPlayerPositions('game-id', ['p1', 'p2']);

      expect(result.size).toBe(1);
      expect(result.has('p2')).toBe(false);
    });

    it('should return empty map for empty player list', async () => {
      const result = await gameService.getPlayerPositions('game-id', []);

      expect(result.size).toBe(0);
    });
  });
});

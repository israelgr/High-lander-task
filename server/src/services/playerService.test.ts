import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import mongoose from 'mongoose';

// Mock modules first
vi.mock('../models/Player.js');

// Import after mocking
import { PlayerModel } from '../models/Player.js';
import * as playerService from './playerService.js';

describe('playerService', () => {
  const mockSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);

    // Setup the PlayerModel mock to return instances with save
    (PlayerModel as unknown as Mock).mockImplementation((data: { username: string }) => ({
      _id: new mongoose.Types.ObjectId(),
      username: data.username,
      avatarUrl: undefined,
      stats: { gamesPlayed: 0, gamesWon: 0, totalDistance: 0, averageTimeToGoal: 0 },
      save: mockSave,
    }));
  });

  describe('createPlayer', () => {
    it('should create a player with the given username', async () => {
      const username = 'newplayer';
      const result = await playerService.createPlayer(username);

      expect(PlayerModel).toHaveBeenCalledWith({ username });
      expect(mockSave).toHaveBeenCalled();
      expect(result.username).toBe(username);
    });

    it('should return player with default stats', async () => {
      const result = await playerService.createPlayer('testuser');

      expect(result.stats).toEqual({
        gamesPlayed: 0,
        gamesWon: 0,
        totalDistance: 0,
        averageTimeToGoal: 0,
      });
    });

    it('should return player with id', async () => {
      const result = await playerService.createPlayer('testuser');

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
    });

    it('should throw error when save fails', async () => {
      mockSave.mockRejectedValueOnce(new Error('Database error'));

      await expect(playerService.createPlayer('testuser')).rejects.toThrow('Database error');
    });
  });

  describe('getPlayerById', () => {
    it('should return player when found', async () => {
      const mockDoc = {
        _id: new mongoose.Types.ObjectId(),
        username: 'existingplayer',
        avatarUrl: undefined,
        stats: { gamesPlayed: 5, gamesWon: 2, totalDistance: 10000, averageTimeToGoal: 180 },
      };

      (PlayerModel.findById as Mock).mockResolvedValue(mockDoc);

      const result = await playerService.getPlayerById(mockDoc._id.toString());

      expect(result).not.toBeNull();
      expect(result?.username).toBe('existingplayer');
      expect(result?.stats.gamesPlayed).toBe(5);
    });

    it('should return null when player not found', async () => {
      (PlayerModel.findById as Mock).mockResolvedValue(null);

      const result = await playerService.getPlayerById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should call findById with correct id', async () => {
      const playerId = new mongoose.Types.ObjectId().toString();
      (PlayerModel.findById as Mock).mockResolvedValue(null);

      await playerService.getPlayerById(playerId);

      expect(PlayerModel.findById).toHaveBeenCalledWith(playerId);
    });
  });

  describe('getPlayerByUsername', () => {
    it('should return player when found by username', async () => {
      const mockDoc = {
        _id: new mongoose.Types.ObjectId(),
        username: 'testuser',
        avatarUrl: undefined,
        stats: { gamesPlayed: 0, gamesWon: 0, totalDistance: 0, averageTimeToGoal: 0 },
      };

      (PlayerModel.findOne as Mock).mockResolvedValue(mockDoc);

      const result = await playerService.getPlayerByUsername('testuser');

      expect(PlayerModel.findOne).toHaveBeenCalledWith({ username: 'testuser' });
      expect(result?.username).toBe('testuser');
    });

    it('should return null when username not found', async () => {
      (PlayerModel.findOne as Mock).mockResolvedValue(null);

      const result = await playerService.getPlayerByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getOrCreatePlayer', () => {
    it('should return existing player if username exists', async () => {
      const existingDoc = {
        _id: new mongoose.Types.ObjectId(),
        username: 'existinguser',
        avatarUrl: undefined,
        stats: { gamesPlayed: 10, gamesWon: 5, totalDistance: 50000, averageTimeToGoal: 200 },
      };

      (PlayerModel.findOne as Mock).mockResolvedValue(existingDoc);

      const result = await playerService.getOrCreatePlayer('existinguser');

      expect(result.stats.gamesPlayed).toBe(10);
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should create new player if username does not exist', async () => {
      (PlayerModel.findOne as Mock).mockResolvedValue(null);

      const result = await playerService.getOrCreatePlayer('newuser');

      expect(PlayerModel).toHaveBeenCalledWith({ username: 'newuser' });
      expect(mockSave).toHaveBeenCalled();
      expect(result.username).toBe('newuser');
    });
  });

  describe('updatePlayerStats', () => {
    it('should increment gamesPlayed on every call', async () => {
      const playerId = new mongoose.Types.ObjectId().toString();
      (PlayerModel.findByIdAndUpdate as Mock).mockResolvedValue({});

      await playerService.updatePlayerStats(playerId, {});

      expect(PlayerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        playerId,
        expect.objectContaining({
          $inc: expect.objectContaining({ 'stats.gamesPlayed': 1 }),
        })
      );
    });

    it('should increment gamesWon when won is true', async () => {
      const playerId = new mongoose.Types.ObjectId().toString();
      (PlayerModel.findByIdAndUpdate as Mock).mockResolvedValue({});

      await playerService.updatePlayerStats(playerId, { won: true });

      expect(PlayerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        playerId,
        expect.objectContaining({
          $inc: expect.objectContaining({
            'stats.gamesPlayed': 1,
            'stats.gamesWon': 1,
          }),
        })
      );
    });

    it('should add distance to totalDistance', async () => {
      const playerId = new mongoose.Types.ObjectId().toString();
      (PlayerModel.findByIdAndUpdate as Mock).mockResolvedValue({});

      await playerService.updatePlayerStats(playerId, { distance: 5000 });

      expect(PlayerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        playerId,
        expect.objectContaining({
          $inc: expect.objectContaining({
            'stats.gamesPlayed': 1,
            'stats.totalDistance': 5000,
          }),
        })
      );
    });

    it('should handle multiple stat updates together', async () => {
      const playerId = new mongoose.Types.ObjectId().toString();
      (PlayerModel.findByIdAndUpdate as Mock).mockResolvedValue({});

      await playerService.updatePlayerStats(playerId, {
        won: true,
        distance: 3000,
        timeToGoal: 120,
      });

      expect(PlayerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        playerId,
        expect.objectContaining({
          $inc: expect.objectContaining({
            'stats.gamesPlayed': 1,
            'stats.gamesWon': 1,
            'stats.totalDistance': 3000,
          }),
        })
      );
    });

    it('should not increment gamesWon when won is false or undefined', async () => {
      const playerId = new mongoose.Types.ObjectId().toString();
      (PlayerModel.findByIdAndUpdate as Mock).mockResolvedValue({});

      await playerService.updatePlayerStats(playerId, { won: false });

      const callArg = (PlayerModel.findByIdAndUpdate as Mock).mock.calls[0][1];
      expect(callArg.$inc['stats.gamesWon']).toBeUndefined();
    });
  });
});

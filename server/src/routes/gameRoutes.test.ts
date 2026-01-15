import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestApp } from '../__tests__/helpers/httpHelper.js';
import { createMockGame } from '../__tests__/fixtures/games.js';
import { SAN_FRANCISCO, TEL_AVIV } from '../__tests__/fixtures/coordinates.js';
import { createMockRouteResponse } from '../__tests__/fixtures/routes.js';

// Mock dependencies
vi.mock('../services/gameService.js');
vi.mock('../services/routingService.js');
vi.mock('../services/authService.js');

import * as gameService from '../services/gameService.js';
import * as routingService from '../services/routingService.js';
import * as authService from '../services/authService.js';
import gameRoutes from './gameRoutes.js';

describe('gameRoutes', () => {
  const app = createTestApp(gameRoutes, '/api/games');
  const testPlayerId = new mongoose.Types.ObjectId().toString();
  const testUserId = new mongoose.Types.ObjectId().toString();
  const validToken = 'valid-test-token';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth service
    (authService.verifyAccessToken as Mock).mockReturnValue({
      userId: testUserId,
      playerId: testPlayerId,
      email: 'test@example.com',
    });
  });

  describe('GET /api/games', () => {
    it('should return list of available games', async () => {
      const mockGames = [
        createMockGame({ code: 'ABC123' }),
        createMockGame({ code: 'DEF456' }),
      ];
      (gameService.getAvailableGames as Mock).mockResolvedValue(mockGames);

      const response = await request(app).get('/api/games');

      expect(response.status).toBe(200);
      expect(response.body.games).toHaveLength(2);
      expect(response.body.games[0].code).toBe('ABC123');
    });

    it('should return empty array when no games available', async () => {
      (gameService.getAvailableGames as Mock).mockResolvedValue([]);

      const response = await request(app).get('/api/games');

      expect(response.status).toBe(200);
      expect(response.body.games).toEqual([]);
    });

    it('should not require authentication', async () => {
      (gameService.getAvailableGames as Mock).mockResolvedValue([]);

      const response = await request(app).get('/api/games');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/games/:gameId', () => {
    const gameId = new mongoose.Types.ObjectId().toString();

    it('should return game when user is participant', async () => {
      const mockGame = createMockGame({
        id: gameId,
        players: [{ id: testPlayerId, username: 'testuser', status: 'waiting', joinedAt: Date.now() }],
      });
      (gameService.getGameById as Mock).mockResolvedValue(mockGame);

      const response = await request(app)
        .get(`/api/games/${gameId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.game.id).toBe(gameId);
    });

    it('should return 403 when user is not participant', async () => {
      const mockGame = createMockGame({
        id: gameId,
        players: [{ id: 'other-player', username: 'other', status: 'waiting', joinedAt: Date.now() }],
      });
      (gameService.getGameById as Mock).mockResolvedValue(mockGame);

      const response = await request(app)
        .get(`/api/games/${gameId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 when game not found', async () => {
      (gameService.getGameById as Mock).mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/games/${gameId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get(`/api/games/${gameId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/games/route', () => {
    it('should return route for valid coordinates', async () => {
      const mockRoute = createMockRouteResponse();
      (routingService.getRoute as Mock).mockResolvedValue(mockRoute);

      const response = await request(app)
        .post('/api/games/route')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ start: SAN_FRANCISCO, end: TEL_AVIV });

      expect(response.status).toBe(200);
      expect(response.body.route).toBeDefined();
      expect(response.body.route.distance).toBeDefined();
      expect(response.body.route.duration).toBeDefined();
    });

    it('should return 400 when start coordinates missing', async () => {
      const response = await request(app)
        .post('/api/games/route')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ end: TEL_AVIV });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 when end coordinates missing', async () => {
      const response = await request(app)
        .post('/api/games/route')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ start: SAN_FRANCISCO });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 when coordinates are incomplete', async () => {
      const response = await request(app)
        .post('/api/games/route')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          start: { latitude: 37.7749 }, // Missing longitude
          end: TEL_AVIV,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/games/route')
        .send({ start: SAN_FRANCISCO, end: TEL_AVIV });

      expect(response.status).toBe(401);
    });

    it('should pass coordinates to routing service', async () => {
      const mockRoute = createMockRouteResponse();
      (routingService.getRoute as Mock).mockResolvedValue(mockRoute);

      await request(app)
        .post('/api/games/route')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ start: SAN_FRANCISCO, end: TEL_AVIV });

      expect(routingService.getRoute).toHaveBeenCalledWith(SAN_FRANCISCO, TEL_AVIV);
    });
  });
});

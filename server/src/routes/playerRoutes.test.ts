import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestApp } from '../__tests__/helpers/httpHelper.js';
import { createMockPlayer, TEST_PLAYERS } from '../__tests__/fixtures/players.js';

// Mock dependencies
vi.mock('../services/playerService.js');
vi.mock('../services/authService.js');

import * as playerService from '../services/playerService.js';
import * as authService from '../services/authService.js';
import playerRoutes from './playerRoutes.js';

describe('playerRoutes', () => {
  const app = createTestApp(playerRoutes, '/api/players');
  const testPlayerId = new mongoose.Types.ObjectId().toString();
  const testUserId = new mongoose.Types.ObjectId().toString();
  const validToken = 'valid-test-token';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth service to verify tokens
    (authService.verifyAccessToken as Mock).mockReturnValue({
      userId: testUserId,
      playerId: testPlayerId,
      email: 'test@example.com',
    });
  });

  describe('POST /api/players', () => {
    it('should return authenticated user player', async () => {
      const mockPlayer = createMockPlayer({ id: testPlayerId });
      (playerService.getPlayerById as Mock).mockResolvedValue(mockPlayer);

      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${validToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.player).toBeDefined();
      expect(response.body.player.id).toBe(testPlayerId);
    });

    it('should return 401 when no token provided', async () => {
      const response = await request(app).post('/api/players').send();

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should return 401 when invalid token provided', async () => {
      (authService.verifyAccessToken as Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/players')
        .set('Authorization', 'Bearer invalid-token')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 404 when player not found', async () => {
      (playerService.getPlayerById as Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${validToken}`)
        .send();

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 500 on service error', async () => {
      (playerService.getPlayerById as Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${validToken}`)
        .send();

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/players/:playerId', () => {
    it('should return player when accessing own player', async () => {
      const mockPlayer = createMockPlayer({ id: testPlayerId });
      (playerService.getPlayerById as Mock).mockResolvedValue(mockPlayer);

      const response = await request(app)
        .get(`/api/players/${testPlayerId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.player).toBeDefined();
      expect(response.body.player.id).toBe(testPlayerId);
    });

    it('should return 403 when accessing another player', async () => {
      const otherPlayerId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/api/players/${otherPlayerId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 when player not found', async () => {
      (playerService.getPlayerById as Mock).mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/players/${testPlayerId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get(`/api/players/${testPlayerId}`);

      expect(response.status).toBe(401);
    });
  });
});

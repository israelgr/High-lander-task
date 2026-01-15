import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '@high-lander/shared';
import { TEL_AVIV } from '../__tests__/fixtures/coordinates.js';

// Mock dependencies
vi.mock('../utils/distance.js');
vi.mock('./routingService.js');

import { generateRandomPointInRadius } from '../utils/distance.js';
import { validatePointIsRoutable } from './routingService.js';
import { generateGoal } from './goalGeneratorService.js';

describe('goalGeneratorService', () => {
  const mockGoalPosition = { latitude: 32.1, longitude: 34.8 };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: generate valid point that is routable
    (generateRandomPointInRadius as Mock).mockReturnValue(mockGoalPosition);
    (validatePointIsRoutable as Mock).mockResolvedValue(true);
  });

  describe('generateGoal', () => {
    it('should generate goal with position within configured radius', async () => {
      const result = await generateGoal(TEL_AVIV, DEFAULT_GAME_CONFIG);

      expect(generateRandomPointInRadius).toHaveBeenCalledWith(
        TEL_AVIV,
        DEFAULT_GAME_CONFIG.goalRadiusMin,
        DEFAULT_GAME_CONFIG.goalRadiusMax
      );
      expect(result.position).toEqual(mockGoalPosition);
    });

    it('should validate goal position is routable', async () => {
      await generateGoal(TEL_AVIV, DEFAULT_GAME_CONFIG);

      expect(validatePointIsRoutable).toHaveBeenCalledWith(mockGoalPosition);
    });

    it('should return goal with generatedAt timestamp', async () => {
      const before = Date.now();
      const result = await generateGoal(TEL_AVIV, DEFAULT_GAME_CONFIG);
      const after = Date.now();

      expect(result.generatedAt).toBeGreaterThanOrEqual(before);
      expect(result.generatedAt).toBeLessThanOrEqual(after);
    });

    it('should include original player position in result', async () => {
      const result = await generateGoal(TEL_AVIV, DEFAULT_GAME_CONFIG);

      expect(result.generatedFromPosition).toEqual(TEL_AVIV);
    });

    it('should retry when first candidate is not routable', async () => {
      const routablePosition = { latitude: 32.2, longitude: 34.9 };

      (generateRandomPointInRadius as Mock)
        .mockReturnValueOnce({ latitude: 32.05, longitude: 34.7 }) // Not routable
        .mockReturnValueOnce(routablePosition); // Routable

      (validatePointIsRoutable as Mock)
        .mockResolvedValueOnce(false) // First candidate not routable
        .mockResolvedValueOnce(true); // Second candidate routable

      const result = await generateGoal(TEL_AVIV, DEFAULT_GAME_CONFIG);

      expect(generateRandomPointInRadius).toHaveBeenCalledTimes(2);
      expect(validatePointIsRoutable).toHaveBeenCalledTimes(2);
      expect(result.position).toEqual(routablePosition);
    });

    it('should use fallback position after max attempts if all fail', async () => {
      const fallbackPosition = { latitude: 32.3, longitude: 35.0 };

      // First 10 calls return unroutable positions
      (validatePointIsRoutable as Mock).mockResolvedValue(false);

      // Setup generateRandomPointInRadius to return fallback on 11th call
      const mockFn = vi.fn();
      for (let i = 0; i < 10; i++) {
        mockFn.mockReturnValueOnce({ latitude: 32.0 + i * 0.01, longitude: 34.7 });
      }
      mockFn.mockReturnValue(fallbackPosition);
      (generateRandomPointInRadius as Mock).mockImplementation(mockFn);

      const result = await generateGoal(TEL_AVIV, DEFAULT_GAME_CONFIG);

      // 10 attempts + 1 fallback = 11 calls
      expect(generateRandomPointInRadius).toHaveBeenCalledTimes(11);
      expect(result.position).toEqual(fallbackPosition);
    });

    it('should succeed on first attempt when point is routable', async () => {
      (validatePointIsRoutable as Mock).mockResolvedValue(true);

      const result = await generateGoal(TEL_AVIV, DEFAULT_GAME_CONFIG);

      expect(generateRandomPointInRadius).toHaveBeenCalledTimes(1);
      expect(validatePointIsRoutable).toHaveBeenCalledTimes(1);
      expect(result.position).toEqual(mockGoalPosition);
    });
  });
});

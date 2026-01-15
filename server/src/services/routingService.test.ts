import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { SAN_FRANCISCO, TEL_AVIV } from '../__tests__/fixtures/coordinates.js';
import { createMockRouteResponse, OSRM_API_RESPONSES } from '../__tests__/fixtures/routes.js';

// Mock redis
vi.mock('../config/redis.js', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
  },
}));

// Mock config
vi.mock('../config/index.js', () => ({
  config: {
    osrm: {
      url: 'http://router.project-osrm.org',
    },
  },
}));

import { redis } from '../config/redis.js';
import { getRoute, validatePointIsRoutable } from './routingService.js';

describe('routingService', () => {
  // Create local fetch mock to avoid conflicts with global setup
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Override global fetch for these tests
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    (redis.get as Mock).mockResolvedValue(null);
    (redis.setex as Mock).mockResolvedValue('OK');
  });

  describe('getRoute', () => {
    it('should return cached route when available', async () => {
      const cachedRoute = createMockRouteResponse();
      (redis.get as Mock).mockResolvedValue(JSON.stringify(cachedRoute));

      const result = await getRoute(SAN_FRANCISCO, TEL_AVIV);

      expect(result).toEqual(cachedRoute);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch from OSRM when not cached', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(OSRM_API_RESPONSES.routeSuccess),
      });

      const result = await getRoute(SAN_FRANCISCO, TEL_AVIV);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('route/v1/foot')
      );
      expect(result.distance).toBeDefined();
      expect(result.duration).toBeDefined();
      expect(result.geometry).toBeDefined();
    });

    it('should cache fetched route', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(OSRM_API_RESPONSES.routeSuccess),
      });

      await getRoute(SAN_FRANCISCO, TEL_AVIV);

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('cache:route:'),
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should throw error when OSRM request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Service Unavailable',
      });

      await expect(getRoute(SAN_FRANCISCO, TEL_AVIV)).rejects.toThrow(
        'OSRM request failed'
      );
    });

    it('should throw error when no route found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(OSRM_API_RESPONSES.noRoute),
      });

      await expect(getRoute(SAN_FRANCISCO, TEL_AVIV)).rejects.toThrow(
        'No route found'
      );
    });

    it('should build correct OSRM URL with coordinates', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(OSRM_API_RESPONSES.routeSuccess),
      });

      await getRoute(SAN_FRANCISCO, TEL_AVIV);

      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).toContain(SAN_FRANCISCO.longitude.toString());
      expect(fetchUrl).toContain(SAN_FRANCISCO.latitude.toString());
      expect(fetchUrl).toContain(TEL_AVIV.longitude.toString());
      expect(fetchUrl).toContain(TEL_AVIV.latitude.toString());
      expect(fetchUrl).toContain('overview=full');
      expect(fetchUrl).toContain('geometries=geojson');
    });
  });

  describe('validatePointIsRoutable', () => {
    it('should return true for routable point', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(OSRM_API_RESPONSES.nearestSuccess),
      });

      const result = await validatePointIsRoutable(SAN_FRANCISCO);

      expect(result).toBe(true);
    });

    it('should return false when OSRM response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      });

      const result = await validatePointIsRoutable(SAN_FRANCISCO);

      expect(result).toBe(false);
    });

    it('should return false when no waypoints found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(OSRM_API_RESPONSES.nearestNotFound),
      });

      const result = await validatePointIsRoutable(SAN_FRANCISCO);

      expect(result).toBe(false);
    });

    it('should return false when OSRM code is not Ok', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ code: 'InvalidQuery', waypoints: null }),
      });

      const result = await validatePointIsRoutable(SAN_FRANCISCO);

      expect(result).toBe(false);
    });

    it('should return false when fetch throws error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await validatePointIsRoutable(SAN_FRANCISCO);

      expect(result).toBe(false);
    });

    it('should call nearest endpoint with correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(OSRM_API_RESPONSES.nearestSuccess),
      });

      await validatePointIsRoutable(SAN_FRANCISCO);

      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).toContain('nearest/v1/foot');
      expect(fetchUrl).toContain(SAN_FRANCISCO.longitude.toString());
      expect(fetchUrl).toContain(SAN_FRANCISCO.latitude.toString());
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach, type SpyInstance } from 'vitest';
import {
  toRadians,
  toDegrees,
  calculateDistance,
  generateRandomPointInRadius,
} from './distance.js';
import {
  SAN_FRANCISCO,
  NEW_YORK,
  SF_NEARBY,
  NORTH_POLE,
  SOUTH_POLE,
  EQUATOR_PRIME_MERIDIAN,
  KNOWN_DISTANCE_PAIRS,
} from '../__tests__/fixtures/coordinates.js';

describe('distance utilities', () => {
  describe('toRadians', () => {
    it('should convert 0 degrees to 0 radians', () => {
      expect(toRadians(0)).toBe(0);
    });

    it('should convert 90 degrees to PI/2 radians', () => {
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 10);
    });

    it('should convert 180 degrees to PI radians', () => {
      expect(toRadians(180)).toBeCloseTo(Math.PI, 10);
    });

    it('should convert 360 degrees to 2*PI radians', () => {
      expect(toRadians(360)).toBeCloseTo(2 * Math.PI, 10);
    });

    it('should handle negative degrees', () => {
      expect(toRadians(-90)).toBeCloseTo(-Math.PI / 2, 10);
    });

    it('should handle fractional degrees', () => {
      expect(toRadians(45.5)).toBeCloseTo(45.5 * (Math.PI / 180), 10);
    });
  });

  describe('toDegrees', () => {
    it('should convert 0 radians to 0 degrees', () => {
      expect(toDegrees(0)).toBe(0);
    });

    it('should convert PI/2 radians to 90 degrees', () => {
      expect(toDegrees(Math.PI / 2)).toBeCloseTo(90, 10);
    });

    it('should convert PI radians to 180 degrees', () => {
      expect(toDegrees(Math.PI)).toBeCloseTo(180, 10);
    });

    it('should convert 2*PI radians to 360 degrees', () => {
      expect(toDegrees(2 * Math.PI)).toBeCloseTo(360, 10);
    });

    it('should handle negative radians', () => {
      expect(toDegrees(-Math.PI / 2)).toBeCloseTo(-90, 10);
    });

    it('should be inverse of toRadians', () => {
      const degrees = 45;
      expect(toDegrees(toRadians(degrees))).toBeCloseTo(degrees, 10);
    });

    it('should handle 1 radian to approximately 57.3 degrees', () => {
      expect(toDegrees(1)).toBeCloseTo(57.2958, 4);
    });
  });

  describe('calculateDistance', () => {
    it('should return 0 for same coordinates', () => {
      expect(calculateDistance(SAN_FRANCISCO, SAN_FRANCISCO)).toBe(0);
    });

    it('should calculate short distance accurately (SF to nearby)', () => {
      const distance = calculateDistance(SAN_FRANCISCO, SF_NEARBY);
      // Should be approximately 14 meters
      expect(distance).toBeGreaterThan(10);
      expect(distance).toBeLessThan(20);
    });

    it('should calculate SF to NY distance correctly (~4,129 km)', () => {
      const distance = calculateDistance(SAN_FRANCISCO, NEW_YORK);
      // Known distance is approximately 4,129 km
      expect(distance).toBeGreaterThan(4_000_000);
      expect(distance).toBeLessThan(4_200_000);
    });

    it('should be symmetric (A to B equals B to A)', () => {
      const d1 = calculateDistance(SAN_FRANCISCO, NEW_YORK);
      const d2 = calculateDistance(NEW_YORK, SAN_FRANCISCO);
      expect(d1).toBeCloseTo(d2, 5);
    });

    it('should handle pole to pole distance (~20,015 km)', () => {
      const distance = calculateDistance(NORTH_POLE, SOUTH_POLE);
      // Half of Earth's circumference, approximately 20,015 km
      expect(distance).toBeGreaterThan(19_000_000);
      expect(distance).toBeLessThan(21_000_000);
    });

    it('should handle crossing the antimeridian', () => {
      const coord1 = { latitude: 0, longitude: 179 };
      const coord2 = { latitude: 0, longitude: -179 };
      const distance = calculateDistance(coord1, coord2);
      // Should be approximately 222 km (2 degrees at equator)
      expect(distance).toBeGreaterThan(200_000);
      expect(distance).toBeLessThan(250_000);
    });

    it.each(KNOWN_DISTANCE_PAIRS)(
      'should calculate distance between known pairs correctly',
      ({ from, to, expectedDistanceMeters, tolerance }) => {
        const distance = calculateDistance(from, to);
        expect(Math.abs(distance - expectedDistanceMeters)).toBeLessThan(tolerance);
      }
    );

    it('should calculate 1 degree at equator correctly (~111 km)', () => {
      const from = EQUATOR_PRIME_MERIDIAN;
      const to = { latitude: 0, longitude: 1 };
      const distance = calculateDistance(from, to);
      // 1 degree at equator is approximately 111.195 km
      expect(distance).toBeGreaterThan(110_000);
      expect(distance).toBeLessThan(112_000);
    });
  });

  describe('generateRandomPointInRadius', () => {
    let randomSpy: SpyInstance<[], number>;

    beforeEach(() => {
      randomSpy = vi.spyOn(Math, 'random');
    });

    afterEach(() => {
      randomSpy.mockRestore();
    });

    it('should generate point within specified radius range', () => {
      const minRadius = 500;
      const maxRadius = 1000;

      // Run multiple times to test randomness
      for (let i = 0; i < 10; i++) {
        const point = generateRandomPointInRadius(SAN_FRANCISCO, minRadius, maxRadius);
        const distance = calculateDistance(SAN_FRANCISCO, point);

        expect(distance).toBeGreaterThanOrEqual(minRadius * 0.99); // 1% tolerance
        expect(distance).toBeLessThanOrEqual(maxRadius * 1.01);
      }
    });

    it('should return valid coordinates', () => {
      const point = generateRandomPointInRadius(SAN_FRANCISCO, 500, 1000);

      expect(point.latitude).toBeGreaterThanOrEqual(-90);
      expect(point.latitude).toBeLessThanOrEqual(90);
      expect(point.longitude).toBeGreaterThanOrEqual(-180);
      expect(point.longitude).toBeLessThanOrEqual(180);
    });

    it('should handle equal min and max radius', () => {
      const radius = 1000;
      const point = generateRandomPointInRadius(SAN_FRANCISCO, radius, radius);
      const distance = calculateDistance(SAN_FRANCISCO, point);

      // Should be very close to the specified radius
      expect(Math.abs(distance - radius)).toBeLessThan(10);
    });

    it('should generate different points on multiple calls', () => {
      const points = Array.from({ length: 5 }, () =>
        generateRandomPointInRadius(SAN_FRANCISCO, 500, 1000)
      );

      const uniquePoints = new Set(points.map(p => `${p.latitude},${p.longitude}`));
      expect(uniquePoints.size).toBeGreaterThan(1);
    });

    it('should produce deterministic output when Math.random is mocked', () => {
      randomSpy
        .mockReturnValueOnce(0.5) // for radius
        .mockReturnValueOnce(0.5); // for bearing

      const point1 = generateRandomPointInRadius(SAN_FRANCISCO, 500, 1000);

      randomSpy
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.5);

      const point2 = generateRandomPointInRadius(SAN_FRANCISCO, 500, 1000);

      expect(point1.latitude).toBeCloseTo(point2.latitude, 5);
      expect(point1.longitude).toBeCloseTo(point2.longitude, 5);
    });

    it('should handle zero minimum radius', () => {
      randomSpy.mockReturnValue(0); // Both random values = 0

      const point = generateRandomPointInRadius(SAN_FRANCISCO, 0, 1000);
      const distance = calculateDistance(SAN_FRANCISCO, point);

      expect(distance).toBeCloseTo(0, -1);
    });

    it('should handle locations near poles', () => {
      const nearPole = { latitude: 89.9, longitude: 0 };
      const point = generateRandomPointInRadius(nearPole, 100, 200);

      expect(point.latitude).toBeGreaterThanOrEqual(-90);
      expect(point.latitude).toBeLessThanOrEqual(90);
    });

    it('should handle large radius values', () => {
      const point = generateRandomPointInRadius(SAN_FRANCISCO, 50000, 100000);
      const distance = calculateDistance(SAN_FRANCISCO, point);

      expect(distance).toBeGreaterThanOrEqual(50000 * 0.99);
      expect(distance).toBeLessThanOrEqual(100000 * 1.01);
    });
  });
});

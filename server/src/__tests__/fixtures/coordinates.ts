import { Coordinates } from '@high-lander/shared';

// Major city coordinates for testing
export const SAN_FRANCISCO: Coordinates = {
  latitude: 37.7749,
  longitude: -122.4194,
};

export const NEW_YORK: Coordinates = {
  latitude: 40.7128,
  longitude: -74.0060,
};

export const TEL_AVIV: Coordinates = {
  latitude: 32.0853,
  longitude: 34.7818,
};

// Short distance coordinates (within same area)
export const SF_NEARBY: Coordinates = {
  latitude: 37.7750,
  longitude: -122.4195,
};

// Edge case coordinates
export const NORTH_POLE: Coordinates = {
  latitude: 90,
  longitude: 0,
};

export const SOUTH_POLE: Coordinates = {
  latitude: -90,
  longitude: 0,
};

export const EQUATOR_PRIME_MERIDIAN: Coordinates = {
  latitude: 0,
  longitude: 0,
};

export const EQUATOR_DATELINE: Coordinates = {
  latitude: 0,
  longitude: 180,
};

// Known distance pairs for testing Haversine formula
export const KNOWN_DISTANCE_PAIRS = [
  {
    from: { latitude: 0, longitude: 0 },
    to: { latitude: 0, longitude: 1 },
    expectedDistanceMeters: 111195, // ~111km at equator for 1 degree
    tolerance: 200,
  },
  {
    from: SAN_FRANCISCO,
    to: NEW_YORK,
    expectedDistanceMeters: 4129000, // ~4,129 km
    tolerance: 10000,
  },
  {
    from: SAN_FRANCISCO,
    to: SF_NEARBY,
    expectedDistanceMeters: 14, // ~14 meters
    tolerance: 5,
  },
];

// Generate random coordinates in a bounding box
export function generateRandomCoordinate(
  minLat = -90,
  maxLat = 90,
  minLng = -180,
  maxLng = 180
): Coordinates {
  return {
    latitude: minLat + Math.random() * (maxLat - minLat),
    longitude: minLng + Math.random() * (maxLng - minLng),
  };
}

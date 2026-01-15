import { RouteResponse } from '@high-lander/shared';

// Create mock route response
export function createMockRouteResponse(
  overrides: Partial<RouteResponse> = {}
): RouteResponse {
  return {
    distance: 1500,
    duration: 900,
    geometry: {
      type: 'LineString',
      coordinates: [
        [34.7818, 32.0853],
        [34.7850, 32.0870],
        [34.7900, 32.1000],
      ],
    },
    ...overrides,
  };
}

// Pre-defined route responses
export const ROUTE_RESPONSES = {
  shortRoute: createMockRouteResponse({ distance: 500, duration: 300 }),
  mediumRoute: createMockRouteResponse({ distance: 1500, duration: 900 }),
  longRoute: createMockRouteResponse({ distance: 5000, duration: 3000 }),
};

// Mock OSRM API responses
export const OSRM_API_RESPONSES = {
  routeSuccess: {
    code: 'Ok',
    routes: [{
      distance: 1500,
      duration: 900,
      geometry: {
        type: 'LineString',
        coordinates: [[34.7818, 32.0853], [34.7900, 32.1000]],
      },
    }],
  },

  noRoute: {
    code: 'NoRoute',
    routes: [],
  },

  nearestSuccess: {
    code: 'Ok',
    waypoints: [{ distance: 10, location: [34.7818, 32.0853] }],
  },

  nearestNotFound: {
    code: 'Ok',
    waypoints: [],
  },
};

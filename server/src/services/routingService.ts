import { Coordinates, RouteResponse, GAME_CONSTANTS } from '@high-lander/shared';
import { config } from '../config/index.js';
import { redis } from '../config/redis.js';
import crypto from 'crypto';

function generateCacheKey(start: Coordinates, end: Coordinates): string {
  const data = `${start.latitude.toFixed(5)},${start.longitude.toFixed(5)}-${end.latitude.toFixed(5)},${end.longitude.toFixed(5)}`;
  return `cache:route:${crypto.createHash('md5').update(data).digest('hex')}`;
}

export async function getRoute(start: Coordinates, end: Coordinates): Promise<RouteResponse> {
  const cacheKey = generateCacheKey(start, end);

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const url = `${config.osrm.url}/route/v1/foot/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OSRM request failed: ${response.statusText}`);
  }

  const data = await response.json() as {
    code: string;
    routes?: Array<{
      distance: number;
      duration: number;
      geometry: { type: 'LineString'; coordinates: [number, number][] };
    }>;
  };

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No route found');
  }

  const route = data.routes[0];
  const result: RouteResponse = {
    distance: route.distance,
    duration: route.duration,
    geometry: route.geometry,
  };

  await redis.setex(cacheKey, GAME_CONSTANTS.ROUTE_CACHE_TTL_SECONDS, JSON.stringify(result));

  return result;
}

export async function validatePointIsRoutable(point: Coordinates): Promise<boolean> {
  try {
    const url = `${config.osrm.url}/nearest/v1/foot/${point.longitude},${point.latitude}`;
    const response = await fetch(url);

    if (!response.ok) {
      return false;
    }

    const data = await response.json() as { code: string; waypoints?: unknown[] };
    return data.code === 'Ok' && !!data.waypoints && data.waypoints.length > 0;
  } catch {
    return false;
  }
}

import {
  Game,
  Player,
  PlayerStats,
  RouteResponse,
  Coordinates,
  DistanceConfig,
  SystemConfig,
} from '@high-lander/shared';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Request failed');
  }

  return response.json();
}

export async function getAvailableGames(): Promise<Game[]> {
  const data = await fetchJson<{ games: Game[] }>('/games');
  return data.games;
}

export async function getGame(gameId: string): Promise<Game> {
  const data = await fetchJson<{ game: Game }>(`/games/${gameId}`);
  return data.game;
}

export async function createOrGetPlayer(username: string): Promise<Player & { stats: PlayerStats }> {
  const data = await fetchJson<{ player: Player & { stats: PlayerStats } }>('/players', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  return data.player;
}

export async function getRoute(start: Coordinates, end: Coordinates): Promise<RouteResponse> {
  const token = localStorage.getItem('accessToken');
  const data = await fetchJson<{ route: RouteResponse }>('/games/route', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ start, end }),
  });
  return data.route;
}

export async function getConfig(): Promise<{ distance: DistanceConfig }> {
  return fetchJson<{ distance: DistanceConfig }>('/config');
}

export async function getAdminConfig(): Promise<{ config: SystemConfig }> {
  const token = localStorage.getItem('accessToken');
  return fetchJson<{ config: SystemConfig }>('/admin/config', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function updateAdminConfig(
  updates: { distance: Partial<DistanceConfig> }
): Promise<{ config: SystemConfig }> {
  const token = localStorage.getItem('accessToken');
  return fetchJson<{ config: SystemConfig }>('/admin/config/distance', {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(updates),
  });
}

export async function refreshAuthTokens(refreshToken: string): Promise<{ tokens: { accessToken: string; refreshToken: string } }> {
  return fetchJson<{ tokens: { accessToken: string; refreshToken: string } }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function registerUser(email: string, password: string, username: string): Promise<{
  user: { id: string; email: string; playerId: string };
  tokens: { accessToken: string; refreshToken: string };
}> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new AuthError(
      error.error?.message || 'Registration failed',
      response.status,
      error.error?.code
    );
  }

  return response.json();
}

export async function loginUser(email: string, password: string): Promise<{
  user: { id: string; email: string; playerId: string };
  tokens: { accessToken: string; refreshToken: string };
}> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new AuthError(
      error.error?.message || 'Login failed',
      response.status,
      error.error?.code
    );
  }

  return response.json();
}

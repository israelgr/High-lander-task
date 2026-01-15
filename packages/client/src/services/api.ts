import { Game, Player, PlayerStats, RouteResponse, Coordinates } from '@high-lander/shared';

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
  const data = await fetchJson<{ route: RouteResponse }>('/games/route', {
    method: 'POST',
    body: JSON.stringify({ start, end }),
  });
  return data.route;
}

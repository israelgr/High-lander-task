import { Coordinates } from './coordinates.js';
import { PlayerInGame } from './player.js';

export type GameStatus = 'waiting' | 'starting' | 'active' | 'finished' | 'cancelled';

export interface GameConfig {
  maxPlayers: number;
  goalRadiusMin: number;
  goalRadiusMax: number;
  proximityThreshold: number;
  timeLimit?: number;
}

export interface Goal {
  position: Coordinates;
  generatedAt: number;
  generatedFromPosition: Coordinates;
}

export interface Game {
  id: string;
  code: string;
  hostPlayerId: string;
  status: GameStatus;
  config: GameConfig;
  goal?: Goal;
  players: PlayerInGame[];
  winnerId?: string;
  startedAt?: number;
  finishedAt?: number;
  createdAt: number;
}

export interface GameResult {
  gameId: string;
  rankings: Array<{
    playerId: string;
    playerName: string;
    rank: number;
    finishTime: number;
    distanceTraveled: number;
  }>;
  stats: {
    totalPlayers: number;
    finishedPlayers: number;
    gameDuration: number;
    shortestPathDistance: number;
  };
}

export interface RouteResponse {
  distance: number;
  duration: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxPlayers: 10,
  goalRadiusMin: 1000,
  goalRadiusMax: 2000,
  proximityThreshold: 30,
};

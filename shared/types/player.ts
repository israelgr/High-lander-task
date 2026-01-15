import { Position } from './coordinates.js';

export type PlayerStatus = 'waiting' | 'playing' | 'finished' | 'disconnected';

export interface Player {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface PlayerInGame extends Player {
  status: PlayerStatus;
  joinedAt: number;
  currentPosition?: Position;
  distanceToGoal?: number;
  finishedAt?: number;
  rank?: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalDistance: number;
  averageTimeToGoal: number;
}

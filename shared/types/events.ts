import { Coordinates, Position } from './coordinates.js';
import { Game, GameConfig, GameResult, RouteResponse } from './game.js';
import { PlayerInGame } from './player.js';
import { DistanceConfig } from './config.js';

// Client -> Server Events
export interface ClientToServerEvents {
  // Authentication
  'player:authenticate': (data: { playerId: string; username: string }) => void;

  // Game Lifecycle
  'game:create': (data: { config?: Partial<GameConfig> }) => void;
  'game:join': (data: { gameCode: string }) => void;
  'game:rejoin': (data: { gameCode: string }) => void;
  'game:leave': () => void;
  'game:start': () => void;

  // Location Updates
  'location:update': (data: {
    position: Position;
  }) => void;

  // Goal Detection
  'goal:reached': (data: {
    position: Position;
  }) => void;
}

// Server -> Client Events
export interface ServerToClientEvents {
  // Connection
  'connection:authenticated': (data: { playerId: string }) => void;
  'connection:error': (data: { code: string; message: string }) => void;

  // Game Lifecycle
  'game:created': (data: { game: Game }) => void;
  'game:joined': (data: { game: Game }) => void;
  'game:player_joined': (data: { player: PlayerInGame }) => void;
  'game:player_left': (data: { playerId: string }) => void;
  'game:countdown': (data: { seconds: number }) => void;
  'game:started': (data: { game: Game }) => void;
  'game:finished': (data: { result: GameResult }) => void;

  // Real-time Updates
  'players:positions': (
    data: Array<{
      playerId: string;
      position: Coordinates;
      distanceToGoal: number;
    }>
  ) => void;

  // Goal Events
  'player:reached_goal': (data: {
    playerId: string;
    playerName: string;
    finishTime: number;
    rank: number;
  }) => void;
  'game:winner': (data: {
    winnerId: string;
    winnerName: string;
    finishTime: number;
  }) => void;

  // Route Updates
  'route:updated': (data: { route: RouteResponse }) => void;

  // Errors
  error: (data: { code: string; message: string }) => void;

  // Configuration
  'config:updated': (data: { config: DistanceConfig }) => void;
}

// Inter-server Events (for scaling)
export interface InterServerEvents {
  ping: () => void;
}

// Socket Data (stored on socket instance)
export interface SocketData {
  userId?: string;
  playerId: string;
  username: string;
  gameId?: string;
}

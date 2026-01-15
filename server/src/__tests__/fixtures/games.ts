import { Game, GameConfig, DEFAULT_GAME_CONFIG, Goal } from '@high-lander/shared';
import { TEL_AVIV } from './coordinates.js';
import { createMockPlayerInGame } from './players.js';

// Create mock game with optional overrides
export function createMockGame(overrides: Partial<Game> = {}): Game {
  const hostId = overrides.hostPlayerId || `host-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id: `game-${Math.random().toString(36).slice(2, 9)}`,
    code: 'ABC123',
    hostPlayerId: hostId,
    status: 'waiting',
    config: { ...DEFAULT_GAME_CONFIG },
    players: [createMockPlayerInGame({ id: hostId, username: 'host' })],
    createdAt: Date.now(),
    ...overrides,
  };
}

// Create mock goal
export function createMockGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    position: { latitude: 32.1000, longitude: 34.7900 },
    generatedAt: Date.now(),
    generatedFromPosition: TEL_AVIV,
    ...overrides,
  };
}

// Create mock game config
export function createMockGameConfig(
  overrides: Partial<GameConfig> = {}
): GameConfig {
  return {
    ...DEFAULT_GAME_CONFIG,
    ...overrides,
  };
}

// Pre-defined game states
export const GAME_STATES = {
  waiting: createMockGame({ status: 'waiting' }),

  activeWithGoal: createMockGame({
    status: 'active',
    goal: createMockGoal(),
    startedAt: Date.now() - 60000,
  }),

  finished: createMockGame({
    status: 'finished',
    goal: createMockGoal(),
    startedAt: Date.now() - 300000,
    finishedAt: Date.now(),
    winnerId: 'winner-id',
  }),

  fullGame: createMockGame({
    config: { ...DEFAULT_GAME_CONFIG, maxPlayers: 2 },
    players: [
      createMockPlayerInGame({ username: 'player1' }),
      createMockPlayerInGame({ username: 'player2' }),
    ],
  }),
};

// Invalid game configurations for testing
export const INVALID_GAME_CONFIGS = {
  zeroMaxPlayers: { maxPlayers: 0 },
  negativeRadius: { goalRadiusMin: -100 },
  invertedRadius: { goalRadiusMin: 2000, goalRadiusMax: 1000 },
};

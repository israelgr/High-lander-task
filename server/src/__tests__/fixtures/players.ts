import { Player, PlayerStats, PlayerInGame } from '@high-lander/shared';

// Create mock player with optional overrides
export function createMockPlayer(
  overrides: Partial<Player & { stats: PlayerStats }> = {}
): Player & { stats: PlayerStats } {
  return {
    id: `player-${Math.random().toString(36).slice(2, 9)}`,
    username: 'testplayer',
    avatarUrl: undefined,
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      totalDistance: 0,
      averageTimeToGoal: 0,
    },
    ...overrides,
  };
}

// Create mock player in game
export function createMockPlayerInGame(
  overrides: Partial<PlayerInGame> = {}
): PlayerInGame {
  return {
    id: `player-${Math.random().toString(36).slice(2, 9)}`,
    username: 'testplayer',
    status: 'waiting',
    joinedAt: Date.now(),
    ...overrides,
  };
}

// Pre-defined test players
export const TEST_PLAYERS = {
  host: createMockPlayer({ id: 'host-player-id', username: 'host_player' }),
  player1: createMockPlayer({ id: 'player-1-id', username: 'player_one' }),
  player2: createMockPlayer({ id: 'player-2-id', username: 'player_two' }),
  veteranPlayer: createMockPlayer({
    id: 'veteran-id',
    username: 'veteran',
    stats: {
      gamesPlayed: 100,
      gamesWon: 50,
      totalDistance: 500000,
      averageTimeToGoal: 300,
    },
  }),
};

// Invalid player data for validation tests
export const INVALID_PLAYER_DATA = {
  emptyUsername: { username: '' },
  shortUsername: { username: 'a' },
  longUsername: { username: 'a'.repeat(21) },
  whitespaceUsername: { username: '   ' },
};

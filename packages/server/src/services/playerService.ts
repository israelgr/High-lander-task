import { Player, PlayerStats } from '@high-lander/shared';
import { PlayerModel, PlayerDocument } from '../models/Player.js';

function documentToPlayer(doc: PlayerDocument): Player & { stats: PlayerStats } {
  return {
    id: doc._id.toString(),
    username: doc.username,
    avatarUrl: doc.avatarUrl,
    stats: doc.stats,
  };
}

export async function createPlayer(username: string): Promise<Player & { stats: PlayerStats }> {
  const player = new PlayerModel({ username });
  await player.save();
  return documentToPlayer(player);
}

export async function getPlayerById(
  playerId: string
): Promise<(Player & { stats: PlayerStats }) | null> {
  const doc = await PlayerModel.findById(playerId);
  return doc ? documentToPlayer(doc) : null;
}

export async function getPlayerByUsername(
  username: string
): Promise<(Player & { stats: PlayerStats }) | null> {
  const doc = await PlayerModel.findOne({ username });
  return doc ? documentToPlayer(doc) : null;
}

export async function getOrCreatePlayer(
  username: string
): Promise<Player & { stats: PlayerStats }> {
  let player = await getPlayerByUsername(username);
  if (!player) {
    player = await createPlayer(username);
  }
  return player;
}

export async function updatePlayerStats(
  playerId: string,
  updates: { won?: boolean; distance?: number; timeToGoal?: number }
): Promise<void> {
  const updateQuery: Record<string, unknown> = {
    $inc: { 'stats.gamesPlayed': 1 },
  };

  if (updates.won) {
    updateQuery.$inc = { ...updateQuery.$inc as object, 'stats.gamesWon': 1 };
  }

  if (updates.distance) {
    updateQuery.$inc = { ...updateQuery.$inc as object, 'stats.totalDistance': updates.distance };
  }

  await PlayerModel.findByIdAndUpdate(playerId, updateQuery);
}

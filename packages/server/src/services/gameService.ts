import {
  Game,
  GameConfig,
  DEFAULT_GAME_CONFIG,
  Coordinates,
  PlayerInGame,
} from '@high-lander/shared';
import { GameModel, GameDocument } from '../models/Game.js';
import { generateGameCode } from '../utils/gameCode.js';
import { generateGoal } from './goalGeneratorService.js';
import { redis } from '../config/redis.js';

function documentToGame(doc: GameDocument): Game {
  return {
    id: doc._id.toString(),
    code: doc.code,
    hostPlayerId: doc.hostPlayerId,
    status: doc.status,
    config: doc.config,
    goal: doc.goal,
    players: doc.players.map(p => ({
      id: p.playerId,
      username: p.username,
      status: p.status,
      joinedAt: p.joinedAt.getTime(),
      finishedAt: p.finishedAt?.getTime(),
      rank: p.rank,
    })),
    winnerId: doc.winnerId,
    startedAt: doc.startedAt?.getTime(),
    finishedAt: doc.finishedAt?.getTime(),
    createdAt: doc.createdAt.getTime(),
  };
}

export async function createGame(
  hostPlayerId: string,
  hostUsername: string,
  partialConfig?: Partial<GameConfig>
): Promise<Game> {
  const config = { ...DEFAULT_GAME_CONFIG, ...partialConfig };
  const code = generateGameCode();

  const game = new GameModel({
    code,
    hostPlayerId,
    status: 'waiting',
    config,
    players: [
      {
        playerId: hostPlayerId,
        username: hostUsername,
        status: 'waiting',
        joinedAt: new Date(),
      },
    ],
  });

  await game.save();
  return documentToGame(game);
}

export async function getGameByCode(code: string): Promise<Game | null> {
  const doc = await GameModel.findOne({ code: code.toUpperCase() });
  return doc ? documentToGame(doc) : null;
}

export async function getGameById(gameId: string): Promise<Game | null> {
  const doc = await GameModel.findById(gameId);
  return doc ? documentToGame(doc) : null;
}

export async function getAvailableGames(): Promise<Game[]> {
  const docs = await GameModel.find({ status: 'waiting' })
    .sort({ createdAt: -1 })
    .limit(20);
  return docs.map(documentToGame);
}

export async function joinGame(
  gameId: string,
  playerId: string,
  username: string
): Promise<Game | null> {
  const doc = await GameModel.findOneAndUpdate(
    {
      _id: gameId,
      status: 'waiting',
      'players.playerId': { $ne: playerId },
      $expr: { $lt: [{ $size: '$players' }, '$config.maxPlayers'] },
    },
    {
      $push: {
        players: {
          playerId,
          username,
          status: 'waiting',
          joinedAt: new Date(),
        },
      },
    },
    { new: true }
  );

  return doc ? documentToGame(doc) : null;
}

export async function leaveGame(gameId: string, playerId: string): Promise<Game | null> {
  const doc = await GameModel.findOneAndUpdate(
    { _id: gameId },
    { $pull: { players: { playerId } } },
    { new: true }
  );

  return doc ? documentToGame(doc) : null;
}

export async function setPlayerReady(gameId: string, playerId: string): Promise<Game | null> {
  const doc = await GameModel.findOneAndUpdate(
    { _id: gameId, 'players.playerId': playerId },
    { $set: { 'players.$.status': 'ready' } },
    { new: true }
  );

  return doc ? documentToGame(doc) : null;
}

export async function startGame(
  gameId: string,
  hostPosition: Coordinates
): Promise<Game | null> {
  const gameDoc = await GameModel.findById(gameId);

  if (!gameDoc || gameDoc.status !== 'waiting') {
    return null;
  }

  const goal = await generateGoal(hostPosition, gameDoc.config);

  gameDoc.status = 'active';
  gameDoc.goal = goal;
  gameDoc.startedAt = new Date();
  gameDoc.players.forEach(p => {
    p.status = 'playing';
  });

  await gameDoc.save();

  await redis.hset(`game:${gameId}:state`, {
    status: 'active',
    startedAt: gameDoc.startedAt.getTime().toString(),
    goal: JSON.stringify(goal),
  });

  return documentToGame(gameDoc);
}

export async function playerReachedGoal(
  gameId: string,
  playerId: string
): Promise<{ game: Game; rank: number } | null> {
  const gameDoc = await GameModel.findById(gameId);

  if (!gameDoc || gameDoc.status !== 'active') {
    return null;
  }

  const finishedCount = gameDoc.players.filter(p => p.status === 'finished').length;
  const rank = finishedCount + 1;
  const isWinner = rank === 1;

  const playerIndex = gameDoc.players.findIndex(p => p.playerId === playerId);
  if (playerIndex === -1) {
    return null;
  }

  gameDoc.players[playerIndex]!.status = 'finished';
  gameDoc.players[playerIndex]!.finishedAt = new Date();
  gameDoc.players[playerIndex]!.rank = rank;

  if (isWinner) {
    gameDoc.winnerId = playerId;
  }

  const allFinished = gameDoc.players.every(
    p => p.status === 'finished' || p.status === 'disconnected'
  );

  if (allFinished) {
    gameDoc.status = 'finished';
    gameDoc.finishedAt = new Date();
  }

  await gameDoc.save();
  return { game: documentToGame(gameDoc), rank };
}

export async function updatePlayerPosition(
  gameId: string,
  playerId: string,
  position: Coordinates
): Promise<void> {
  await redis.geoadd(
    `game:${gameId}:locations`,
    position.longitude,
    position.latitude,
    playerId
  );

  await redis.hset(`game:${gameId}:player:${playerId}`, {
    currentPosition: JSON.stringify(position),
    lastUpdate: Date.now().toString(),
  });
}

export async function getPlayerPositions(
  gameId: string,
  playerIds: string[]
): Promise<Map<string, Coordinates>> {
  const positions = new Map<string, Coordinates>();

  for (const playerId of playerIds) {
    const data = await redis.hget(`game:${gameId}:player:${playerId}`, 'currentPosition');
    if (data) {
      positions.set(playerId, JSON.parse(data));
    }
  }

  return positions;
}

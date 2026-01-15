import { Socket, Server } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  GAME_CONSTANTS,
} from '@high-lander/shared';
import * as gameService from '../../services/gameService.js';
import { redis } from '../../config/redis.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function setupGameHandler(socket: GameSocket, io: GameServer): void {
  socket.on('game:create', async ({ config }) => {
    const { playerId, username } = socket.data;

    if (!playerId || !username) {
      socket.emit('error', { code: 'NOT_AUTHENTICATED', message: 'Please authenticate first' });
      return;
    }

    try {
      const game = await gameService.createGame(playerId, username, config);

      socket.data.gameId = game.id;
      await socket.join(`game:${game.id}`);

      await redis.set(`socket:${socket.id}:game`, game.id);
      await redis.hset(`game:${game.id}:player:${playerId}`, 'socketId', socket.id);

      socket.emit('game:created', { game });
      console.log(`Game created: ${game.code} by ${username}`);
    } catch (error) {
      console.error('Create game error:', error);
      socket.emit('error', { code: 'CREATE_FAILED', message: 'Failed to create game' });
    }
  });

  socket.on('game:join', async ({ gameCode }) => {
    const { playerId, username } = socket.data;

    if (!playerId || !username) {
      socket.emit('error', { code: 'NOT_AUTHENTICATED', message: 'Please authenticate first' });
      return;
    }

    try {
      const existingGame = await gameService.getGameByCode(gameCode);

      if (!existingGame) {
        socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Game not found' });
        return;
      }

      const game = await gameService.joinGame(existingGame.id, playerId, username);

      if (!game) {
        socket.emit('error', { code: 'JOIN_FAILED', message: 'Cannot join this game' });
        return;
      }

      socket.data.gameId = game.id;
      await socket.join(`game:${game.id}`);

      await redis.set(`socket:${socket.id}:game`, game.id);
      await redis.hset(`game:${game.id}:player:${playerId}`, 'socketId', socket.id);

      socket.emit('game:joined', { game });

      const player = game.players.find(p => p.id === playerId);
      if (player) {
        socket.to(`game:${game.id}`).emit('game:player_joined', { player });
      }

      console.log(`${username} joined game ${game.code}`);
    } catch (error) {
      console.error('Join game error:', error);
      socket.emit('error', { code: 'JOIN_FAILED', message: 'Failed to join game' });
    }
  });

  // Rejoin an existing game the player is already in (works for active games)
  socket.on('game:rejoin', async ({ gameCode }) => {
    const { playerId, username } = socket.data;

    if (!playerId || !username) {
      socket.emit('error', { code: 'NOT_AUTHENTICATED', message: 'Please authenticate first' });
      return;
    }

    try {
      const game = await gameService.getGameByCode(gameCode);

      if (!game) {
        socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Game not found' });
        return;
      }

      // Check if player is in the game
      const isPlayerInGame = game.players.some(p => p.id === playerId);
      if (!isPlayerInGame) {
        socket.emit('error', { code: 'NOT_IN_GAME', message: 'You are not in this game' });
        return;
      }

      socket.data.gameId = game.id;
      await socket.join(`game:${game.id}`);

      await redis.set(`socket:${socket.id}:game`, game.id);
      await redis.hset(`game:${game.id}:player:${playerId}`, 'socketId', socket.id);

      // Emit joined event (works for both waiting and active games)
      socket.emit('game:joined', { game });

      console.log(`${username} rejoined game ${game.code} (status: ${game.status})`);
    } catch (error) {
      console.error('Rejoin game error:', error);
      socket.emit('error', { code: 'REJOIN_FAILED', message: 'Failed to rejoin game' });
    }
  });

  socket.on('game:leave', async () => {
    const { playerId, gameId } = socket.data;

    if (!playerId || !gameId) {
      return;
    }

    try {
      await gameService.leaveGame(gameId, playerId);
      await socket.leave(`game:${gameId}`);

      await redis.del(`socket:${socket.id}:game`);
      await redis.del(`game:${gameId}:player:${playerId}`);

      socket.to(`game:${gameId}`).emit('game:player_left', { playerId });
      socket.data.gameId = undefined;

      console.log(`Player ${playerId} left game ${gameId}`);
    } catch (error) {
      console.error('Leave game error:', error);
    }
  });

  socket.on('game:start', async () => {
    const { playerId, gameId } = socket.data;

    if (!playerId || !gameId) {
      return;
    }

    try {
      const existingGame = await gameService.getGameById(gameId);

      if (!existingGame || existingGame.hostPlayerId !== playerId) {
        socket.emit('error', { code: 'NOT_HOST', message: 'Only the host can start the game' });
        return;
      }

      const playerData = await redis.hget(`game:${gameId}:player:${playerId}`, 'currentPosition');

      // Default mock position (Tel Aviv) for testing when no real location is available
      const DEFAULT_MOCK_POSITION = { latitude: 32.0853, longitude: 34.7818 };
      const hostPosition = playerData ? JSON.parse(playerData) : DEFAULT_MOCK_POSITION;

      for (let i = GAME_CONSTANTS.COUNTDOWN_SECONDS; i > 0; i--) {
        io.to(`game:${gameId}`).emit('game:countdown', { seconds: i });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const game = await gameService.startGame(gameId, hostPosition);

      if (game) {
        io.to(`game:${gameId}`).emit('game:started', { game });
        console.log(`Game ${game.code} started`);
      }
    } catch (error) {
      console.error('Start game error:', error);
      socket.emit('error', { code: 'START_FAILED', message: 'Failed to start game' });
    }
  });
}

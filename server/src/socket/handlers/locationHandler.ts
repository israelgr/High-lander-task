import { Socket, Server } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  Coordinates,
} from '@high-lander/shared';
import * as gameService from '../../services/gameService.js';
import { calculateDistance } from '../../utils/distance.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function setupLocationHandler(socket: GameSocket, io: GameServer): void {
  socket.on('location:update', async ({ position }) => {
    const { playerId, gameId } = socket.data;

    if (!playerId || !gameId) {
      return;
    }

    try {
      await gameService.updatePlayerPosition(gameId, playerId, {
        latitude: position.latitude,
        longitude: position.longitude,
      });

      const game = await gameService.getGameById(gameId);

      if (!game || game.status !== 'active') {
        return;
      }

      const playerIds = game.players
        .filter(p => p.status === 'playing')
        .map(p => p.id);

      const positions = await gameService.getPlayerPositions(gameId, playerIds);

      const playersData = playerIds
        .filter(id => positions.has(id))
        .map(id => {
          const pos = positions.get(id)!;
          const distanceToGoal = game.goal
            ? calculateDistance(pos, game.goal.position)
            : 0;

          return {
            playerId: id,
            position: pos,
            distanceToGoal,
          };
        });

      io.to(`game:${gameId}`).emit('players:positions', playersData);
    } catch (error) {
      console.error('Location update error:', error);
    }
  });

  socket.on('goal:reached', async ({ position }) => {
    const { playerId, username, gameId } = socket.data;

    if (!playerId || !gameId || !username) {
      return;
    }

    try {
      const game = await gameService.getGameById(gameId);

      if (!game || game.status !== 'active' || !game.goal) {
        return;
      }

      const distance = calculateDistance(
        { latitude: position.latitude, longitude: position.longitude },
        game.goal.position
      );

      if (distance > game.config.proximityThreshold) {
        socket.emit('error', {
          code: 'NOT_AT_GOAL',
          message: `You are ${Math.round(distance)}m away from the goal`,
        });
        return;
      }

      const result = await gameService.playerReachedGoal(gameId, playerId);

      if (!result) {
        return;
      }

      const { game: updatedGame, rank } = result;
      const finishTime = updatedGame.startedAt
        ? (Date.now() - updatedGame.startedAt) / 1000
        : 0;

      io.to(`game:${gameId}`).emit('player:reached_goal', {
        playerId,
        playerName: username,
        finishTime,
        rank,
      });

      if (rank === 1) {
        io.to(`game:${gameId}`).emit('game:winner', {
          winnerId: playerId,
          winnerName: username,
          finishTime,
        });
      }

      if (updatedGame.status === 'finished') {
        const rankings = updatedGame.players
          .filter(p => p.rank !== undefined)
          .sort((a, b) => (a.rank || 999) - (b.rank || 999))
          .map(p => ({
            playerId: p.id,
            playerName: p.username,
            rank: p.rank!,
            finishTime: p.finishedAt && updatedGame.startedAt
              ? (p.finishedAt - updatedGame.startedAt) / 1000
              : 0,
            distanceTraveled: 0,
          }));

        io.to(`game:${gameId}`).emit('game:finished', {
          result: {
            gameId,
            rankings,
            stats: {
              totalPlayers: updatedGame.players.length,
              finishedPlayers: rankings.length,
              gameDuration: updatedGame.finishedAt && updatedGame.startedAt
                ? (updatedGame.finishedAt - updatedGame.startedAt) / 1000
                : 0,
              shortestPathDistance: 0,
            },
          },
        });
      }

      console.log(`${username} reached goal (rank: ${rank})`);
    } catch (error) {
      console.error('Goal reached error:', error);
    }
  });
}

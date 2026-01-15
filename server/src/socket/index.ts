import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@high-lander/shared';
import { config } from '../config/index.js';
import { setupConnectionHandler } from './handlers/connectionHandler.js';
import { setupGameHandler } from './handlers/gameHandler.js';
import { setupLocationHandler } from './handlers/locationHandler.js';
import * as authService from '../services/authService.js';
import * as configService from '../services/configService.js';

export function setupSocket(httpServer: HttpServer) {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = authService.verifyAccessToken(token);

      socket.data.userId = payload.userId;
      socket.data.playerId = payload.playerId;

      next();
    } catch {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.data.userId})`);

    setupConnectionHandler(socket);
    setupGameHandler(socket, io);
    setupLocationHandler(socket, io);
  });

  configService.subscribeToConfigUpdates((systemConfig) => {
    io.emit('config:updated', { config: systemConfig.distance });
  });

  return io;
}

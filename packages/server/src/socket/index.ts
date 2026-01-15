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

  io.on('connection', socket => {
    console.log(`Socket connected: ${socket.id}`);

    setupConnectionHandler(socket);
    setupGameHandler(socket, io);
    setupLocationHandler(socket, io);
  });

  return io;
}

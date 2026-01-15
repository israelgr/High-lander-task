import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { redis } from './config/redis.js';
import { setupSocket } from './socket/index.js';

let httpServer: ReturnType<typeof createServer>;
let io: Server;

async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(() => {
    console.log('HTTP server closed');
  });

  // Close socket connections gracefully
  if (io) {
    io.close(() => {
      console.log('Socket.IO closed');
    });
  }

  // Close database connections
  try {
    await redis.quit();
    console.log('Redis connection closed');
  } catch (err) {
    console.error('Error closing Redis:', err);
  }

  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (err) {
    console.error('Error closing MongoDB:', err);
  }

  console.log('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function start() {
  try {
    await connectDatabase();

    await redis.ping();
    console.log('Redis ping successful');

    httpServer = createServer(app);

    io = setupSocket(httpServer);

    httpServer.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

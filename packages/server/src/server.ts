import { createServer } from 'http';
import app from './app.js';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { redis } from './config/redis.js';
import { setupSocket } from './socket/index.js';

async function start() {
  try {
    await connectDatabase();

    await redis.ping();
    console.log('Redis ping successful');

    const httpServer = createServer(app);

    setupSocket(httpServer);

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

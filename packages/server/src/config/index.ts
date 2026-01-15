import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/navigation-game',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  osrm: {
    url: process.env.OSRM_URL || 'http://localhost:5000',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
} as const;

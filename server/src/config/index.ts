import dotenv from 'dotenv';

dotenv.config();

// Validate required secrets in production
const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (process.env.NODE_ENV === 'production' && (!accessSecret || !refreshSecret)) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in production');
}

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

  jwt: {
    accessSecret: accessSecret ?? 'dev-access-secret-change-in-prod',
    refreshSecret: refreshSecret ?? 'dev-refresh-secret-change-in-prod',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  defaults: {
    distance: {
      goalRadiusMin: parseInt(process.env.DEFAULT_GOAL_RADIUS_MIN || '1000', 10),
      goalRadiusMax: parseInt(process.env.DEFAULT_GOAL_RADIUS_MAX || '2000', 10),
      proximityThresholds: {
        near: parseInt(process.env.DEFAULT_PROXIMITY_NEAR || '100', 10),
        veryClose: parseInt(process.env.DEFAULT_PROXIMITY_VERY_CLOSE || '50', 10),
        reached: parseInt(process.env.DEFAULT_PROXIMITY_REACHED || '30', 10),
      },
      defaultProximityThreshold: parseInt(process.env.DEFAULT_PROXIMITY_THRESHOLD || '30', 10),
      defaultMaxPlayers: parseInt(process.env.DEFAULT_MAX_PLAYERS || '10', 10),
    },
  },
} as const;

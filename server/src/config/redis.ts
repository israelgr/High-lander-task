import { Redis } from 'ioredis';
import { config } from './index.js';

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 3) {
      console.error('Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err: Error) => {
  console.error('Redis error:', err);
});

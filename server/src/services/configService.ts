import { DistanceConfig, SystemConfig } from '@high-lander/shared';
import { redis } from '../config/redis.js';
import { config } from '../config/index.js';
import { ConfigModel, ConfigHistoryModel } from '../models/Config.js';

const CONFIG_KEY = 'config:system';
const CONFIG_CHANNEL = 'config:updates';

let cachedConfig: SystemConfig | null = null;

export function getDefaultConfig(): SystemConfig {
  return {
    distance: {
      goalRadiusMin: config.defaults.distance.goalRadiusMin,
      goalRadiusMax: config.defaults.distance.goalRadiusMax,
      proximityThresholds: {
        near: config.defaults.distance.proximityThresholds.near,
        veryClose: config.defaults.distance.proximityThresholds.veryClose,
        reached: config.defaults.distance.proximityThresholds.reached,
      },
      defaultProximityThreshold: config.defaults.distance.defaultProximityThreshold,
      defaultMaxPlayers: config.defaults.distance.defaultMaxPlayers,
    },
    metadata: {
      updatedAt: Date.now(),
      updatedBy: 'system',
      version: 1,
    },
  };
}

export async function getSystemConfig(): Promise<SystemConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const redisConfig = await redis.get(CONFIG_KEY);
    if (redisConfig) {
      cachedConfig = JSON.parse(redisConfig);
      return cachedConfig!;
    }
  } catch (error) {
    console.error('Error reading config from Redis:', error);
  }

  try {
    const dbConfig = await ConfigModel.findOne({ type: 'system' });
    if (dbConfig) {
      cachedConfig = dbConfig.config;
      await redis.set(CONFIG_KEY, JSON.stringify(cachedConfig));
      return cachedConfig!;
    }
  } catch (error) {
    console.error('Error reading config from MongoDB:', error);
  }

  return getDefaultConfig();
}

export async function getDistanceConfig(): Promise<DistanceConfig> {
  const systemConfig = await getSystemConfig();
  return systemConfig.distance;
}

export async function updateDistanceConfig(
  updates: Partial<DistanceConfig>,
  updatedBy: string
): Promise<SystemConfig> {
  const currentConfig = await getSystemConfig();

  const newDistanceConfig: DistanceConfig = {
    ...currentConfig.distance,
    ...updates,
  };

  if (updates.proximityThresholds) {
    newDistanceConfig.proximityThresholds = {
      ...currentConfig.distance.proximityThresholds,
      ...updates.proximityThresholds,
    };
  }

  const newConfig: SystemConfig = {
    distance: newDistanceConfig,
    metadata: {
      updatedAt: Date.now(),
      updatedBy,
      version: currentConfig.metadata.version + 1,
    },
  };

  await ConfigModel.findOneAndUpdate(
    { type: 'system' },
    { config: newConfig, updatedAt: new Date() },
    { upsert: true }
  );

  await ConfigHistoryModel.create({
    configType: 'system',
    config: newConfig,
    changedBy: updatedBy,
  });

  await redis.set(CONFIG_KEY, JSON.stringify(newConfig));

  cachedConfig = newConfig;

  try {
    await redis.publish(
      CONFIG_CHANNEL,
      JSON.stringify({
        type: 'config:updated',
        config: newConfig,
      })
    );
  } catch (error) {
    console.error('Error publishing config update:', error);
  }

  return newConfig;
}

export async function getConfigHistory(
  limit: number = 20,
  offset: number = 0
): Promise<{ history: SystemConfig[]; total: number }> {
  const [history, total] = await Promise.all([
    ConfigHistoryModel.find({ configType: 'system' })
      .sort({ changedAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    ConfigHistoryModel.countDocuments({ configType: 'system' }),
  ]);

  return {
    history: history.map(h => h.config),
    total,
  };
}

export function subscribeToConfigUpdates(
  callback: (config: SystemConfig) => void
): void {
  const subscriber = redis.duplicate();

  subscriber.subscribe(CONFIG_CHANNEL).catch((err) => {
    console.error('Failed to subscribe to config updates:', err);
  });

  subscriber.on('message', (_channel: string, message: string) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'config:updated') {
        cachedConfig = data.config;
        callback(data.config);
      }
    } catch (error) {
      console.error('Error processing config update message:', error);
    }
  });
}

export function validateDistanceConfig(updates: Partial<DistanceConfig>): string[] {
  const errors: string[] = [];

  if (updates.goalRadiusMin !== undefined) {
    if (updates.goalRadiusMin < 50) {
      errors.push('goalRadiusMin must be at least 50 meters');
    }
    if (updates.goalRadiusMin > 5000) {
      errors.push('goalRadiusMin cannot exceed 5000 meters');
    }
  }

  if (updates.goalRadiusMax !== undefined) {
    if (updates.goalRadiusMax < 100) {
      errors.push('goalRadiusMax must be at least 100 meters');
    }
    if (updates.goalRadiusMax > 10000) {
      errors.push('goalRadiusMax cannot exceed 10000 meters');
    }
  }

  if (updates.goalRadiusMin !== undefined && updates.goalRadiusMax !== undefined) {
    if (updates.goalRadiusMin >= updates.goalRadiusMax) {
      errors.push('goalRadiusMin must be less than goalRadiusMax');
    }
  }

  if (updates.proximityThresholds) {
    const { near, veryClose, reached } = updates.proximityThresholds;

    if (near !== undefined && (near < 10 || near > 500)) {
      errors.push('proximityThresholds.near must be between 10 and 500 meters');
    }

    if (veryClose !== undefined && (veryClose < 5 || veryClose > 200)) {
      errors.push('proximityThresholds.veryClose must be between 5 and 200 meters');
    }

    if (reached !== undefined && (reached < 5 || reached > 100)) {
      errors.push('proximityThresholds.reached must be between 5 and 100 meters');
    }
  }

  if (updates.defaultProximityThreshold !== undefined) {
    if (updates.defaultProximityThreshold < 5 || updates.defaultProximityThreshold > 100) {
      errors.push('defaultProximityThreshold must be between 5 and 100 meters');
    }
  }

  if (updates.defaultMaxPlayers !== undefined) {
    if (updates.defaultMaxPlayers < 1 || updates.defaultMaxPlayers > 50) {
      errors.push('defaultMaxPlayers must be between 1 and 50');
    }
  }

  return errors;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}

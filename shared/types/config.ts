export interface ProximityThresholds {
  near: number;
  veryClose: number;
  reached: number;
}

export interface DistanceConfig {
  goalRadiusMin: number;
  goalRadiusMax: number;
  proximityThresholds: ProximityThresholds;
  defaultProximityThreshold: number;
  defaultMaxPlayers: number;
}

export interface ConfigMetadata {
  updatedAt: number;
  updatedBy: string;
  version: number;
}

export interface SystemConfig {
  distance: DistanceConfig;
  metadata: ConfigMetadata;
}

export interface UpdateConfigRequest {
  distance?: Partial<DistanceConfig>;
}

export interface ConfigResponse {
  config: SystemConfig;
}

export const DEFAULT_DISTANCE_CONFIG: DistanceConfig = {
  goalRadiusMin: 1000,
  goalRadiusMax: 2000,
  proximityThresholds: {
    near: 100,
    veryClose: 50,
    reached: 30,
  },
  defaultProximityThreshold: 30,
  defaultMaxPlayers: 10,
};

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DistanceConfig, DEFAULT_DISTANCE_CONFIG } from '@high-lander/shared';
import { getConfig } from '../services/api';
import { useSocket } from '../hooks/useSocket';

interface ConfigContextValue {
  distanceConfig: DistanceConfig;
  isLoading: boolean;
  error: string | null;
  refetchConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [distanceConfig, setDistanceConfig] = useState<DistanceConfig>(DEFAULT_DISTANCE_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();

  const refetchConfig = async () => {
    try {
      const config = await getConfig();
      setDistanceConfig(config.distance);
      setError(null);
    } catch (err) {
      setError('Failed to load configuration');
      console.error('Config fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetchConfig();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleConfigUpdate = ({ config }: { config: DistanceConfig }) => {
      setDistanceConfig(config);
    };

    socket.on('config:updated', handleConfigUpdate);

    return () => {
      socket.off('config:updated', handleConfigUpdate);
    };
  }, [socket]);

  return (
    <ConfigContext.Provider value={{ distanceConfig, isLoading, error, refetchConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

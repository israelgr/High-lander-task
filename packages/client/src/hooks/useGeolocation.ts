import { useState, useEffect, useCallback } from 'react';
import { Position } from '@high-lander/shared';

interface GeolocationState {
  position: Position | null;
  error: string | null;
  loading: boolean;
  permissionStatus: PermissionState | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
  watch?: boolean;
}

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000,
  watch: true,
};

export function useGeolocation(options: UseGeolocationOptions = {}): GeolocationState & {
  requestPermission: () => void;
  refresh: () => void;
} {
  const opts = { ...defaultOptions, ...options };

  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: true,
    permissionStatus: null,
  });

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setState(prev => ({
      ...prev,
      position: {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      },
      error: null,
      loading: false,
    }));
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let errorMessage = 'Failed to get location';

    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location access.';
        break;
      case err.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable.';
        break;
      case err.TIMEOUT:
        errorMessage = 'Location request timed out.';
        break;
    }

    setState(prev => ({
      ...prev,
      error: errorMessage,
      loading: false,
    }));
  }, []);

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: opts.enableHighAccuracy,
      maximumAge: opts.maximumAge,
      timeout: opts.timeout,
    });
  }, [handleSuccess, handleError, opts.enableHighAccuracy, opts.maximumAge, opts.timeout]);

  const refresh = useCallback(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setState(prev => ({ ...prev, permissionStatus: result.state }));

        result.onchange = () => {
          setState(prev => ({ ...prev, permissionStatus: result.state }));
        };
      });
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      }));
      return;
    }

    let watchId: number | undefined;

    if (opts.watch) {
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: opts.enableHighAccuracy,
        maximumAge: opts.maximumAge,
        timeout: opts.timeout,
      });
    } else {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy: opts.enableHighAccuracy,
        maximumAge: opts.maximumAge,
        timeout: opts.timeout,
      });
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [opts.watch, opts.enableHighAccuracy, opts.maximumAge, opts.timeout, handleSuccess, handleError]);

  return { ...state, requestPermission, refresh };
}

import { Position } from '@high-lander/shared';

type PositionListener = (position: Position) => void;

// Default location: Tel Aviv
const DEFAULT_POSITION: Position = {
  latitude: 32.0853,
  longitude: 34.7818,
  accuracy: 10,
  timestamp: Date.now(),
};

// Movement step in degrees (roughly 10 meters)
const MOVEMENT_STEP = 0.0001;

class MockLocationService {
  private position: Position = { ...DEFAULT_POSITION };
  private listeners: Set<PositionListener> = new Set();
  private intervalId: number | null = null;

  getPosition(): Position {
    return { ...this.position, timestamp: Date.now() };
  }

  setPosition(latitude: number, longitude: number): void {
    this.position = {
      latitude,
      longitude,
      accuracy: 10,
      timestamp: Date.now(),
    };
    this.notifyListeners();
  }

  move(direction: 'up' | 'down' | 'left' | 'right'): void {
    switch (direction) {
      case 'up':
        this.position.latitude += MOVEMENT_STEP;
        break;
      case 'down':
        this.position.latitude -= MOVEMENT_STEP;
        break;
      case 'left':
        this.position.longitude -= MOVEMENT_STEP;
        break;
      case 'right':
        this.position.longitude += MOVEMENT_STEP;
        break;
    }
    this.position.timestamp = Date.now();
    this.notifyListeners();
  }

  subscribe(listener: PositionListener): () => void {
    this.listeners.add(listener);

    // Immediately notify with current position
    listener(this.getPosition());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const position = this.getPosition();
    this.listeners.forEach(listener => listener(position));
  }

  startWatching(intervalMs: number = 1000): void {
    if (this.intervalId !== null) return;

    this.intervalId = window.setInterval(() => {
      this.notifyListeners();
    }, intervalMs);
  }

  stopWatching(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset(): void {
    this.position = { ...DEFAULT_POSITION };
    this.notifyListeners();
  }
}

// Singleton instance
export const mockLocationService = new MockLocationService();

// Check if mock mode is enabled
export function isMockLocationEnabled(): boolean {
  return import.meta.env.VITE_MOCK_LOCATION === 'true';
}

// Preset locations for quick selection
export const PRESET_LOCATIONS = {
  'Tel Aviv': { latitude: 32.0853, longitude: 34.7818 },
  'Jerusalem': { latitude: 31.7683, longitude: 35.2137 },
  'Haifa': { latitude: 32.7940, longitude: 34.9896 },
  'New York': { latitude: 40.7128, longitude: -74.0060 },
  'London': { latitude: 51.5074, longitude: -0.1278 },
} as const;

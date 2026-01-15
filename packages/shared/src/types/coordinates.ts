export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Position extends Coordinates {
  accuracy?: number;
  timestamp: number;
}

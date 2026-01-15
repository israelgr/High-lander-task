import { Polyline } from 'react-leaflet';

interface RoutePathProps {
  coordinates: [number, number][];
}

export function RoutePath({ coordinates }: RoutePathProps) {
  const positions: [number, number][] = coordinates.map(([lng, lat]) => [lat, lng]);

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: '#3b82f6',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10',
      }}
    />
  );
}

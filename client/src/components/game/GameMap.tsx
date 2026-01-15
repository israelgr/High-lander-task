import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Coordinates } from '@high-lander/shared';
import { PlayerMarker } from './PlayerMarker';
import { GoalMarker } from './GoalMarker';
import { RoutePath } from './RoutePath';
import { OtherPlayersLayer } from './OtherPlayersLayer';

interface GameMapProps {
  playerPosition: Coordinates | null;
  goalPosition?: Coordinates | null;
  route?: { coordinates: [number, number][] } | null;
  otherPlayers?: Map<string, { position: Coordinates; distanceToGoal: number }>;
  onGoalReach?: () => void;
}

function MapController({ position }: { position: Coordinates | null }) {
  const map = useMap();
  const initialSet = useRef(false);

  useEffect(() => {
    if (position && !initialSet.current) {
      map.setView([position.latitude, position.longitude], 16);
      initialSet.current = true;
    }
  }, [map, position]);

  return null;
}

export function GameMap({
  playerPosition,
  goalPosition,
  route,
  otherPlayers,
  onGoalReach,
}: GameMapProps) {
  const defaultCenter: [number, number] = playerPosition
    ? [playerPosition.latitude, playerPosition.longitude]
    : [32.0853, 34.7818];

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={defaultCenter}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController position={playerPosition} />

        {route && <RoutePath coordinates={route.coordinates} />}

        {playerPosition && <PlayerMarker position={playerPosition} />}

        {goalPosition && (
          <GoalMarker position={goalPosition} onReach={onGoalReach} />
        )}

        {otherPlayers && <OtherPlayersLayer players={otherPlayers} />}
      </MapContainer>
    </div>
  );
}

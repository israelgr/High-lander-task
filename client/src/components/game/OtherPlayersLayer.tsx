import { CircleMarker, Tooltip } from 'react-leaflet';
import { Coordinates } from '@high-lander/shared';

interface OtherPlayersLayerProps {
  players: Map<string, { position: Coordinates; distanceToGoal: number }>;
}

const COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function OtherPlayersLayer({ players }: OtherPlayersLayerProps) {
  const entries = Array.from(players.entries());

  return (
    <>
      {entries.map(([playerId, { position, distanceToGoal }], index) => (
        <CircleMarker
          key={playerId}
          center={[position.latitude, position.longitude]}
          radius={10}
          pathOptions={{
            color: COLORS[index % COLORS.length],
            fillColor: COLORS[index % COLORS.length],
            fillOpacity: 0.8,
            weight: 2,
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            {Math.round(distanceToGoal)}m
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

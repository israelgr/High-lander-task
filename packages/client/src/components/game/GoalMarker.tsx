import { CircleMarker, Popup } from 'react-leaflet';
import { Coordinates } from '@high-lander/shared';

interface GoalMarkerProps {
  position: Coordinates;
  onReach?: () => void;
}

export function GoalMarker({ position }: GoalMarkerProps) {
  return (
    <>
      <CircleMarker
        center={[position.latitude, position.longitude]}
        radius={20}
        pathOptions={{
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.2,
          weight: 2,
        }}
      />

      <CircleMarker
        center={[position.latitude, position.longitude]}
        radius={10}
        pathOptions={{
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.8,
          weight: 3,
        }}
      >
        <Popup>
          <div>
            <strong>Goal</strong>
            <p>Reach this location to win!</p>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

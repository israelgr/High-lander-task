import { CircleMarker, Popup } from 'react-leaflet';
import { Coordinates } from '@high-lander/shared';

interface PlayerMarkerProps {
  position: Coordinates;
  accuracy?: number;
}

export function PlayerMarker({ position, accuracy }: PlayerMarkerProps) {
  return (
    <>
      <CircleMarker
        center={[position.latitude, position.longitude]}
        radius={12}
        pathOptions={{
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 1,
          weight: 3,
        }}
      >
        <Popup>
          <div>
            <strong>You are here</strong>
            {accuracy && <p>Accuracy: ~{Math.round(accuracy)}m</p>}
          </div>
        </Popup>
      </CircleMarker>

      {accuracy && accuracy > 20 && (
        <CircleMarker
          center={[position.latitude, position.longitude]}
          radius={accuracy / 5}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 1,
          }}
        />
      )}
    </>
  );
}

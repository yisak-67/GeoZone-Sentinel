import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Zone, Coordinates } from '../types';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../constants';

// Fix for default Leaflet markers in React
// We use CDN URLs here because importing png files directly (import icon from './marker.png') 
// causes errors in browser-based ESM environments without a bundler.
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ZoneMapProps {
  zones: Zone[];
  userLocation: Coordinates | null;
  onMapClick?: (coords: Coordinates) => void;
  selectedZoneId?: string | null;
}

const LocationMarker = ({ position, label }: { position: Coordinates; label: string }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], map.getZoom());
    }
  }, [position, map]);

  return (
    <Marker position={[position.lat, position.lng]}>
      <Popup>{label}</Popup>
    </Marker>
  );
};

const ClickHandler = ({ onClick }: { onClick: (coords: Coordinates) => void }) => {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

const ZoneMap: React.FC<ZoneMapProps> = ({ zones, userLocation, onMapClick, selectedZoneId }) => {
  return (
    <MapContainer 
      center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]} 
      zoom={DEFAULT_ZOOM} 
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {zones.map((zone) => (
        <Circle
          key={zone.id}
          center={[zone.center.lat, zone.center.lng]}
          radius={zone.radiusMeters}
          pathOptions={{
            color: selectedZoneId === zone.id ? '#2563eb' : '#ef4444', // Blue if selected, Red otherwise
            fillColor: selectedZoneId === zone.id ? '#3b82f6' : '#fca5a5',
            fillOpacity: 0.4
          }}
        >
          <Popup>
            <div className="font-semibold">{zone.name}</div>
            <div className="text-xs text-gray-600">Radius: {zone.radiusMeters}m</div>
          </Popup>
        </Circle>
      ))}

      {userLocation && (
        <LocationMarker position={userLocation} label="Your Location" />
      )}

      {onMapClick && <ClickHandler onClick={onMapClick} />}
    </MapContainer>
  );
};

export default ZoneMap;
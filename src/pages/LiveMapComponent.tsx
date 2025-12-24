// LiveMapComponent.tsx
import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons
const iconRetinaUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png";
const iconUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png";
const shadowUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export type AircraftStatus = "available" | "in_flight" | "maintenance";

export interface AircraftForMap {
  id: string;
  registration: string;
  type: string;
  status: AircraftStatus;
  latitude: number;
  longitude: number;
  baseLocation?: string;
}

interface Props {
  aircraftData: AircraftForMap[];
  center?: LatLngExpression;
  zoom?: number;
}

const LiveMapComponent: React.FC<Props> = ({
  aircraftData,
  center = [20.5937, 78.9629],
  zoom = 5,
}) => {
  const active = aircraftData.filter(
    (a) => a.status === "available" || a.status === "in_flight"
  );

  const mapDisplay = useMemo(
    () => (
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", borderRadius: 12 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {active.map((a) => (
          <Marker key={a.id} position={[a.latitude, a.longitude]}>
            <Popup>
              <div className="text-sm">
                <strong>{a.registration}</strong>
                <div>{a.type}</div>
                <div className="text-xs text-gray-600">{a.baseLocation}</div>
                <div className="text-xs mt-1">Status: {a.status.replace("_", " ")}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    ),
    [aircraftData, center, zoom]
  );

  return <>{mapDisplay}</>;
};

export default LiveMapComponent;
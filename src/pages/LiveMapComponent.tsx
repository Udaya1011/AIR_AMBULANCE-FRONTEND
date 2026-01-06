import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
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
  initialTrackedId?: string | null;
}

const MapController = ({
  onTrack,
  initialTrackedId,
  aircraftData
}: {
  onTrack: (id: string | null) => void;
  initialTrackedId: string | null;
  aircraftData: AircraftForMap[];
}) => {
  const map = useMap();

  // Handle Initial Tracking from Props
  useEffect(() => {
    if (initialTrackedId) {
      const ac = aircraftData.find(a => a.id === initialTrackedId);
      if (ac) {
        onTrack(ac.id);
        map.flyTo([ac.latitude, ac.longitude], 13, { animate: true, duration: 1.5 });
      }
    }
  }, [initialTrackedId, map, onTrack, aircraftData]);

  // Handle Global Custom Event flyToAircraft
  useEffect(() => {
    const handleFlyTo = (e: any) => {
      const { id, lat, lng } = e.detail;
      onTrack(id);
      map.flyTo([lat, lng], 13, {
        animate: true,
        duration: 1.5
      });
    };

    window.addEventListener("flyToAircraft", handleFlyTo);
    return () => window.removeEventListener("flyToAircraft", handleFlyTo);
  }, [map, onTrack]);

  return null;
};

const AircraftMarker = ({ a, isTracked }: { a: any; isTracked: boolean }) => {
  const markerRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (isTracked && markerRef.current) {
      setTimeout(() => {
        markerRef.current.openPopup();
      }, 500);
    }
  }, [isTracked]);

  return (
    <Marker
      ref={markerRef}
      {...({
        position: [a.latitude, a.longitude],
        icon: L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              ${isTracked ? '<div class="absolute w-10 h-10 bg-blue-400/20 rounded-full animate-ping"></div>' : ''}
              <div class="p-2 ${a.status === 'in_flight' ? 'bg-blue-600' : 'bg-green-600'} rounded-lg shadow-xl border-2 border-white transform ${isTracked ? 'scale-125' : 'scale-100'} transition-all duration-500">
                <svg class="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
                </svg>
              </div>
            </div>
          `,
          className: 'bg-transparent',
          iconSize: [24, 24]
        })
      } as any)}
    >
      <Popup>
        <div className="text-sm p-1 text-black min-w-[180px]">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${a.status === 'in_flight' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
            <strong className="text-lg text-black">{a.registration}</strong>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-black">
            <span className="text-gray-500 font-bold uppercase tracking-tighter">Type:</span>
            <span className="font-semibold text-black">{a.type}</span>
            <span className="text-gray-500 font-bold uppercase tracking-tighter">Status:</span>
            <span className={`font-black uppercase ${a.status === 'in_flight' ? 'text-blue-600' : 'text-green-600'}`}>{a.status.replace("_", " ")}</span>
            <span className="text-gray-500 font-bold uppercase tracking-tighter col-span-2 mt-1 py-1 border-t border-gray-100">Location Details</span>
            <span className="text-gray-500 font-bold tracking-tighter italic">Latitude:</span>
            <span className="font-bold text-blue-700">{a.latitude.toFixed(6)}</span>
            <span className="text-gray-500 font-bold tracking-tighter italic">Longitude:</span>
            <span className="font-bold text-blue-700">{a.longitude.toFixed(6)}</span>
          </div>
          {isTracked && (
            <div className="mt-3 pt-2 border-t border-blue-100 flex items-center justify-center bg-blue-50/50 rounded-b-lg -mx-2 -mb-2 py-2">
              <span className="text-[10px] font-black text-blue-600 animate-pulse uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                Live Track Active
              </span>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

const LiveMapComponent: React.FC<Props> = ({
  aircraftData,
  center = [20.5937, 78.9629],
  zoom = 5,
  initialTrackedId = null
}) => {
  const [trackedId, setTrackedId] = useState<string | null>(initialTrackedId);

  const active = useMemo(() => aircraftData.filter(
    (a) => a && (a.status === "available" || a.status === "in_flight") && typeof a.latitude === 'number'
  ), [aircraftData]);

  return (
    <MapContainer
      center={center as LatLngExpression}
      zoom={zoom}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", minHeight: "500px", borderRadius: 12 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <MapController
        onTrack={setTrackedId}
        initialTrackedId={initialTrackedId}
        aircraftData={aircraftData}
      />

      {active.map((a) => {
        const isTracked = a.id === trackedId;

        // Simulate a "direction" or "path" for in_flight aircraft
        const path = (a.status === 'in_flight' || isTracked) ? [
          [a.latitude - 1.2, a.longitude - 0.8] as [number, number], // Simulated origin
          [a.latitude, a.longitude] as [number, number],             // Current position
          [a.latitude + 0.5, a.longitude + 0.4] as [number, number]  // Simulated destination
        ] : null;

        return (
          <React.Fragment key={a.id}>
            {path && (
              <>
                <Polyline
                  positions={path as LatLngExpression[]}
                  color={isTracked ? "#2563eb" : "#94a3b8"}
                  weight={isTracked ? 4 : 2}
                  dashArray={isTracked ? "10, 10" : "5, 5"}
                  opacity={isTracked ? 0.8 : 0.4}
                />
                <Marker
                  position={path[2] as LatLngExpression}
                  icon={L.divIcon({
                    html: `<div class="w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm"></div>`,
                    className: 'bg-transparent',
                    iconSize: [8, 8]
                  })}
                />
              </>
            )}
            <AircraftMarker key={a.id} a={a} isTracked={isTracked} />
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
};


export default LiveMapComponent;
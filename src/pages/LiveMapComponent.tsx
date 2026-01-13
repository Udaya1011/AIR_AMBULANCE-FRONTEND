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
  customRoute?: {
    code?: string;
    start: { lat: number, lng: number, name?: string };
    end: { lat: number, lng: number, name?: string };
    startName?: string;
    endName?: string;
  } | null;
}

const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    // Small timeout to ensure the dialog/container is fully rendered
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timeout);
  }, [map]);
  return null;
};

const MapController = ({
  onTrack,
  initialTrackedId,
  aircraftData,
  customRoute
}: {
  onTrack: (id: string | null) => void;
  initialTrackedId: string | null;
  aircraftData: AircraftForMap[];
  customRoute?: any;
}) => {
  const map = useMap();

  // Handle Initial Tracking from Props
  useEffect(() => {
    if (customRoute) {
      // Fly to custom route bounds
      const bounds = L.latLngBounds(
        [customRoute.start.lat, customRoute.start.lng],
        [customRoute.end.lat, customRoute.end.lng]
      );
      map.flyToBounds(bounds, { padding: [100, 100], animate: true, duration: 1.5 });
    } else if (initialTrackedId) {
      const ac = aircraftData.find(a => a.id === initialTrackedId);
      if (ac) {
        onTrack(ac.id);
        map.flyTo([ac.latitude, ac.longitude], 12, { animate: true, duration: 1.5 });
      }
    }
  }, [initialTrackedId, map, onTrack, aircraftData, customRoute]);

  // Handle Global Custom Event flyToAircraft
  useEffect(() => {
    const handleFlyTo = (e: any) => {
      const { id, lat, lng } = e.detail;
      onTrack(id);
      map.flyTo([lat, lng], 12, {
        animate: true,
        duration: 1.5
      });
    };

    window.addEventListener("flyToAircraft", handleFlyTo);
    return () => window.removeEventListener("flyToAircraft", handleFlyTo);
  }, [map, onTrack]);

  return <MapResizer />;
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
              ${isTracked ? '<div class="absolute w-12 h-12 bg-blue-500/20 rounded-full animate-ping"></div>' : ''}
              <div class="p-2 ${a.status === 'in_flight' ? 'bg-blue-600' : 'bg-emerald-600'} rounded-xl shadow-2xl border-2 border-white transform ${isTracked ? 'scale-110' : 'scale-100'} transition-all duration-300">
                <svg class="w-5 h-5 text-white fill-current transform -rotate-45" viewBox="0 0 24 24">
                  <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
                </svg>
              </div>
            </div>
          `,
          className: 'bg-transparent',
          iconSize: [32, 32]
        })
      } as any)}
    >
      <Popup className="premium-map-popup">
        <div className="text-sm p-2 min-w-[200px]">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <strong className="text-base text-slate-900 font-black tracking-tight">{a.registration}</strong>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${a.status === 'in_flight' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {a.status.replace("_", " ")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-y-2 text-[10px] font-bold">
            <span className="text-slate-400 uppercase tracking-widest">Model</span>
            <span className="text-slate-900 text-right uppercase">{a.type}</span>
            <span className="text-slate-400 uppercase tracking-widest">Latitude</span>
            <span className="text-blue-600 text-right">{a.latitude.toFixed(4)}</span>
            <span className="text-slate-400 uppercase tracking-widest">Longitude</span>
            <span className="text-blue-600 text-right">{a.longitude.toFixed(4)}</span>
          </div>
          {isTracked && (
            <div className="mt-4 pt-3 border-t border-blue-50 flex items-center justify-center">
              <span className="text-[9px] font-black text-blue-600 animate-pulse uppercase tracking-[0.2em] flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                Telemetry Active
              </span>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

// Helper to calculate bearing between two points
const toRadians = (deg: number) => (deg * Math.PI) / 180;
const toDegrees = (rad: number) => (rad * 180) / Math.PI;

const getBearing = (startLat: number, startLng: number, destLat: number, destLng: number) => {
  const startLatRad = toRadians(startLat);
  const startLngRad = toRadians(startLng);
  const destLatRad = toRadians(destLat);
  const destLngRad = toRadians(destLng);

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  const brng = toDegrees(Math.atan2(y, x));
  return (brng + 360) % 360;
};

const LiveMapComponent: React.FC<Props> = ({
  aircraftData,
  center = [20.5937, 78.9629],
  zoom = 5,
  initialTrackedId = null,
  customRoute = null
}) => {
  const [trackedId, setTrackedId] = useState<string | null>(initialTrackedId);

  const active = useMemo(() => aircraftData.filter(
    (a) => a && (a.status === "available" || a.status === "in_flight") && typeof a.latitude === 'number'
  ), [aircraftData]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
      <MapContainer
        center={center as LatLngExpression}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MapController
          onTrack={setTrackedId}
          initialTrackedId={initialTrackedId}
          aircraftData={aircraftData}
          customRoute={customRoute}
        />

        {/* Render Custom Route if Available */}
        {customRoute && (() => {
          const start = [customRoute.start.lat, customRoute.start.lng];
          let end = [customRoute.end.lat, customRoute.end.lng];
          if (start[0] === end[0] && start[1] === end[1]) { end = [start[0] + 0.008, start[1] + 0.008]; }

          const bearing = getBearing(start[0], start[1], end[0], end[1]);
          const progress = 0.75;
          const planePos: [number, number] = [
            start[0] + (end[0] - start[0]) * progress,
            start[1] + (end[1] - start[1]) * progress
          ];

          return (
            <>
              {/* Origin Marker */}
              <Marker
                {...({
                  position: start as any,
                  icon: L.divIcon({
                    html: `
                      <div class="relative flex items-center justify-center">
                        <div class="w-10 h-10 bg-blue-500/10 rounded-full animate-ping absolute"></div>
                        <div class="w-8 h-8 bg-white rounded-full border-4 border-blue-600 flex items-center justify-center relative z-10 shadow-xl">
                          <div class="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                      </div>
                    `,
                    className: 'bg-transparent',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                  })
                } as any)}
              >
                <Popup>
                  <div className="p-2">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Mission Origin</span>
                    <strong className="text-sm text-slate-900">{customRoute.startName || customRoute.start.name || 'Sector Alpha'}</strong>
                  </div>
                </Popup>
              </Marker>

              {/* Destination Marker */}
              <Marker
                {...({
                  position: end as any,
                  icon: L.divIcon({
                    html: `
                      <div class="relative flex items-center justify-center">
                        <div class="w-8 h-8 bg-white rounded-full border-4 border-emerald-500 flex items-center justify-center relative z-10 shadow-xl">
                          <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        </div>
                      </div>
                    `,
                    className: 'bg-transparent',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                  })
                } as any)}
              >
                <Popup>
                  <div className="p-2">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Mission Target</span>
                    <strong className="text-sm text-slate-900">{customRoute.endName || customRoute.end.name || 'Sector Beta'}</strong>
                  </div>
                </Popup>
              </Marker>

              {/* Animated Route Path */}
              <Polyline
                {...({
                  positions: [start, end] as any,
                  color: "#94a3b8",
                  weight: 3,
                  opacity: 0.3,
                  dashArray: "10, 10",
                  lineCap: "round"
                } as any)}
              />
              <Polyline
                {...({
                  positions: [start, planePos] as any,
                  color: "#2563eb",
                  weight: 4,
                  opacity: 0.8,
                  lineCap: "round"
                } as any)}
              />

              {/* High-Fidelity Aircraft Carrier */}
              <Marker
                {...({
                  position: planePos,
                  icon: L.divIcon({
                    html: `
                      <div class="relative flex items-center justify-center" style="transform: rotate(${bearing}deg);">
                        <div class="absolute w-20 h-20 bg-blue-500/5 rounded-full animate-pulse"></div>
                        <div class="p-3 bg-blue-600 text-white rounded-2xl shadow-2xl border-4 border-white relative z-10">
                          <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
                            <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
                          </svg>
                        </div>
                      </div>
                    `,
                    className: 'bg-transparent',
                    iconSize: [60, 60],
                    iconAnchor: [30, 30]
                  })
                } as any)}
              >
                <Popup>
                  <div className="text-center p-2 min-w-[160px]">
                    <div className="flex items-center gap-2 justify-center mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">En Route Telemetry</span>
                    </div>
                    <strong className="text-lg text-slate-900 block leading-tight mb-2 uppercase italic">{customRoute.code || 'LIVE OPS'}</strong>
                    <div className="py-1.5 px-3 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest italic">Vector Established</div>
                  </div>
                </Popup>
              </Marker>
            </>
          );
        })()}

        {!customRoute && active.map((a) => (
          <AircraftMarker key={a.id} a={a} isTracked={a.id === trackedId} />
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveMapComponent;
'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { useAppStore } from '@/store';
import { getStatusColor, formatFuel, formatETA, getRiskColor } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Leaflet must be imported dynamically on client only
const MapContainer = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(m => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(m => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(m => m.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then(m => m.Polyline),
  { ssr: false }
);
const Polygon = dynamic(
  () => import('react-leaflet').then(m => m.Polygon),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then(m => m.CircleMarker),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('react-leaflet').then(m => m.Tooltip),
  { ssr: false }
);

// Port data for markers
const PORTS = [
  { id: 'KWT-1', name: 'Kuwait City', position: [29.48, 48.34] as [number, number] },
  { id: 'BUS-1', name: 'Bushehr', position: [28.83, 50.73] as [number, number] },
  { id: 'DMM-1', name: 'Dammam', position: [26.56, 50.30] as [number, number] },
  { id: 'BAH-1', name: 'Manama', position: [26.50, 50.55] as [number, number] },
  { id: 'DOH-1', name: 'Doha', position: [25.46, 51.95] as [number, number] },
  { id: 'AUH-1', name: 'Abu Dhabi', position: [25.22, 54.18] as [number, number] },
  { id: 'DXB-1', name: 'Jebel Ali', position: [25.50, 54.75] as [number, number] },
  { id: 'BND-1', name: 'Bandar Abbas', position: [26.62, 56.11] as [number, number] },
  { id: 'SOH-1', name: 'Sohar', position: [24.72, 57.02] as [number, number] },
  { id: 'MCT-1', name: 'Muscat', position: [23.92, 58.58] as [number, number] },
];

function MapInner() {
  const ships = useAppStore(s => s.ships);
  const zones = useAppStore(s => s.zones);
  const selectedShipId = useAppStore(s => s.selectedShipId);
  const selectShip = useAppStore(s => s.selectShip);
  const user = useAppStore(s => s.user);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    import('leaflet').then(leaflet => {
      setL(leaflet.default);
    });
  }, []);

  const createShipIcon = (ship: any) => {
    if (!L) return undefined;

    const color = ship.status === 'danger' || ship.status === 'stranded' ? '#ef4444'
      : ship.status === 'warning' || ship.status === 'rerouting' ? '#f59e0b'
      : '#06b6d4';

    const glowClass = ship.status === 'danger' || ship.status === 'stranded' ? 'ship-marker-danger'
      : ship.status === 'warning' || ship.status === 'rerouting' ? 'ship-marker-warning'
      : 'ship-marker-normal';

    return L.divIcon({
      html: `
        <div class="${glowClass}" style="position:relative;width:28px;height:28px;">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style="transform:rotate(${ship.heading}deg)">
            <path d="M14 2 L22 24 L14 19 L6 24 Z" fill="${color}" stroke="${color}" stroke-width="1" opacity="0.9"/>
          </svg>
          <div style="position:absolute;top:-6px;left:-6px;width:40px;height:40px;border-radius:50%;border:2px solid ${color};opacity:0.3;animation:ship-pulse 2s infinite;"></div>
        </div>
      `,
      className: 'ship-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16],
    });
  };

  const createPortIcon = () => {
    if (!L) return undefined;
    return L.divIcon({
      html: `
        <div style="width:12px;height:12px;background:#4ade80;border-radius:50%;border:2px solid #166534;box-shadow:0 0 8px rgba(74,222,128,0.5);"></div>
      `,
      className: 'port-icon',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  };

  // Filter ships for captain view
  const visibleShips = user?.role === 'captain' && user.assignedShipId
    ? ships.filter(s => s.shipId === user.assignedShipId)
    : ships;

  if (!L) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-navy-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-cyan-400 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={[25.5, 54.0]}
      zoom={7}
      className="w-full h-full"
      zoomControl={true}
      attributionControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Navigable water boundary */}
      <Polyline
        positions={[
          [29.80, 48.60], [29.50, 50.00], [28.80, 50.80], [27.80, 52.00],
          [26.70, 53.50], [26.30, 55.00], [26.65, 56.10], [26.50, 56.40],
          [26.00, 56.80], [25.50, 57.50], [25.50, 58.50], [25.00, 60.00],
          [22.00, 60.00], [22.50, 60.00], [23.80, 58.80], [24.50, 57.20],
          [25.20, 56.50], [26.45, 56.45], [26.30, 55.90], [26.00, 55.50],
          [25.30, 54.50], [24.80, 53.00], [25.30, 52.00], [26.40, 51.50],
          [26.50, 50.30], [27.50, 49.80], [28.50, 49.00], [29.50, 48.30],
          [29.80, 48.60],
        ]}
        pathOptions={{ color: '#06b6d4', weight: 1, opacity: 0.3, dashArray: '8,4' }}
      />

      {/* Restricted zones */}
      {zones.map(zone => (
        <Polygon
          key={zone.id}
          positions={zone.polygon.map(p => [p.lat, p.lng] as [number, number])}
          pathOptions={{
            color: zone.severity === 'critical' ? '#ef4444' : zone.severity === 'danger' ? '#f97316' : '#f59e0b',
            fillColor: zone.severity === 'critical' ? '#ef4444' : zone.severity === 'danger' ? '#f97316' : '#f59e0b',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '6,3',
          }}
        >
          <Tooltip permanent className="zone-tooltip">
            <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600 }}>
              ⚠ {zone.name}
            </span>
          </Tooltip>
        </Polygon>
      ))}

      {/* Port markers */}
      {PORTS.map(port => (
        <Marker
          key={port.id}
          position={port.position}
          icon={createPortIcon()}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <span style={{ color: '#4ade80', fontSize: '11px', fontWeight: 600 }}>
              ⚓ {port.name}
            </span>
          </Tooltip>
        </Marker>
      ))}

      {/* Ship routes */}
      {visibleShips.map(ship => {
        if (!ship.route || ship.route.length < 2) return null;
        return (
          <Polyline
            key={`route-${ship.shipId}`}
            positions={ship.route.map(p => [p.lat, p.lng] as [number, number])}
            pathOptions={{
              color: ship.status === 'rerouting' ? '#f97316' : '#06b6d4',
              weight: 1.5,
              opacity: selectedShipId === ship.shipId ? 0.8 : 0.25,
              dashArray: '4,6',
            }}
          />
        );
      })}

      {/* Ship markers */}
      {visibleShips.map(ship => (
        <Marker
          key={ship.shipId}
          position={[ship.position.lat, ship.position.lng]}
          icon={createShipIcon(ship)}
          eventHandlers={{
            click: () => selectShip(ship.shipId),
          }}
        >
          <Popup>
            <div style={{ minWidth: 220, fontFamily: 'Inter, sans-serif' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(6,182,212,0.2)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ fontSize: 18 }}>🚢</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{ship.name}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{ship.shipId}</div>
                </div>
                <div style={{
                  marginLeft: 'auto', padding: '2px 8px', borderRadius: 12,
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  background: ship.status === 'normal' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  color: ship.status === 'normal' ? '#34d399' : '#f87171',
                }}>
                  {ship.status}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 11 }}>
                <div><span style={{ color: '#64748b' }}>Speed:</span> <span style={{ color: '#e2e8f0' }}>{ship.speed} kn</span></div>
                <div><span style={{ color: '#64748b' }}>Heading:</span> <span style={{ color: '#e2e8f0' }}>{Math.round(ship.heading)}°</span></div>
                <div><span style={{ color: '#64748b' }}>Fuel:</span> <span style={{ color: ship.fuel < 1000 ? '#f87171' : '#e2e8f0' }}>{formatFuel(ship.fuel)} t</span></div>
                <div><span style={{ color: '#64748b' }}>Cargo:</span> <span style={{ color: '#e2e8f0' }}>{ship.cargo}</span></div>
                <div><span style={{ color: '#64748b' }}>Dest:</span> <span style={{ color: '#e2e8f0' }}>{ship.destination}</span></div>
                <div><span style={{ color: '#64748b' }}>ETA:</span> <span style={{ color: '#e2e8f0' }}>{ship.eta ? formatETA(ship.eta) : 'N/A'}</span></div>
                <div><span style={{ color: '#64748b' }}>Weather:</span> <span style={{ color: '#e2e8f0' }}>{ship.weatherCondition || 'N/A'}</span></div>
                <div><span style={{ color: '#64748b' }}>Risk:</span> <span style={{ color: getRiskColor(ship.riskLevel || 'low') }}>{ship.riskLevel || 'low'}</span></div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default function MapView() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-navy-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-cyan-400 text-sm">Initializing tactical display...</p>
        </div>
      </div>
    );
  }

  return <MapInner />;
}

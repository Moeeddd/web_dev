'use client';

import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import { Ship, Navigation, Fuel, Package, MapPin, AlertTriangle } from 'lucide-react';
import { getStatusBg, formatFuel, formatETA, getRiskColor } from '@/lib/utils';

export default function ShipsPanel() {
  const ships = useAppStore(s => s.ships);
  const selectedShipId = useAppStore(s => s.selectedShipId);
  const selectShip = useAppStore(s => s.selectShip);
  const user = useAppStore(s => s.user);

  const visibleShips = user?.role === 'captain' && user.assignedShipId
    ? ships.filter(s => s.shipId === user.assignedShipId)
    : ships;

  const selectedShip = ships.find(s => s.shipId === selectedShipId);

  if (selectedShip) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-cyan-500/10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <Ship className="w-4 h-4 text-cyan-400" />
              {selectedShip.name}
            </h2>
            <button
              onClick={() => selectShip(null)}
              className="text-xs text-gray-400 hover:text-cyan-400 transition-colors"
            >
              ← All Ships
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status header */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <span className={`status-badge border ${getStatusBg(selectedShip.status)}`}>
                {selectedShip.status.toUpperCase()}
              </span>
              <span className="text-xs font-mono text-gray-400">{selectedShip.shipId}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Speed</p>
                <p className="text-white font-semibold">{selectedShip.speed} <span className="text-xs text-gray-400">kn</span></p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Heading</p>
                <p className="text-white font-semibold">{Math.round(selectedShip.heading)}°</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Position</p>
                <p className="text-white font-mono text-xs">
                  {selectedShip.position.lat.toFixed(3)}°N {selectedShip.position.lng.toFixed(3)}°E
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Risk Level</p>
                <p style={{ color: getRiskColor(selectedShip.riskLevel || 'low') }} className="font-semibold capitalize">
                  {selectedShip.riskLevel || 'low'}
                </p>
              </div>
            </div>
          </div>

          {/* Fuel gauge */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Fuel className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Fuel</span>
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className={`text-2xl font-bold ${selectedShip.fuel < 1000 ? 'text-red-400' : 'text-white'}`}>
                {formatFuel(selectedShip.fuel)}
              </span>
              <span className="text-xs text-gray-400">tons</span>
            </div>
            <div className="w-full h-2 bg-navy-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: selectedShip.fuel < 1000 ? '#ef4444' : selectedShip.fuel < 3000 ? '#f59e0b' : '#06b6d4',
                }}
                animate={{ width: `${Math.min(100, (selectedShip.fuel / 8500) * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            {selectedShip.fuel < 1000 && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Fuel critically low</span>
              </div>
            )}
          </div>

          {/* Voyage info */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Voyage</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Destination</span>
                <span className="text-white font-medium">{selectedShip.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ETA</span>
                <span className="text-white font-medium">{selectedShip.eta ? formatETA(selectedShip.eta) : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Weather</span>
                <span className="text-white">{selectedShip.weatherCondition || 'Loading...'}</span>
              </div>
            </div>
          </div>

          {/* Cargo */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Cargo</span>
            </div>
            <p className="text-white capitalize">{selectedShip.cargo}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-cyan-500/10">
        <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <Ship className="w-4 h-4 text-cyan-400" />
          FLEET OVERVIEW
          <span className="text-xs text-gray-500 font-normal ml-auto">{visibleShips.length} ships</span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visibleShips.map((ship, i) => (
          <motion.button
            key={ship.shipId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => selectShip(ship.shipId)}
            className="w-full p-3 border-b border-cyan-500/5 hover:bg-cyan-500/5 transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                ship.status === 'normal' ? 'bg-emerald-500/10' : 
                ship.status === 'danger' || ship.status === 'stranded' ? 'bg-red-500/10' : 'bg-amber-500/10'
              }`}>
                <Ship className={`w-4 h-4 ${
                  ship.status === 'normal' ? 'text-emerald-400' : 
                  ship.status === 'danger' || ship.status === 'stranded' ? 'text-red-400' : 'text-amber-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
                    {ship.name}
                  </span>
                  <span className={`status-badge text-[9px] border ${getStatusBg(ship.status)}`}>
                    {ship.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                  <span>{ship.speed} kn</span>
                  <span>⛽ {formatFuel(ship.fuel)}t</span>
                  <span>→ {ship.destination}</span>
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

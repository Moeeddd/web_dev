'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import { BarChart3, Fuel, Ship, AlertTriangle, Activity, Package } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { getStatusBg, getRiskColor } from '@/lib/utils';

export default function AnalyticsPanel() {
  const ships = useAppStore(s => s.ships);
  const alerts = useAppStore(s => s.alerts);
  const analytics = useAppStore(s => s.analytics);

  const stats = useMemo(() => {
    const totalFuel = ships.reduce((sum, s) => sum + s.fuel, 0);
    const avgFuel = ships.length ? totalFuel / ships.length : 0;
    const avgSpeed = ships.length ? ships.reduce((sum, s) => sum + s.speed, 0) / ships.length : 0;
    const criticalShips = ships.filter(s => s.fuel < 1000 || s.status === 'danger' || s.status === 'stranded').length;
    const unackAlerts = alerts.filter(a => !a.acknowledged).length;

    const statusData = [
      { name: 'Normal', count: ships.filter(s => s.status === 'normal').length, color: '#10b981' },
      { name: 'Warning', count: ships.filter(s => s.status === 'warning').length, color: '#f59e0b' },
      { name: 'Rerouting', count: ships.filter(s => s.status === 'rerouting').length, color: '#f97316' },
      { name: 'Danger', count: ships.filter(s => s.status === 'danger').length, color: '#ef4444' },
      { name: 'Stranded', count: ships.filter(s => s.status === 'stranded').length, color: '#991b1b' },
    ].filter(d => d.count > 0);

    const cargoTypes: Record<string, number> = {};
    ships.forEach(s => { cargoTypes[s.cargo] = (cargoTypes[s.cargo] || 0) + 1; });
    const cargoData = Object.entries(cargoTypes).map(([name, count]) => ({ name, count }));

    const fuelData = ships.map(s => ({
      name: s.name.substring(0, 6),
      fuel: Math.round(s.fuel),
      fill: s.fuel < 1000 ? '#ef4444' : s.fuel < 3000 ? '#f59e0b' : '#06b6d4',
    }));

    return { totalFuel, avgFuel, avgSpeed, criticalShips, unackAlerts, statusData, cargoData, fuelData };
  }, [ships, alerts]);

  const cardClass = "glass-panel p-3 space-y-1";

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-cyan-500/10">
        <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          ANALYTICS DASHBOARD
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cardClass}
          >
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Fuel className="w-3 h-3" />
              Total Fuel
            </div>
            <p className="text-lg font-bold text-white">{(stats.totalFuel / 1000).toFixed(1)}K</p>
            <p className="text-[10px] text-gray-500">tons across fleet</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={cardClass}
          >
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Activity className="w-3 h-3" />
              Avg Speed
            </div>
            <p className="text-lg font-bold text-white">{stats.avgSpeed.toFixed(1)}</p>
            <p className="text-[10px] text-gray-500">knots average</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cardClass}
          >
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <AlertTriangle className="w-3 h-3" />
              Active Alerts
            </div>
            <p className="text-lg font-bold text-amber-400">{stats.unackAlerts}</p>
            <p className="text-[10px] text-gray-500">unacknowledged</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={cardClass}
          >
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Ship className="w-3 h-3" />
              Critical
            </div>
            <p className="text-lg font-bold text-red-400">{stats.criticalShips}</p>
            <p className="text-[10px] text-gray-500">ships at risk</p>
          </motion.div>
        </div>

        {/* Fleet status chart */}
        <div className="glass-panel p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Fleet Status</h3>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10,22,40,0.95)',
                    border: '1px solid rgba(6,182,212,0.3)',
                    borderRadius: 8,
                    color: '#e2e8f0',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {stats.statusData.map(s => (
              <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-gray-400">{s.name}: {s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fuel levels chart */}
        <div className="glass-panel p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Fuel Levels</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.fuelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.1)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={45} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10,22,40,0.95)',
                    border: '1px solid rgba(6,182,212,0.3)',
                    borderRadius: 8,
                    color: '#e2e8f0',
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value} tons`, 'Fuel']}
                />
                <Bar dataKey="fuel" radius={[0, 4, 4, 0]}>
                  {stats.fuelData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cargo distribution */}
        <div className="glass-panel p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Package className="w-3 h-3" />
            Cargo Distribution
          </h3>
          <div className="space-y-2">
            {stats.cargoData.map(c => (
              <div key={c.name} className="flex items-center justify-between">
                <span className="text-xs text-gray-300 capitalize">{c.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${(c.count / ships.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{c.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

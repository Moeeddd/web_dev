'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import { getSocket } from '@/hooks/useSocket';
import { AlertTriangle, Bell, Check, Filter, X } from 'lucide-react';
import { getPriorityColor, timeAgo } from '@/lib/utils';

export default function AlertsPanel() {
  const alerts = useAppStore(s => s.alerts);
  const [filter, setFilter] = useState<string>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const filteredAlerts = useMemo(() => {
    let result = alerts;

    if (!showAcknowledged) {
      result = result.filter(a => !a.acknowledged);
    }

    if (filter !== 'all') {
      result = result.filter(a => a.type === filter);
    }

    return result;
  }, [alerts, filter, showAcknowledged]);

  const handleAcknowledge = (alertId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('alert:acknowledge', alertId);
    }
  };

  const alertTypes = [
    'all', 'geofence_breach', 'distress', 'collision_risk',
    'fuel_shortage', 'stranded', 'severe_weather', 'rerouting'
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-cyan-500/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            ALERT CENTER
          </h2>
          <span className="text-xs text-gray-500">
            {filteredAlerts.length} alerts
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {alertTypes.slice(0, 5).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                filter === type
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              {type === 'all' ? 'All' : type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 mt-2 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showAcknowledged}
            onChange={e => setShowAcknowledged(e.target.checked)}
            className="w-3 h-3 rounded border-gray-600 bg-navy-800 text-cyan-500"
          />
          Show acknowledged
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <p>No active alerts</p>
            </div>
          ) : (
            filteredAlerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.02 }}
                className={`p-3 border-b border-cyan-500/5 hover:bg-cyan-500/5 transition-all ${
                  alert.acknowledged ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    alert.priority === 'critical' ? 'bg-red-500 animate-pulse' :
                    alert.priority === 'high' ? 'bg-orange-500' :
                    alert.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`status-badge text-[9px] border ${getPriorityColor(alert.priority)}`}>
                        {alert.priority}
                      </span>
                      <span className="text-[9px] text-gray-600">{timeAgo(alert.timestamp)}</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-200 mb-0.5">{alert.title}</p>
                    <p className="text-[11px] text-gray-400 line-clamp-2">{alert.message}</p>
                  </div>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all flex-shrink-0"
                      title="Acknowledge"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

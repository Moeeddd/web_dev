'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import { X, AlertTriangle, Radio, ShieldAlert, Fuel, Navigation } from 'lucide-react';

export default function AlertToast() {
  const alerts = useAppStore(s => s.alerts);
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    if (alerts.length === 0) return;

    const latest = alerts[0];
    if (!latest || latest.acknowledged) return;

    // Check if we already have this toast
    if (toasts.find(t => t.id === latest.id)) return;

    // Only show toasts for recent alerts (last 5 seconds)
    const alertTime = new Date(latest.timestamp).getTime();
    if (Date.now() - alertTime > 5000) return;

    setToasts(prev => [latest, ...prev].slice(0, 3));

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== latest.id));
    }, 8000);
  }, [alerts]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'distress': return <Radio className="w-4 h-4" />;
      case 'geofence_breach': return <ShieldAlert className="w-4 h-4" />;
      case 'fuel_shortage': return <Fuel className="w-4 h-4" />;
      case 'rerouting': return <Navigation className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getBorderColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500/50 shadow-red-500/10';
      case 'high': return 'border-orange-500/50 shadow-orange-500/10';
      case 'medium': return 'border-amber-500/50 shadow-amber-500/10';
      default: return 'border-cyan-500/50 shadow-cyan-500/10';
    }
  };

  const getIconColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-amber-400';
      default: return 'text-cyan-400';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`pointer-events-auto max-w-sm bg-navy-950/95 backdrop-blur-md border rounded-lg shadow-2xl p-3 ${getBorderColor(toast.priority)}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${getIconColor(toast.priority)}`}>
                {getIcon(toast.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white mb-0.5 line-clamp-1">{toast.title}</p>
                <p className="text-[11px] text-gray-400 line-clamp-2">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

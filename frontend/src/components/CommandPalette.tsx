'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import { getSocket } from '@/hooks/useSocket';
import {
  Search, Ship, AlertTriangle, MapPin, Shield,
  Zap, Navigation, ArrowRight, Fuel
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

export default function CommandPalette() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const ships = useAppStore(s => s.ships);
  const setActivePanel = useAppStore(s => s.setActivePanel);
  const selectShip = useAppStore(s => s.selectShip);
  const setShowCommandPalette = useAppStore(s => s.setShowCommandPalette);
  const user = useAppStore(s => s.user);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const close = () => setShowCommandPalette(false);

  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [];

    // Navigation commands
    items.push(
      { id: 'nav-fleet', label: 'Fleet Overview', description: 'View all ships', icon: <Ship className="w-4 h-4" />, action: () => { setActivePanel('ships'); close(); }, category: 'Navigation' },
      { id: 'nav-alerts', label: 'Alert Center', description: 'View active alerts', icon: <AlertTriangle className="w-4 h-4" />, action: () => { setActivePanel('alerts'); close(); }, category: 'Navigation' },
      { id: 'nav-distress', label: 'Distress Center', description: 'Distress signals', icon: <Zap className="w-4 h-4" />, action: () => { setActivePanel('distress'); close(); }, category: 'Navigation' },
    );

    if (user?.role === 'command') {
      items.push(
        { id: 'nav-analytics', label: 'Analytics Dashboard', description: 'Fleet analytics', icon: <Navigation className="w-4 h-4" />, action: () => { setActivePanel('analytics'); close(); }, category: 'Navigation' },
        { id: 'nav-playback', label: 'Playback Timeline', description: 'Historical replay', icon: <Navigation className="w-4 h-4" />, action: () => { setActivePanel('playback'); close(); }, category: 'Navigation' },
      );
    }

    // Ship commands
    for (const ship of ships) {
      items.push({
        id: `ship-${ship.shipId}`,
        label: ship.name,
        description: `${ship.shipId} — ${ship.status} — ${ship.cargo}`,
        icon: <Ship className="w-4 h-4" />,
        action: () => { selectShip(ship.shipId); setActivePanel('ships'); close(); },
        category: 'Ships',
      });
    }

    return items;
  }, [ships, user, setActivePanel, selectShip, close]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const lower = query.toLowerCase();
    return commands.filter(c =>
      c.label.toLowerCase().includes(lower) ||
      c.description.toLowerCase().includes(lower)
    );
  }, [query, commands]);

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filtered]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-[20vh]"
        onClick={close}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="w-full max-w-lg glass-panel border-cyan-500/30 shadow-2xl shadow-cyan-500/10 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 p-4 border-b border-cyan-500/10">
            <Search className="w-5 h-5 text-cyan-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-500"
              placeholder="Search commands, ships, actions..."
            />
            <kbd className="px-2 py-1 bg-navy-800/50 rounded text-[10px] text-gray-500 font-mono">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-2">
                <div className="px-3 py-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                  {category}
                </div>
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left 
                               hover:bg-cyan-500/10 transition-all group"
                  >
                    <div className="text-gray-400 group-hover:text-cyan-400 transition-colors">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 group-hover:text-white transition-colors">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{item.description}</p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-gray-600 group-hover:text-cyan-400 transition-colors" />
                  </button>
                ))}
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No matching commands
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

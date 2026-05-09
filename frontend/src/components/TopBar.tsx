'use client';

import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import {
  Anchor, LogOut, Ship, AlertTriangle, BarChart3,
  Radio, FileText, Clock, Shield, User
} from 'lucide-react';

export default function TopBar() {
  const user = useAppStore(s => s.user);
  const logout = useAppStore(s => s.logout);
  const ships = useAppStore(s => s.ships);
  const alerts = useAppStore(s => s.alerts);
  const activePanel = useAppStore(s => s.activePanel);
  const setActivePanel = useAppStore(s => s.setActivePanel);
  const setShowCommandPalette = useAppStore(s => s.setShowCommandPalette);

  const unackAlerts = alerts.filter(a => !a.acknowledged).length;
  const criticalAlerts = alerts.filter(a => a.priority === 'critical' && !a.acknowledged).length;
  const activeShips = ships.filter(s => s.status !== 'stranded').length;

  const navItems = user?.role === 'command' ? [
    { id: 'ships' as const, icon: Ship, label: 'Fleet' },
    { id: 'alerts' as const, icon: AlertTriangle, label: 'Alerts', badge: unackAlerts },
    { id: 'analytics' as const, icon: BarChart3, label: 'Analytics' },
    { id: 'directives' as const, icon: FileText, label: 'Directives' },
    { id: 'distress' as const, icon: Radio, label: 'Distress' },
    { id: 'playback' as const, icon: Clock, label: 'Playback' },
  ] : [
    { id: 'ships' as const, icon: Ship, label: 'My Ship' },
    { id: 'alerts' as const, icon: AlertTriangle, label: 'Alerts', badge: unackAlerts },
    { id: 'directives' as const, icon: FileText, label: 'Orders' },
    { id: 'distress' as const, icon: Radio, label: 'Distress' },
  ];

  return (
    <header className="h-14 bg-navy-950/90 backdrop-blur-md border-b border-cyan-500/15 flex items-center px-4 z-50 relative">
      {/* Logo */}
      <div className="flex items-center gap-3 mr-8">
        <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
          <Anchor className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-wider leading-none">
            HORIZON <span className="text-cyan-400">CMD</span>
          </h1>
          <p className="text-[10px] text-gray-500 tracking-widest">STRAIT OF HORMUZ</p>
        </div>
      </div>

      {/* Status indicators */}
      <div className="hidden md:flex items-center gap-4 mr-6">
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-gray-400">LIVE</span>
        </div>
        <div className="text-xs text-gray-500">
          <span className="text-gray-300 font-semibold">{activeShips}</span>/{ships.length} Active
        </div>
        {criticalAlerts > 0 && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="flex items-center gap-1.5 text-xs text-red-400"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>{criticalAlerts} Critical</span>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-1 flex-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              activePanel === item.id
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Command palette hint */}
        <button
          onClick={() => setShowCommandPalette(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-navy-800/50 border border-cyan-500/15 
                     rounded-lg text-xs text-gray-400 hover:text-gray-300 hover:border-cyan-500/30 transition-all"
        >
          <span>Command</span>
          <kbd className="px-1.5 py-0.5 bg-navy-700/50 rounded text-[10px] font-mono">⌘K</kbd>
        </button>

        {/* User info */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-navy-800/40 rounded-lg border border-cyan-500/10">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            user?.role === 'command' ? 'bg-cyan-500/20' : 'bg-amber-500/20'
          }`}>
            {user?.role === 'command' ? (
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <User className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-medium text-gray-200 leading-none">{user?.username}</p>
            <p className="text-[10px] text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

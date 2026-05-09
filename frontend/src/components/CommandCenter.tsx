'use client';

import { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';
import { useAppStore } from '@/store';
import TopBar from './TopBar';
import MapView from './MapView';
import SidePanel from './SidePanel';
import AlertToast from './AlertToast';
import CommandPalette from './CommandPalette';

export default function CommandCenter() {
  const socket = useSocket();
  const user = useAppStore(s => s.user);
  const showCommandPalette = useAppStore(s => s.showCommandPalette);
  const setShowCommandPalette = useAppStore(s => s.setShowCommandPalette);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setShowCommandPalette(!showCommandPalette);
    }
    if (e.key === 'Escape') {
      setShowCommandPalette(false);
    }
  }, [showCommandPalette, setShowCommandPalette]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen flex flex-col overflow-hidden"
    >
      <TopBar />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Map takes full width */}
        <div className="flex-1 relative">
          <MapView />
        </div>

        {/* Side panel */}
        <SidePanel />
      </div>

      {/* Alert toasts */}
      <AlertToast />

      {/* Command palette */}
      {showCommandPalette && <CommandPalette />}
    </motion.div>
  );
}

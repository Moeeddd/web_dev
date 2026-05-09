'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import ShipsPanel from './panels/ShipsPanel';
import AlertsPanel from './panels/AlertsPanel';
import AnalyticsPanel from './panels/AnalyticsPanel';
import DirectivesPanel from './panels/DirectivesPanel';
import DistressPanel from './panels/DistressPanel';
import PlaybackPanel from './panels/PlaybackPanel';

export default function SidePanel() {
  const activePanel = useAppStore(s => s.activePanel);

  const panels: Record<string, React.ReactNode> = {
    ships: <ShipsPanel />,
    alerts: <AlertsPanel />,
    analytics: <AnalyticsPanel />,
    directives: <DirectivesPanel />,
    distress: <DistressPanel />,
    playback: <PlaybackPanel />,
  };

  return (
    <div className="w-[380px] min-w-[380px] h-full bg-navy-950/90 backdrop-blur-md border-l border-cyan-500/15 flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={activePanel}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-hidden flex flex-col"
        >
          {panels[activePanel]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

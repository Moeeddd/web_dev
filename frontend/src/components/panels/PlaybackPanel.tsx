'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import { fetchPlayback } from '@/lib/api';
import { Clock, Play, Pause, SkipBack, SkipForward, Rewind } from 'lucide-react';

export default function PlaybackPanel() {
  const token = useAppStore(s => s.token);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const setShips = useAppStore(s => s.setShips);

  const loadPlayback = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const from = new Date(Date.now() - 3600000).toISOString();
      const to = new Date().toISOString();
      const data = await fetchPlayback(token, from, to);
      setSnapshots(data);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Failed to load playback:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPlayback();
  }, [loadPlayback]);

  useEffect(() => {
    if (!playing || snapshots.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= snapshots.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 500);

    return () => clearInterval(timer);
  }, [playing, snapshots.length]);

  useEffect(() => {
    if (snapshots[currentIndex]?.data?.ships) {
      setShips(snapshots[currentIndex].data.ships);
    }
  }, [currentIndex, snapshots, setShips]);

  const progress = snapshots.length > 0 ? (currentIndex / (snapshots.length - 1)) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-cyan-500/10">
        <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          PLAYBACK TIMELINE
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Timeline scrubber */}
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  {snapshots.length > 0
                    ? new Date(snapshots[currentIndex]?.timestamp).toLocaleTimeString()
                    : '--:--:--'}
                </span>
                <span className="text-[10px] text-gray-500">
                  {currentIndex + 1} / {snapshots.length}
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-navy-800 rounded-full mb-4 cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  setCurrentIndex(Math.round(pct * (snapshots.length - 1)));
                }}
              >
                <div
                  className="absolute top-0 left-0 h-full bg-cyan-500 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50 
                             transition-all duration-200 group-hover:scale-125"
                  style={{ left: `calc(${progress}% - 8px)` }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentIndex(0)}
                  className="p-2 text-gray-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-cyan-500/10"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 5))}
                  className="p-2 text-gray-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-cyan-500/10"
                >
                  <Rewind className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPlaying(!playing)}
                  className="p-3 bg-cyan-500/20 text-cyan-400 rounded-full hover:bg-cyan-500/30 transition-all 
                             border border-cyan-500/30 hover:border-cyan-500/50"
                >
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setCurrentIndex(Math.min(snapshots.length - 1, currentIndex + 5))}
                  className="p-2 text-gray-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-cyan-500/10"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reload button */}
            <button
              onClick={loadPlayback}
              className="btn-ghost w-full text-xs"
            >
              Reload Last Hour
            </button>

            {/* Info */}
            <div className="glass-panel p-4 text-xs text-gray-400 space-y-2">
              <p>📍 Playback shows ship positions recorded every 30 seconds</p>
              <p>🕐 Covering the last 60 minutes of activity</p>
              <p>⏯ Use controls or click timeline to scrub</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

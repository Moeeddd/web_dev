'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import { getSocket } from '@/hooks/useSocket';
import { Radio, Send, AlertTriangle, Brain, ShieldAlert } from 'lucide-react';
import { timeAgo, getPriorityColor } from '@/lib/utils';

export default function DistressPanel() {
  const user = useAppStore(s => s.user);
  const distressMessages = useAppStore(s => s.distressMessages);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const isCaptain = user?.role === 'captain';

  const handleSendDistress = () => {
    const socket = getSocket();
    if (!socket || !message || !user?.assignedShipId) return;

    setSending(true);
    socket.emit('distress:send', {
      shipId: user.assignedShipId,
      message,
    });

    setTimeout(() => {
      setMessage('');
      setSending(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-cyan-500/10">
        <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <Radio className="w-4 h-4 text-red-400" />
          DISTRESS CENTER
        </h2>
      </div>

      {/* Captain distress form */}
      {isCaptain && (
        <div className="p-4 border-b border-cyan-500/10 bg-red-950/20">
          <div className="flex items-center gap-2 mb-3 text-xs text-red-400">
            <ShieldAlert className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Emergency Distress Signal</span>
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="input-field text-sm resize-none border-red-500/30 focus:border-red-500/50 focus:ring-red-500/30"
            rows={3}
            placeholder="Describe the emergency situation..."
          />
          <button
            onClick={handleSendDistress}
            disabled={!message || sending}
            className="btn-danger w-full mt-2 text-xs flex items-center justify-center gap-2"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-3 h-3" />
                SEND DISTRESS SIGNAL
              </>
            )}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {distressMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm">
            <Radio className="w-8 h-8 mb-2 opacity-50" />
            <p>No distress signals</p>
          </div>
        ) : (
          distressMessages.map((distress, i) => (
            <motion.div
              key={distress.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-4 border-b border-cyan-500/5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-bold text-white">{distress.shipName}</span>
                </div>
                <span className="text-[10px] text-gray-600">{timeAgo(distress.timestamp)}</span>
              </div>

              <p className="text-xs text-gray-300 mb-3 italic">"{distress.message}"</p>

              {/* AI Analysis */}
              {distress.aiAnalysis && (
                <div className="glass-panel p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-cyan-400">
                    <Brain className="w-3.5 h-3.5" />
                    <span className="font-semibold uppercase tracking-wider">AI Analysis</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-500">Severity:</span>{' '}
                      <span className={`font-semibold ${
                        distress.aiAnalysis.severity === 'critical' ? 'text-red-400' :
                        distress.aiAnalysis.severity === 'high' ? 'text-orange-400' :
                        'text-amber-400'
                      }`}>{distress.aiAnalysis.severity}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>{' '}
                      <span className="text-gray-200">{distress.aiAnalysis.incidentType}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Injuries:</span>{' '}
                      <span className="text-gray-200">{distress.aiAnalysis.injuries}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Priority:</span>{' '}
                      <span className="text-gray-200">{distress.aiAnalysis.recommendedPriority}</span>
                    </div>
                  </div>

                  <div className="text-[11px]">
                    <span className="text-gray-500">Impact:</span>{' '}
                    <span className="text-gray-300">{distress.aiAnalysis.operationalImpact}</span>
                  </div>

                  {distress.aiAnalysis.recommendations.length > 0 && (
                    <div className="text-[11px]">
                      <span className="text-gray-500 block mb-1">Recommendations:</span>
                      <ul className="space-y-0.5 text-gray-300">
                        {distress.aiAnalysis.recommendations.slice(0, 3).map((r, j) => (
                          <li key={j} className="flex items-start gap-1.5">
                            <span className="text-cyan-400 mt-0.5">›</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

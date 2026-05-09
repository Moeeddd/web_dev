'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import { getSocket } from '@/hooks/useSocket';
import { FileText, Send, Check, X, ChevronDown } from 'lucide-react';
import { timeAgo, getPriorityColor } from '@/lib/utils';

const directiveTypes = [
  { value: 'reroute', label: 'Reroute' },
  { value: 'hold_position', label: 'Hold Position' },
  { value: 'change_speed', label: 'Change Speed' },
  { value: 'emergency_stop', label: 'Emergency Stop' },
  { value: 'proceed', label: 'Proceed' },
  { value: 'escort', label: 'Request Escort' },
  { value: 'fuel_transfer', label: 'Fuel Transfer' },
];

export default function DirectivesPanel() {
  const user = useAppStore(s => s.user);
  const ships = useAppStore(s => s.ships);
  const directives = useAppStore(s => s.directives);
  const [selectedShip, setSelectedShip] = useState('');
  const [directiveType, setDirectiveType] = useState('reroute');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  const isCommand = user?.role === 'command';

  const handleIssue = () => {
    const socket = getSocket();
    if (!socket || !selectedShip || !message) return;

    const ship = ships.find(s => s.shipId === selectedShip);
    socket.emit('directive:issue', {
      shipId: selectedShip,
      shipName: ship?.name || '',
      issuedBy: user?.username || '',
      type: directiveType,
      message,
    });

    setMessage('');
    setShowForm(false);
  };

  const handleRespond = (directiveId: string, status: 'accepted' | 'rejected') => {
    const socket = getSocket();
    if (socket) {
      socket.emit('directive:respond', { directiveId, status });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-cyan-500/10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            DIRECTIVES
          </h2>
          {isCommand && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary text-xs py-1.5 px-3"
            >
              + New Order
            </button>
          )}
        </div>
      </div>

      {/* Issue form (command only) */}
      {showForm && isCommand && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="p-4 border-b border-cyan-500/10 bg-navy-900/50"
        >
          <div className="space-y-3">
            <select
              value={selectedShip}
              onChange={e => setSelectedShip(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Select Ship...</option>
              {ships.map(s => (
                <option key={s.shipId} value={s.shipId}>{s.name} ({s.shipId})</option>
              ))}
            </select>

            <select
              value={directiveType}
              onChange={e => setDirectiveType(e.target.value)}
              className="input-field text-sm"
            >
              {directiveTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="input-field text-sm resize-none"
              rows={3}
              placeholder="Directive message..."
            />

            <div className="flex gap-2">
              <button onClick={handleIssue} className="btn-primary text-xs flex items-center gap-1.5 flex-1">
                <Send className="w-3 h-3" />
                Issue Directive
              </button>
              <button onClick={() => setShowForm(false)} className="btn-ghost text-xs">
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex-1 overflow-y-auto">
        {directives.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm">
            <FileText className="w-8 h-8 mb-2 opacity-50" />
            <p>No directives issued</p>
          </div>
        ) : (
          directives.map((directive, i) => (
            <motion.div
              key={directive.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-3 border-b border-cyan-500/5 hover:bg-cyan-500/5 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">{directive.shipName || directive.shipId}</span>
                  <span className={`status-badge text-[9px] border ${
                    directive.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : directive.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }`}>
                    {directive.status}
                  </span>
                </div>
                <span className="text-[10px] text-gray-600">{timeAgo(directive.createdAt)}</span>
              </div>
              <div className="text-[10px] text-cyan-400/80 mb-1 uppercase tracking-wider">
                {directive.type.replace(/_/g, ' ')}
              </div>
              <p className="text-xs text-gray-400">{directive.message}</p>

              {/* Captain response buttons */}
              {user?.role === 'captain' && directive.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleRespond(directive.id, 'accepted')}
                    className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 
                               rounded text-xs text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  >
                    <Check className="w-3 h-3" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(directive.id, 'rejected')}
                    className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/30 
                               rounded text-xs text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <X className="w-3 h-3" />
                    Reject
                  </button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

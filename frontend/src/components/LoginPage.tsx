'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import { login } from '@/lib/api';
import { Anchor, Shield, Ship, Eye, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const setAuth = useAppStore(s => s.setAuth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      setAuth(result.user, result.token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (user: string, pass: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await login(user, pass);
      setAuth(result.user, result.token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-overlay opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo area */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 relative"
          >
            <div className="absolute inset-0 bg-cyan-500/20 rounded-2xl rotate-45 animate-pulse-glow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Anchor className="w-10 h-10 text-cyan-400" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            HORIZON <span className="text-cyan-400">COMMAND</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Maritime Crisis Operations Platform
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-amber-400/80">
            <AlertTriangle className="w-3 h-3" />
            <span>STRAIT OF HORMUZ — ACTIVE CRISIS ZONE</span>
          </div>
        </div>

        {/* Login form */}
        <div className="glass-panel p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Operator ID
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter username"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Access Code
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Authenticate</span>
                </>
              )}
            </button>
          </form>

          {/* Quick access */}
          <div className="mt-6 pt-6 border-t border-cyan-500/10">
            <p className="text-xs text-gray-500 text-center mb-3 uppercase tracking-wider">Quick Access</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => quickLogin('admiral', 'command123')}
                disabled={loading}
                className="flex items-center gap-2 p-3 bg-navy-800/50 border border-cyan-500/20 rounded-lg 
                           hover:border-cyan-500/40 hover:bg-navy-800/80 transition-all text-sm group"
              >
                <Eye className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
                <div className="text-left">
                  <div className="text-gray-200 font-medium">Command</div>
                  <div className="text-gray-500 text-xs">admiral</div>
                </div>
              </button>
              <button
                onClick={() => quickLogin('captain_aurora', 'captain123')}
                disabled={loading}
                className="flex items-center gap-2 p-3 bg-navy-800/50 border border-cyan-500/20 rounded-lg 
                           hover:border-cyan-500/40 hover:bg-navy-800/80 transition-all text-sm group"
              >
                <Ship className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
                <div className="text-left">
                  <div className="text-gray-200 font-medium">Captain</div>
                  <div className="text-gray-500 text-xs">Aurora</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          CLASSIFIED — AUTHORIZED PERSONNEL ONLY
        </p>
      </motion.div>
    </div>
  );
}

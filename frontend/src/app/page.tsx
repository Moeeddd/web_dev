'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import LoginPage from '@/components/LoginPage';
import CommandCenter from '@/components/CommandCenter';

export default function Home() {
  const user = useAppStore(s => s.user);
  const token = useAppStore(s => s.token);
  const setAuth = useAppStore(s => s.setAuth);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Restore session from localStorage
    const savedToken = localStorage.getItem('horizon_token');
    const savedUser = localStorage.getItem('horizon_user');
    if (savedToken && savedUser) {
      try {
        setAuth(JSON.parse(savedUser), savedToken);
      } catch {
        localStorage.removeItem('horizon_token');
        localStorage.removeItem('horizon_user');
      }
    }
    setHydrated(true);
  }, [setAuth]);

  if (!hydrated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cyan-400 text-lg font-medium">Initializing Horizon Command...</p>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <LoginPage />;
  }

  return <CommandCenter />;
}

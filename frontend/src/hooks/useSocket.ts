'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '@/store';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const token = useAppStore(s => s.token);
  const setShips = useAppStore(s => s.setShips);
  const addAlert = useAppStore(s => s.addAlert);
  const acknowledgeAlert = useAppStore(s => s.acknowledgeAlert);
  const addZone = useAppStore(s => s.addZone);
  const removeZone = useAppStore(s => s.removeZone);
  const addDirective = useAppStore(s => s.addDirective);
  const updateDirective = useAppStore(s => s.updateDirective);
  const addDistress = useAppStore(s => s.addDistress);
  const setAnalytics = useAppStore(s => s.setAnalytics);
  const addProximityWarning = useAppStore(s => s.addProximityWarning);

  const connect = useCallback(() => {
    if (!token || socketRef.current?.connected) return;

    const wsUrl = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_WS_URL || window.location.origin)
      : 'http://localhost';

    const s = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 50,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      console.log('🔌 WebSocket connected');
    });

    s.on('ships:update', (ships) => {
      setShips(ships);
    });

    s.on('alert:new', (alert) => {
      addAlert(alert);
    });

    s.on('alert:acknowledge', (alertId) => {
      acknowledgeAlert(alertId);
    });

    s.on('zone:created', (zone) => {
      addZone(zone);
    });

    s.on('zone:deleted', (zoneId) => {
      removeZone(zoneId);
    });

    s.on('directive:new', (directive) => {
      addDirective(directive);
    });

    s.on('directive:update', (directive) => {
      updateDirective(directive);
    });

    s.on('distress:new', (distress) => {
      addDistress(distress);
    });

    s.on('analytics:update', (analytics) => {
      setAnalytics(analytics);
    });

    s.on('proximity:warning', (data) => {
      addProximityWarning(data);
    });

    s.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
    });

    s.on('connect_error', (err) => {
      console.error('WebSocket error:', err.message);
    });

    socketRef.current = s;
    socket = s;

    return () => {
      s.disconnect();
      socketRef.current = null;
      socket = null;
    };
  }, [token, setShips, addAlert, acknowledgeAlert, addZone, removeZone, addDirective, updateDirective, addDistress, setAnalytics, addProximityWarning]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect]);

  return socketRef.current;
}

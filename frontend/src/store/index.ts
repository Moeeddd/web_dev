import { create } from 'zustand';

export interface Position {
  lat: number;
  lng: number;
}

export interface Ship {
  shipId: string;
  name: string;
  position: Position;
  speed: number;
  heading: number;
  destination: string;
  fuel: number;
  cargo: string;
  status: string;
  route?: Position[];
  eta?: string;
  weatherCondition?: string;
  riskLevel?: string;
}

export interface Alert {
  id: string;
  type: string;
  priority: string;
  shipId?: string;
  shipName?: string;
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  metadata?: Record<string, unknown>;
}

export interface RestrictedZone {
  id: string;
  name: string;
  polygon: Position[];
  severity: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
}

export interface Directive {
  id: string;
  shipId: string;
  shipName: string;
  issuedBy: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface DistressMessage {
  id: string;
  shipId: string;
  shipName: string;
  message: string;
  timestamp: string;
  position: Position;
  aiAnalysis?: {
    severity: string;
    incidentType: string;
    injuries: number;
    damageEstimate: string;
    recommendedPriority: string;
    operationalImpact: string;
    recommendations: string[];
  };
}

export interface User {
  id: string;
  username: string;
  role: 'command' | 'captain';
  assignedShipId?: string;
  assignedShipName?: string;
}

export interface FleetAnalytics {
  totalFuel: number;
  avgFuel: number;
  shipsByStatus: Record<string, number>;
  activeAlerts: number;
  criticalAlerts: number;
  avgSpeed: number;
  cargoDistribution: Record<string, number>;
  riskDistribution: Record<string, number>;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;

  // Ships
  ships: Ship[];
  selectedShipId: string | null;
  setShips: (ships: Ship[]) => void;
  updateShip: (ship: Ship) => void;
  selectShip: (shipId: string | null) => void;

  // Alerts
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (alertId: string) => void;
  clearAlerts: () => void;

  // Restricted Zones
  zones: RestrictedZone[];
  addZone: (zone: RestrictedZone) => void;
  removeZone: (zoneId: string) => void;

  // Directives
  directives: Directive[];
  addDirective: (directive: Directive) => void;
  updateDirective: (directive: Directive) => void;

  // Distress
  distressMessages: DistressMessage[];
  addDistress: (distress: DistressMessage) => void;

  // Analytics
  analytics: FleetAnalytics | null;
  setAnalytics: (analytics: FleetAnalytics) => void;

  // UI state
  activePanel: 'alerts' | 'ships' | 'analytics' | 'directives' | 'distress' | 'playback';
  setActivePanel: (panel: AppState['activePanel']) => void;
  isDrawingZone: boolean;
  setIsDrawingZone: (v: boolean) => void;
  showCommandPalette: boolean;
  setShowCommandPalette: (v: boolean) => void;

  // Proximity warnings
  proximityWarnings: { ship1: string; ship2: string; distance: number }[];
  addProximityWarning: (w: { ship1: string; ship2: string; distance: number }) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  token: null,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('horizon_token', token);
      localStorage.setItem('horizon_user', JSON.stringify(user));
    }
    set({ user, token });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('horizon_token');
      localStorage.removeItem('horizon_user');
    }
    set({ user: null, token: null });
  },

  // Ships
  ships: [],
  selectedShipId: null,
  setShips: (ships) => set({ ships }),
  updateShip: (ship) => set((state) => ({
    ships: state.ships.map(s => s.shipId === ship.shipId ? ship : s),
  })),
  selectShip: (shipId) => set({ selectedShipId: shipId }),

  // Alerts
  alerts: [],
  addAlert: (alert) => set((state) => {
    const exists = state.alerts.find(a => a.id === alert.id);
    if (exists) return state;
    return { alerts: [alert, ...state.alerts].slice(0, 200) };
  }),
  acknowledgeAlert: (alertId) => set((state) => ({
    alerts: state.alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a),
  })),
  clearAlerts: () => set({ alerts: [] }),

  // Zones
  zones: [],
  addZone: (zone) => set((state) => {
    const exists = state.zones.find(z => z.id === zone.id);
    if (exists) return state;
    return { zones: [...state.zones, zone] };
  }),
  removeZone: (zoneId) => set((state) => ({
    zones: state.zones.filter(z => z.id !== zoneId),
  })),

  // Directives
  directives: [],
  addDirective: (directive) => set((state) => {
    const exists = state.directives.find(d => d.id === directive.id);
    if (exists) return state;
    return { directives: [directive, ...state.directives].slice(0, 100) };
  }),
  updateDirective: (directive) => set((state) => ({
    directives: state.directives.map(d => d.id === directive.id ? directive : d),
  })),

  // Distress
  distressMessages: [],
  addDistress: (distress) => set((state) => {
    const exists = state.distressMessages.find(d => d.id === distress.id);
    if (exists) return state;
    return { distressMessages: [distress, ...state.distressMessages].slice(0, 50) };
  }),

  // Analytics
  analytics: null,
  setAnalytics: (analytics) => set({ analytics }),

  // UI
  activePanel: 'ships',
  setActivePanel: (panel) => set({ activePanel: panel }),
  isDrawingZone: false,
  setIsDrawingZone: (v) => set({ isDrawingZone: v }),
  showCommandPalette: false,
  setShowCommandPalette: (v) => set({ showCommandPalette: v }),

  // Proximity
  proximityWarnings: [],
  addProximityWarning: (w) => set((state) => ({
    proximityWarnings: [w, ...state.proximityWarnings.filter(
      pw => !(pw.ship1 === w.ship1 && pw.ship2 === w.ship2)
    )].slice(0, 20),
  })),
}));

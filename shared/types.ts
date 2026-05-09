// Shared types between frontend and backend

export interface Position {
  lat: number;
  lng: number;
}

export type ShipStatus = 'normal' | 'warning' | 'danger' | 'stranded' | 'rerouting' | 'distress';

export interface Ship {
  shipId: string;
  name: string;
  position: Position;
  speed: number;
  heading: number;
  destination: string;
  fuel: number;
  cargo: string;
  status: ShipStatus;
  route?: Position[];
  eta?: string;
  weatherCondition?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface Port {
  id: string;
  name: string;
  position: Position;
}

export interface RestrictedZone {
  id: string;
  name: string;
  polygon: Position[];
  createdBy: string;
  createdAt: string;
  severity: 'warning' | 'danger' | 'critical';
  active: boolean;
}

export type AlertType = 'geofence_breach' | 'distress' | 'collision_risk' | 'fuel_shortage' | 'stranded' | 'severe_weather' | 'rerouting';
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  shipId?: string;
  shipName?: string;
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  position?: Position;
  metadata?: Record<string, unknown>;
}

export interface Directive {
  id: string;
  shipId: string;
  shipName: string;
  issuedBy: string;
  type: 'reroute' | 'hold_position' | 'change_speed' | 'emergency_stop' | 'proceed' | 'escort' | 'fuel_transfer';
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface DistressMessage {
  id: string;
  shipId: string;
  shipName: string;
  message: string;
  timestamp: string;
  position: Position;
  aiAnalysis?: AIAnalysis;
}

export interface AIAnalysis {
  severity: 'low' | 'medium' | 'high' | 'critical';
  incidentType: string;
  injuries: number;
  damageEstimate: string;
  recommendedPriority: string;
  operationalImpact: string;
  recommendations: string[];
}

export interface WeatherData {
  position: Position;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  waveHeight: number;
  weatherCode: number;
  severity: 'calm' | 'moderate' | 'rough' | 'severe' | 'extreme';
  description: string;
}

export interface PlaybackSnapshot {
  timestamp: string;
  ships: Ship[];
  alerts: Alert[];
  restrictedZones: RestrictedZone[];
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
  shipsByStatus: Record<ShipStatus, number>;
  activeAlerts: number;
  criticalAlerts: number;
  avgSpeed: number;
  cargoDistribution: Record<string, number>;
  riskDistribution: Record<string, number>;
}

// WebSocket event types
export interface ServerToClientEvents {
  'ships:update': (ships: Ship[]) => void;
  'ship:update': (ship: Ship) => void;
  'alert:new': (alert: Alert) => void;
  'alert:acknowledge': (alertId: string) => void;
  'zone:created': (zone: RestrictedZone) => void;
  'zone:deleted': (zoneId: string) => void;
  'directive:new': (directive: Directive) => void;
  'directive:update': (directive: Directive) => void;
  'distress:new': (distress: DistressMessage) => void;
  'weather:update': (weather: WeatherData[]) => void;
  'proximity:warning': (data: { ship1: string; ship2: string; distance: number }) => void;
  'analytics:update': (analytics: FleetAnalytics) => void;
  'playback:snapshot': (snapshot: PlaybackSnapshot) => void;
}

export interface ClientToServerEvents {
  'zone:create': (zone: Omit<RestrictedZone, 'id' | 'createdAt'>) => void;
  'zone:delete': (zoneId: string) => void;
  'directive:issue': (directive: Omit<Directive, 'id' | 'createdAt' | 'status'>) => void;
  'directive:respond': (data: { directiveId: string; status: 'accepted' | 'rejected' }) => void;
  'distress:send': (data: { shipId: string; message: string }) => void;
  'alert:acknowledge': (alertId: string) => void;
  'playback:request': (data: { from: string; to: string }) => void;
}

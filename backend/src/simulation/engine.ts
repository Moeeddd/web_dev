import { PrismaClient } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import { config } from '../config';
import { logger } from '../config/logger';
import {
  haversineDistance,
  calculateBearing,
  moveAlongBearing,
  knotsToKmh,
  isPointInPolygon,
  calculateETA,
  generateRoute,
  normalizeBearing,
} from '../services/geo';
import { fetchWeatherBatch } from '../services/weather';
import { v4 as uuid } from 'uuid';

interface Position {
  lat: number;
  lng: number;
}

interface ShipState {
  shipId: string;
  name: string;
  position: Position;
  speed: number;
  heading: number;
  destination: string;
  fuel: number;
  cargo: string;
  status: string;
  route: Position[];
  routeIndex: number;
  weatherSeverity: string;
  riskLevel: string;
}

interface RestrictedZoneState {
  id: string;
  polygon: Position[];
  severity: string;
  active: boolean;
}

export class SimulationEngine {
  private ships: Map<string, ShipState> = new Map();
  private zones: RestrictedZoneState[] = [];
  private weatherCache: Map<string, { severity: string; description: string; windSpeed: number; waveHeight: number }> = new Map();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private weatherTimer: ReturnType<typeof setInterval> | null = null;
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;
  private prisma: PrismaClient;
  private io: SocketServer;
  private tickCount = 0;

  constructor(prisma: PrismaClient, io: SocketServer) {
    this.prisma = prisma;
    this.io = io;
  }

  async initialize(): Promise<void> {
    logger.info('🚀 Initializing simulation engine...');

    // Load ships from database
    const dbShips = await this.prisma.ship.findMany();
    for (const ship of dbShips) {
      const dest = config.ports.find(p => p.id === ship.destination);
      const position: Position = { lat: ship.lat, lng: ship.lng };
      const destPosition = dest?.position || position;

      const route = generateRoute(position, destPosition, []);

      this.ships.set(ship.shipId, {
        shipId: ship.shipId,
        name: ship.name,
        position,
        speed: ship.speed,
        heading: ship.heading,
        destination: ship.destination,
        fuel: ship.fuel,
        cargo: ship.cargo,
        status: ship.status,
        route,
        routeIndex: 0,
        weatherSeverity: 'calm',
        riskLevel: ship.riskLevel || 'low',
      });
    }

    // Load restricted zones
    const dbZones = await this.prisma.restrictedZone.findMany({ where: { active: true } });
    this.zones = dbZones.map(z => ({
      id: z.id,
      polygon: typeof z.polygon === 'string' ? JSON.parse(z.polygon) : z.polygon as unknown as Position[],
      severity: z.severity,
      active: z.active,
    }));

    // Regenerate routes considering zones
    for (const [, ship] of this.ships) {
      const dest = config.ports.find(p => p.id === ship.destination);
      if (dest) {
        ship.route = generateRoute(ship.position, dest.position, this.zones);
        ship.routeIndex = 0;
      }
    }

    logger.info(`✅ Loaded ${this.ships.size} ships, ${this.zones.length} restricted zones`);
  }

  start(): void {
    // Main simulation tick - every second
    this.tickTimer = setInterval(() => this.tick(), config.simulation.tickInterval);

    // Weather update - every 5 minutes
    this.weatherTimer = setInterval(() => this.updateWeather(), 300000);

    // Playback snapshots - every 30 seconds
    this.snapshotTimer = setInterval(() => this.saveSnapshot(), config.simulation.snapshotInterval);

    // Initial weather fetch
    setTimeout(() => this.updateWeather(), 2000);

    logger.info('⚡ Simulation engine started');
  }

  stop(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.weatherTimer) clearInterval(this.weatherTimer);
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
    logger.info('Simulation engine stopped');
  }

  private async tick(): Promise<void> {
    this.tickCount++;

    for (const [shipId, ship] of this.ships) {
      if (ship.status === 'stranded') continue;

      // Move ship
      this.moveShip(ship);

      // Consume fuel
      this.consumeFuel(ship);

      // Check zone violations
      this.checkZoneViolations(ship);

      // Update risk level
      this.updateRiskLevel(ship);

      // Persist to DB every 10 ticks
      if (this.tickCount % 10 === 0) {
        await this.persistShip(ship);
      }
    }

    // Check proximity warnings every 5 ticks
    if (this.tickCount % 5 === 0) {
      this.checkProximityWarnings();
    }

    // Emit ship updates
    const shipData = this.getShipsArray();
    this.io.emit('ships:update', shipData);

    // Emit analytics every 10 ticks
    if (this.tickCount % 10 === 0) {
      this.emitAnalytics();
    }

    // Record history every 30 ticks
    if (this.tickCount % 30 === 0) {
      await this.recordHistory();
    }
  }

  private moveShip(ship: ShipState): void {
    if (ship.speed <= 0 || ship.status === 'stranded') return;

    const dest = config.ports.find(p => p.id === ship.destination);
    if (!dest) return;

    const distToDest = haversineDistance(ship.position, dest.position);

    // Arrived at destination
    if (distToDest < 2) {
      // Pick a new random destination
      const otherPorts = config.ports.filter(p => p.id !== ship.destination);
      const newDest = otherPorts[Math.floor(Math.random() * otherPorts.length)];
      ship.destination = newDest.id;
      ship.route = generateRoute(ship.position, newDest.position, this.zones);
      ship.routeIndex = 0;
      return;
    }

    // Determine target - follow route waypoints
    let target = dest.position;
    if (ship.route.length > 0 && ship.routeIndex < ship.route.length) {
      target = ship.route[ship.routeIndex];
      const distToWaypoint = haversineDistance(ship.position, target);
      if (distToWaypoint < 3) {
        ship.routeIndex = Math.min(ship.routeIndex + 1, ship.route.length - 1);
        target = ship.route[ship.routeIndex];
      }
    }

    // Calculate movement
    const targetBearing = calculateBearing(ship.position, target);
    const normalizedTarget = normalizeBearing(targetBearing);

    // Smooth heading change (max 5 degrees per tick)
    let headingDiff = normalizedTarget - ship.heading;
    if (headingDiff > 180) headingDiff -= 360;
    if (headingDiff < -180) headingDiff += 360;
    const maxTurn = 5;
    const turn = Math.max(-maxTurn, Math.min(maxTurn, headingDiff));
    ship.heading = normalizeBearing(ship.heading + turn);

    // Distance per tick (1 second)
    const speedKmh = knotsToKmh(ship.speed);
    const distPerTick = speedKmh / 3600; // km per second

    // Move ship
    const newPos = moveAlongBearing(ship.position, ship.heading, distPerTick);
    ship.position = newPos;
  }

  private consumeFuel(ship: ShipState): void {
    let consumption = config.simulation.fuelConsumptionRate * (ship.speed / 14);

    // Weather penalty
    const weather = this.weatherCache.get(ship.shipId);
    if (weather && (weather.severity === 'rough' || weather.severity === 'severe' || weather.severity === 'extreme')) {
      consumption *= (1 + config.simulation.weatherFuelPenalty);
    }

    ship.fuel = Math.max(0, ship.fuel - consumption);

    // Fuel warnings
    if (ship.fuel < 500 && ship.fuel > 0 && this.tickCount % 60 === 0) {
      this.createAlert({
        type: 'fuel_shortage',
        priority: ship.fuel < 200 ? 'critical' : 'high',
        shipId: ship.shipId,
        shipName: ship.name,
        title: `Fuel Critical: ${ship.name}`,
        message: `${ship.name} has only ${Math.round(ship.fuel)} tons of fuel remaining`,
      });
    }

    if (ship.fuel <= 0) {
      ship.status = 'stranded';
      ship.speed = 0;
      this.createAlert({
        type: 'stranded',
        priority: 'critical',
        shipId: ship.shipId,
        shipName: ship.name,
        title: `STRANDED: ${ship.name}`,
        message: `${ship.name} has run out of fuel and is now adrift`,
      });
    }
  }

  private checkZoneViolations(ship: ShipState): void {
    for (const zone of this.zones) {
      if (!zone.active) continue;

      if (isPointInPolygon(ship.position, zone.polygon)) {
        if (ship.status !== 'danger' && ship.status !== 'rerouting') {
          ship.status = 'danger';

          this.createAlert({
            type: 'geofence_breach',
            priority: 'critical',
            shipId: ship.shipId,
            shipName: ship.name,
            title: `GEOFENCE BREACH: ${ship.name}`,
            message: `${ship.name} has entered a restricted zone`,
          });

          // Auto-reroute
          this.rerouteShip(ship);
        }
      }
    }
  }

  private rerouteShip(ship: ShipState): void {
    const dest = config.ports.find(p => p.id === ship.destination);
    if (!dest) return;

    ship.status = 'rerouting';
    ship.route = generateRoute(ship.position, dest.position, this.zones);
    ship.routeIndex = 0;

    this.createAlert({
      type: 'rerouting',
      priority: 'high',
      shipId: ship.shipId,
      shipName: ship.name,
      title: `REROUTING: ${ship.name}`,
      message: `${ship.name} is being rerouted to avoid restricted zones`,
    });

    // Notify via WebSocket
    this.io.emit('ship:update', this.serializeShip(ship));
  }

  private updateRiskLevel(ship: ShipState): void {
    const weather = this.weatherCache.get(ship.shipId);
    let risk = 'low';

    if (ship.fuel < 500) risk = 'high';
    if (ship.fuel < 200) risk = 'critical';
    if (ship.status === 'danger' || ship.status === 'stranded') risk = 'critical';
    if (ship.status === 'rerouting') risk = risk === 'low' ? 'medium' : risk;
    if (weather && (weather.severity === 'severe' || weather.severity === 'extreme')) {
      risk = risk === 'low' ? 'high' : risk;
    }

    ship.riskLevel = risk;
  }

  private checkProximityWarnings(): void {
    const shipArray = Array.from(this.ships.values());

    for (let i = 0; i < shipArray.length; i++) {
      for (let j = i + 1; j < shipArray.length; j++) {
        const dist = haversineDistance(shipArray[i].position, shipArray[j].position);

        if (dist < config.simulation.proximityWarningDistance) {
          this.io.emit('proximity:warning', {
            ship1: shipArray[i].shipId,
            ship2: shipArray[j].shipId,
            distance: Math.round(dist * 100) / 100,
          });

          if (this.tickCount % 30 === 0) {
            this.createAlert({
              type: 'collision_risk',
              priority: dist < 1 ? 'critical' : 'high',
              shipId: shipArray[i].shipId,
              shipName: shipArray[i].name,
              title: `COLLISION RISK: ${shipArray[i].name} ↔ ${shipArray[j].name}`,
              message: `Ships are ${dist.toFixed(2)}km apart`,
            });
          }
        }
      }
    }
  }

  private async updateWeather(): Promise<void> {
    try {
      const positions = Array.from(this.ships.values()).map(s => ({
        lat: s.position.lat,
        lng: s.position.lng,
        shipId: s.shipId,
      }));

      const weatherData = await fetchWeatherBatch(positions);

      for (const [shipId, data] of weatherData) {
        this.weatherCache.set(shipId, data);
        const ship = this.ships.get(shipId);
        if (ship) {
          ship.weatherSeverity = data.severity;

          if (data.severity === 'severe' || data.severity === 'extreme') {
            this.createAlert({
              type: 'severe_weather',
              priority: data.severity === 'extreme' ? 'critical' : 'high',
              shipId,
              shipName: ship.name,
              title: `Severe Weather: ${ship.name}`,
              message: `${data.description} - Wind: ${data.windSpeed}km/h, Waves: ${data.waveHeight}m`,
            });
          }
        }
      }

      // Emit weather update
      const weatherArray = Array.from(weatherData.entries()).map(([shipId, data]) => {
        const ship = this.ships.get(shipId);
        return {
          position: ship?.position || { lat: 0, lng: 0 },
          ...data,
          temperature: data.windSpeed, // reuse field
        };
      });

      this.io.emit('weather:update', weatherArray);
      logger.info('🌤️ Weather updated for all ships');
    } catch (error) {
      logger.error('Weather update failed', { error });
    }
  }

  private async persistShip(ship: ShipState): Promise<void> {
    try {
      await this.prisma.ship.update({
        where: { shipId: ship.shipId },
        data: {
          lat: ship.position.lat,
          lng: ship.position.lng,
          speed: ship.speed,
          heading: ship.heading,
          fuel: ship.fuel,
          status: ship.status,
          destination: ship.destination,
          route: JSON.stringify(ship.route),
          riskLevel: ship.riskLevel,
        },
      });
    } catch (error) {
      logger.error('Failed to persist ship', { shipId: ship.shipId, error });
    }
  }

  private async recordHistory(): Promise<void> {
    try {
      const historyRecords = Array.from(this.ships.values()).map(ship => ({
        shipId: ship.shipId,
        lat: ship.position.lat,
        lng: ship.position.lng,
        speed: ship.speed,
        heading: ship.heading,
        fuel: ship.fuel,
        status: ship.status,
      }));

      await this.prisma.shipHistory.createMany({ data: historyRecords });
    } catch (error) {
      logger.error('Failed to record history', { error });
    }
  }

  private async saveSnapshot(): Promise<void> {
    try {
      const ships = this.getShipsArray();
      const alerts = await this.prisma.alert.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 3600000) } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      await this.prisma.playbackSnapshot.create({
        data: {
          data: JSON.stringify({ ships, alertCount: alerts.length }),
        },
      });

      // Clean old snapshots (keep last hour)
      await this.prisma.playbackSnapshot.deleteMany({
        where: { timestamp: { lt: new Date(Date.now() - 3600000) } },
      });
      await this.prisma.shipHistory.deleteMany({
        where: { timestamp: { lt: new Date(Date.now() - 3600000) } },
      });
    } catch (error) {
      logger.error('Failed to save snapshot', { error });
    }
  }

  private createAlert(data: {
    type: string;
    priority: string;
    shipId?: string;
    shipName?: string;
    title: string;
    message: string;
  }): void {
    const alert = {
      id: uuid(),
      ...data,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    // Save to DB asynchronously
    this.prisma.alert.create({
      data: {
        id: alert.id,
        type: alert.type,
        priority: alert.priority,
        shipId: alert.shipId,
        title: alert.title,
        message: alert.message,
        acknowledged: false,
      },
    }).catch(err => logger.error('Alert save failed', { err }));

    // Emit to all clients
    this.io.emit('alert:new', alert);
  }

  private serializeShip(ship: ShipState) {
    const dest = config.ports.find(p => p.id === ship.destination);
    const weather = this.weatherCache.get(ship.shipId);

    return {
      shipId: ship.shipId,
      name: ship.name,
      position: ship.position,
      speed: ship.speed,
      heading: ship.heading,
      destination: ship.destination,
      fuel: Math.round(ship.fuel),
      cargo: ship.cargo,
      status: ship.status,
      route: ship.route,
      eta: dest ? calculateETA(ship.position, dest.position, ship.speed).toISOString() : undefined,
      weatherCondition: weather?.description || 'Unknown',
      riskLevel: ship.riskLevel,
    };
  }

  getShipsArray() {
    return Array.from(this.ships.values()).map(s => this.serializeShip(s));
  }

  getShip(shipId: string) {
    const ship = this.ships.get(shipId);
    return ship ? this.serializeShip(ship) : null;
  }

  getWeatherForShip(shipId: string) {
    return this.weatherCache.get(shipId);
  }

  addRestrictedZone(zone: RestrictedZoneState): void {
    this.zones.push(zone);

    // Check all ships and reroute if needed
    for (const [, ship] of this.ships) {
      if (isPointInPolygon(ship.position, zone.polygon)) {
        this.rerouteShip(ship);
      } else {
        // Check if current route intersects
        const dest = config.ports.find(p => p.id === ship.destination);
        if (dest) {
          ship.route = generateRoute(ship.position, dest.position, this.zones);
          ship.routeIndex = 0;
        }
      }
    }
  }

  removeRestrictedZone(zoneId: string): void {
    this.zones = this.zones.filter(z => z.id !== zoneId);

    // Recalculate routes
    for (const [, ship] of this.ships) {
      const dest = config.ports.find(p => p.id === ship.destination);
      if (dest) {
        ship.route = generateRoute(ship.position, dest.position, this.zones);
        ship.routeIndex = 0;
        if (ship.status === 'rerouting') {
          ship.status = 'normal';
        }
      }
    }
  }

  private emitAnalytics(): void {
    const ships = Array.from(this.ships.values());
    const totalFuel = ships.reduce((sum, s) => sum + s.fuel, 0);
    const avgFuel = totalFuel / ships.length;
    const avgSpeed = ships.reduce((sum, s) => sum + s.speed, 0) / ships.length;

    const shipsByStatus: Record<string, number> = {};
    const cargoDistribution: Record<string, number> = {};
    const riskDistribution: Record<string, number> = {};

    for (const ship of ships) {
      shipsByStatus[ship.status] = (shipsByStatus[ship.status] || 0) + 1;
      cargoDistribution[ship.cargo] = (cargoDistribution[ship.cargo] || 0) + 1;
      riskDistribution[ship.riskLevel] = (riskDistribution[ship.riskLevel] || 0) + 1;
    }

    this.io.emit('analytics:update', {
      totalFuel: Math.round(totalFuel),
      avgFuel: Math.round(avgFuel),
      shipsByStatus,
      activeAlerts: 0,
      criticalAlerts: 0,
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      cargoDistribution,
      riskDistribution,
    });
  }
}

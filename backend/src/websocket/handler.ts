import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { logger } from '../config/logger';
import { SimulationEngine } from '../simulation/engine';
import { analyzeDistressMessage } from '../services/ai';
import { v4 as uuid } from 'uuid';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    username: string;
    role: string;
    assignedShipId?: string;
  };
}

export function setupWebSocket(
  httpServer: HttpServer,
  prisma: PrismaClient,
  simulation: SimulationEngine
): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token as string, config.jwtSecret) as {
        id: string;
        username: string;
        role: string;
        assignedShipId?: string;
      };
      socket.data = {
        userId: decoded.id,
        username: decoded.username,
        role: decoded.role,
        assignedShipId: decoded.assignedShipId,
      };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const { username, role, assignedShipId } = socket.data;

    logger.info(`🔌 Client connected: ${username} (${role})`, { socketId: socket.id });

    // Send initial data
    socket.emit('ships:update', simulation.getShipsArray());

    // Load and send existing alerts
    prisma.alert.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 3600000) } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }).then(alerts => {
      for (const alert of alerts) {
        socket.emit('alert:new', {
          id: alert.id,
          type: alert.type,
          priority: alert.priority,
          shipId: alert.shipId,
          title: alert.title,
          message: alert.message,
          timestamp: alert.createdAt.toISOString(),
          acknowledged: alert.acknowledged,
        });
      }
    });

    // Load and send restricted zones
    prisma.restrictedZone.findMany({ where: { active: true } }).then(zones => {
      for (const zone of zones) {
        socket.emit('zone:created', {
          id: zone.id,
          name: zone.name,
          polygon: typeof zone.polygon === 'string' ? JSON.parse(zone.polygon) : zone.polygon,
          severity: zone.severity,
          active: zone.active,
          createdBy: zone.createdBy,
          createdAt: zone.createdAt.toISOString(),
        });
      }
    });

    // Load existing directives
    prisma.directive.findMany({
      where: assignedShipId ? { shipId: assignedShipId } : {},
      orderBy: { createdAt: 'desc' },
      take: 20,
    }).then(directives => {
      for (const d of directives) {
        socket.emit('directive:new', {
          id: d.id,
          shipId: d.shipId,
          shipName: '',
          issuedBy: d.issuedBy,
          type: d.type,
          message: d.message,
          status: d.status,
          createdAt: d.createdAt.toISOString(),
        });
      }
    });

    // === EVENT HANDLERS ===

    // Create restricted zone (Command only)
    socket.on('zone:create', async (data) => {
      if (role !== 'command') return;

      try {
        const zone = await prisma.restrictedZone.create({
          data: {
            name: data.name || 'Restricted Zone',
            polygon: JSON.stringify(data.polygon),
            severity: data.severity || 'danger',
            active: true,
            createdBy: socket.data.userId,
          },
        });

        const zoneData = {
          id: zone.id,
          name: zone.name,
          polygon: data.polygon,
          severity: zone.severity,
          active: true,
          createdBy: socket.data.userId,
          createdAt: zone.createdAt.toISOString(),
        };

        // Update simulation
        simulation.addRestrictedZone({
          id: zone.id,
          polygon: data.polygon,
          severity: zone.severity,
          active: true,
        });

        // Broadcast to all clients
        io.emit('zone:created', zoneData);
        logger.info(`🚧 Zone created: ${zone.name}`, { zoneId: zone.id });
      } catch (error) {
        logger.error('Failed to create zone', { error });
      }
    });

    // Delete restricted zone (Command only)
    socket.on('zone:delete', async (zoneId) => {
      if (role !== 'command') return;

      try {
        await prisma.restrictedZone.update({
          where: { id: zoneId },
          data: { active: false },
        });

        simulation.removeRestrictedZone(zoneId);
        io.emit('zone:deleted', zoneId);
        logger.info(`🚧 Zone deleted: ${zoneId}`);
      } catch (error) {
        logger.error('Failed to delete zone', { error });
      }
    });

    // Issue directive (Command only)
    socket.on('directive:issue', async (data) => {
      if (role !== 'command') return;

      try {
        const ship = await prisma.ship.findUnique({ where: { shipId: data.shipId } });
        if (!ship) return;

        const directive = await prisma.directive.create({
          data: {
            shipId: data.shipId,
            issuedBy: socket.data.userId,
            type: data.type,
            message: data.message,
            status: 'pending',
          },
        });

        const directiveData = {
          id: directive.id,
          shipId: data.shipId,
          shipName: ship.name,
          issuedBy: socket.data.username,
          type: data.type,
          message: data.message,
          status: 'pending',
          createdAt: directive.createdAt.toISOString(),
        };

        io.emit('directive:new', directiveData);
        logger.info(`📋 Directive issued for ${ship.name}`, { type: data.type });
      } catch (error) {
        logger.error('Failed to issue directive', { error });
      }
    });

    // Respond to directive (Captain only)
    socket.on('directive:respond', async (data) => {
      if (role !== 'captain') return;

      try {
        const directive = await prisma.directive.update({
          where: { id: data.directiveId },
          data: { status: data.status },
        });

        const directiveData = {
          id: directive.id,
          shipId: directive.shipId,
          shipName: '',
          issuedBy: directive.issuedBy,
          type: directive.type,
          message: directive.message,
          status: data.status,
          createdAt: directive.createdAt.toISOString(),
        };

        io.emit('directive:update', directiveData);
        logger.info(`📋 Directive ${data.status}: ${directive.id}`);
      } catch (error) {
        logger.error('Failed to respond to directive', { error });
      }
    });

    // Send distress message (Captain only)
    socket.on('distress:send', async (data) => {
      try {
        const ship = simulation.getShip(data.shipId);
        if (!ship) return;

        // Run AI analysis
        const aiAnalysis = await analyzeDistressMessage(
          data.message,
          ship.name,
          ship.position
        );

        const distress = await prisma.distressMessage.create({
          data: {
            shipId: data.shipId,
            message: data.message,
            lat: ship.position.lat,
            lng: ship.position.lng,
            aiAnalysis: JSON.stringify(aiAnalysis),
          },
        });

        const distressData = {
          id: distress.id,
          shipId: data.shipId,
          shipName: ship.name,
          message: data.message,
          timestamp: distress.createdAt.toISOString(),
          position: ship.position,
          aiAnalysis,
        };

        io.emit('distress:new', distressData);

        // Auto-create alert from distress
        io.emit('alert:new', {
          id: uuid(),
          type: 'distress',
          priority: aiAnalysis.severity,
          shipId: data.shipId,
          shipName: ship.name,
          title: `DISTRESS: ${ship.name} - ${aiAnalysis.incidentType}`,
          message: data.message,
          timestamp: new Date().toISOString(),
          acknowledged: false,
          metadata: aiAnalysis,
        });

        logger.info(`🆘 Distress from ${ship.name}: ${data.message}`);
      } catch (error) {
        logger.error('Failed to process distress', { error });
      }
    });

    // Acknowledge alert
    socket.on('alert:acknowledge', async (alertId) => {
      try {
        await prisma.alert.update({
          where: { id: alertId },
          data: {
            acknowledged: true,
            acknowledgedBy: socket.data.userId,
          },
        });

        io.emit('alert:acknowledge', alertId);
      } catch (error) {
        logger.error('Failed to acknowledge alert', { error });
      }
    });

    // Playback request
    socket.on('playback:request', async (data) => {
      try {
        const from = new Date(data.from);
        const to = new Date(data.to);

        const snapshots = await prisma.playbackSnapshot.findMany({
          where: {
            timestamp: { gte: from, lte: to },
          },
          orderBy: { timestamp: 'asc' },
        });

        for (const snapshot of snapshots) {
          const parsed = typeof snapshot.data === 'string'
            ? JSON.parse(snapshot.data)
            : snapshot.data;

          socket.emit('playback:snapshot', {
            timestamp: snapshot.timestamp.toISOString(),
            ships: parsed.ships || [],
            alerts: [],
            restrictedZones: [],
          });
        }
      } catch (error) {
        logger.error('Playback request failed', { error });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Client disconnected: ${username}`);
    });
  });

  return io;
}

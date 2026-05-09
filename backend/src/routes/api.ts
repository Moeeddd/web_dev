import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { config } from '../config';
import { logger } from '../config/logger';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { SimulationEngine } from '../simulation/engine';
import { getFleetAdvisorSuggestion } from '../services/ai';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export function createRoutes(prisma: PrismaClient, simulation: SimulationEngine): Router {
  const router = Router();

  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'horizon-command' });
  });

  // Login
  router.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          assignedShipId: user.assignedShipId,
        },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      // Get ship name if captain
      let assignedShipName: string | undefined;
      if (user.assignedShipId) {
        const ship = await prisma.ship.findUnique({ where: { shipId: user.assignedShipId } });
        assignedShipName = ship?.name;
      }

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          assignedShipId: user.assignedShipId,
          assignedShipName,
        },
      });

      logger.info(`🔑 Login: ${username} (${user.role})`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
        return;
      }
      logger.error('Login error', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verify token
  router.get('/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
    res.json({ user: req.user });
  });

  // Get all ships
  router.get('/ships', authenticateToken, (_req: AuthRequest, res: Response) => {
    const ships = simulation.getShipsArray();
    res.json(ships);
  });

  // Get single ship
  router.get('/ships/:shipId', authenticateToken, (req: AuthRequest, res: Response) => {
    const ship = simulation.getShip(req.params.shipId as string);
    if (!ship) {
      res.status(404).json({ error: 'Ship not found' });
      return;
    }
    res.json(ship);
  });

  // Get ports
  router.get('/ports', authenticateToken, (_req: AuthRequest, res: Response) => {
    res.json(config.ports);
  });

  // Get navigable water polygon
  router.get('/navigable-water', authenticateToken, (_req: AuthRequest, res: Response) => {
    res.json(config.navigableWater);
  });

  // Get alerts
  router.get('/alerts', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const alerts = await prisma.alert.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 3600000) } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      res.json(alerts.map(a => ({
        id: a.id,
        type: a.type,
        priority: a.priority,
        shipId: a.shipId,
        title: a.title,
        message: a.message,
        timestamp: a.createdAt.toISOString(),
        acknowledged: a.acknowledged,
      })));
    } catch (error) {
      logger.error('Failed to fetch alerts', { error });
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  // Get restricted zones
  router.get('/zones', authenticateToken, async (_req: AuthRequest, res: Response) => {
    try {
      const zones = await prisma.restrictedZone.findMany({ where: { active: true } });
      res.json(zones.map(z => ({
        id: z.id,
        name: z.name,
        polygon: typeof z.polygon === 'string' ? JSON.parse(z.polygon) : z.polygon,
        severity: z.severity,
        active: z.active,
        createdBy: z.createdBy,
        createdAt: z.createdAt.toISOString(),
      })));
    } catch (error) {
      logger.error('Failed to fetch zones', { error });
      res.status(500).json({ error: 'Failed to fetch zones' });
    }
  });

  // Get directives
  router.get('/directives', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const where = req.user?.role === 'captain' && req.user.assignedShipId
        ? { shipId: req.user.assignedShipId }
        : {};

      const directives = await prisma.directive.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { ship: true },
      });

      res.json(directives.map(d => ({
        id: d.id,
        shipId: d.shipId,
        shipName: d.ship.name,
        issuedBy: d.issuedBy,
        type: d.type,
        message: d.message,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
      })));
    } catch (error) {
      logger.error('Failed to fetch directives', { error });
      res.status(500).json({ error: 'Failed to fetch directives' });
    }
  });

  // Get distress messages
  router.get('/distress', authenticateToken, async (_req: AuthRequest, res: Response) => {
    try {
      const messages = await prisma.distressMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { ship: true },
      });

      res.json(messages.map(d => ({
        id: d.id,
        shipId: d.shipId,
        shipName: d.ship.name,
        message: d.message,
        timestamp: d.createdAt.toISOString(),
        position: { lat: d.lat, lng: d.lng },
        aiAnalysis: d.aiAnalysis ? (typeof d.aiAnalysis === 'string' ? JSON.parse(d.aiAnalysis) : d.aiAnalysis) : null,
      })));
    } catch (error) {
      logger.error('Failed to fetch distress messages', { error });
      res.status(500).json({ error: 'Failed to fetch distress messages' });
    }
  });

  // Get playback data
  router.get('/playback', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 3600000);
      const to = req.query.to ? new Date(req.query.to as string) : new Date();

      const snapshots = await prisma.playbackSnapshot.findMany({
        where: { timestamp: { gte: from, lte: to } },
        orderBy: { timestamp: 'asc' },
      });

      res.json(snapshots.map(s => ({
        timestamp: s.timestamp.toISOString(),
        data: typeof s.data === 'string' ? JSON.parse(s.data) : s.data,
      })));
    } catch (error) {
      logger.error('Failed to fetch playback data', { error });
      res.status(500).json({ error: 'Failed to fetch playback data' });
    }
  });

  // AI Fleet Advisor
  router.get('/advisor', authenticateToken, requireRole('command'), async (_req: AuthRequest, res: Response) => {
    try {
      const ships = simulation.getShipsArray();
      const shipsInDanger = ships.filter(s => s.status === 'danger' || s.status === 'stranded').length;
      const fuelCriticalShips = ships.filter(s => s.fuel < 1000).map(s => s.name);

      const alerts = await prisma.alert.findMany({
        where: {
          acknowledged: false,
          createdAt: { gte: new Date(Date.now() - 3600000) },
        },
      });

      const suggestions = await getFleetAdvisorSuggestion({
        shipsInDanger,
        activeAlerts: alerts.length,
        weatherSeverity: 'moderate',
        fuelCriticalShips,
      });

      res.json({ suggestions });
    } catch (error) {
      logger.error('Advisor error', { error });
      res.status(500).json({ error: 'Failed to get advisor suggestions' });
    }
  });

  // Weather for ship
  router.get('/weather/:shipId', authenticateToken, (req: AuthRequest, res: Response) => {
    const weather = simulation.getWeatherForShip(req.params.shipId as string);
    if (!weather) {
      res.json({ severity: 'calm', description: 'Data unavailable', windSpeed: 0, waveHeight: 0 });
      return;
    }
    res.json(weather);
  });

  return router;
}

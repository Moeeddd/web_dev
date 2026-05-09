import express from 'express';
import cors from 'cors';
import http from 'http';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { logger } from './config/logger';
import { createRoutes } from './routes/api';
import { setupWebSocket } from './websocket/handler';
import { SimulationEngine } from './simulation/engine';

async function main() {
  logger.info('🌊 Starting Horizon Command backend...');

  // Initialize Prisma
  const prisma = new PrismaClient();
  await prisma.$connect();
  logger.info('✅ Database connected');

  // Create Express app
  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  // Create HTTP server
  const httpServer = http.createServer(app);

  // Create simulation engine (needs io, but io needs httpServer)
  // We'll pass io after creation
  const simulation = new SimulationEngine(prisma, null as any);

  // Setup WebSocket
  const io = setupWebSocket(httpServer, prisma, simulation);

  // Replace the io reference in simulation
  (simulation as any).io = io;

  // Initialize simulation
  await simulation.initialize();

  // Mount API routes
  const apiRoutes = createRoutes(prisma, simulation);
  app.use('/api', apiRoutes);

  // Health check at root
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start simulation
  simulation.start();

  // Start server
  httpServer.listen(config.port, () => {
    logger.info(`🚀 Horizon Command running on port ${config.port}`);
    logger.info(`📡 WebSocket server ready`);
    logger.info(`🗺️ Simulation engine active - tracking 15 ships`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    simulation.stop();
    await prisma.$disconnect();
    httpServer.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  logger.error('Fatal startup error', { error });
  process.exit(1);
});

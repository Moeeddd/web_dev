import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  simulation: {
    tickInterval: 1000, // 1 second
    fuelConsumptionRate: 0.15, // tons per tick per knot
    weatherFuelPenalty: 0.3, // 30% increase
    proximityWarningDistance: 2, // km
    snapshotInterval: 30000, // 30 seconds
  },
  ports: [
    { id: 'KWT-1', name: 'Kuwait City', position: { lat: 29.48, lng: 48.34 } },
    { id: 'BUS-1', name: 'Bushehr', position: { lat: 28.83, lng: 50.73 } },
    { id: 'DMM-1', name: 'Dammam', position: { lat: 26.56, lng: 50.30 } },
    { id: 'BAH-1', name: 'Manama', position: { lat: 26.50, lng: 50.55 } },
    { id: 'DOH-1', name: 'Doha', position: { lat: 25.46, lng: 51.95 } },
    { id: 'AUH-1', name: 'Abu Dhabi', position: { lat: 25.22, lng: 54.18 } },
    { id: 'DXB-1', name: 'Jebel Ali', position: { lat: 25.50, lng: 54.75 } },
    { id: 'BND-1', name: 'Bandar Abbas', position: { lat: 26.62, lng: 56.11 } },
    { id: 'SOH-1', name: 'Sohar', position: { lat: 24.72, lng: 57.02 } },
    { id: 'MCT-1', name: 'Muscat', position: { lat: 23.92, lng: 58.58 } },
  ],
  navigableWater: [
    { lat: 29.80, lng: 48.60 }, { lat: 29.50, lng: 50.00 }, { lat: 28.80, lng: 50.80 },
    { lat: 27.80, lng: 52.00 }, { lat: 26.70, lng: 53.50 }, { lat: 26.30, lng: 55.00 },
    { lat: 26.65, lng: 56.10 }, { lat: 26.50, lng: 56.40 }, { lat: 26.00, lng: 56.80 },
    { lat: 25.50, lng: 57.50 }, { lat: 25.50, lng: 58.50 }, { lat: 25.00, lng: 60.00 },
    { lat: 22.00, lng: 60.00 }, { lat: 22.50, lng: 60.00 }, { lat: 23.80, lng: 58.80 },
    { lat: 24.50, lng: 57.20 }, { lat: 25.20, lng: 56.50 }, { lat: 26.45, lng: 56.45 },
    { lat: 26.30, lng: 55.90 }, { lat: 26.00, lng: 55.50 }, { lat: 25.30, lng: 54.50 },
    { lat: 24.80, lng: 53.00 }, { lat: 25.30, lng: 52.00 }, { lat: 26.40, lng: 51.50 },
    { lat: 26.50, lng: 50.30 }, { lat: 27.50, lng: 49.80 }, { lat: 28.50, lng: 49.00 },
    { lat: 29.50, lng: 48.30 }, { lat: 29.80, lng: 48.60 },
  ],
};

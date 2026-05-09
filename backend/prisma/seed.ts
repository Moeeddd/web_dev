import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const fleetData = {
  fleet: [
    { shipId: "MV-1", name: "Aurora", position: [26.55, 56.20], speed: 14, heading: 105, destination: "MCT-1", fuel: 6800, cargo: "crude oil", status: "normal" },
    { shipId: "MV-2", name: "Borealis", position: [25.50, 57.20], speed: 19, heading: 270, destination: "DXB-1", fuel: 5400, cargo: "containers", status: "normal" },
    { shipId: "MV-3", name: "Cygnus", position: [25.70, 53.00], speed: 16, heading: 95, destination: "MCT-1", fuel: 7200, cargo: "LNG", status: "normal" },
    { shipId: "MV-4", name: "Dragon", position: [26.40, 56.00], speed: 13, heading: 110, destination: "SOH-1", fuel: 5800, cargo: "bulk grain", status: "normal" },
    { shipId: "MV-5", name: "Emerald", position: [27.50, 51.20], speed: 12, heading: 165, destination: "DOH-1", fuel: 8200, cargo: "crude oil", status: "normal" },
    { shipId: "MV-6", name: "Falcon", position: [25.40, 54.53], speed: 22, heading: 280, destination: "DOH-1", fuel: 4100, cargo: "containers", status: "normal" },
    { shipId: "MV-7", name: "Gharial", position: [26.50, 53.50], speed: 14, heading: 270, destination: "KWT-1", fuel: 750, cargo: "crude oil", status: "normal" },
    { shipId: "MV-8", name: "Halcyon", position: [24.93, 56.94], speed: 19, heading: 250, destination: "DMM-1", fuel: 5200, cargo: "automobiles", status: "normal" },
    { shipId: "MV-9", name: "Iris", position: [28.20, 50.30], speed: 13, heading: 175, destination: "BAH-1", fuel: 7800, cargo: "crude oil", status: "normal" },
    { shipId: "MV-10", name: "Jade", position: [25.02, 57.96], speed: 20, heading: 285, destination: "BND-1", fuel: 6300, cargo: "containers", status: "normal" },
    { shipId: "MV-11", name: "Kite", position: [25.64, 52.18], speed: 18, heading: 95, destination: "MCT-1", fuel: 7600, cargo: "LNG", status: "normal" },
    { shipId: "MV-12", name: "Lotus", position: [29.10, 48.80], speed: 12, heading: 145, destination: "SOH-1", fuel: 8500, cargo: "crude oil", status: "normal" },
    { shipId: "MV-13", name: "Mirage", position: [24.60, 57.30], speed: 21, heading: 320, destination: "BAH-1", fuel: 5900, cargo: "containers", status: "normal" },
    { shipId: "MV-14", name: "Nova", position: [24.12, 58.43], speed: 11, heading: 290, destination: "DOH-1", fuel: 4600, cargo: "bulk cement", status: "normal" },
    { shipId: "MV-15", name: "Orca", position: [26.34, 55.91], speed: 13, heading: 215, destination: "MCT-1", fuel: 7100, cargo: "crude oil", status: "normal" }
  ]
};

async function main() {
  console.log('🚢 Seeding Horizon Command database...');

  // Clear existing data
  await prisma.playbackSnapshot.deleteMany();
  await prisma.weatherSnapshot.deleteMany();
  await prisma.distressMessage.deleteMany();
  await prisma.directive.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.shipHistory.deleteMany();
  await prisma.restrictedZone.deleteMany();
  await prisma.ship.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const passwordHash = await bcrypt.hash('command123', 10);
  const captainHash = await bcrypt.hash('captain123', 10);

  const commandUser = await prisma.user.create({
    data: {
      username: 'admiral',
      passwordHash,
      role: 'command',
    },
  });

  console.log('✅ Created command user: admiral / command123');

  // Create captain users for each ship
  for (const ship of fleetData.fleet) {
    await prisma.user.create({
      data: {
        username: `captain_${ship.name.toLowerCase()}`,
        passwordHash: captainHash,
        role: 'captain',
        assignedShipId: ship.shipId,
      },
    });
  }

  console.log('✅ Created 15 captain users (captain_<shipname> / captain123)');

  // Create ships
  for (const ship of fleetData.fleet) {
    await prisma.ship.create({
      data: {
        shipId: ship.shipId,
        name: ship.name,
        lat: ship.position[0],
        lng: ship.position[1],
        speed: ship.speed,
        heading: ship.heading,
        destination: ship.destination,
        fuel: ship.fuel,
        cargo: ship.cargo,
        status: ship.status,
        riskLevel: ship.fuel < 1000 ? 'high' : 'low',
      },
    });
  }

  console.log('✅ Created 15 ships from fleet data');

  // Create initial restricted zone (Strait of Hormuz hotspot)
  await prisma.restrictedZone.create({
    data: {
      name: 'Strait of Hormuz - Naval Blockade',
      polygon: JSON.stringify([
        { lat: 26.8, lng: 56.0 },
        { lat: 26.8, lng: 56.5 },
        { lat: 26.4, lng: 56.5 },
        { lat: 26.4, lng: 56.0 },
      ]),
      severity: 'critical',
      active: true,
      createdBy: commandUser.id,
    },
  });

  console.log('✅ Created initial restricted zone');
  console.log('');
  console.log('🎯 Demo Credentials:');
  console.log('  Command: admiral / command123');
  console.log('  Captain: captain_aurora / captain123');
  console.log('  (or captain_<shipname> / captain123 for any ship)');
  console.log('');
  console.log('🚀 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

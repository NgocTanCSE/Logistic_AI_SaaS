import { PrismaClient } from '@prisma/client';
import { fakerVI as faker } from '@faker-js/faker';

export async function seedAdvancedFleet(prisma: PrismaClient) {
  console.log('--- Seeding Advanced Fleet (GPS & Expenses) ---');

  const trips = await prisma.trip.findMany({ select: { id: true, tripCode: true, driverId: true }, take: 10 });
  const branches = await prisma.branch.findMany({ select: { id: true, address: true }, take: 5 });

  if (trips.length === 0) return;

  // 1. GPS Tracking Logs
  const gpsLogs = [];
  for (const trip of trips) {
    const logCount = faker.number.int({ min: 10, max: 20 });
    let currentLat = 10.762622;
    let currentLng = 106.660172;

    for (let i = 0; i < logCount; i++) {
      currentLat += (Math.random() - 0.5) * 0.01;
      currentLng += (Math.random() - 0.5) * 0.01;
      
      gpsLogs.push({
        id: faker.string.uuid(),
        tripId: trip.id,
        driverId: trip.driverId || '',
        lat: currentLat,
        lng: currentLng,
        speed: faker.number.float({ min: 0, max: 60 }),
        heading: faker.number.float({ min: 0, max: 360 }),
        timestamp: faker.date.recent({ days: 1 })
      });
    }
  }

  // 2. Geofences
  const geofences = [];
  for (const branch of branches) {
    geofences.push({
      id: faker.string.uuid(),
      name: `Geofence - ${branch.address.substring(0, 20)}`,
      zoneType: 'WAREHOUSE',
      polygon: '{"type":"Polygon","coordinates":[[[106.6,10.7],[106.7,10.7],[106.7,10.8],[106.6,10.8],[106.6,10.7]]]}',
      isActive: true
    });
  }

  // 3. Driver Expenses & COD
  const expenses = [];
  const cods = [];
  for (const trip of trips) {
    expenses.push({
      id: faker.string.uuid(),
      driverId: trip.driverId!,
      tripId: trip.id,
      category: faker.helpers.arrayElement(['FUEL', 'TOLL', 'PARKING']),
      amount: faker.number.int({ min: 50000, max: 500000 }),
      status: 'APPROVED',
      createdAt: faker.date.recent({ days: 5 })
    });

    cods.push({
      id: faker.string.uuid(),
      driverId: trip.driverId!,
      totalCodCollected: faker.number.int({ min: 100000, max: 2000000 }),
      amountRemitted: 0,
      status: 'PENDING',
      createdAt: faker.date.recent({ days: 1 })
    });
  }

  await prisma.gpsTrackingLog.createMany({ data: gpsLogs });
  await prisma.geofence.createMany({ data: geofences });
  await prisma.driverExpense.createMany({ data: expenses });
  await prisma.codRemittance.createMany({ data: cods });

  console.log(`✅ Seeded ${gpsLogs.length} GPS Logs, ${geofences.length} Geofences, ${expenses.length} Expenses.`);
}

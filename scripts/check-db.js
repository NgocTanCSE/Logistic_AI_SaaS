const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const drivers = await prisma.driver.count();
  const clients = await prisma.client.count();
  const users = await prisma.tenantUser.count();
  const orders = await prisma.order.count();
  const trips = await prisma.trip.count();
  
  console.log('--- DATABASE STATS ---');
  console.log('Drivers:', drivers);
  console.log('Clients:', clients);
  console.log('Tenant Users:', users);
  console.log('Orders (Client Data):', orders);
  console.log('Trips (Driver Data):', trips);
}
main().catch(console.error).finally(() => prisma.$disconnect());

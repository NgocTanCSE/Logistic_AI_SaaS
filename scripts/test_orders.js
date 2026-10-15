const { PrismaClient } = require('@prisma/client');
const faker = require('@faker-js/faker').faker;
const prisma = new PrismaClient();

async function test() {
  const allClients = await prisma.client.findMany();
  const allDrivers = await prisma.driver.findMany();
  
  if (allClients.length === 0 || allDrivers.length === 0) {
    console.log("No clients or drivers found");
    return;
  }

  const ordersBatch = Array.from({ length: 100 }).map(() => ({
    trackingCode: 'TRK-' + faker.string.numeric(8),
    clientId: faker.helpers.arrayElement(allClients).id,
    codAmount: faker.number.int({ min: 100000, max: 5000000 }),
    shippingFee: faker.number.int({ min: 15000, max: 150000 }),
    recipientName: faker.person.fullName(),
    recipientPhone: faker.phone.number(),
    recipientAddress: faker.location.streetAddress() + ', ' + faker.location.city(),
    status: faker.helpers.arrayElement(['NEW', 'PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED']),
    lat: 10.7733 + (Math.random() - 0.5) * 0.1,
    lng: 106.7000 + (Math.random() - 0.5) * 0.1,
    driverId: faker.helpers.arrayElement(allDrivers).id
  }));

  try {
    await prisma.order.createMany({ data: ordersBatch });
    console.log('Orders inserted successfully!');
  } catch(e) {
    console.error('Error inserting orders:', e);
  }
}

test().finally(() => prisma.$disconnect());

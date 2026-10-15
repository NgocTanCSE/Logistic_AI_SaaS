const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clients:', await prisma.client.count());
  console.log('Drivers:', await prisma.driver.count());
  console.log('Vehicles:', await prisma.vehicle.count());
  console.log('StockMovements:', await prisma.stockMovement.count());
  console.log('Products:', await prisma.product.count());
}

main().finally(() => prisma.$disconnect());

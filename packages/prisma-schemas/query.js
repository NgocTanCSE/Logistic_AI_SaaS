const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Users:', await prisma.tenantUser.count());
  console.log('Orders:', await prisma.order.count());
  console.log('Inventory:', await prisma.inventory.count());
  console.log('Tasks:', await prisma.task.count());
}

main().finally(() => prisma.$disconnect());

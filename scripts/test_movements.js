const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { faker } = require('@faker-js/faker');

async function testStockMovements() {
  const allInventories = await prisma.inventory.findMany({ take: 50 });
  if (allInventories.length === 0) {
     console.log("No inventories");
     return;
  }
  const movements = [];
  for (let i = 0; i < 200; i++) {
    const inv = faker.helpers.arrayElement(allInventories);
    movements.push({
      inventoryId: inv.id,
      warehouseId: inv.warehouseId,
      transactionType: faker.helpers.arrayElement(['INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'TRANSFER']),
      quantityChange: faker.number.int({ min: -50, max: 50 }),
      balanceAfter: faker.number.int({ min: 0, max: 100 }),
      actorId: faker.string.uuid(),
      referenceDocument: `REF-${faker.string.alphanumeric(8).toUpperCase()}`
    });
  }
  try {
    await prisma.stockMovement.createMany({ data: movements });
    console.log("Stock movements inserted!");
  } catch(e) {
    console.error(e);
  }
}

testStockMovements().finally(() => prisma.$disconnect());

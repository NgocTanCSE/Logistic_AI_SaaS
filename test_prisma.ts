import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("CustomRole:", !!prisma.customRole);
  console.log("Warehouse:", !!prisma.warehouse);
  console.log("Order:", !!prisma.order);
  console.log("StockMovement:", !!prisma.stockMovement);
}

main().catch(console.error);

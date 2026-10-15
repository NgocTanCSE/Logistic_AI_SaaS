import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const tenantClient = prisma.$extends({});
    const orders = await tenantClient.order.findMany({ include: { items: true } });
    console.log("Orders count:", orders.length);
  } catch (e) {
    console.error("ERROR:", e);
  }
}
main();

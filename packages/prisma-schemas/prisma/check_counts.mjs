import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const tables = [
  'subscriptionPlan', 'tenant', 'tenantUser', 'systemAdmin',
  'order', 'orderItem', 'orderTrackingEvent', 'product',
  'category', 'trip', 'tripStop', 'delivery', 'inventory'
];
for (const t of tables) {
  try {
    const count = await prisma[t].count();
    console.log(t + ': ' + count);
  } catch(e) {
    console.log(t + ': ERROR - ' + e.message.split('\n')[0]);
  }
}
await prisma.$disconnect();

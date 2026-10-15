import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const tenantClient = prisma.$extends({});
console.log(tenantClient.order);
console.log(typeof tenantClient.order?.findMany);

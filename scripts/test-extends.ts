import { PrismaClient } from '@prisma/client';

class PrismaService extends PrismaClient {
  public get tenantClient(): any {
    return this.$extends({});
  }
}

const prisma = new PrismaService();
console.log("tenantClient.order:", prisma.tenantClient.order);
console.log("tenantClient.order.findMany:", prisma.tenantClient.order?.findMany);

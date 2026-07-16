const { PrismaClient } = require('@prisma/client');
class PrismaService extends PrismaClient {
  constructor() {
    super();
  }
  get tenantClient() {
    return this;
  }
}
const prisma = new PrismaService();
console.log("prisma.driver:", prisma.driver);
console.log("prisma.tenantClient.driver:", prisma.tenantClient.driver);

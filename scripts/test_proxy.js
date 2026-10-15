const { PrismaClient } = require('@prisma/client');
class MyPrisma extends PrismaClient {
  get tenantClient() {
    return this.$extends({});
  }
}
async function run() {
  const prisma = new MyPrisma();
  console.log("tenantUser on prisma:", !!prisma.tenantUser);
  const tc = prisma.tenantClient;
  console.log("tenantUser on tenantClient:", !!tc.tenantUser);
}
run();

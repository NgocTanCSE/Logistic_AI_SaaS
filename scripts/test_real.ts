import { PrismaService } from './services/iam-service/src/prisma/prisma.service';

async function main() {
  const prisma = new PrismaService();
  console.log('Is SQLite:', PrismaService.isSqlite);
  
  console.log('tenantUser directly:', !!prisma.tenantUser);
  console.log('tenantClient:', !!prisma.tenantClient);
  console.log('tenantClient.tenantUser:', !!prisma.tenantClient?.tenantUser);
  
  await prisma.$disconnect();
}
main().catch(console.error);

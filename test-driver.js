const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.tenantUser.create({
    data: {
      email: "testdriver" + Date.now() + "@test.com",
      fullName: "Test Driver",
      role: "DRIVER"
    }
  });

  const driver = await prisma.driver.create({
    data: {
      userId: user.id,
      licenseClass: "C",
      licenseExpiry: new Date()
    }
  });

  console.log("Created driver:", driver);

  const drivers = await prisma.driver.findMany({ include: { user: true } });
  console.log("Fetched drivers:", drivers);
}

main().catch(console.error).finally(() => prisma.$disconnect());

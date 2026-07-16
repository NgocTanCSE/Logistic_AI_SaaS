import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./dev.db"
    }
  }
});

async function main() {
  try {
    const roles = await prisma.customRole.count();
    console.log("Roles count:", roles);
    const remittances = await prisma.codRemittance.count();
    console.log("Remittances count:", remittances);
    const aiFeedbacks = await prisma.aiFeedback.count();
    console.log("AI Feedbacks count:", aiFeedbacks);
  } catch (e: any) {
    console.error("ERROR:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

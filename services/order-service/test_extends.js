const { PrismaClient } = require('@prisma/client');
async function run() {
  const prisma = new PrismaClient();
  try {
    const extended = prisma.$extends({});
    console.log("Extended successfully:", !!extended);
  } catch (err) {
    console.error("Error extending:", err);
  }
}
run();

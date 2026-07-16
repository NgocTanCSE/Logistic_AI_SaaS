import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log(' Bắt đầu seeding bổ sung đơn hàng (FIXED) cho AI training...');

  const firstTenant = await prisma.tenant.findFirst();
  if (!firstTenant) {
      console.error("❌ Không tìm thấy Tenant nào.");
      return;
  }

  console.log(` Đang đổ 2,000 đơn hàng cho Tenant: ${firstTenant.name}`);

  const batchSize = 100;
  for (let i = 0; i < 2000; i += batchSize) {
    const ordersData = Array.from({ length: batchSize }).map(() => ({
      trackingCode: `TRK-${faker.string.alphanumeric(10).toUpperCase()}`, // Giảm độ dài nếu cần, nhưng 50 chars là đủ
      status: 'DELIVERED',
      recipientName: faker.person.fullName().substring(0, 50),
      recipientPhone: faker.string.numeric(10), // Tránh ký tự đặc biệt làm dài chuỗi
      recipientAddress: faker.location.streetAddress().substring(0, 100),
      codAmount: parseFloat(faker.commerce.price({ min: 1000, max: 5000 })),
      shippingFee: parseFloat(faker.commerce.price({ min: 10, max: 100 })),
    }));

    await prisma.order.createMany({ data: ordersData });
    console.log(`   + Đã tạo ${i + batchSize}/2000 Đơn hàng...`);
  }

  console.log('✨ Seeding đơn hàng hoàn tất!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

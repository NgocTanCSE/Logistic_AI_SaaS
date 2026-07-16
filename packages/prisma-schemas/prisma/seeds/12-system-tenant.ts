import { PrismaClient } from '@prisma/client';
import { fakerVI as faker } from '@faker-js/faker';

export async function seedSystemAndTenant(prisma: PrismaClient) {
  console.log('--- Seeding System & Tenant ---');

  const users = await prisma.tenantUser.findMany({ select: { id: true }, take: 100 });

  // 1. Tenants (Since system expects single tenant logic often, but let's ensure one exists if not)
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: faker.string.uuid(),
        name: 'Demo Logistics VN',
        slug: 'demo-logistics-vn',
        dbSchemaName: 'public',
        status: 'ACTIVE'
      }
    });
  }

  // 2. Notifications
  const notifications = [];
  if (users.length > 0) {
    for (let i = 0; i < 200; i++) {
      notifications.push({
        id: faker.string.uuid(),
        userId: faker.helpers.arrayElement(users).id,
        title: faker.helpers.arrayElement(['Đơn hàng mới', 'Cảnh báo kho', 'Hoàn tất chuyến xe']),
        body: faker.lorem.sentence(),
        type: faker.helpers.arrayElement(['INFO', 'WARNING', 'ALERT']),
        isRead: faker.datatype.boolean(),
        createdAt: faker.date.recent({ days: 10 })
      });
    }
    await prisma.notification.createMany({ data: notifications });
  }

  // 3. Settings
  const uiConfig = {
    id: faker.string.uuid(),
    tenantId: tenant.id,
    primaryColor: '#0070f3',
    logoUrl: 'https://example.com/logo.png',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await prisma.tenantUiConfig.create({ data: uiConfig });

  console.log(`✅ Seeded 1 Tenant, ${notifications.length} Notifications, and UI Config.`);
}

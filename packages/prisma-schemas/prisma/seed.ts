import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Subscription Plans
  await prisma.subscriptionPlan.upsert({
    where: { code: 'BASIC' },
    update: {},
    create: {
      name: 'Basic',
      code: 'BASIC',
      priceMonthly: 99,
      maxUsers: 10,
      maxWarehouses: 3,
      maxVehicles: 10,
      featuresJson: JSON.stringify({ wms: true, tms: true }),
      description: 'Basic plan for small businesses',
      isActive: true,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: 'PRO' },
    update: {},
    create: {
      name: 'Professional',
      code: 'PRO',
      priceMonthly: 299,
      maxUsers: 50,
      maxWarehouses: 10,
      maxVehicles: 50,
      featuresJson: JSON.stringify({ wms: true, tms: true, ai: true }),
      description: 'Professional plan with AI features',
      isActive: true,
    },
  });

  // 2. Create Super Admin
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.systemAdmin.upsert({
    where: { email: 'admin@smartlogi.com' },
    update: {},
    create: {
      email: 'admin@smartlogi.com',
      passwordHash: adminPasswordHash,
      fullName: 'Super Admin',
      status: 'ACTIVE',
    },
  });

  // 3. Create Demo Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    update: {},
    create: {
      name: 'Demo Tenant',
      slug: 'demo-tenant',
      dbSchemaName: 'public',
      status: 'ACTIVE',
      settingsJson: JSON.stringify({ timezone: 'Asia/Ho_Chi_Minh', currency: 'VND' }),
    },
  });

  // 4. Create All Roles
  const adminRole = await (async () => {
    let role = await prisma.customRole.findFirst({ where: { name: 'TENANT_ADMIN' } });
    if (!role) role = await prisma.customRole.create({ data: { name: 'TENANT_ADMIN', isSystemDefault: true } });
    return role;
  })();

  const managerRole = await (async () => {
    let role = await prisma.customRole.findFirst({ where: { name: 'WAREHOUSE_MANAGER' } });
    if (!role) role = await prisma.customRole.create({ data: { name: 'WAREHOUSE_MANAGER', isSystemDefault: true } });
    return role;
  })();

  const staffRole = await (async () => {
    let role = await prisma.customRole.findFirst({ where: { name: 'WAREHOUSE_STAFF' } });
    if (!role) role = await prisma.customRole.create({ data: { name: 'WAREHOUSE_STAFF', isSystemDefault: true } });
    return role;
  })();

  const logisticsRole = await (async () => {
    let role = await prisma.customRole.findFirst({ where: { name: 'LOGISTICS_MANAGER' } });
    if (!role) role = await prisma.customRole.create({ data: { name: 'LOGISTICS_MANAGER', isSystemDefault: true } });
    return role;
  })();

  const driverRole = await (async () => {
    let role = await prisma.customRole.findFirst({ where: { name: 'DRIVER' } });
    if (!role) role = await prisma.customRole.create({ data: { name: 'DRIVER', isSystemDefault: true } });
    return role;
  })();

  const clientRole = await (async () => {
    let role = await prisma.customRole.findFirst({ where: { name: 'CUSTOMER_CLIENT' } });
    if (!role) role = await prisma.customRole.create({ data: { name: 'CUSTOMER_CLIENT', isSystemDefault: true } });
    return role;
  })();

  // 5. Create Permissions
  const allPermissions: { roleId: string; resource: string; action: string }[] = [
    ...['read', 'create', 'update', 'delete', 'manage', 'adjust', 'dispatch'].flatMap(action =>
      ['inventory', 'warehouses', 'tasks', 'orders', 'trips', 'vehicles', 'drivers', 'users', 'roles', 'settings', 'billing', 'api-keys', 'audit-logs'].map(resource => ({
        roleId: adminRole.id,
        resource,
        action,
      }))
    ),
    { roleId: adminRole.id, resource: 'clients', action: 'manage' },
    { roleId: adminRole.id, resource: 'clients', action: 'read' },
    { roleId: adminRole.id, resource: 'returns', action: 'read' },
    { roleId: adminRole.id, resource: 'returns', action: 'create' },
    { roleId: adminRole.id, resource: 'returns', action: 'approve' },
    { roleId: adminRole.id, resource: 'returns', action: 'inspect' },
    { roleId: adminRole.id, resource: 'returns', action: 'refund' },
    { roleId: adminRole.id, resource: 'mobile', action: 'sync:pull' },
    { roleId: adminRole.id, resource: 'mobile', action: 'sync:push' },
    { roleId: adminRole.id, resource: 'mobile', action: 'uploads' },
    { roleId: adminRole.id, resource: 'mobile', action: 'gps:batch' },
    { roleId: adminRole.id, resource: 'mobile', action: 'sos' },
    { roleId: adminRole.id, resource: 'pack-station', action: 'scan' },
    { roleId: adminRole.id, resource: 'tenant-dashboard', action: 'read' },
    // WAREHOUSE_MANAGER permissions
    { roleId: managerRole.id, resource: 'inventory', action: 'read' },
    { roleId: managerRole.id, resource: 'inventory', action: 'adjust' },
    { roleId: managerRole.id, resource: 'warehouses', action: 'manage' },
    { roleId: managerRole.id, resource: 'tasks', action: 'read' },
    { roleId: managerRole.id, resource: 'tasks', action: 'create' },
    { roleId: managerRole.id, resource: 'tasks', action: 'update' },
    { roleId: managerRole.id, resource: 'orders', action: 'read' },
    { roleId: managerRole.id, resource: 'vehicles', action: 'read' },
    { roleId: managerRole.id, resource: 'users', action: 'read' },
    { roleId: managerRole.id, resource: 'notifications', action: 'read' },
    { roleId: managerRole.id, resource: 'pack-station', action: 'scan' },
    // WAREHOUSE_STAFF permissions
    { roleId: staffRole.id, resource: 'inventory', action: 'read' },
    { roleId: staffRole.id, resource: 'tasks', action: 'read' },
    { roleId: staffRole.id, resource: 'tasks', action: 'update' },
    { roleId: staffRole.id, resource: 'mobile', action: 'sync:pull' },
    { roleId: staffRole.id, resource: 'mobile', action: 'sync:push' },
    { roleId: staffRole.id, resource: 'pack-station', action: 'scan' },
    // LOGISTICS_MANAGER permissions
    { roleId: logisticsRole.id, resource: 'orders', action: 'read' },
    { roleId: logisticsRole.id, resource: 'orders', action: 'create' },
    { roleId: logisticsRole.id, resource: 'trips', action: 'read' },
    { roleId: logisticsRole.id, resource: 'trips', action: 'dispatch' },
    { roleId: logisticsRole.id, resource: 'vehicles', action: 'read' },
    { roleId: logisticsRole.id, resource: 'vehicles', action: 'manage' },
    { roleId: logisticsRole.id, resource: 'drivers', action: 'manage' },
    { roleId: logisticsRole.id, resource: 'users', action: 'read' },
    { roleId: logisticsRole.id, resource: 'notifications', action: 'read' },
    { roleId: logisticsRole.id, resource: 'returns', action: 'read' },
    { roleId: logisticsRole.id, resource: 'returns', action: 'create' },
    { roleId: logisticsRole.id, resource: 'returns', action: 'approve' },
    // DRIVER permissions
    { roleId: driverRole.id, resource: 'trips', action: 'read' },
    { roleId: driverRole.id, resource: 'mobile', action: 'sync:pull' },
    { roleId: driverRole.id, resource: 'mobile', action: 'sync:push' },
    { roleId: driverRole.id, resource: 'mobile', action: 'uploads' },
    { roleId: driverRole.id, resource: 'mobile', action: 'gps:batch' },
    { roleId: driverRole.id, resource: 'mobile', action: 'sos' },
    // CUSTOMER_CLIENT permissions
    { roleId: clientRole.id, resource: 'orders', action: 'read' },
    { roleId: clientRole.id, resource: 'orders', action: 'create' },
    { roleId: clientRole.id, resource: 'inventory', action: 'read' },
    { roleId: clientRole.id, resource: 'notifications', action: 'read' },
    { roleId: clientRole.id, resource: 'returns', action: 'read' },
    { roleId: clientRole.id, resource: 'returns', action: 'create' },
  ];

  await prisma.rolePermission.createMany({ data: allPermissions });

  // 6. Create Client first (needed for ClientUser)
  const client = await prisma.client.upsert({
    where: { id: 'demo-client' },
    update: {},
    create: { id: 'demo-client', name: 'Demo B2B Client', status: 'ACTIVE' },
  });

  // 7. Create Tenant Admin User
  const tenantAdminPassword = await bcrypt.hash('Tenant@123', 10);
  const tenantAdmin = await prisma.tenantUser.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash: tenantAdminPassword,
      fullName: 'Tenant Admin',
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: tenantAdmin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: tenantAdmin.id, roleId: adminRole.id },
  });

  // 8. Create ClientUser for tenant admin (for customer portal)
  const existingClientUser = await prisma.clientUser.findFirst({ where: { email: 'admin@demo.com' } });
  if (!existingClientUser) {
    await prisma.clientUser.create({
      data: {
        email: 'admin@demo.com',
        clientId: client.id,
        fullName: 'Tenant Admin',
        status: 'ACTIVE',
      },
    });
  }

  // 9. Create Warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-MAIN' },
    update: {},
    create: {
      name: 'Main Warehouse',
      code: 'WH-MAIN',
      address: '123 Logistics Street, Ho Chi Minh City',
      managerId: tenantAdmin.id,
      status: 'ACTIVE',
    },
  });

  // 10. Create Zone & Rack
  const zoneA = await prisma.zone.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: 'ZA' } },
    update: {},
    create: { warehouseId: warehouse.id, code: 'ZA', type: 'STORAGE' },
  });

  const rack = await prisma.rack.upsert({
    where: { zoneId_code: { zoneId: zoneA.id, code: 'R01' } },
    update: {},
    create: { zoneId: zoneA.id, code: 'R01', aisle: 'A', rows: 4, levels: 3 },
  });

  // 11. Create Bins
  await prisma.bin.upsert({
    where: { barcode: 'BIN-A01-01' },
    update: {},
    create: {
      rackId: rack.id,
      warehouseId: warehouse.id,
      barcode: 'BIN-A01-01',
      rowIndex: 1,
      levelIndex: 1,
      maxWeightKg: 500,
      maxVolumeCbm: 1.0,
    },
  });

  await prisma.bin.upsert({
    where: { barcode: 'BIN-A01-02' },
    update: {},
    create: {
      rackId: rack.id,
      warehouseId: warehouse.id,
      barcode: 'BIN-A01-02',
      rowIndex: 1,
      levelIndex: 2,
      maxWeightKg: 500,
      maxVolumeCbm: 1.0,
    },
  });

  // 12. Create Categories
  const electronicsCategory = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { name: 'Electronics', slug: 'electronics', icon: 'cpu', sortOrder: 1, isActive: true },
  });

  const clothingCategory = await prisma.category.upsert({
    where: { slug: 'clothing' },
    update: {},
    create: { name: 'Clothing', slug: 'clothing', icon: 'shirt', sortOrder: 2, isActive: true },
  });

  // 13. Create Products
  await prisma.product.upsert({
    where: { sku: 'ELEC-001' },
    update: {},
    create: {
      sku: 'ELEC-001',
      name: 'Wireless Mouse',
      barcode: 'BAR-ELEC-001',
      categoryId: electronicsCategory.id,
      weightKg: 0.2,
      volumeCbm: 0.001,
      status: 'ACTIVE',
    },
  });

  await prisma.product.upsert({
    where: { sku: 'ELEC-002' },
    update: {},
    create: {
      sku: 'ELEC-002',
      name: 'USB-C Cable',
      barcode: 'BAR-ELEC-002',
      categoryId: electronicsCategory.id,
      weightKg: 0.05,
      volumeCbm: 0.0005,
      status: 'ACTIVE',
    },
  });

  await prisma.product.upsert({
    where: { sku: 'CLO-001' },
    update: {},
    create: {
      sku: 'CLO-001',
      name: 'T-Shirt',
      barcode: 'BAR-CLO-001',
      categoryId: clothingCategory.id,
      weightKg: 0.2,
      volumeCbm: 0.002,
      status: 'ACTIVE',
    },
  });

  // 14. Create Sample Orders
  await prisma.order.upsert({
    where: { trackingCode: 'SLG-20260115-00001' },
    update: {},
    create: {
      trackingCode: 'SLG-20260115-00001',
      clientId: client.id,
      status: 'NEW',
      recipientName: 'Nguyen Van A',
      recipientPhone: '0901234567',
      recipientAddress: '123 Le Loi, District 1, HCMC',
      codAmount: 500000,
      shippingFee: 30000,
    },
  });

  await prisma.order.upsert({
    where: { trackingCode: 'SLG-20260115-00002' },
    update: {},
    create: {
      trackingCode: 'SLG-20260115-00002',
      clientId: client.id,
      status: 'IN_TRANSIT',
      recipientName: 'Tran Thi B',
      recipientPhone: '0912345678',
      recipientAddress: '456 Nguyen Hue, District 1, HCMC',
      codAmount: 350000,
      shippingFee: 25000,
    },
  });

  // 15. Create Vehicles
  await prisma.vehicle.upsert({
    where: { plateNumber: '51A-12345' },
    update: {},
    create: { plateNumber: '51A-12345', type: 'TRUCK', capacityKg: 1000, capacityCbm: 5, status: 'ACTIVE' },
  });

  await prisma.vehicle.upsert({
    where: { plateNumber: '51B-67890' },
    update: {},
    create: { plateNumber: '51B-67890', type: 'VAN', capacityKg: 500, capacityCbm: 3, status: 'ACTIVE' },
  });

  // 16. Create Driver
  const driverPassword = await bcrypt.hash('driver123', 10);
  const driverUser = await prisma.tenantUser.upsert({
    where: { email: 'driver@demo.com' },
    update: {},
    create: {
      email: 'driver@demo.com',
      passwordHash: driverPassword,
      fullName: 'Demo Driver',
      phone: '0909876543',
      status: 'ACTIVE',
    },
  });

  await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      licenseClass: 'C',
      licenseExpiry: new Date('2030-12-31'),
      status: 'OFFLINE',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: driverUser.id, roleId: driverRole.id } },
    update: {},
    create: { userId: driverUser.id, roleId: driverRole.id },
  });

  // 17. Create Shipping Rates
  await prisma.shippingRate.createMany({
    data: [
      { name: 'Standard Delivery', baseFee: 30000, minFee: 30000, serviceType: 'STANDARD', isActive: true },
      { name: 'Express Delivery', baseFee: 50000, minFee: 50000, serviceType: 'EXPRESS', isActive: true },
    ],
  });

  // 18. Create Return Reasons
  await prisma.returnReason.createMany({
    data: [
      { code: 'DAMAGED', name: 'Sản phẩm bị hư hỏng', isActive: true },
      { code: 'WRONG_ITEM', name: 'Sai sản phẩm', isActive: true },
      { code: 'DEFECTIVE', name: 'Lỗi sản xuất', isActive: true },
      { code: 'OTHER', name: 'Lý do khác', isActive: true },
    ],
  });

  // 19. Create System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: 'MAX_LOGIN_ATTEMPTS', value: '5', description: 'Max login attempts' },
      { key: 'SESSION_TIMEOUT_MINUTES', value: '30', description: 'Session timeout' },
      { key: 'DEFAULT_CURRENCY', value: 'VND', description: 'Currency' },
      { key: 'DEFAULT_TIMEZONE', value: 'Asia/Ho_Chi_Minh', description: 'Timezone' },
    ],
  });

  console.log('Seed completed successfully!');
  console.log('Login credentials:');
  console.log('- Super Admin: admin@smartlogi.com / admin123');
  console.log('- Tenant Admin: admin@demo.com / Tenant@123');
  console.log('- Driver: driver@demo.com / driver123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
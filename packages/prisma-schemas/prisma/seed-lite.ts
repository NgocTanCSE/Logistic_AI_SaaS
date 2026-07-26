import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log(' Seed-lite HF: Creating essential demo data for SQLite...');

  // 1. Subscription Plans
  console.log('--- Seeding Subscription Plans ---');
  const plans = [
    { name: 'Basic', code: 'BASIC', priceMonthly: 99, maxUsers: 10, maxWarehouses: 2, maxVehicles: 5 },
    { name: 'Pro', code: 'PRO', priceMonthly: 299, maxUsers: 50, maxWarehouses: 10, maxVehicles: 30 },
    { name: 'Enterprise', code: 'ENTERPRISE', priceMonthly: 999, maxUsers: 500, maxWarehouses: 100, maxVehicles: 500 },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {},
      create: {
        ...plan,
        // Dùng string cho SQLite (đã convert Json -> String)
        featuresJson: JSON.stringify({ ai_routing: plan.code !== 'BASIC', real_time_tracking: true }),
        isActive: true
      },
    });
  }

  const proPlan = await prisma.subscriptionPlan.findFirst({ where: { code: 'PRO' } });

  // 2. System Admin (Cho admin-portal)
  console.log('--- Seeding System Admin ---');
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  await prisma.systemAdmin.upsert({
    where: { email: 'admin@smartlogi.vn' },
    update: { passwordHash: adminPasswordHash, status: 'ACTIVE' },
    create: {
      email: 'admin@smartlogi.vn',
      passwordHash: adminPasswordHash,
      fullName: 'Super Admin',
      status: 'ACTIVE',
    },
  });

  // 3. Demo Tenant (Cho tenant-portal)
  console.log('--- Seeding Demo Tenant ---');
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    update: { status: 'ACTIVE', planId: proPlan?.id },
    create: {
      name: 'Demo Logistics Co.',
      slug: 'demo-tenant',
      dbSchemaName: 'tenant_demo',
      status: 'ACTIVE',
      planId: proPlan?.id,
      maxUsers: 50,
      maxWarehouses: 5,
      maxVehicles: 30,
    },
  });

  // 4. Roles & Permissions
  console.log('--- Seeding Roles & Permissions ---');
const rolePermissionMap: Record<string, string[]> = {
    'TENANT_ADMIN': [
      "inventory:read", "inventory:adjust", "warehouses:manage", "tasks:read", "tasks:create", "tasks:update",
      "orders:read", "orders:create", "trips:read", "trips:dispatch", "vehicles:read", "vehicles:manage",
      "drivers:manage", "users:read", "users:invite", "roles:manage", "settings:manage", "audit-logs:read",
      "billing:read", "api-keys:manage", "notifications:read", "mobile:sync:pull", "mobile:sync:push",
      "mobile:uploads", "mobile:gps:batch", "mobile:sos", "pack-station:scan", "returns:read", "returns:create", "returns:approve", "returns:inspect", "returns:refund"
    ],
    'WAREHOUSE_MANAGER': [
      "inventory:read", "inventory:adjust", "warehouses:manage", "tasks:read", "tasks:create", "tasks:update",
      "orders:read", "vehicles:read", "users:read", "notifications:read", "pack-station:scan"
    ],
    'WAREHOUSE_STAFF': [
      "inventory:read", "tasks:read", "tasks:update", "mobile:sync:pull", "mobile:sync:push", "pack-station:scan"
    ],
    'LOGISTICS_MANAGER': [
      "orders:read", "orders:create", "trips:read", "trips:dispatch", "vehicles:read", "vehicles:manage",
      "drivers:manage", "users:read", "notifications:read", "returns:read", "returns:create", "returns:approve"
    ],
    'DRIVER': [
      "trips:read", "mobile:sync:pull", "mobile:sync:push", "mobile:uploads", "mobile:gps:batch", "mobile:sos"
    ],
    'CUSTOMER_CLIENT': [
      "orders:read", "orders:create", "inventory:read", "notifications:read", "returns:read", "returns:create"
    ],
    'TENANT_USER': [
      "inventory:read", "orders:read", "tasks:read", "trips:read"
    ]
  };

  const roleIds: Record<string, string> = {};

  for (const roleName of Object.keys(rolePermissionMap)) {
    let role = await prisma.customRole.findFirst({ where: { name: roleName } });
    if (!role) {
      role = await prisma.customRole.create({
        data: { name: roleName, isSystemDefault: true },
      });
    }
    roleIds[roleName] = role.id;

    // Seed Permissions
    const perms = rolePermissionMap[roleName];
    for (const p of perms) {
      const [resource, action] = p.split(':');
      const actionName = p.split(':').slice(1).join(':'); // handle things like "sync:pull"
      
      const existingPerm = await prisma.rolePermission.findFirst({
        where: { roleId: role.id, resource, action: actionName }
      });
      
      if (!existingPerm) {
         await prisma.rolePermission.create({
           data: { roleId: role.id, resource, action: actionName }
         });
      }
    }
  }

  // 5. Demo Tenant Users for ALL roles
  console.log('--- Seeding Demo Users for all roles ---');
  const tenantAdminPassword = await bcrypt.hash('Tenant@123', 10);

const demoUsers = [
     { email: 'tenant.admin@smartlogi.vn', fullName: 'Tenant Admin', role: 'TENANT_ADMIN', password: 'Tenant@123' },
     { email: 'wh.manager@smartlogi.vn', fullName: 'WH Manager', role: 'WAREHOUSE_MANAGER', password: 'Tenant@123' },
     { email: 'wh.staff@smartlogi.vn', fullName: 'WH Staff', role: 'WAREHOUSE_STAFF', password: 'Tenant@123' },
     { email: 'log.manager@smartlogi.vn', fullName: 'Log Manager', role: 'LOGISTICS_MANAGER', password: 'Tenant@123' },
     { email: 'driver@smartlogi.vn', fullName: 'Driver User', role: 'DRIVER', password: 'Tenant@123' },
     { email: 'client@smartlogi.vn', fullName: 'Client User', role: 'CUSTOMER_CLIENT', password: 'Tenant@123' },
     { email: 'user@smartlogi.vn', fullName: 'Basic User', role: 'TENANT_USER', password: 'Tenant@123' },
   ];

   for (const userDef of demoUsers) {
     const tenantAdminPassword = await bcrypt.hash(userDef.password, 10);
     const tenantUser = await prisma.tenantUser.upsert({
       where: { email: userDef.email },
       update: { passwordHash: tenantAdminPassword, status: 'ACTIVE', fullName: userDef.fullName },
       create: {
         email: userDef.email,
         fullName: userDef.fullName,
         status: 'ACTIVE',
         passwordHash: tenantAdminPassword,
       },
     });

    // Link Role
    const roleId = roleIds[userDef.role];
    if (roleId) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: { userId: tenantUser.id, roleId }
        },
        update: {},
        create: { userId: tenantUser.id, roleId }
      });
    }
    console.log(`    User: ${userDef.email} (${userDef.role})`);
  }


  // 6. Warehouse
  console.log('--- Seeding Warehouses, Zones, Racks, Bins ---');
  const warehousesData = Array.from({ length: 5 }).map((_, i) => ({
    name: `Warehouse ${i+1}`,
    code: `WH-00${i+1}`,
    address: faker.location.streetAddress() + ', ' + faker.location.city(),
    status: 'ACTIVE',
  }));
  await prisma.warehouse.createMany({ data: warehousesData }).catch(e => console.warn('  [WARN] warehouses:', e.message));
  const allWhs = await prisma.warehouse.findMany();

  for (const wh of allWhs) {
    const zonesData = Array.from({ length: 2 }).map((_, i) => ({
      warehouseId: wh.id,
      code: `ZONE-${wh.code}-${faker.string.alpha(1).toUpperCase()}`,
      type: 'STORAGE'
    }));
    await prisma.zone.createMany({ data: zonesData }).catch(e => console.warn('  [WARN] zones:', e.message));
  }
  const allZones = await prisma.zone.findMany();

  for (const zone of allZones) {
    const racksData = Array.from({ length: 5 }).map((_, i) => ({
      zoneId: zone.id,
      code: `RACK-${zone.code}-${i+1}`,
      aisle: `A${i+1}`,
      rows: 5,
      levels: 3
    }));
    await prisma.rack.createMany({ data: racksData }).catch(e => console.warn('  [WARN] racks:', e.message));
  }
  const allRacks = await prisma.rack.findMany();

  const binsData = [];
  for (const rack of allRacks) {
    for (let i=0; i<10; i++) {
      binsData.push({
        rackId: rack.id,
        warehouseId: allZones.find(z => z.id === rack.zoneId)?.warehouseId || allWhs[0].id,
        barcode: `BIN-${rack.code}-${i}`,
        rowIndex: 1,
        levelIndex: 1
      });
    }
  }
  await prisma.bin.createMany({ data: binsData }).catch(e => console.warn('  [WARN] bins:', e.message));
  const allBins = await prisma.bin.findMany();

  console.log('--- Seeding Categories ---');
  const categoriesData = Array.from({ length: 10 }).map((_, i) => {
    const name = faker.commerce.department();
    return {
      name,
      slug: (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat') + '-' + i,
    };
  });
  await prisma.category.createMany({ data: categoriesData }).catch(e => console.warn('  [WARN] categories:', e.message));
  const allCategories = await prisma.category.findMany();

  console.log('--- Seeding Products ---');
  const productsData = Array.from({ length: 200 }).map(() => ({
    sku: faker.commerce.isbn(),
    name: faker.commerce.productName(),
    weightKg: faker.number.float({ min: 0.1, max: 20 }),
    volumeCbm: faker.number.float({ min: 0.01, max: 2 }),
    categoryId: allCategories.length > 0 ? faker.helpers.arrayElement(allCategories).id : undefined,
  }));
  await prisma.product.createMany({ data: productsData }).catch(e => console.warn('  [WARN] products:', e.message));
  const allProducts = await prisma.product.findMany();

  console.log('--- Seeding 500 Inventory & Stock Movements ---');
  const inventories = [];
  for (let i = 0; i < 500; i++) {
    inventories.push({
      productId: faker.helpers.arrayElement(allProducts).id,
      warehouseId: faker.helpers.arrayElement(allWhs).id,
      binId: faker.helpers.arrayElement(allBins).id,
      quantityOnHand: faker.number.int({ min: 10, max: 1000 }),
      quantityAllocated: faker.number.int({ min: 0, max: 10 }),
      status: 'AVAILABLE',
    });
  }
  await prisma.inventory.createMany({ data: inventories }).catch(e => console.warn('  [WARN] inventory:', e.message));
  
const allInventories = await prisma.inventory.findMany({ take: 50 });
  const allTenantUsers = await prisma.tenantUser.findMany();
  const movements = [];
  for (let i = 0; i < 200; i++) {
    const inv = faker.helpers.arrayElement(allInventories);
    movements.push({
      inventoryId: inv.id,
      warehouseId: inv.warehouseId,
      transactionType: faker.helpers.arrayElement(['INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'TRANSFER']),
      quantityChange: faker.number.int({ min: -50, max: 50 }),
      balanceAfter: faker.number.int({ min: 0, max: 100 }),
      actorId: allTenantUsers.length > 0 ? faker.helpers.arrayElement(allTenantUsers).id : undefined,
      referenceDocument: `REF-${faker.string.alphanumeric(8).toUpperCase()}`
    });
  }
  await prisma.stockMovement.createMany({ data: movements }).catch(e => console.warn('  [WARN] stock_movements:', e.message));

  console.log('--- Seeding Drivers, Vehicles, Clients ---');
  const vehiclesData = Array.from({ length: 50 }).map(() => ({
    plateNumber: faker.vehicle.vrm(),
    type: faker.helpers.arrayElement(['TRUCK_1T', 'TRUCK_5T', 'VAN', 'MOTORBIKE']),
    capacityKg: faker.number.int({ min: 500, max: 5000 }),
    capacityCbm: faker.number.int({ min: 5, max: 30 }),
    status: 'ACTIVE'
  }));
  await prisma.vehicle.createMany({ data: vehiclesData }).catch(e => console.warn('  [WARN] vehicles:', e.message));
  const allVehicles = await prisma.vehicle.findMany();

  const driverUsersData = Array.from({ length: 50 }).map((_, i) => ({
    email: `driver${i}@smartlogi.vn`,
    passwordHash: '$2b$10$X7hO0M1O8aYQ8TfW8QYxU.Z/XQ8TfW8QYxU.Z/XQ8TfW8QYxU.', // fake hash
    fullName: faker.person.fullName(),
    status: 'ACTIVE'
  }));
  await prisma.tenantUser.createMany({ data: driverUsersData }).catch(e => console.warn('  [WARN] driver users:', e.message));
  const newDriverUsers = await prisma.tenantUser.findMany({ where: { email: { startsWith: 'driver' } } });

  const driversData = newDriverUsers.map((user) => ({
    userId: user.id,
    licenseClass: 'C',
    licenseExpiry: faker.date.future(),
    status: 'AVAILABLE'
  }));
  await prisma.driver.createMany({ data: driversData }).catch(e => console.warn('  [WARN] drivers:', e.message));
  const allDrivers = await prisma.driver.findMany();

  const clientsData = Array.from({ length: 20 }).map(() => ({
    name: faker.company.name(),
    status: 'ACTIVE'
  }));
  await prisma.client.createMany({ data: clientsData }).catch(e => console.warn('  [WARN] clients:', e.message));
  const allClients = await prisma.client.findMany();


  console.log('--- Seeding 500 Orders & Tracking ---');
  const allOrders: any[] = [];
  for (let i = 0; i < 5; i++) {
    const ordersBatch = Array.from({ length: 100 }).map(() => ({
      trackingCode: `TRK-${faker.string.numeric(8)}`,
      clientId: faker.helpers.arrayElement(allClients).id,
      codAmount: faker.number.int({ min: 100000, max: 5000000 }), 
      shippingFee: faker.number.int({ min: 15000, max: 150000 }), 
      recipientName: faker.person.fullName(), 
      recipientPhone: faker.phone.number(), 
      recipientAddress: faker.location.streetAddress() + ', ' + faker.location.city(), 
      status: faker.helpers.arrayElement(['NEW', 'PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED']), 
      lat: 10.7733 + (Math.random() - 0.5) * 0.1, 
      lng: 106.7000 + (Math.random() - 0.5) * 0.1,
      driverId: faker.helpers.arrayElement(allDrivers).id
    }));
    await prisma.order.createMany({ data: ordersBatch }).catch(e => console.warn('  [WARN] orders batch:', e.message));
  }
  const allOrdersData = await prisma.order.findMany();
  allOrders.push(...allOrdersData);

  console.log('--- Seeding Order Items ---');
  if (allOrders.length > 0 && allProducts.length > 0) {
    const orderItemsData = [];
    for (const order of allOrders) {
      const itemCount = faker.number.int({ min: 1, max: 5 });
      for (let j = 0; j < itemCount; j++) {
        orderItemsData.push({
          orderId: order.id,
          productId: faker.helpers.arrayElement(allProducts).id,
          quantity: faker.number.int({ min: 1, max: 10 }),
        });
      }
    }
    await prisma.orderItem.createMany({ data: orderItemsData }).catch(e => console.warn('  [WARN] order_items:', e.message));
  }

  console.log('--- Seeding Order Tracking Events ---');
  if (allOrders.length > 0) {
    const trackingEventsData = [];
    for (const order of allOrders.slice(0, 200)) {
      const eventCount = faker.number.int({ min: 2, max: 5 });
      const statuses = ['CREATED', 'CONFIRMED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];
      for (let j = 0; j < eventCount; j++) {
        trackingEventsData.push({
          orderId: order.id,
          status: statuses[j] || 'DELIVERED',
          location: faker.location.streetAddress() + ', ' + faker.location.city(),
          description: faker.lorem.sentence(),
          timestamp: faker.date.recent({ days: 7 }),
        });
      }
    }
    await prisma.orderTrackingEvent.createMany({ data: trackingEventsData }).catch(e => console.warn('  [WARN] tracking_events:', e.message));
  }

  console.log('--- Seeding Trips ---');
  const tripsData = Array.from({ length: 100 }).map(() => ({
    tripCode: `TRIP-${faker.string.alphanumeric(8).toUpperCase()}`,
    driverId: faker.helpers.arrayElement(allDrivers).id,
    vehicleId: faker.helpers.arrayElement(allVehicles).id,
    status: faker.helpers.arrayElement(['DRAFT', 'IN_PROGRESS', 'COMPLETED']),
    totalWeightKg: faker.number.int({ min: 100, max: 2000 })
  }));
  await prisma.trip.createMany({ data: tripsData }).catch(e => console.warn('  [WARN] trips:', e.message));
  const allTrips = await prisma.trip.findMany();

  console.log('--- Seeding Trip Stops & Deliveries ---');
  if (allTrips.length > 0 && allOrders.length > 0) {
    for (const trip of allTrips.slice(0, 80)) {
      const stopsCount = faker.number.int({ min: 2, max: 6 });
      for (let s = 0; s < stopsCount; s++) {
        const order = faker.helpers.arrayElement(allOrders);
        await prisma.tripStop.create({
          data: {
            tripId: trip.id,
            sequence: s + 1,
            stopType: faker.helpers.arrayElement(['PICKUP', 'DELIVERY']),
            address: faker.location.streetAddress() + ', ' + faker.location.city(),
            status: s === 0 ? 'COMPLETED' : faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS']),
          },
        }).catch(e => console.warn('  [WARN] trip_stop:', e.message));
      }
    }
    const allTripStops = await prisma.tripStop.findMany();
    const deliveriesData = allTripStops.slice(0, 100).map((stop) => ({
      tripId: stop.tripId,
      orderId: faker.helpers.arrayElement(allOrders).id,
      stopSequence: stop.sequence,
      stopType: stop.stopType,
      status: faker.helpers.arrayElement(['PENDING', 'IN_TRANSIT', 'DELIVERED']),
      customerName: faker.person.fullName(),
      customerPhone: faker.phone.number(),
      deliveryAddress: faker.location.streetAddress() + ', ' + faker.location.city(),
      lat: 10.7733 + (Math.random() - 0.5) * 0.1,
      lng: 106.7000 + (Math.random() - 0.5) * 0.1,
    }));
    await prisma.delivery.createMany({ data: deliveriesData }).catch(e => console.warn('  [WARN] deliveries:', e.message));
  }

  console.log('--- Seeding Finance (Expenses, COD) ---');
  const expensesData = Array.from({ length: 100 }).map(() => ({
    driverId: faker.helpers.arrayElement(allDrivers).id,
    amount: faker.number.int({ min: 50000, max: 1000000 }),
    category: faker.helpers.arrayElement(['FUEL', 'TOLL', 'MAINTENANCE', 'OTHER']),
    status: faker.helpers.arrayElement(['PENDING', 'APPROVED', 'REJECTED']),
    note: faker.lorem.sentence()
  }));
  await prisma.driverExpense.createMany({ data: expensesData }).catch(e => console.warn('  [WARN] expenses:', e.message));

  const codData = Array.from({ length: 100 }).map(() => {
    const isPending = faker.helpers.arrayElement([true, false]);
    return {
      driverId: faker.helpers.arrayElement(allDrivers).id,
      totalCodCollected: faker.number.int({ min: 500000, max: 5000000 }),
      totalExpensesDeducted: 0,
      amountRemitted: faker.number.int({ min: 500000, max: 5000000 }),
      status: isPending ? 'PENDING' : faker.helpers.arrayElement(['COMPLETED', 'REJECTED']),
    };
  });
  await prisma.codRemittance.createMany({ data: codData }).catch(e => console.warn('  [WARN] cod_remittances:', e.message));

  console.log('--- Seeding SOS Alerts ---');
  const sosData = Array.from({ length: 50 }).map(() => ({
    driverId: faker.helpers.arrayElement(allDrivers).id,
    message: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(['OPEN', 'IN_PROGRESS', 'RESOLVED'])
  }));
  await prisma.sosAlert.createMany({ data: sosData }).catch(e => console.warn('  [WARN] sos_alerts:', e.message));

console.log('--- Seeding Equipment Logs & Tasks ---');
   const equipmentData = Array.from({ length: 50 }).map(() => ({
     staffId: faker.helpers.arrayElement(allTenantUsers).id,
    warehouseId: faker.helpers.arrayElement(allWhs).id,
    equipmentCode: `EQ-${faker.string.numeric(4)}`,
    checkedOutAt: faker.date.recent(),
    status: faker.helpers.arrayElement(['OUT', 'RETURNED'])
  }));
  await prisma.equipmentCheckout.createMany({ data: equipmentData }).catch(e => console.warn('  [WARN] equipment:', e.message));

  const tasksData = Array.from({ length: 100 }).map(() => ({
    warehouseId: faker.helpers.arrayElement(allWhs).id,
    taskType: faker.helpers.arrayElement(['INBOUND', 'PUTAWAY', 'PICKING', 'PACKING', 'CYCLE_COUNT']),
    productId: faker.helpers.arrayElement(allProducts).id,
    quantityRequested: faker.number.int({ min: 1, max: 100 }),
    status: faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    priority: faker.helpers.arrayElement([0, 1, 2, 3])
  }));
  await prisma.task.createMany({ data: tasksData }).catch(e => console.warn('  [WARN] tasks:', e.message));

  console.log('--- Seeding Branches ---');
  const branchesData = Array.from({ length: 5 }).map((_, i) => ({
    type: faker.helpers.arrayElement(['HUB', 'STATION', 'DROP_OFF']),
    code: `BR-${faker.string.numeric(4)}`,
    name: `Branch ${i+1}`,
    address: faker.location.streetAddress() + ', ' + faker.location.city(),
    lat: 10.7733 + (Math.random() - 0.5) * 0.1,
    lng: 106.7000 + (Math.random() - 0.5) * 0.1,
    capacityCbm: faker.number.int({ min: 100, max: 1000 }),
    managerId: faker.helpers.arrayElement(allTenantUsers).id,
    status: 'ACTIVE'
  }));
  await prisma.branch.createMany({ data: branchesData }).catch(e => console.warn('  [WARN] branches:', e.message));

  console.log('--- Seeding WavePicking ---');
  const wavesData = Array.from({ length: 10 }).map((_, i) => ({
    warehouseId: faker.helpers.arrayElement(allWhs).id,
    waveNumber: `WAVE-${faker.string.numeric(6)}`,
    status: faker.helpers.arrayElement(['NEW', 'IN_PROGRESS', 'COMPLETED']),
    totalOrders: faker.number.int({ min: 10, max: 100 }),
    totalItems: faker.number.int({ min: 50, max: 500 }),
    createdBy: faker.helpers.arrayElement(allTenantUsers).id,
  }));
  await prisma.wavePicking.createMany({ data: wavesData }).catch(e => console.warn('  [WARN] wave_picking:', e.message));

  console.log('--- Seeding AI Models & Feedbacks ---');
  const modelsData = Array.from({ length: 3 }).map((_, i) => ({
    name: `Demand-Forecasting-V${i+1}`,
    version: `1.0.${i}`,
    type: 'FORECASTING',
    accuracy: faker.number.float({ min: 80, max: 99 }),
    modelPath: `/models/demand-v${i+1}.bin`,
    isCurrent: i === 2,
    metadata: JSON.stringify({ epochs: 100, batchSize: 32 })
  }));
  await prisma.aiModel.createMany({ data: modelsData }).catch(e => console.warn('  [WARN] ai_models:', e.message));
  const allModels = await prisma.aiModel.findMany();

  if (allModels.length > 0) {
    const feedbackData = Array.from({ length: 20 }).map(() => ({
      modelId: faker.helpers.arrayElement(allModels).id,
      resourceType: 'ORDER',
      resourceId: faker.string.uuid(),
      aiPrediction: 'High Volume',
      humanCorrected: 'Medium Volume',
      confidence: faker.number.float({ min: 50, max: 99 }),
      isUsedForTrain: faker.helpers.arrayElement([true, false])
    }));
    await prisma.aiFeedback.createMany({ data: feedbackData }).catch(e => console.warn('  [WARN] ai_feedbacks:', e.message));
  }

  console.log('--- Seeding Demand Forecasts ---');
  const forecastProducts = await prisma.product.findMany({ take: 20 });
  if (forecastProducts.length > 0) {
    const forecastData = Array.from({ length: 100 }).map(() => ({
      productId: faker.helpers.arrayElement(forecastProducts).id,
      forecastDate: faker.date.future(),
      demandQuantity: faker.number.int({ min: 10, max: 5000 }),
      modelVersion: '1.0.2',
    }));
    await prisma.demandForecast.createMany({ data: forecastData }).catch(e => console.warn('  [WARN] demand_forecasts:', e.message));
  }

  console.log('--- Seeding CycleCounts & Adjustments ---');
  const cycleCountsData = Array.from({ length: 10 }).map(() => ({
    warehouseId: faker.helpers.arrayElement(allWhs).id,
    status: faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
    scheduledAt: faker.date.future(),
    createdBy: faker.helpers.arrayElement(allTenantUsers).id,
  }));
  await prisma.cycleCount.createMany({ data: cycleCountsData }).catch(e => console.warn('  [WARN] cycle_counts:', e.message));

  if (allInventories.length > 0) {
    const adjustmentsData = Array.from({ length: 20 }).map(() => {
      const inv = faker.helpers.arrayElement(allInventories);
      return {
        inventoryId: inv.id,
        warehouseId: inv.warehouseId,
        reasonCode: faker.helpers.arrayElement(['DAMAGE', 'EXPIRED', 'FOUND', 'LOST']),
        quantityChange: faker.number.int({ min: -10, max: 10 }),
        createdBy: faker.helpers.arrayElement(allTenantUsers).id,
      };
    });
    await prisma.adjustment.createMany({ data: adjustmentsData }).catch(e => console.warn('  [WARN] adjustments:', e.message));
  }

  console.log('--- Seeding PackStationLogs & ScanLogs ---');
  if (allWhs.length > 0 && allTenantUsers.length > 0) {
    const packLogsData = Array.from({ length: 20 }).map(() => ({
      warehouseId: faker.helpers.arrayElement(allWhs).id,
      orderId: faker.helpers.arrayElement(allOrders).id,
    }));
    await prisma.packStationLog.createMany({ data: packLogsData }).catch(e => console.warn('  [WARN] pack_station_logs:', e.message));

    const scanLogsData = Array.from({ length: 50 }).map(() => ({
      warehouseId: faker.helpers.arrayElement(allWhs).id,
      actorId: faker.helpers.arrayElement(allTenantUsers).id,
      barcode: faker.string.alphanumeric(10).toUpperCase(),
      result: faker.helpers.arrayElement(['SUCCESS', 'FAILED']),
    }));
    await prisma.scanLog.createMany({ data: scanLogsData }).catch(e => console.warn('  [WARN] scan_logs:', e.message));
  }

  console.log('--- Seeding Return Reasons ---');
  const returnReasonsData = [
    { code: 'DAMAGED', name: 'Sản phẩm bị hư hỏng', description: 'Sản phẩm bị vỡ, trầy xước hoặc hư hỏng khi nhận', isActive: true },
    { code: 'WRONG_ITEM', name: 'Sai sản phẩm', description: 'Nhận sai sản phẩm so với đơn đặt hàng', isActive: true },
    { code: 'DEFECTIVE', name: 'Lỗi sản xuất', description: 'Sản phẩm không hoạt động hoặc có lỗi từ nhà sản xuất', isActive: true },
    { code: 'NOT_AS_DESCRIBED', name: 'Không đúng mô tả', description: 'Sản phẩm không giống như mô tả trên website', isActive: true },
    { code: 'CHANGE_MIND', name: 'Đổi ý', description: 'Khách hàng không còn nhu cầu sử dụng sản phẩm', isActive: true },
    { code: 'DUPLICATE', name: 'Đặt trùng', description: 'Khách hàng đặt trùng sản phẩm', isActive: true },
    { code: 'LATE_DELIVERY', name: 'Giao hàng trễ', description: 'Giao hàng không đúng thời hạn cam kết', isActive: true },
    { code: 'WRONG_ADDRESS', name: 'Sai địa chỉ', description: 'Địa chỉ giao hàng không chính xác', isActive: true },
    { code: 'OTHER', name: 'Lý do khác', description: 'Lý do không được liệt kê ở trên', isActive: true },
  ];
  for (const reason of returnReasonsData) {
    await prisma.returnReason.upsert({ where: { code: reason.code }, update: {}, create: reason }).catch(e => console.warn('  [WARN] return_reason:', e.message));
  }

  console.log('--- Seeding demo API keys & feature flags ---');
  const demoKeyHash = await bcrypt.hash('demo-secret-key-1234', 10);
  await prisma.tenantApiKey.create({
    data: {
      tenantId: demoTenant.id,
      keyHash: demoKeyHash,
      name: 'Demo API Key',
      scopes: JSON.stringify(['inventory:read', 'orders:create']),
    },
  });
  await prisma.featureFlag.createMany({
    data: [
      { tenantId: demoTenant.id, key: 'beta-dashboard', enabled: false, description: 'Enable beta UI for tenant' },
      { tenantId: demoTenant.id, key: 'enable-export', enabled: true, description: 'Allow data export' },
    ],
  });

  console.log(' SQLite Seeding Finished Successfully');
  console.log(' Admin: admin@smartlogi.vn / Admin@123');
  console.log(' Tenant: demo-tenant / tenant.admin@smartlogi.vn / Tenant@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

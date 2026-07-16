if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
  console.log(`[Seeder] No DATABASE_URL found. Defaulting to: ${process.env.DATABASE_URL}`);
  console.log(`[Seeder] No DATABASE_URL found. Defaulting to: ${process.env.DATABASE_URL}`);
}

import { PrismaClient } from '@prisma/client';
import { seedRoles } from './01-roles';
import { seedUsers } from './02-users';
import { seedWarehouses } from './03-warehouses';
import { seedCatalogAndInventory } from './04-catalog-inventory';
import { seedFleetAndDrivers } from './05-fleet-drivers';
import { seedClientsAndOrders } from './06-clients-orders';
import { seedTripsAndTasks } from './07-trips';
import { seedTrackingAndAi } from './08-tracking-ai';
import { seedFinanceAndReturns } from './09-finance-returns';
import { seedAdvancedFleet } from './10-advanced-fleet';
import { seedAdvancedWarehouse } from './11-advanced-warehouse';
import { seedSystemAndTenant } from './12-system-tenant';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🧹 Wiping existing data...');
  try {
    await prisma.taskItem.deleteMany();
    await prisma.task.deleteMany();
    await prisma.delivery.deleteMany();
    await prisma.tripStop.deleteMany();
    await prisma.gpsTrackingLog.deleteMany();
    await prisma.driverExpense.deleteMany();
    await prisma.codRemittance.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.orderTrackingEvent.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.returnItem.deleteMany();
    await prisma.returnRequest.deleteMany();
    await prisma.returnReason.deleteMany();
    await prisma.paymentTransaction.deleteMany();
    await prisma.invoiceLineItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.order.deleteMany();
    await prisma.sosAlert.deleteMany();
    await prisma.client.deleteMany();
    await prisma.geofence.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.adjustment.deleteMany();
    await prisma.cycleCount.deleteMany();
    await prisma.scanLog.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.demandForecast.deleteMany();
    await prisma.aiModel.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.bin.deleteMany();
    await prisma.rack.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.tenantUiConfig.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.customRole.deleteMany();
    await prisma.tenantUser.deleteMany();
  } catch (e) {
    console.error('Error wiping database:', e);
  }
}

async function main() {
  console.log('🚀 Starting Enterprise Data Seeding (Scale: 400 Employees)...');

  try {
    await clearDatabase();
    
    // 1. Roles
    const roleIds = await seedRoles(prisma);

    // 2. Users
    await seedUsers(prisma, roleIds);

    // 3. Warehouses & Locations
    await seedWarehouses(prisma);

    // 4. Catalog & Inventory
    await seedCatalogAndInventory(prisma);

    // 5. Fleet & Drivers
    await seedFleetAndDrivers(prisma);

    // 6. Clients & Orders
    await seedClientsAndOrders(prisma);

    // 7. Trips, Deliveries & Tasks
    await seedTripsAndTasks(prisma);

    // 8. Tracking & AI
    await seedTrackingAndAi(prisma);

    // 9. Finance & Returns
    await seedFinanceAndReturns(prisma);

    // 10. Advanced Fleet
    await seedAdvancedFleet(prisma);

    // 11. Advanced Warehouse
    await seedAdvancedWarehouse(prisma);

    // 12. System & Tenant
    await seedSystemAndTenant(prisma);

    console.log('✨ All seed data successfully generated!');
  } catch (e) {
    console.error('❌ Seeding failed: ', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

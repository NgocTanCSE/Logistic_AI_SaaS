import { Reflector } from '@nestjs/core';
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler"
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core"
import { HealthController } from "./controllers/health.controller"
import { InventoryController } from "./controllers/inventory.controller"
import { AdjustmentsController } from "./controllers/adjustments.controller"
import { CycleCountsController } from "./controllers/cycle-counts.controller"
import { WarehouseOpsController } from "./controllers/warehouse-ops.controller"
import { ProductsController } from "./controllers/products.controller"
import { MobileController } from "./controllers/mobile.controller"
import { BinsController } from "./controllers/bins.controller"
import { WarehousesController } from "./warehouses/warehouses.controller"
import { BranchesController } from "./warehouses/branches.controller"
import { LocationsController } from "./locations/locations.controller"
import { WavesController } from "./waves/waves.controller"
import { TasksController } from "./tasks/tasks.controller"
import { TenantMiddleware } from "./middleware/tenant.middleware"
import { PrismaModule } from "./prisma/prisma.module"
import { AuthModule } from "./auth/auth.module"
import { InventoryService } from "./controllers/inventory.service"
import { WavesService } from "./waves/waves.service"
import { AuditLogInterceptor, TenantSchemaInterceptor } from "./middleware/audit-log.interceptor"

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    PrismaModule, 
    AuthModule
  ],
  controllers: [
    HealthController, 
    InventoryController, 
    AdjustmentsController,
    CycleCountsController,
    WarehouseOpsController,
    ProductsController,
    MobileController,
    BinsController,
    WarehousesController,
    BranchesController,
    LocationsController,
    WavesController,
    TasksController
  ],
  providers: [Reflector, InventoryService, WavesService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantSchemaInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*")
  }
}

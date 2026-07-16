import { Reflector } from '@nestjs/core';
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { CacheModule } from "@nestjs/cache-manager"
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler"
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core"
import { HealthController } from "./controllers/health.controller"
import { PublicTrackingController, TrackingController } from "./controllers/public-tracking.controller"
import { ClientOrdersController } from "./controllers/client-orders.controller"
import { ClientInventoryController } from "./controllers/client-inventory.controller"
import { ClientWebhooksController } from "./controllers/client-webhooks.controller"
import { ClientInvoicesController } from "./controllers/client-invoices.controller"
import { ClientReturnsController } from "./controllers/client-returns.controller"
import { TenantMiddleware } from "./middleware/tenant.middleware"
import { PrismaModule } from "./prisma/prisma.module"
import { AuthModule } from "./auth/auth.module"
import { TenantSchemaInterceptor } from "./interceptors/request-logging.interceptor"

@Module({
  imports: [
    CacheModule.register({ ttl: 60000 }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    PrismaModule, 
    AuthModule
  ],
  controllers: [
    HealthController,
    PublicTrackingController,
    TrackingController,
    ClientOrdersController,
    ClientInventoryController,
    ClientWebhooksController,
    ClientInvoicesController,
    ClientReturnsController,
  ],
  providers: [Reflector, 
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantSchemaInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*")
  }
}

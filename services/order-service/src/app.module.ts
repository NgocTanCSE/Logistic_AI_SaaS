import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { ClientsModule, Transport } from "@nestjs/microservices"
import { HttpModule } from "@nestjs/axios"
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler"
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core"
import { Reflector } from "@nestjs/core"
import { HealthController } from "./controllers/health.controller"
import { OrdersController } from "./controllers/orders.controller"
import { BulkUploadController } from "./controllers/bulk-upload.controller"
import { ReturnsController } from "./controllers/returns.controller"
import { ClientsController } from "./clients/clients.controller"
import { TrackingController } from "./tracking/tracking.controller"
import { WebhooksController } from "./webhooks/webhooks.controller"
import { AuthController } from "./auth/auth.controller"
import { TenantMiddleware } from "./middleware/tenant.middleware"
import { PrismaModule } from "./prisma/prisma.module"
import { AuthModule } from "./auth/auth.module"
import { KafkaEventService } from "./services/kafka-event.service"
import { AuditLogInterceptor, TenantSchemaInterceptor } from "./middleware/audit-log.interceptor"
import { PermissionsGuard } from "shared-types"

const kafkaBrokers = process.env.KAFKA_BROKERS?.trim()

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    PrismaModule, 
    AuthModule,
    HttpModule,
    ...(kafkaBrokers ? [
      ClientsModule.register([
        {
          name: 'KAFKA_SERVICE',
          transport: Transport.KAFKA,
          options: {
            client: {
              brokers: [kafkaBrokers],
              retry: { retries: 0 },
              connectionTimeout: 500,
            },
            consumer: {
              groupId: 'order-group',
            },
          },
        },
      ]),
    ] : []),
  ],
  controllers: [
    HealthController, 
    OrdersController, 
    BulkUploadController,
    ReturnsController,
    ClientsController, 
    TrackingController, 
    WebhooksController,
    AuthController
  ],
  providers: [
    Reflector,
    KafkaEventService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
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

import { Reflector, APP_INTERCEPTOR } from '@nestjs/core';
import { Logger, MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { CacheModule } from "@nestjs/cache-manager"
import { BullModule } from "@nestjs/bullmq"
import { HttpModule } from "@nestjs/axios"
import { ThrottlerModule } from "@nestjs/throttler"
import { HealthController } from "./controllers/health.controller"
import { TenantMiddleware } from "./middleware/tenant.middleware"
import { PrismaModule } from "./prisma/prisma.module"
import { AuthModule } from "./auth/auth.module"
import { VehiclesController } from "./fleet/vehicles.controller"
import { DriversController } from "./fleet/drivers.controller"
import { TripsController } from "./trips/trips.controller"
import { MobileTripsController } from "./trips/mobile-trips.controller"
import { GpsController } from "./tracking/gps.controller"
import { GeofencesController } from "./tracking/geofences.controller"
import { BranchesController } from "./warehouses/branches.controller"
import { DriverAppController } from "./driver-app/driver-app.controller"
import { FinanceController } from "./controllers/finance.controller"
import { AiManagementController } from "./controllers/ai-management.controller"
import { AiModelsController } from "./controllers/ai-models.controller"
import { CodRemittancesController } from "./controllers/cod-remittances.controller"
import { LogisticsController } from "./controllers/logistics.controller"
import { ReturnsController } from "./controllers/returns.controller"
import { LogisticsService } from "./services/logistics.service"
import { GeocodingService } from "./services/geocoding.service"
import { S3Service } from "./services/s3.service"
import { UploadController } from "./controllers/upload.controller"
import { RoutingProcessor } from "./processors/routing.processor"
import { getQueueToken } from "@nestjs/bullmq"
import { AuditLogInterceptor, TenantSchemaInterceptor } from "./middleware/audit-log.interceptor"

const isRedisEnabled = process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost';

const importsArr: any[] = [
  ThrottlerModule.forRoot([{
    ttl: 60000,
    limit: 100,
  }]),
  CacheModule.register(),
  PrismaModule, 
  AuthModule, 
  HttpModule
];

const providersArr: any[] = [
   Reflector, 
   LogisticsService, 
   GeocodingService, 
   S3Service,
   {
     provide: APP_INTERCEPTOR,
     useClass: TenantSchemaInterceptor,
   },
   {
     provide: APP_INTERCEPTOR,
     useClass: AuditLogInterceptor,
   },
];

if (isRedisEnabled) {
  importsArr.push(
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'routing',
    })
  );
  providersArr.push(RoutingProcessor);
} else {
  // Provide a mock queue when Redis is unavailable to prevent DI errors
  providersArr.push({
    provide: getQueueToken('routing'),
    useValue: {
      add: async (name: string, data: any) => {
        new Logger('MockQueue').warn(`Skipped adding job ${name} because Redis is disabled.`);
        return { id: 'mock-job-id', status: 'COMPLETED' };
      },
    },
  });
}

@Module({
  imports: importsArr,
controllers: [
    HealthController, 
    VehiclesController,
    DriversController,
    TripsController, 
    MobileTripsController,
    GpsController,
    GeofencesController,
    BranchesController,
    DriverAppController,
    FinanceController,
    AiManagementController,
    AiModelsController,
    CodRemittancesController,
    LogisticsController,
    ReturnsController,
    UploadController
  ],
  providers: providersArr,
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*")
  }
}

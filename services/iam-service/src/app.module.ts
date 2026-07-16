import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { CacheModule } from "@nestjs/cache-manager"
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler"
import { APP_INTERCEPTOR, APP_GUARD, Reflector } from "@nestjs/core"
import { HealthController } from "./controllers/health.controller"
import { AuthController } from "./controllers/auth.controller"
import { AdminAuthController } from "./controllers/admin-auth.controller"
import { TenantAuthController } from "./controllers/tenant-auth.controller"
import { MobileAuthController } from "./controllers/mobile-auth.controller"
import { ClientAuthController } from "./controllers/client-auth.controller"
import { AdminTenantsController } from "./controllers/admin-tenants.controller"
import { AdminDashboardController } from "./controllers/admin-dashboard.controller"
import { StripeWebhookController } from "./controllers/stripe-webhook.controller"
import { PrismaModule } from "./prisma/prisma.module"
import { LoggerMiddleware } from "./middleware/logger.middleware"
import { TenantMiddleware } from "./middleware/tenant.middleware"
import { AuthModule } from "./auth/auth.module"
import { StripeService } from "./payments/stripe.service";
import { MfaService } from "./services/mfa.service";
import { AuditLogInterceptor, TenantSchemaInterceptor } from "./middleware/audit-log.interceptor";

import { TenantRolesController } from "./controllers/tenant-roles.controller";
import { TenantUsersController } from "./controllers/tenant-users.controller";
import { AdminAuditLogsController } from "./controllers/admin-audit-logs.controller";
import { TenantSettingsController } from "./controllers/tenant-settings.controller";
import { BranchesController } from "./controllers/branches.controller";

import { TenantDashboardController } from "./controllers/tenant-dashboard.controller";
import { TenantAuditLogsController } from "./controllers/tenant-audit-logs.controller";
import { TenantBillingController } from "./controllers/tenant-billing.controller";

import { AdminBillingController } from "./controllers/admin-billing.controller";
import { ApiKeysController } from "./controllers/api-keys.controller";
import { FeatureFlagsController } from "./controllers/feature-flags.controller";
import { MetricsController } from "./controllers/metrics.controller";

@Module({
  imports: [
    CacheModule.register({ ttl: 300000 }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 5,
      },
    ]),
    PrismaModule, 
    AuthModule
  ],
  controllers: [
    HealthController,
    AuthController,
    AdminAuthController,
    TenantAuthController,
    MobileAuthController,
    ClientAuthController,
    AdminTenantsController,
    AdminDashboardController,
    StripeWebhookController,
    TenantRolesController,
    TenantUsersController,
    AdminAuditLogsController,
    BranchesController,
    TenantSettingsController,
    TenantDashboardController,
    TenantAuditLogsController,
    TenantBillingController,
    AdminBillingController,
    ApiKeysController,
    FeatureFlagsController,
    MetricsController,
  ],
  providers: [Reflector, StripeService, MfaService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantSchemaInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware, TenantMiddleware).forRoutes("*")
  }
}

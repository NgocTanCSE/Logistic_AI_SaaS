import { Reflector, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthController } from './controllers/health.controller';
import { NotificationsController } from './controllers/notifications.controller';
import { EventController } from './controllers/event.controller';
import { NotificationService } from './services/notification.service';
import { TasksService } from './services/tasks.service';
import { PrismaModule } from './prisma/prisma.module';
import { EventPrismaService } from './prisma/event-prisma.service';
import { ProviderFactory } from './providers/provider.factory';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { NotificationGateway } from './gateways/notification.gateway';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { JwtStrategy } from './auth/jwt.strategy';
import { TenantSchemaInterceptor } from './interceptors/request-logging.interceptor';
import { PermissionsGuard } from 'shared-types';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'smartlogi-jwt-secret',
      signOptions: { expiresIn: '1d' },
    }),
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  controllers: [HealthController, NotificationsController, EventController],
  providers: [
    Reflector,
    PermissionsGuard,
    NotificationService,
    TasksService,
    EventPrismaService,
    ProviderFactory,
    NotificationGateway,
    JwtAuthGuard,
    JwtStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantSchemaInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}

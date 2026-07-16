import { Controller, Get } from '@nestjs/common';
import { SERVICES } from '../config/services.config';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Routes')
@Controller('routes')
export class RoutesController {
  @Get()
  list() {
    return {
      gateway: 'SmartLogi API Gateway v1.0',
      services: SERVICES.map((s) => ({
        name: s.name,
        prefix: s.prefix,
      })),
      endpoints: {
        auth: '/api/v1/iam/auth/login',
        admin: '/api/v1/iam/admin',
        tenant: '/api/v1/iam/tenant',
        inventory: '/api/v1/inventory',
        orders: '/api/v1/orders',
        logistics: '/api/v1/logistics',
        customers: '/api/v1/customer',
        notifications: '/api/v1/notifications',
        ai: '/api/v1/ai',
        gps: '/gps',
        webhooks: '/webhook',
      },
    };
  }
}

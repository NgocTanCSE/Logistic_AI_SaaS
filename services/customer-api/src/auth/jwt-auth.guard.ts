import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Permissions } from 'shared-types';

const MOCK_ROLE_PERMISSIONS: Record<string, string[]> = {
  CUSTOMER_CLIENT: [
    Permissions.OrdersRead,
    Permissions.OrdersCreate,
    Permissions.InventoryRead,
    Permissions.NotificationsRead,
    Permissions.ReturnsRead,
    Permissions.ReturnsCreate,
  ],
  WAREHOUSE_STAFF: [
    Permissions.InventoryRead,
    Permissions.TasksRead,
    Permissions.TasksUpdate,
    Permissions.MobileSyncPull,
    Permissions.MobileSyncPush,
    Permissions.PackStationScan,
  ],
  TENANT_ADMIN: [
    Permissions.OrdersRead,
    Permissions.OrdersCreate,
    Permissions.InventoryRead,
    Permissions.InventoryAdjust,
    Permissions.WarehousesManage,
    Permissions.TasksRead,
    Permissions.TasksCreate,
    Permissions.TasksUpdate,
    Permissions.TripsRead,
    Permissions.TripsDispatch,
    Permissions.VehiclesRead,
    Permissions.VehiclesManage,
    Permissions.DriversManage,
    Permissions.UsersRead,
    Permissions.UsersInvite,
    Permissions.RolesManage,
    Permissions.SettingsManage,
    Permissions.AuditLogsRead,
    Permissions.BillingRead,
    Permissions.ApiKeysManage,
    Permissions.NotificationsRead,
    Permissions.MobileSyncPull,
    Permissions.MobileSyncPush,
    Permissions.MobileUploads,
    Permissions.MobileGpsBatch,
    Permissions.MobileSos,
    Permissions.PackStationScan,
    Permissions.ReturnsRead,
    Permissions.ReturnsCreate,
    Permissions.ReturnsApprove,
    Permissions.ReturnsInspect,
    Permissions.ReturnsRefund,
  ],
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwtService: JwtService;

  constructor(private readonly prisma: PrismaService) {
    this.jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'smartlogi-jwt-secret' });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const mockRole = request.headers['x-mock-role'] as string | undefined;

    if (mockRole) {
      request.user = {
        sub: 'mock-user-id',
        email: 'mock@dev.local',
        role: mockRole,
        tenant_id: undefined,
        schema_name: 'public',
        schemaName: 'public',
        permissions: MOCK_ROLE_PERMISSIONS[mockRole] || [],
      };
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader) throw new UnauthorizedException('Missing token');

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Invalid token');

    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (payload.tenant_id) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: payload.tenant_id },
        });
        if (!tenant || tenant.status !== 'ACTIVE') {
          throw new UnauthorizedException('Tenant is inactive or deleted');
        }
      }
      request.user = { ...payload, schemaName: payload.schema_name || 'public' };
      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

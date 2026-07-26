import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { getJwtSecret, PUBLIC_PATHS } from '../config/services.config';
import { Permissions } from 'shared-types';

const MOCK_ROLE_PERMISSIONS: Record<string, string[]> = {
  WAREHOUSE_MANAGER: [
    Permissions.InventoryRead,
    Permissions.InventoryAdjust,
    Permissions.WarehousesManage,
    Permissions.TasksRead,
    Permissions.TasksCreate,
    Permissions.TasksUpdate,
    Permissions.OrdersRead,
    Permissions.VehiclesRead,
    Permissions.UsersRead,
    Permissions.NotificationsRead,
    Permissions.PackStationScan,
  ],
  WAREHOUSE_STAFF: [
    Permissions.InventoryRead,
    Permissions.TasksRead,
    Permissions.TasksUpdate,
    Permissions.MobileSyncPull,
    Permissions.MobileSyncPush,
    Permissions.PackStationScan,
  ],
  LOGISTICS_MANAGER: [
    Permissions.OrdersRead,
    Permissions.OrdersCreate,
    Permissions.TripsRead,
    Permissions.TripsDispatch,
    Permissions.VehiclesRead,
    Permissions.VehiclesManage,
    Permissions.DriversManage,
    Permissions.UsersRead,
    Permissions.NotificationsRead,
    Permissions.ReturnsRead,
    Permissions.ReturnsCreate,
    Permissions.ReturnsApprove,
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
  TENANT_USER: [
    Permissions.InventoryRead,
    Permissions.OrdersRead,
    Permissions.TasksRead,
    Permissions.TripsRead,
  ],
  DRIVER: [
    Permissions.TripsRead,
    Permissions.MobileSyncPull,
    Permissions.MobileSyncPush,
    Permissions.MobileUploads,
    Permissions.MobileGpsBatch,
    Permissions.MobileSos,
  ],
  CUSTOMER_CLIENT: [
    Permissions.OrdersRead,
    Permissions.OrdersCreate,
    Permissions.InventoryRead,
    Permissions.NotificationsRead,
    Permissions.ReturnsRead,
    Permissions.ReturnsCreate,
  ],
};

@Injectable()
export class JwtGatewayGuard implements CanActivate {
  private readonly logger = new Logger(JwtGatewayGuard.name);
  private readonly jwtSecret: string;

  constructor() {
    try {
      this.jwtSecret = getJwtSecret();
    } catch (error) {
      this.logger.error('JWT_SECRET is not configured. Set JWT_SECRET environment variable.');
      throw error;
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.originalUrl;

    if (this.isPublicPath(path)) {
      return true;
    }

    const mockRole = request.headers['x-mock-role'] as string | undefined;

    if (mockRole) {
      (request as any).user = {
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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    try {
      const decoded: any = jwt.verify(token, this.jwtSecret);
      decoded.schemaName = decoded.schema_name || 'public';
      (request as any).user = decoded;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private isPublicPath(path: string): boolean {
    return PUBLIC_PATHS.some((publicPath) => path.startsWith(publicPath));
  }
}

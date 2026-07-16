import { PrismaClient } from '@prisma/client';

export async function seedRoles(prisma: PrismaClient) {
  console.log('--- Seeding Roles and Permissions ---');
  
  const roles = [
    'TENANT_ADMIN',
    'WAREHOUSE_MANAGER',
    'WAREHOUSE_STAFF',
    'LOGISTICS_MANAGER',
    'DRIVER',
    'CUSTOMER_CLIENT',
    'TENANT_USER'
  ];

  const adminPerms = [
    'inventory:read', 'inventory:adjust', 'warehouses:manage', 'tasks:read', 'tasks:create', 'tasks:update',
    'orders:read', 'orders:create', 'trips:read', 'trips:dispatch', 'vehicles:read', 'vehicles:manage',
    'drivers:manage', 'users:read', 'users:invite', 'roles:manage', 'settings:manage', 'audit-logs:read',
    'billing:read', 'api-keys:manage', 'notifications:read', 'mobile:sync:pull', 'mobile:sync:push',
    'mobile:uploads', 'mobile:gps:batch', 'mobile:sos', 'pack-station:scan', 'clients:manage', 'clients:read',
    'returns:read', 'returns:create', 'returns:approve', 'returns:inspect', 'returns:refund', 'tenant-dashboard:read'
  ];

  const roleIds: Record<string, string> = {};

  for (const roleName of roles) {
    let role = await prisma.customRole.findFirst({ where: { name: roleName } });
    if (!role) {
      role = await prisma.customRole.create({
        data: { name: roleName, isSystemDefault: true }
      });
    }
    roleIds[roleName] = role.id;

    // Full permissions for admin and log.manager as fallback
    if (roleName === 'TENANT_ADMIN' || roleName === 'LOGISTICS_MANAGER' || roleName === 'WAREHOUSE_MANAGER') {
      for (const p of adminPerms) {
        const [resource, actionName] = p.split(':');
        
        const existingPerm = await prisma.rolePermission.findFirst({
          where: { roleId: role.id, resource, action: actionName }
        });
        
        if (!existingPerm) {
           await prisma.rolePermission.create({
             data: { roleId: role.id, resource, action: actionName }
           });
        }
      }
    }
  }

  return roleIds;
}

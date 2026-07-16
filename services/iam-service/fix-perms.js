const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "file:./dev.db" } } });

async function fixPermissions() {
  try {
    const roles = await prisma.customRole.findMany({ where: { name: 'TENANT_ADMIN' } });
    const adminPerms = [
      'returns:read', 'returns:create', 'returns:approve', 'returns:inspect', 'returns:refund', 'tenant-dashboard:read', 'clients:manage', 'clients:read'
    ];
    
    let count = 0;
    for (const role of roles) {
      for (const p of adminPerms) {
        const [resource, action] = p.split(':');
        const exists = await prisma.rolePermission.findFirst({
          where: { roleId: role.id, resource, action }
        });
        if (!exists) {
          await prisma.rolePermission.create({
            data: { roleId: role.id, resource, action }
          });
          count++;
        }
      }
    }
    console.log(`Successfully added ${count} missing permissions to existing TENANT_ADMIN roles.`);
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}
fixPermissions();

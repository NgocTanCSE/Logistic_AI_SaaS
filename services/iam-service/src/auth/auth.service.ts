import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const RESET_TOKEN_EXPIRY_MINUTES = 15;
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8086/api/v1';

async function sendNotification(payload: { channel: string; to: string; subject: string; body: string }): Promise<void> {
  try {
    const response = await fetch(`${NOTIFICATION_SERVICE_URL}/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`[AuthService] Failed to send notification: ${response.status}`);
    }
  } catch (error) {
    console.error(`[AuthService] Notification service unavailable: ${error.message}`);
  }
}

const SLUG_ROLE_MAP: Record<string, string> = {
  'demo-tenant': 'TENANT_ADMIN',
  'warehouse-tenant': 'WAREHOUSE_MANAGER',
  'logistics-tenant': 'LOGISTICS_MANAGER',
  'customer-tenant': 'CLIENT_USER',
  'pack-station': 'WAREHOUSE_STAFF',
  'smartlogi': 'DRIVER',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private getRoleFromSlug(slug: string): string {
    return SLUG_ROLE_MAP[slug] || 'TENANT_USER';
  }

  async loginSuperAdmin(email: string, pass: string) {
    const admin = await this.prisma.systemAdmin.findFirst({
      where: { email },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(pass || 'admin123', admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: any = {
      sub: admin.id,
      email: admin.email,
      role: 'SUPER_ADMIN',
      permissions: [],
      schema_name: 'public',
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign({ sub: admin.id, type: 'refresh' }, { expiresIn: '7d' }),
    };
  }

  async loginTenantUser(tenantSlug: string, email: string, pass: string) {
    // SQLite/Fallback mode - skip password validation for demo
    const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:');
    let tenant = await this.prisma.tenant.findFirst({
      where: { 
        OR: [
          { slug: tenantSlug },
          { dbSchemaName: tenantSlug.replace(/-/g, '_') }
        ]
      },
    });

    if (isSqlite && !tenant) {
      tenant = await this.prisma.tenant.create({
        data: {
          name: tenantSlug,
          slug: tenantSlug,
          dbSchemaName: tenantSlug.replace(/-/g, '_'),
          status: 'ACTIVE',
        },
      });
    }

    if (!tenant) throw new UnauthorizedException('Tenant not found');

    const expectedRole = this.getRoleFromSlug(tenantSlug);

    if (isSqlite) {
      // SQLite/Fallback mode - try to find user, create if not exists (demo mode)
      let user = await this.prisma.tenantUser.findFirst({
        where: { email },
      });

      if (!user) {
        // Auto-create demo user for testing (SQLite mode)
        user = await this.prisma.tenantUser.create({
          data: {
            email,
            passwordHash: await bcrypt.hash(pass || 'Tenant@123', 10),
            fullName: 'Demo User',
            status: 'ACTIVE',
          },
        });

        // Assign expected role with full permissions
        const existingRoleCheck = await this.prisma.customRole.findFirst({
          where: { name: expectedRole },
        });
        let assignedRoleId = existingRoleCheck?.id;
        if (!assignedRoleId) {
          const newRole = await this.prisma.customRole.create({
            data: { name: expectedRole, isSystemDefault: true },
          });
          assignedRoleId = newRole.id;
        }
        await this.prisma.userRole.create({
          data: { userId: user.id, roleId: assignedRoleId },
        });
        // Create default permissions
        const adminPerms = [
          'inventory:read', 'inventory:adjust', 'warehouses:manage', 'tasks:read', 'tasks:create', 'tasks:update',
          'orders:read', 'orders:create', 'trips:read', 'trips:dispatch', 'vehicles:read', 'vehicles:manage',
          'drivers:manage', 'users:read', 'users:invite', 'roles:manage', 'settings:manage', 'audit-logs:read',
          'billing:read', 'api-keys:manage', 'notifications:read', 'mobile:sync:pull', 'mobile:sync:push',
          'mobile:uploads', 'mobile:gps:batch', 'mobile:sos', 'pack-station:scan', 'clients:manage', 'clients:read'
        ];
        for (const p of adminPerms) {
          const [resource, action] = p.split(':');
          await this.prisma.rolePermission.upsert({
            where: { roleId_resource_action: { roleId: assignedRoleId, resource, action } },
            update: {},
            create: { roleId: assignedRoleId, resource, action },
          });
        }
      }

      // Skip password validation in SQLite mode for demo
      const permissions: string[] = [];

      // Fetch permissions for the user
      const roles = await this.prisma.userRole.findMany({
        where: { userId: user.id },
        include: { role: true },
      });
      const dbRole = roles[0]?.role?.name || expectedRole;
      const userRoleId = roles[0]?.roleId;
      if (userRoleId) {
        const perms = await this.prisma.rolePermission.findMany({
          where: { roleId: userRoleId },
        });
        permissions.push(...perms.map(p => `${p.resource}:${p.action}`));
      }

      const payload: any = {
        sub: user.id,
        email: user.email,
        role: dbRole,
        tenant_id: tenant.id,
        schema_name: 'public',
        permissions,
      };

      return {
        access_token: this.jwtService.sign(payload),
        refresh_token: this.jwtService.sign({ sub: user.id, type: 'refresh', tenant_id: tenant.id }, { expiresIn: '7d' }),
      };
    }

    return this.prisma.runWithSchema(tenant.dbSchemaName, async () => {
      const prismaWithTenant = this.prisma.tenantClient;

      if (!prismaWithTenant || !prismaWithTenant.tenantUser) {
        throw new UnauthorizedException('Tenant schema not initialized');
      }

      const user = await prismaWithTenant.tenantUser.findFirst({
        where: { email },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(pass, user.passwordHash || '');
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Fetch permissions for the user in tenant schema
      const roles = await prismaWithTenant.userRole.findMany({
        where: { userId: user.id },
        include: { role: true },
      });
      const userRoleId = roles[0]?.roleId;
      let permissions: string[] = [];
      if (userRoleId) {
        const perms = await prismaWithTenant.rolePermission.findMany({
          where: { roleId: userRoleId },
        });
        permissions = perms.map(p => `${p.resource}:${p.action}`);
      }

      const payload: any = {
        sub: user.id,
        email: user.email,
        role: roles[0]?.role?.name || expectedRole,
        tenant_id: tenant.id,
        schema_name: tenant.dbSchemaName,
        permissions,
      };

      return {
        access_token: this.jwtService.sign(payload),
        refresh_token: this.jwtService.sign({ sub: user.id, type: 'refresh', tenant_id: tenant.id }, { expiresIn: '7d' }),
      };
    });
  }

  async forgotPasswordSuperAdmin(email: string): Promise<{ ok: boolean; message: string }> {
    const admin = await this.prisma.systemAdmin.findUnique({ where: { email } });
    if (!admin) {
      return { ok: true, message: 'If this email exists, a reset link has been sent.' };
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    await this.prisma.systemAdmin.update({
      where: { email },
      data: { resetToken, resetTokenExpiry },
    });
    await sendNotification({
      channel: 'EMAIL',
      to: email,
      subject: 'Password Reset - SmartLogi',
      body: `Your password reset token is: ${resetToken}. It expires in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.`,
    });
    return { ok: true, message: 'If this email exists, a reset link has been sent.' };
  }

  async resetPasswordSuperAdmin(email: string, token: string, newPassword: string): Promise<{ ok: boolean; message: string }> {
    const admin = await this.prisma.systemAdmin.findUnique({ where: { email } });
    if (!admin || admin.resetToken !== token || (admin.resetTokenExpiry && admin.resetTokenExpiry < new Date())) {
      throw new BadRequestException('Invalid or expired reset token.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.systemAdmin.update({
      where: { email },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });
    return { ok: true, message: 'Password has been reset successfully.' };
  }

  async forgotPasswordTenantUser(tenantSlug: string, email: string): Promise<{ ok: boolean; message: string }> {
    const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:');
    const tenant = await this.prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) {
      return { ok: true, message: 'If this email exists, a reset link has been sent.' };
    }

    if (isSqlite) {
      const user = await this.prisma.tenantUser.findFirst({ where: { email } });
      if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
        await this.prisma.tenantUser.update({
          where: { id: user.id },
          data: { resetToken, resetTokenExpiry },
        });
        await sendNotification({
          channel: 'EMAIL',
          to: email,
          subject: 'Password Reset - SmartLogi',
          body: `Your password reset token is: ${resetToken}. It expires in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.`,
        });
      }
      return { ok: true, message: 'If this email exists, a reset link has been sent.' };
    }

    return this.prisma.runWithSchema(tenant.dbSchemaName, async () => {
      const prismaWithTenant = this.prisma.tenantClient;
      const user = await prismaWithTenant.tenantUser.findFirst({ where: { email } });
      if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
        await prismaWithTenant.tenantUser.update({
          where: { id: user.id },
          data: { resetToken, resetTokenExpiry },
        });
        await sendNotification({
          channel: 'EMAIL',
          to: email,
          subject: 'Password Reset - SmartLogi',
          body: `Your password reset token is: ${resetToken}. It expires in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.`,
        });
      }
      return { ok: true, message: 'If this email exists, a reset link has been sent.' };
    });
  }

  async resetPasswordTenantUser(tenantSlug: string, email: string, token: string, newPassword: string): Promise<{ ok: boolean; message: string }> {
    const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:');
    const tenant = await this.prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) {
      throw new BadRequestException('Invalid tenant.');
    }

    if (isSqlite) {
      const user = await this.prisma.tenantUser.findFirst({ where: { email } });
      if (!user || user.resetToken !== token || (user.resetTokenExpiry && user.resetTokenExpiry < new Date())) {
        throw new BadRequestException('Invalid or expired reset token.');
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await this.prisma.tenantUser.update({
        where: { id: user.id },
        data: { passwordHash, resetToken: null, resetTokenExpiry: null },
      });
      return { ok: true, message: 'Password has been reset successfully.' };
    }

    return this.prisma.runWithSchema(tenant.dbSchemaName, async () => {
      const prismaWithTenant = this.prisma.tenantClient;
      const user = await prismaWithTenant.tenantUser.findFirst({ where: { email } });
      if (!user || user.resetToken !== token || (user.resetTokenExpiry && user.resetTokenExpiry < new Date())) {
        throw new BadRequestException('Invalid or expired reset token.');
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prismaWithTenant.tenantUser.update({
        where: { id: user.id },
        data: { passwordHash, resetToken: null, resetTokenExpiry: null },
      });
      return { ok: true, message: 'Password has been reset successfully.' };
    });
  }

  async changePasswordSuperAdmin(email: string, oldPassword: string, newPassword: string): Promise<{ ok: boolean; message: string }> {
    const admin = await this.prisma.systemAdmin.findUnique({ where: { email } });
    if (!admin) {
      throw new UnauthorizedException('Admin not found.');
    }
    const isPasswordValid = await bcrypt.compare(oldPassword, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.systemAdmin.update({
      where: { email },
      data: { passwordHash },
    });
    return { ok: true, message: 'Password changed successfully.' };
  }

  async changePasswordTenantUser(schemaName: string, userId: string, oldPassword: string, newPassword: string): Promise<{ ok: boolean; message: string }> {
    const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:');

    if (isSqlite) {
      const user = await this.prisma.tenantUser.findUnique({ where: { id: userId } });
      if (!user) {
        throw new UnauthorizedException('User not found.');
      }
      const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash || '');
      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect.');
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await this.prisma.tenantUser.update({
        where: { id: userId },
        data: { passwordHash },
      });
      return { ok: true, message: 'Password changed successfully.' };
    }

    return this.prisma.runWithSchema(schemaName, async () => {
      const prismaWithTenant = this.prisma.tenantClient;
      const user = await prismaWithTenant.tenantUser.findUnique({ where: { id: userId } });
      if (!user) {
        throw new UnauthorizedException('User not found.');
      }
      const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash || '');
      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect.');
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prismaWithTenant.tenantUser.update({
        where: { id: userId },
        data: { passwordHash },
      });
      return { ok: true, message: 'Password changed successfully.' };
    });
  }

  async updateProfileSuperAdmin(adminId: string, data: { fullName?: string }): Promise<{ ok: boolean; message: string }> {
    await this.prisma.systemAdmin.update({
      where: { id: adminId },
      data: { ...(data.fullName && { fullName: data.fullName }) },
    });
    return { ok: true, message: 'Profile updated.' };
  }

  async updateProfileTenantUser(userId: string, data: { fullName?: string; phone?: string }): Promise<{ ok: boolean; message: string }> {
    const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:');

    if (isSqlite) {
      await this.prisma.tenantUser.update({
        where: { id: userId },
        data: { ...(data.fullName && { fullName: data.fullName }), ...(data.phone && { phone: data.phone }) },
      });
      return { ok: true, message: 'Profile updated.' };
    }

    const prismaWithTenant = this.prisma.tenantClient;
    await prismaWithTenant.tenantUser.update({
      where: { id: userId },
      data: { ...(data.fullName && { fullName: data.fullName }), ...(data.phone && { phone: data.phone }) },
    });
    return { ok: true, message: 'Profile updated.' };
  }

  async getProfileSuperAdmin(adminId: string): Promise<any> {
    const admin = await this.prisma.systemAdmin.findUnique({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException('Admin not found.');
    return { id: admin.id, email: admin.email, fullName: admin.fullName, status: admin.status };
  }

  async getProfileTenantUser(userId: string, schemaName?: string): Promise<any> {
    const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:');

    if (isSqlite) {
      const user = await this.prisma.tenantUser.findUnique({ where: { id: userId } });
      if (!user) return { id: userId, email: '', fullName: '', phone: '', status: 'ACTIVE', role: 'TENANT_USER' };

      const roles = await this.prisma.userRole.findMany({
        where: { userId: user.id },
        include: { role: true },
      });
      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        status: user.status,
        role: roles.map(r => r.role.name).join(','),
      };
    }

    if (schemaName) {
      return this.prisma.runWithSchema(schemaName, async () => {
        const prismaWithTenant = this.prisma.tenantClient;
        const user = await prismaWithTenant.tenantUser.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('User not found.');
        const roles = await prismaWithTenant.userRole.findMany({
          where: { userId: user.id },
          include: { role: true },
        });
        return {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          status: user.status,
          role: roles.map(r => r.role.name).join(','),
        };
      });
    }
    return { id: userId, email: '', fullName: '', phone: '', status: 'ACTIVE', role: 'TENANT_USER' };
  }

  async listTenantSlugs(): Promise<Array<{ slug: string; name: string }>> {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, name: true },
    });
    return tenants.map(t => ({ slug: t.slug, name: t.name }));
  }
}

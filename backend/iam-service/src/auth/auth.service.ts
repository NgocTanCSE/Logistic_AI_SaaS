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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private getRoleFromSlug(slug: string): string {
    return 'TENANT_USER';
  }

  async loginSuperAdmin(email: string, pass: string) {
    const admin = await this.prisma.systemAdmin.findFirst({
      where: { email },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Always verify the password, regardless of database provider.
    // Previously this check was gated behind `if (isSqlite)`, which meant
    // password verification was silently skipped in production (PostgreSQL),
    // allowing super-admin login with any password as long as the email existed.
    const isPasswordValid = admin.passwordHash && await bcrypt.compare(pass, admin.passwordHash);
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

    if (isSqlite) {
      const user = await this.prisma.tenantUser.findFirst({
        where: { email },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = user.passwordHash && await bcrypt.compare(pass, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const roles = await this.prisma.userRole.findMany({
        where: { userId: user.id },
        include: { role: true },
      });
      const userRoleId = roles[0]?.roleId;
      let permissions: string[] = [];
      if (userRoleId) {
        const perms = await this.prisma.rolePermission.findMany({
          where: { roleId: userRoleId },
        });
        permissions = perms.map(p => `${p.resource}:${p.action}`);
      }

      const dbRole = roles[0]?.role?.name || 'TENANT_USER';

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

      const isPasswordValid = user.passwordHash && await bcrypt.compare(pass, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

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
        role: roles[0]?.role?.name || 'TENANT_USER',
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

  async loginOrSignupWithGoogle(tenantSlug: string, email: string, fullName: string): Promise<any> {
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

    if (isSqlite) {
      let user = await this.prisma.tenantUser.findFirst({ where: { email } });

      if (!user) {
        user = await this.prisma.tenantUser.create({
          data: {
            email,
            fullName: fullName || email.split('@')[0],
            passwordHash: '',
            status: 'ACTIVE',
          },
        });

        const defaultRole = await this.prisma.role.findFirst({
          where: { name: 'TENANT_USER' },
        });

        if (defaultRole) {
          await this.prisma.userRole.create({
            data: {
              userId: user.id,
              roleId: defaultRole.id,
            },
          });
        }
      }

      const roles = await this.prisma.userRole.findMany({
        where: { userId: user.id },
        include: { role: true },
      });
      const userRoleId = roles[0]?.roleId;
      let permissions: string[] = [];
      if (userRoleId) {
        const perms = await this.prisma.rolePermission.findMany({
          where: { roleId: userRoleId },
        });
        permissions = perms.map(p => `${p.resource}:${p.action}`);
      }

      const dbRole = roles[0]?.role?.name || 'TENANT_USER';

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

    throw new UnauthorizedException('Google OAuth requires SQLite mode in this configuration.');
  }

  async verifyGoogleToken(tenantSlug: string, googleToken: string): Promise<any> {

    let email: string | null = null;
    let fullName = '';

    try {
      const { OAuth2Client } = await import('google-auth-library');
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload?.email || null;
      fullName = payload?.name || '';
    } catch (e) {
      console.error('[AuthService] Failed to verify Google token:', e);
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!email) {
      throw new UnauthorizedException('Google token does not contain an email');
    }

    return this.loginOrSignupWithGoogle(tenantSlug, email, fullName);
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

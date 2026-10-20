import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const RESET_TOKEN_EXPIRY_MINUTES = 15;

/**
 * Each portal has an explicit allow-list of roles. A session is only issued
 * when the authenticated account actually holds a role that belongs to the
 * portal. This prevents, for example, a CUSTOMER_CLIENT from signing in to
 * the back-office tenant portal, or a DRIVER from opening the pack station.
 */
export type LoginPortal = 'tenant' | 'pack-station' | 'customer' | 'mobile';

const PORTAL_ALLOWED_ROLES: Record<LoginPortal, string[]> = {
  tenant: [
    'TENANT_ADMIN',
    'TENANT_USER',
    'WAREHOUSE_MANAGER',
    'WAREHOUSE_STAFF',
    'LOGISTICS_MANAGER',
    'DRIVER',
  ],
  'pack-station': ['TENANT_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'],
  customer: ['CUSTOMER_CLIENT'],
  mobile: ['DRIVER'],
};

const PORTAL_LABELS: Record<LoginPortal, string> = {
  tenant: 'Tenant Portal',
  'pack-station': 'Pack Station',
  customer: 'Customer Portal',
  mobile: 'Driver App',
};

function normalizePortal(value?: string): LoginPortal {
  if (value === 'pack-station' || value === 'customer' || value === 'mobile') {
    return value;
  }
  return 'tenant';
}
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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private getRoleFromSlug(slug: string): string {
    return 'TENANT_USER';
  }

  async loginSuperAdmin(email: string, pass: string) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const admin = await this.prisma.systemAdmin.findFirst({
      where: { email: normalizedEmail },
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
      role: 'SUPER_ADMIN',
    };
  }

  /**
   * Resolve the tenant, load the account's real role/permissions and sign a
   * session that is valid for the requested portal.
   */
  private async buildTenantSession(
    client: any,
    tenant: any,
    user: any,
    portal: LoginPortal,
  ): Promise<any> {
    const roles = await client.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    const roleName: string = roles[0]?.role?.name || 'TENANT_USER';
    if (!PORTAL_ALLOWED_ROLES[portal].includes(roleName)) {
      throw new ForbiddenException(
        `Tài khoản ${user.email} có vai trò ${roleName}, không được phép đăng nhập ${PORTAL_LABELS[portal]}.`,
      );
    }

    const userRoleId = roles[0]?.roleId;
    let permissions: string[] = [];
    if (userRoleId) {
      const perms = await client.rolePermission.findMany({ where: { roleId: userRoleId } });
      permissions = perms.map((p: any) => `${p.resource}:${p.action}`);
    }

    // Best-effort: never fail a login because the audit timestamp could not be written.
    await client.tenantUser
      .update({ where: { id: user.id }, data: { lastLogin: new Date() } })
      .catch(() => undefined);

    const payload: any = {
      sub: user.id,
      email: user.email,
      role: roleName,
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      schema_name: tenant.dbSchemaName || 'public',
      permissions,
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(
        { sub: user.id, type: 'refresh', tenant_id: tenant.id },
        { expiresIn: '7d' },
      ),
      role: roleName,
      permissions,
    };
  }

  private async findTenant(tenantSlug: string): Promise<any> {
    if (!tenantSlug || !tenantSlug.trim()) {
      throw new BadRequestException('Missing x-tenant-slug header');
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: tenantSlug },
          { dbSchemaName: tenantSlug.replace(/-/g, '_') },
        ],
      },
    });

    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }
    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException('Tenant is inactive or suspended');
    }
    return tenant;
  }

  private withTenantSchema<T>(tenant: any, callback: (client: any) => Promise<T>): Promise<T> {
    if (PrismaService.isSqlite) {
      return callback(this.prisma);
    }
    return this.prisma.runWithSchema(tenant.dbSchemaName, () => callback(this.prisma.getTenantDb()));
  }

  /** Emails are stored lowercase; still match case-insensitively on PostgreSQL. */
  private emailFilter(email: string): any {
    if (PrismaService.isSqlite) {
      return { email };
    }
    return { email: { equals: email, mode: 'insensitive' } };
  }

  async loginTenantUser(
    tenantSlug: string,
    email: string,
    pass: string,
    portalValue?: string,
  ) {
    const portal = normalizePortal(portalValue);
    const tenant = await this.findTenant(tenantSlug);
    const normalizedEmail = (email || '').trim().toLowerCase();

    return this.withTenantSchema(tenant, async (client) => {
      const user = await client.tenantUser.findFirst({
        where: this.emailFilter(normalizedEmail),
      });

      // Accounts created through Google have an empty password hash and must
      // never be usable for password login.
      if (!user || !user.passwordHash) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return this.buildTenantSession(client, tenant, user, portal);
    });
  }

  /**
   * Sign in with a Google ID token.
   *
   * Correctness rules:
   *  - the account must already exist for every portal except the tenant
   *    back-office, where auto-provisioning can be enabled explicitly with
   *    GOOGLE_AUTO_PROVISION=true (new accounts get the least-privileged
   *    TENANT_USER role);
   *  - the account's real role must belong to the portal (PORTAL_ALLOWED_ROLES);
   *  - an account with an empty password hash can only ever use Google.
   */
  async loginTenantUserWithGoogle(
    tenantSlug: string,
    credential: string,
    portalValue?: string,
  ) {
    const portal = normalizePortal(portalValue);
    const tenant = await this.findTenant(tenantSlug);
    const { email, fullName } = await this.verifyGoogleIdToken(credential);

    return this.withTenantSchema(tenant, async (client) => {
      let user = await client.tenantUser.findFirst({ where: this.emailFilter(email) });

      if (!user) {
        if (portal !== 'tenant' || process.env.GOOGLE_AUTO_PROVISION !== 'true') {
          throw new ForbiddenException(
            `Tài khoản Google ${email} chưa được cấp quyền truy cập ${PORTAL_LABELS[portal]}. Vui lòng liên hệ quản trị viên.`,
          );
        }

        const defaultRole = await client.customRole.findFirst({
          where: { name: 'TENANT_USER' },
        });
        if (!defaultRole) {
          throw new UnauthorizedException('Default role TENANT_USER is not configured');
        }

        user = await client.tenantUser.create({
          data: {
            email,
            fullName: fullName || email.split('@')[0],
            passwordHash: '',
            status: 'ACTIVE',
          },
        });
        await client.userRole.create({
          data: { userId: user.id, roleId: defaultRole.id },
        });
      }

      if (user.status !== 'ACTIVE') {
        throw new ForbiddenException('Tài khoản đã bị vô hiệu hoá.');
      }

      return this.buildTenantSession(client, tenant, user, portal);
    });
  }

  private async verifyGoogleIdToken(
    credential: string,
  ): Promise<{ email: string; fullName: string }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new UnauthorizedException('Google login is not configured (GOOGLE_CLIENT_ID is missing).');
    }
    if (!credential) {
      throw new UnauthorizedException('Missing Google credential');
    }

    let payload: any;
    try {
      const { OAuth2Client } = await import('google-auth-library');
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (error: any) {
      this.logger.error(`Failed to verify Google token: ${error?.message || error}`);
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.email) {
      throw new UnauthorizedException('Google token does not contain an email');
    }
    if (payload.email_verified === false) {
      throw new UnauthorizedException('Google email is not verified');
    }

    return {
      email: String(payload.email).trim().toLowerCase(),
      fullName: payload.name || '',
    };
  }

  /**
   * Super-admin Google login. Only accounts that already exist in
   * system_admins are accepted, plus an explicit operator allow-list
   * (SUPER_ADMIN_GOOGLE_EMAILS) that provisions them on first use.
   * A Google account can never self-promote to SUPER_ADMIN.
   */
  async loginSuperAdminWithGoogle(credential: string): Promise<any> {
    const { email, fullName } = await this.verifyGoogleIdToken(credential);

    let admin = await this.prisma.systemAdmin.findFirst({ where: { email } });

    if (!admin) {
      const allowList = (process.env.SUPER_ADMIN_GOOGLE_EMAILS || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      if (!allowList.includes(email)) {
        throw new ForbiddenException(
          `Tài khoản Google ${email} không có quyền truy cập Admin Portal.`,
        );
      }

      admin = await this.prisma.systemAdmin.create({
        data: {
          email,
          fullName: fullName || email.split('@')[0],
          // Google-only account: an empty hash blocks password login.
          passwordHash: '',
          status: 'ACTIVE',
        },
      });
    }

    if (admin.status !== 'ACTIVE') {
      throw new ForbiddenException('Tài khoản quản trị đã bị vô hiệu hoá.');
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
      refresh_token: this.jwtService.sign(
        { sub: admin.id, type: 'refresh' },
        { expiresIn: '7d' },
      ),
      role: 'SUPER_ADMIN',
    };
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
      const prismaWithTenant = this.prisma.getTenantDb();
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
      const prismaWithTenant = this.prisma.getTenantDb();
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
      const prismaWithTenant = this.prisma.getTenantDb();
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

    const prismaWithTenant = this.prisma.getTenantDb();
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
        const prismaWithTenant = this.prisma.getTenantDb();
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

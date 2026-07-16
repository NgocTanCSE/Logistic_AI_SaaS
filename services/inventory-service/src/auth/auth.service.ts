import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async loginSuperAdmin(email: string, pass: string) {
    const admin = await this.prisma.systemAdmin.findUnique({
      where: { email },
    });

    if (!admin || !(await bcrypt.compare(pass, admin.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (admin.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account inactive');
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
    };
  }

  async loginTenantUser(tenantSlug: string, email: string, pass: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) throw new UnauthorizedException('Tenant not found');

    const tenantClient = this.prisma.tenantClient;

    const user = await tenantClient.tenantUser.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: true }
            }
          }
        }
      }
    });

    if (!user || !(await bcrypt.compare(pass, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const permissions: string[] = (user.roles as any[]).flatMap((ur: any) => 
      (ur.role.permissions as any[]).map((p: any) => `${p.resource}:${p.action}`)
    );
    
    const roleName = (user.roles[0] as any)?.role?.name || 'TENANT_USER';

    const payload: any = {
      sub: user.id,
      email: user.email,
      role: roleName,
      tenant_id: tenant.id,
      schema_name: tenant.dbSchemaName,
      permissions,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}

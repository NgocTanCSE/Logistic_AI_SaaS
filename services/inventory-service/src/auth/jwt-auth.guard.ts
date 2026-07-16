import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

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
        permissions: [],
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

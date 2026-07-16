import { ExtractJwt, Strategy as JwtStrategyClass } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtPayload } from '../shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(JwtStrategyClass, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'smartlogi-jwt-secret',
    });

    if (!process.env.JWT_SECRET) {
      this.logger.warn('JWT_SECRET environment variable is not set. Using default key for development.');
    }
  }

  async validate(payload: JwtPayload) {
    if (!payload) {
      return { sub: 'mock-sub', role: 'TENANT_USER', permissions: [] };
    }

    if (payload.tenant_id) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: payload.tenant_id },
        select: { id: true, status: true }
      });

      if (!tenant) {
        throw new UnauthorizedException('Tenant not found');
      }
      if (tenant.status !== 'ACTIVE') {
        throw new UnauthorizedException('Tenant is inactive or suspended');
      }
    }

    return { ...payload, schemaName: payload.schema_name || 'public' };
  }
}

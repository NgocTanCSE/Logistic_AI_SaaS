import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayload } from 'shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'smartlogi-jwt-secret',
    });
  }

  async validate(payload: JwtPayload) {
    // Validate if the tenant still exists and is active
    if (payload.tenant_id) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: payload.tenant_id },
      });
      if (!tenant || tenant.status !== 'ACTIVE') {
        throw new UnauthorizedException('Tenant is inactive or deleted');
      }
    }
    
    return { ...payload, schemaName: payload.schema_name || 'public' };
  }
}
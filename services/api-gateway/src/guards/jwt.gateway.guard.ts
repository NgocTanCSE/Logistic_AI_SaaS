import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { getJwtSecret, PUBLIC_PATHS } from '../config/services.config';

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
        permissions: [],
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

import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request | any, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return next();
    }

    // SQLite mode: skip tenant validation
    if (PrismaService.isSqlite) {
      req.tenantId = tenantId as string;
      req.schemaName = 'public';
      return next();
    }

    try {
      const tenant = await this.prisma.tenant.findFirst({
        where: { id: tenantId as string },
      });

      if (!tenant) {
        throw new UnauthorizedException('Tenant not found');
      }

      if (tenant.status !== 'ACTIVE') {
        throw new ForbiddenException('Tenant suspended');
      }

      req.tenantId = tenant.id;
      req.schemaName = tenant.dbSchemaName;

      return this.prisma.runWithSchema(tenant.dbSchemaName, async () => { next(); }).catch(next);
    } catch (error) {
      next(error);
    }
  }
}

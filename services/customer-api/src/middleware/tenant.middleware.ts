import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request | any, res: Response, next: NextFunction) {
    // Note: req.user is NOT available here (middleware runs before guards)
    // Schema context is handled by TenantSchemaInterceptor which runs after guards
    next();
  }
}
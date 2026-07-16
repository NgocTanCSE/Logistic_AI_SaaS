import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions, Permissions } from '../shared-types';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApiKeysController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.ApiKeysManage)
  async list(@Request() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    const keys = await this.prisma.tenantClient.tenantApiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return keys.map(k => ({
      id: k.id,
      name: k.name,
      prefix: k.id.slice(0, 8),
      createdAt: k.createdAt,
      isActive: k.revokedAt === null,
    }));
  }

  @Post()
  @RequirePermissions(Permissions.ApiKeysManage)
  async create(
    @Request() req: any,
    @Body() body: { name?: string; scopes?: string[] },
  ) {
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    // Generate a 256‑bit secret and store only its hash.
    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyHash = await bcrypt.hash(rawKey, 10);

    await this.prisma.tenantClient.tenantApiKey.create({
      data: {
        tenantId,
        keyHash,
        name: body.name,
        scopes: body.scopes ?? [],
      },
    });

    // Return the secret once; callers must store it securely.
    return { key: rawKey };
  }

  @Delete(':id')
  @RequirePermissions(Permissions.ApiKeysManage)
  async revoke(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    const existing = await this.prisma.tenantClient.tenantApiKey.findUnique({
      where: { id },
    });
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException('API key not found');
    }
    await this.prisma.tenantClient.tenantApiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }
}

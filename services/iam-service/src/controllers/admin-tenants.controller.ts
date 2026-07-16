import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, InternalServerErrorException, NotFoundException, BadRequestException, Logger } from "@nestjs/common"
import { TenantCreateDto } from "../dtos/tenant-create.dto"
import { UpdateTenantDto } from "../dtos/tenant-update.dto"
import { Permissions, PermissionsGuard, RequirePermissions } from "../shared-types"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { PrismaService } from "../prisma/prisma.service"
import * as bcrypt from "bcrypt"
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Admin Tenants')
@Controller("admin/tenants")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTenantsController {
  private readonly logger = new Logger('AdminTenantsController');

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.TenantsManage)
  async list(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('sort') sort: string = 'createdAt',
    @Query('order') order: 'asc' | 'desc' = 'desc',
  ) {
    try {
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      // Validate sort field to prevent injection
      const allowedSortFields = ['createdAt', 'name', 'status', 'slug'];
      const safeSort = allowedSortFields.includes(sort) ? sort : 'createdAt';
      const safeOrder = order === 'asc' ? 'asc' : 'desc';

      const [data, total] = await Promise.all([
        this.prisma.tenant.findMany({
          skip,
          take,
          orderBy: { [safeSort]: safeOrder },
          include: { plan: true },
        }),
        this.prisma.tenant.count(),
      ]);

      return {
        data,
        meta: {
          total,
          page: Number(page),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch tenants");
    }
  }

  @Get(":id")
  @RequirePermissions(Permissions.TenantsManage)
  async detail(@Param("id") id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, include: { plan: true } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  @Post()
  @RequirePermissions(Permissions.TenantsManage)
  async create(@Body() body: TenantCreateDto & { adminEmail?: string, adminPassword?: string }) {
    const dbSchemaName = `tenant_${body.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
    
    const { SchemaProvisioner } = require('../scripts/schema-provisioner');
    let ddlStatements: string[] = [];
    try {
      ddlStatements = await SchemaProvisioner.getProvisioningSql(dbSchemaName);
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Tạo Tenant record trong public
      const tenant = await tx.tenant.create({
        data: {
          name: body.name,
          slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          dbSchemaName,
          status: "ACTIVE",
          planId: body.planId,
        }
      });

      try {
        // 2. Tạo PostgreSQL Schema
        await tx.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${dbSchemaName}"`);

        // 3. Chạy toàn bộ DDL (tự động extract từ schema.prisma)
        for (const statement of ddlStatements) {
          await tx.$executeRawUnsafe(statement);
        }

        // 4. Seed Admin đầu tiên cho Tenant
        if (body.adminEmail && body.adminPassword) {
          // Validate password length
          if (body.adminPassword.length < 8) {
            throw new BadRequestException("Password must be at least 8 characters long");
          }
          const passwordHash = await bcrypt.hash(body.adminPassword, 10);
          
          // Tạo role ADMIN mặc định và lưu ID để dùng gán cho user
          const roleResult = await tx.customRole.create({
            data: {
              name: 'TENANT_ADMIN',
              isSystemDefault: true,
            }
          });
          const roleId = roleResult.id;

          // Tạo user và lưu ID
          const userResult = await tx.tenantUser.create({
            data: {
              email: body.adminEmail,
              passwordHash,
              fullName: `Admin ${body.name}`,
              status: 'ACTIVE',
            }
          });
          const userId = userResult.id;

          // Gán role
          await tx.userRole.create({
            data: {
              userId,
              roleId,
            }
          });
        }

        return tenant;
      } catch (error) {
        this.logger.error(`Provisioning failed: ${error.message}`);
        throw new InternalServerErrorException(`Failed to provision tenant database: ${error.message}`);
      }
    });
  }

  @Patch(":id")
  @RequirePermissions(Permissions.TenantsManage)
  async update(@Param("id") id: string, @Body() body: UpdateTenantDto) {
    try {
      return await this.prisma.tenant.update({
        where: { id },
        data: body,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Tenant with ID ${id} not found`);
      }
      throw new InternalServerErrorException(`Failed to update tenant: ${error.message}`);
    }
  }

  @Delete(":id")
  @RequirePermissions(Permissions.TenantsManage)
  async remove(@Param("id") id: string) {
    try {
      return await this.prisma.tenant.update({
        where: { id },
        data: { status: 'DELETED', deletedAt: new Date() }
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Tenant with ID ${id} not found`);
      }
      throw new InternalServerErrorException("Failed to delete tenant");
    }
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "../shared-types";
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Tenant Roles')
@Controller("tenant/roles")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantRolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.RolesManage)
  async list() {
    return this.prisma.tenantClient.customRole.findMany({
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get(":id")
  @RequirePermissions(Permissions.RolesManage)
  async detail(@Param("id") id: string) {
    return this.prisma.tenantClient.customRole.findUnique({
      where: { id },
      include: {
        permissions: true,
        users: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true, status: true }
            }
          }
        }
      },
    });
  }

  @Post()
  @RequirePermissions(Permissions.RolesManage)
  async create(@Body() body: { name: string, permissions: { resource: string, action: string }[] }) {
    return this.prisma.tenantClient.customRole.create({
      data: {
        name: body.name,
        permissions: {
          create: body.permissions
        }
      },
      include: { permissions: true }
    });
  }

  @Patch(":id")
  @RequirePermissions(Permissions.RolesManage)
  async update(@Param("id") id: string, @Body() body: { name?: string, permissions?: { resource: string, action: string }[] }) {
    try {
      // If permissions are provided, replace all of them
      if (body.permissions) {
        await this.prisma.tenantClient.rolePermission.deleteMany({
          where: { roleId: id },
        });

        await this.prisma.tenantClient.rolePermission.createMany({
          data: body.permissions.map(p => ({
            roleId: id,
            resource: p.resource,
            action: p.action,
          })),
        });
      }

      if (body.name) {
        await this.prisma.tenantClient.customRole.update({
          where: { id },
          data: { name: body.name },
        });
      }

      return await this.prisma.tenantClient.customRole.findUnique({
        where: { id },
        include: { permissions: true },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }
      throw new InternalServerErrorException("Failed to update role");
    }
  }

  @Delete(":id")
  @RequirePermissions(Permissions.RolesManage)
  async remove(@Param("id") id: string) {
    // Prevent deleting system default roles
    const role = await this.prisma.tenantClient.customRole.findUnique({ where: { id } });
    if (role?.isSystemDefault) {
      return { ok: false, message: "Cannot delete system default role" };
    }

    // Cascade delete will remove role_permissions and user_roles
    await this.prisma.tenantClient.customRole.delete({ where: { id } });
    return { ok: true };
  }
}

import { Controller, Get, Post, Patch, Param, Body, UseGuards, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Branches')
@Controller("branches")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BranchesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.TripsRead)
  async listBranches() {
    try {
      return await this.prisma.tenantClient.branch.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          address: true,
          lat: true,
          lng: true,
          status: true,
          manager: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch branches");
    }
  }

  @Get(":id")
  @RequirePermissions(Permissions.TripsRead)
  async getBranch(@Param("id") id: string) {
    try {
      const branch = await this.prisma.tenantClient.branch.findUnique({
        where: { id },
        include: {
          manager: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      });
      if (!branch) throw new NotFoundException(`Branch with ID ${id} not found`);
      return branch;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to fetch branch");
    }
  }

  @Post()
  @RequirePermissions(Permissions.TripsDispatch)
  async createBranch(@Body() body: { code: string, name: string, address: string, lat?: number, lng?: number, managerId?: string, type?: string }) {
    try {
      return await this.prisma.tenantClient.branch.create({
        data: {
          code: body.code,
          name: body.name,
          address: body.address,
          lat: body.lat,
          lng: body.lng,
          type: body.type || 'WAREHOUSE',
          managerId: body.managerId
        }
      });
    } catch (error) {
      throw new InternalServerErrorException("Failed to create branch");
    }
  }

  @Patch(":id")
  @RequirePermissions(Permissions.TripsDispatch)
  async updateBranch(@Param("id") id: string, @Body() body: { name?: string, address?: string, lat?: number, lng?: number, managerId?: string, status?: string }) {
    try {
      const branch = await this.prisma.tenantClient.branch.findUnique({ where: { id } });
      if (!branch) throw new NotFoundException(`Branch with ID ${id} not found`);

      return await this.prisma.tenantClient.branch.update({
        where: { id },
        data: body
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to update branch");
    }
  }
}

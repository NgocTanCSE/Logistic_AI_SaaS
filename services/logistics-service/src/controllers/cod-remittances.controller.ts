import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query, NotFoundException, InternalServerErrorException, BadRequestException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('COD Remittances')
@Controller("finance/cod")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CodRemittancesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.OrdersRead)
  async listRemittances(
    @Query('driverId') driverId?: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    try {
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);
      
      const where: any = {};
      if (driverId) where.driverId = driverId;
      if (status) where.status = status;

      const [data, total] = await Promise.all([
        this.prisma.tenantClient.codRemittance.findMany({
          where,
          skip,
          take,
          include: {
            driver: {
              include: {
                user: {
                  select: { id: true, fullName: true, email: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.tenantClient.codRemittance.count({ where })
      ]);

      return {
        data,
        meta: {
          total,
          page: Number(page),
          limit: take,
          totalPages: Math.ceil(total / take)
        }
      };
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch COD remittances");
    }
  }

  @Get(":id")
  @RequirePermissions(Permissions.OrdersRead)
  async getRemittance(@Param("id") id: string) {
    try {
      const remittance = await this.prisma.tenantClient.codRemittance.findUnique({
        where: { id },
        include: {
          driver: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true }
              }
            }
          }
        }
      });
      if (!remittance) throw new NotFoundException(`Remittance with ID ${id} not found`);
      return remittance;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to fetch COD remittance");
    }
  }

  @Patch(":id/approve")
  @RequirePermissions(Permissions.OrdersCreate)
  async approveRemittance(@Param("id") id: string) {
    try {
      const remittance = await this.prisma.tenantClient.codRemittance.findUnique({ where: { id } });
      if (!remittance) throw new NotFoundException(`Remittance with ID ${id} not found`);
      
      return await this.prisma.tenantClient.codRemittance.update({
        where: { id },
        data: { status: 'APPROVED' }
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to approve remittance");
    }
  }

  @Patch(":id/reject")
  @RequirePermissions(Permissions.OrdersCreate)
  async rejectRemittance(@Param("id") id: string) {
    try {
      const remittance = await this.prisma.tenantClient.codRemittance.findUnique({ where: { id } });
      if (!remittance) throw new NotFoundException(`Remittance with ID ${id} not found`);
      
      return await this.prisma.tenantClient.codRemittance.update({
        where: { id },
        data: { status: 'REJECTED' }
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to reject remittance");
    }
  }
}
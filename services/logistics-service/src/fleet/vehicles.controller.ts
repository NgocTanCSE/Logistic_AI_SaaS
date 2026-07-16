import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Vehicles')
@Controller("vehicles")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VehiclesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.VehiclesRead)
  async list(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
  ) {
    const skip = (Number(page || 1) - 1) * Number(limit || 20);
    const take = Number(limit || 20);

    const where = search ? {
      OR: [
        { plateNumber: { contains: search, mode: 'insensitive' as const } },
        { type: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {};

    const [data, total] = await Promise.all([
      this.prisma.tenantClient.vehicle.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenantClient.vehicle.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page || 1),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  @Get(":id")
  @RequirePermissions(Permissions.VehiclesRead)
  async detail(@Param("id") id: string) {
    return this.prisma.tenantClient.vehicle.findUnique({
      where: { id },
      include: { trips: { take: 10, orderBy: { tripCode: 'desc' } } },
    });
  }

  @Post()
  @RequirePermissions(Permissions.VehiclesManage)
  async create(@Body() body: { plateNumber: string, type: string, capacityKg?: number, capacityCbm?: number }) {
    try {
      return await this.prisma.tenantClient.vehicle.create({
        data: {
          plateNumber: body.plateNumber,
          type: body.type,
          capacityKg: body.capacityKg || 0,
          capacityCbm: body.capacityCbm || 0,
          status: "ACTIVE",
        },
      });
    } catch (error) {
      throw new InternalServerErrorException("Failed to create vehicle");
    }
  }

  @Patch(":id")
  @RequirePermissions(Permissions.VehiclesManage)
  async update(@Param("id") id: string, @Body() body: any) {
    try {
      return await this.prisma.tenantClient.vehicle.update({
        where: { id },
        data: body,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Vehicle with ID ${id} not found`);
      }
      throw new InternalServerErrorException("Failed to update vehicle");
    }
  }

  @Delete(":id")
  @RequirePermissions(Permissions.VehiclesManage)
  async remove(@Param("id") id: string) {
    try {
      return await this.prisma.tenantClient.vehicle.update({
        where: { id },
        data: { status: "INACTIVE" },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Vehicle with ID ${id} not found`);
      }
      throw new InternalServerErrorException("Failed to delete vehicle");
    }
  }

  @Get("fleet")
  @RequirePermissions(Permissions.VehiclesRead)
  async fleetUtilization() {
    const [totalVehicles, activeVehicles] = await Promise.all([
      this.prisma.tenantClient.vehicle.count(),
      this.prisma.tenantClient.vehicle.count({ where: { status: "ACTIVE" } }),
    ]);
    const activeTrips = await this.prisma.tenantClient.trip.count({ where: { status: "IN_TRANSIT" } });
    const utilization = totalVehicles > 0 ? activeTrips / totalVehicles : 0;
    return { data: { totalVehicles, activeVehicles, utilization } };
  }
}

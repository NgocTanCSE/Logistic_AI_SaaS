import { Controller, Get, Post, Patch, Query, Body, Param, UseGuards, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { LogisticsService } from "../services/logistics.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Trips')
@Controller("trips")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TripsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logisticsService: LogisticsService
  ) {}

  @Post()
  @RequirePermissions(Permissions.TripsDispatch)
  async createTrip(@Body() body: any) {
    try {
      return await this.prisma.tenantClient.trip.create({
        data: {
          tripCode: `TRIP-${Date.now()}`,
          status: "DRAFT",
          totalWeightKg: body.totalWeightKg,
          totalVolumeCbm: body.totalVolumeCbm,
        }
      });
    } catch (error) {
      throw new InternalServerErrorException("Failed to create trip");
    }
  }

  @Get()
  @RequirePermissions(Permissions.TripsRead)
  async listTrips(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("status") status?: string,
  ) {
    try {
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);
      const where: any = {};
      if (status) where.status = status;

      const [data, total] = await Promise.all([
        this.prisma.tenantClient.trip.findMany({
          where,
          skip,
          take,
          include: { driver: { include: { user: true } }, vehicle: true, stops: true },
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.tenantClient.trip.count({ where }),
      ]);

      return {
        data,
        meta: { total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) },
      };
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch trips");
    }
  }

  @Get(":id")
  @RequirePermissions(Permissions.TripsRead)
  async getTrip(@Param("id") id: string) {
    try {
      const trip = await this.prisma.tenantClient.trip.findUnique({
        where: { id },
        include: {
          driver: { include: { user: true } },
          vehicle: true,
          stops: { orderBy: { sequence: "asc" } },
          deliveries: true,
        },
      });
      if (!trip) throw new NotFoundException(`Trip ${id} not found`);
      return trip;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to fetch trip");
    }
  }

  @Patch(":id")
  @RequirePermissions(Permissions.TripsDispatch)
  async updateTrip(@Param("id") id: string, @Body() body: any) {
    try {
      const trip = await this.prisma.tenantClient.trip.findUnique({ where: { id } });
      if (!trip) throw new NotFoundException(`Trip ${id} not found`);
      return await this.prisma.tenantClient.trip.update({ where: { id }, data: body });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to update trip");
    }
  }

  @Post(":id/start")
  @RequirePermissions(Permissions.TripsDispatch)
  async startTrip(@Param("id") id: string) {
    try {
      const trip = await this.prisma.tenantClient.trip.findUnique({ where: { id } });
      if (!trip) throw new NotFoundException(`Trip ${id} not found`);
      return await this.prisma.tenantClient.trip.update({
        where: { id },
        data: { status: "IN_PROGRESS", departureTime: new Date() },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to start trip");
    }
  }

  @Post(":id/complete")
  @RequirePermissions(Permissions.TripsDispatch)
  async completeTrip(@Param("id") id: string) {
    try {
      const trip = await this.prisma.tenantClient.trip.findUnique({ where: { id } });
      if (!trip) throw new NotFoundException(`Trip ${id} not found`);
      return await this.prisma.tenantClient.trip.update({
        where: { id },
        data: { status: "COMPLETED", returnTime: new Date() },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to complete trip");
    }
  }

  @Post(":id/cancel")
  @RequirePermissions(Permissions.TripsDispatch)
  async cancelTrip(@Param("id") id: string) {
    try {
      const trip = await this.prisma.tenantClient.trip.findUnique({ where: { id } });
      if (!trip) throw new NotFoundException(`Trip ${id} not found`);
      return await this.prisma.tenantClient.trip.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to cancel trip");
    }
  }

  @Post(":id/stops")
  @RequirePermissions(Permissions.TripsDispatch)
  async addStop(@Param("id") id: string, @Body() body: any) {
    try {
      return await this.prisma.tenantClient.tripStop.create({
        data: {
          tripId: id,
          stopType: body.stopType,
          sequence: body.sequence,
          address: body.address,
          plannedEta: body.plannedEta ? new Date(body.plannedEta) : undefined
        }
      });
    } catch (error) {
      throw new InternalServerErrorException("Failed to add stop");
    }
  }

  @Post(":id/assign")
  @RequirePermissions(Permissions.TripsDispatch)
  async assignTrip(@Param("id") id: string, @Body() body: { driverId: string, vehicleId: string }) {
    try {
      return await this.logisticsService.dispatchTrip(id, body.driverId, body.vehicleId, "ASSIGNED");
    } catch (error) {
      throw new InternalServerErrorException("Failed to assign trip");
    }
  }
}

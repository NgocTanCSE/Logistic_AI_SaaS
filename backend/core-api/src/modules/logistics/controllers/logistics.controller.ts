import { Body, Controller, Get, Param, Post, Patch, Query, UseGuards } from "@nestjs/common"
import { CreateGeofenceDto } from "../dtos/create-geofence.dto"
import { DispatchTripDto } from "../dtos/dispatch-trip.dto"
import { OptimizeRoutingDto } from "../dtos/optimize-routing.dto"
import { Permissions, PermissionsGuard, RequirePermissions } from "shared-types"
import { JwtAuthGuard } from "../../../core/auth/jwt-auth.guard"
import { LogisticsService } from "../services/logistics.service"
import { PrismaService } from "../../../core/prisma/prisma.service"
import { ApiTags } from "@nestjs/swagger"

@ApiTags('Logistics')
@Controller("logistics")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LogisticsController {
  constructor(
    private readonly logisticsService: LogisticsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Admin shipment view. Trips are the transport unit in this system, so
   * expose a flattened shipment shape instead of duplicating a shipment model.
   */
  @Get("shipments")
  @RequirePermissions(Permissions.TripsRead)
  async shipments(
    @Query("status") status?: string,
    @Query("limit") limit: number = 20,
  ) {
    const where: any = {};
    if (status === "ACTIVE") {
      where.status = { in: ["DISPATCHED", "IN_TRANSIT", "STARTED"] };
    } else if (status) {
      where.status = status;
    }

    const trips = await this.prisma.getTenantDb().trip.findMany({
      where,
      take: Math.min(Number(limit) || 20, 100),
      include: {
        driver: { include: { user: true } },
        vehicle: true,
        stops: { orderBy: { sequence: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: trips.map((trip: any) => {
        const stops = trip.stops || [];
        const origin = stops.find((stop: any) => stop.stopType === "PICKUP") || stops[0];
        const destination =
          [...stops].reverse().find((stop: any) => stop.stopType === "DELIVERY") ||
          stops[stops.length - 1];
        const progress =
          trip.status === "COMPLETED"
            ? 100
            : ["IN_TRANSIT", "STARTED", "IN_PROGRESS", "DISPATCHED"].includes(
                  trip.status,
                )
              ? 60
              : 20;
        return {
          id: trip.id,
          trackingNumber: trip.tripCode,
          driver:
            trip.driver?.user?.fullName ||
            trip.driver?.fullName ||
            "Unassigned",
          vehicle: trip.vehicle?.plateNumber || "—",
          origin: origin?.address || "—",
          destination: destination?.address || "—",
          status: trip.status,
          progress,
          eta: trip.returnTime || trip.departureTime || null,
        };
      }),
    };
  }

  @Get("trips")
  @RequirePermissions(Permissions.TripsRead)
  async list(@Query("page") page: number, @Query("limit") limit: number) {
    return this.logisticsService.listTrips({ page: Number(page || 1), limit: Number(limit || 20) });
  }

  @Post("trips/:id/dispatch")
  @RequirePermissions(Permissions.TripsDispatch)
  async dispatch(@Param("id") id: string, @Body() body: DispatchTripDto) {
    return this.logisticsService.dispatchTrip(id, body.driverId, body.vehicleId);
  }

  @Get("dispatch/unassigned-orders")
  @RequirePermissions(Permissions.TripsRead)
  async unassignedOrders() {
    return this.logisticsService.getUnassignedOrders();
  }

  @Post("routing/optimize-async")
  @RequirePermissions(Permissions.TripsDispatch)
  async optimize(@Body() body: OptimizeRoutingDto) {
    return this.logisticsService.optimizeRouting(body);
  }

  @Get("routing/jobs/:jobId")
  @RequirePermissions(Permissions.TripsRead)
  async routingJob(@Param("jobId") jobId: string) {
    return this.logisticsService.getRoutingJob(jobId);
  }

  @Post("routing/jobs/:jobId/apply")
  @RequirePermissions(Permissions.TripsDispatch)
  async applyRouting(@Param("jobId") jobId: string) {
    return this.logisticsService.applyRoutingJob(jobId);
  }

  @Post("trips/:id/start")
  @RequirePermissions(Permissions.TripsDispatch)
  async startTrip(@Param("id") id: string) {
    return this.logisticsService.startTrip(id);
  }

  @Post("trips/:id/complete")
  @RequirePermissions(Permissions.TripsDispatch)
  async completeTrip(@Param("id") id: string) {
    return this.logisticsService.completeTrip(id);
  }

  @Patch("trips/:id/status")
  @RequirePermissions(Permissions.TripsDispatch)
  async updateTripStatus(@Param("id") id: string, @Body() body: { status: string }) {
    return this.logisticsService.updateTripStatus(id, body.status);
  }

  @Get("reports/trips")
  @RequirePermissions(Permissions.TripsRead)
  async tripReport(@Query("range") range: string = "7d") {
    return this.logisticsService.getTripReport(range);
  }

  @Get("reports/fleet")
  @RequirePermissions(Permissions.TripsRead)
  async fleetReport(@Query("range") range: string = "7d") {
    return this.logisticsService.getFleetReport(range);
  }
}

import { Controller, Get, Param, UseGuards, Request, Query } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";

/**
 * Mobileâ€‘specific readâ€‘only endpoints used by the driver app.
 * Returns trips assigned to the authenticated driver and the stops for a given trip.
 */
@ApiTags('Mobile Trips')
@Controller("mobile/trips")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MobileTripsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List trips belonging to the current driver.
   * Uses the JWT `sub` claim (user id) to locate the driver record.
   */
  @Get()
  @RequirePermissions(Permissions.TripsRead)
  async listDriverTrips(@Request() req: any, @Query('sinceVersion') sinceVersion?: string) {
    const driver = await this.prisma.tenantClient.driver.findUnique({
      where: { userId: req.user?.sub },
    });
    if (!driver) return [];
    const whereClause: any = { driverId: driver.id };
    if (sinceVersion !== undefined && sinceVersion !== null && sinceVersion !== '') {
      const versionNum = Number(sinceVersion);
      if (!isNaN(versionNum)) {
        whereClause.syncVersion = { gt: versionNum };
      }
    }
    return this.prisma.tenantClient.trip.findMany({
      where: whereClause,
      include: { stops: true, driver: true, vehicle: true },
    });
  }

  /**
   * Retrieve stops for a specific trip.
   * Returns the ordered list of stops for the requested trip id.
   */
  @Get(":id/stops")
  @RequirePermissions(Permissions.TripsRead)
  async getTripStops(@Param("id") id: string) {
    return this.prisma.tenantClient.tripStop.findMany({
      where: { tripId: id },
      orderBy: { sequence: "asc" },
    });
  }
}

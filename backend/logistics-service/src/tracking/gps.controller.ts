import { Controller, Get, Post, Body, UseGuards, Request, Query, BadRequestException, Logger } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('GPS')
@Controller("gps")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GpsController {
  private readonly logger = new Logger('GpsController');

  constructor(private readonly prisma: PrismaService) {}

  private validateSchemaName(schemaName: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName);
  }

  private validateCoordinate(value: any, fieldName: string): number {
    const num = Number(value);
    if (isNaN(num)) {
      throw new BadRequestException(`Invalid ${fieldName}: must be a number`);
    }
    return num;
  }

  @Get("active-fleet")
  @RequirePermissions(Permissions.TripsRead)
  async getActiveFleet(@Query("status") status: string) {
    const drivers = await this.prisma.tenantClient.driver.findMany({
      where: status ? { status } : { status: { not: "OFFLINE" } },
      include: {
        user: { select: { id: true, fullName: true } },
        GpsTrackingLog: {
          orderBy: { timestamp: "desc" },
          take: 1,
        }
      }
    });

    return drivers.map((d: any) => ({
      driverId: d.id,
      name: d.user.fullName,
      status: d.status,
      lat: d.GpsTrackingLog[0]?.lat ? Number(d.GpsTrackingLog[0].lat) : null,
      lng: d.GpsTrackingLog[0]?.lng ? Number(d.GpsTrackingLog[0].lng) : null,
      lastUpdate: d.GpsTrackingLog[0]?.timestamp || d.locationUpdatedAt,
      label: `${d.user.fullName} (${d.status})`
    }));
  }

  @Post("batch")
  @RequirePermissions(Permissions.MobileGpsBatch)
  async uploadBatchGps(@Body() body: { logs: any[] }, @Request() req: any) {
    const userId = req.user?.sub;
    
    if (!body.logs || !Array.isArray(body.logs) || body.logs.length === 0) {
      throw new BadRequestException("logs array is required and cannot be empty");
    }

    const driver = await this.prisma.tenantClient.driver.findUnique({ where: { userId } });
    if (!driver) throw new BadRequestException("Driver not found for user");

    const driverId = driver.id;

    const inserts = body.logs.map(log => {
      return this.prisma.tenantClient.gpsTrackingLog.create({
        data: {
          driverId,
          lat: log.lat,
          lng: log.lng,
          speed: log.speed,
          heading: log.heading,
          timestamp: new Date(log.timestamp),
          isOfflineCached: log.isOfflineCached || false,
        }
      });
    });

    await this.prisma.tenantClient.$transaction(inserts);

    const latestLog = body.logs[body.logs.length - 1];
    if (latestLog) {
      const schemaName = req.schemaName || 'tenant';
      
      if (!this.validateSchemaName(schemaName)) {
        throw new BadRequestException("Invalid schema name");
      }

      const lng = this.validateCoordinate(latestLog.lng, "lng");
      const lat = this.validateCoordinate(latestLog.lat, "lat");

      await this.prisma.$executeRawUnsafe(
        `UPDATE "${schemaName}"."drivers"
        SET last_known_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
            location_updated_at = NOW()
        WHERE id = $3::uuid`,
        lng, lat, driverId
      );

      const geofenceAlerts: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT name, zone_type 
        FROM "${schemaName}"."geofences"
        WHERE is_active = true 
          AND ST_Contains(polygon, ST_SetSRID(ST_MakePoint($1, $2), 4326))`,
        lng, lat
      );

      if (geofenceAlerts.length > 0) {
        this.logger.warn(`Geofence Alert: Driver ${driverId} entered: ${geofenceAlerts.map(g => g.name).join(', ')}`);
      }
    }

    return { ok: true, processedCount: inserts.length };
  }
}

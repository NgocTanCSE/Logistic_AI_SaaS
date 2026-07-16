import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, BadRequestException, NotFoundException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Geofences')
@Controller("geofences")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GeofencesController {
  constructor(private readonly prisma: PrismaService) {}

  private validateSchemaName(schemaName: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName);
  }

  @Post()
  @RequirePermissions(Permissions.TripsDispatch)
  async createGeofence(@Body() body: { name: string, polygonWkt: string, zoneType: string }, @Request() req: any) {
    const schemaName = req.schemaName || 'tenant';
    
    if (!this.validateSchemaName(schemaName)) {
      throw new BadRequestException("Invalid schema name");
    }

    if (!body.name || !body.polygonWkt || !body.zoneType) {
      throw new BadRequestException("name, polygonWkt, and zoneType are required");
    }

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "${schemaName}"."geofences" (id, name, polygon, zone_type, is_active)
      VALUES (gen_random_uuid(), $1, ST_GeomFromText($2, 4326), $3, true)`,
      body.name, body.polygonWkt, body.zoneType
    );

    return { ok: true, message: "Geofence created with PostGIS" };
  }

  @Get()
  @RequirePermissions(Permissions.TripsRead)
  async listGeofences(@Request() req: any) {
    const schemaName = req.schemaName || 'tenant';
    
    if (!this.validateSchemaName(schemaName)) {
      throw new BadRequestException("Invalid schema name");
    }

    const result: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT id, name, ST_AsGeoJSON(polygon)::json as polygon, zone_type as "zoneType", is_active as "isActive"
      FROM "${schemaName}"."geofences"`
    );

    return result;
  }

  @Patch(":id")
  @RequirePermissions(Permissions.TripsDispatch)
  async updateGeofence(@Param("id") id: string, @Body() body: { name?: string, zoneType?: string, isActive?: boolean }, @Request() req: any) {
    const schemaName = req.schemaName || 'tenant';
    
    if (!this.validateSchemaName(schemaName)) {
      throw new BadRequestException("Invalid schema name");
    }

    const result: any[] = await this.prisma.$queryRawUnsafe(
      `UPDATE "${schemaName}"."geofences" SET name = COALESCE($1, name), zone_type = COALESCE($2, zone_type), is_active = COALESCE($3, is_active) WHERE id = $4 RETURNING id`,
      body.name || null, body.zoneType || null, body.isActive ?? null, id
    );

    if (result.length === 0) {
      throw new NotFoundException("Geofence not found");
    }

    return { ok: true };
  }

  @Delete(":id")
  @RequirePermissions(Permissions.TripsDispatch)
  async deleteGeofence(@Param("id") id: string, @Request() req: any) {
    const schemaName = req.schemaName || 'tenant';
    
    if (!this.validateSchemaName(schemaName)) {
      throw new BadRequestException("Invalid schema name");
    }

    const result: any[] = await this.prisma.$queryRawUnsafe(
      `DELETE FROM "${schemaName}"."geofences" WHERE id = $1 RETURNING id`,
      id
    );

    if (result.length === 0) {
      throw new NotFoundException("Geofence not found");
    }

    return { ok: true };
  }
}

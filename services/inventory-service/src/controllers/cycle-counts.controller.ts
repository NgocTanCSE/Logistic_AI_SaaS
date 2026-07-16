import { Controller, Get, Post, Patch, Body, UseGuards, Request, Query, Param, NotFoundException } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types"
import { InventoryService } from "./inventory.service"
import { PrismaService } from "../prisma/prisma.service"

@ApiTags("Cycle Counts")
@Controller("inventory/cycle-counts")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CycleCountsController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly prisma: PrismaService
  ) {}

  @Post()
  @RequirePermissions(Permissions.InventoryAdjust)
  async createCycleCount(@Body() body: { warehouseId: string, scheduledAt?: Date }, @Request() req: any) {
    let actorId = req.user?.sub;
    if (!actorId) {
      const user = await this.prisma.tenantClient.tenantUser.findFirst();
      actorId = user?.id;
    }
    
    let warehouseId = body.warehouseId;
    if (!warehouseId) {
      const wh = await this.prisma.tenantClient.warehouse.findFirst();
      if (!wh) throw new NotFoundException("No warehouse available");
      warehouseId = wh.id;
    }

    return this.inventoryService.createCycleCount({ 
      warehouseId, 
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined, 
      actorId 
    });
  }

  @Get()
  @RequirePermissions(Permissions.InventoryRead)
  async list(@Query("warehouseId") warehouseId: string, @Query("page") page: number, @Query("limit") limit: number) {
    return this.inventoryService.getCycleCounts(warehouseId, { page: Number(page || 1), limit: Number(limit || 20) })
  }

  @Patch(":id/status")
  @RequirePermissions(Permissions.InventoryAdjust)
  async updateStatus(@Param("id") id: string, @Body() body: { status: string }) {
    return this.inventoryService.updateCycleCountStatus(id, body.status)
  }
}

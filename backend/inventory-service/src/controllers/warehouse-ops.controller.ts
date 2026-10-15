import { Controller, Post, Patch, Body, UseGuards, Request, Param, Get } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types"
import { InventoryService } from "./inventory.service"
import { PrismaService } from "../prisma/prisma.service"

@ApiTags("Warehouse Ops")
@Controller("inventory/ops")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WarehouseOpsController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly prisma: PrismaService
  ) {}

  @Post("shift/start")
  @RequirePermissions(Permissions.InventoryRead)
  async startShift(@Body() body: { warehouseId: string }, @Request() req: any) {
    let staffId = req.user?.sub;
    if (!staffId) {
      const user = await this.prisma.tenantClient.tenantUser.findFirst();
      staffId = user?.id;
    }
    return this.inventoryService.startShift(body.warehouseId, staffId)
  }

  @Patch("shift/:id/end")
  @RequirePermissions(Permissions.InventoryRead)
  async endShift(@Param("id") id: string) {
    return this.inventoryService.endShift(id)
  }

  @Post("equipment/checkout")
  @RequirePermissions(Permissions.InventoryRead)
  async checkoutEquipment(@Body() body: { warehouseId: string, equipmentCode: string }, @Request() req: any) {
    let staffId = req.user?.sub;
    if (!staffId) {
      const user = await this.prisma.tenantClient.tenantUser.findFirst();
      staffId = user?.id;
    }
    return this.inventoryService.checkoutEquipment(body.warehouseId, body.equipmentCode, staffId)
  }

  @Patch("equipment/:id/return")
  @RequirePermissions(Permissions.InventoryRead)
  async returnEquipment(@Param("id") id: string) {
    return this.inventoryService.returnEquipment(id)
  }

  @Get("equipment/logs")
  @RequirePermissions(Permissions.InventoryRead)
  async getEquipmentLogs() {
    return this.inventoryService.getEquipmentLogs()
  }

  @Post("pack-log")
  @RequirePermissions(Permissions.InventoryRead)
  async createPackLog(@Body() body: { warehouseId: string, orderId?: string, weightGrams?: number, dimensionCm?: string, deviceId?: string }) {
    return this.inventoryService.createPackLog(body)
  }
}

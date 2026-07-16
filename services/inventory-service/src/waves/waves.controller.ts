import { Controller, Get, Post, Body, UseGuards, Request } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types"
import { WavesService } from "./waves.service"
import { AllocationStrategy } from "wms-engine"

@ApiTags("Waves")
@Controller("waves")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WavesController {
  constructor(private readonly wavesService: WavesService) {}

  @Post("generate")
  @RequirePermissions(Permissions.TasksCreate)
  async generateWave(@Body() body: { warehouseId: string, orderIds: string[], strategy?: AllocationStrategy }) {
    return this.wavesService.generateWave(body.warehouseId, body.orderIds, body.strategy);
  }

  @Get()
  @RequirePermissions(Permissions.TasksRead)
  async listWaves() {
    return this.wavesService.listWaves();
  }
}

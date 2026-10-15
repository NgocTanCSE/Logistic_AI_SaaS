import { Controller, Get, Post, Body, Param, UseGuards, Request, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types"
import { PrismaService } from "../prisma/prisma.service"

@ApiTags("Tasks")
@Controller("tasks")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.TasksRead)
  async listTasks() {
    return this.prisma.tenantClient.task.findMany({
      include: { product: true, assignee: true }
    });
  }

  @Post()
  @RequirePermissions(Permissions.TasksCreate)
  async createTask(@Body() body: any) {
    return this.prisma.tenantClient.task.create({ data: body });
  }

  @Post(":id/assign")
  @RequirePermissions(Permissions.TasksUpdate)
  async assignTask(@Param("id") id: string, @Body() body: { assigneeId: string }) {
    return this.prisma.tenantClient.task.update({
      where: { id },
      data: { assigneeId: body.assigneeId, status: "ASSIGNED" }
    });
  }

  @Post(":id/complete")
  @RequirePermissions(Permissions.TasksUpdate)
  async completeTask(@Param("id") id: string, @Body() body: { actualQty: number }, @Request() req: any) {
    const actorId = req.user?.sub || "00000000-0000-0000-0000-000000000000";

    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      // 1. Láº¥y thĂ´ng tin Task vĂ  Inventory liĂªn quan
      const task = await tx.task.findUnique({
        where: { id },
        include: { wave: true }
      });

      if (!task) throw new NotFoundException("Task not found");
      if (task.status === "COMPLETED") throw new BadRequestException("Task already completed");

      // TĂ¬m inventory dá»±a trĂªn sourceBin vĂ  product
      const invs = await tx.inventory.findMany({ 
        where: { 
          warehouseId: task.warehouseId, 
          productId: task.productId, 
          binId: task.sourceBinId 
        } 
      });

      if (invs.length === 0) throw new NotFoundException("Source inventory not found");
      const inv = invs[0];

      // 2. Cáº­p nháº­t Task status
      await tx.task.update({
        where: { id },
        data: { 
          status: "COMPLETED", 
          quantityActual: body.actualQty,
          assigneeId: task.assigneeId || actorId
        }
      });

      // 3. Kháº¥u trá»« kho: Trá»« cáº£ sá»‘ dÆ° thá»±c táº¿ vĂ  sá»‘ dÆ° Ä‘Ă£ cáº¥p phĂ¡t (Allocated)
      const updateResult = await tx.$executeRawUnsafe(
        `UPDATE inventory 
        SET quantity_on_hand = quantity_on_hand - $1,
            quantity_allocated = quantity_allocated - $2,
            version = version + 1
        WHERE id = $3::uuid AND version = $4`,
        body.actualQty, task.quantityRequested, inv.id, inv.version
      );

      if (updateResult === 0) throw new ConflictException("Inventory concurrent update detected");

      // 4. Ghi nháº­n biáº¿n Ä‘á»™ng kho (Stock Movement)
      await tx.stockMovement.create({
        data: {
          inventoryId: inv.id,
          warehouseId: task.warehouseId,
          transactionType: task.taskType,
          quantityChange: -body.actualQty,
          balanceAfter: inv.quantityOnHand - body.actualQty,
          reasonCode: `TASK_COMPLETE_${task.id}`,
          actorId: actorId
        }
      });

      return { ok: true, taskId: task.id };
    });
  }
}

import { Controller, Get, Post, Body, UseGuards, Request, UnauthorizedException, ConflictException } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types"
import { PrismaService } from "../prisma/prisma.service"

@ApiTags("Mobile")
@Controller("mobile")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MobileController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("sync")
  @RequirePermissions(Permissions.MobileSyncPull)
  async syncTasks(@Request() req: any) {
    const userId = req.user?.sub;
    if (!userId) throw new UnauthorizedException("User ID not found in token");
    
    return this.prisma.tenantClient.task.findMany({
      where: { assigneeId: userId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
      include: { product: true }
    });
  }

  @Post("scan-logs")
  @RequirePermissions(Permissions.MobileSyncPush)
  async submitScanLogs(@Body() body: { logs: any[] }, @Request() req: any) {
    const actorId = req.user?.sub;
    
    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      let processedCount = 0;

      for (const log of body.logs) {
        // 1. Insert the scan log
        await tx.scanLog.create({
          data: {
            warehouseId: log.warehouseId,
            taskId: log.taskId,
            barcode: log.barcode,
            result: log.result,
            deviceId: log.deviceId,
            actorId,
          }
        });

        // 2. Phase 2.2: Apply Optimistic Locking if action is PACK or OUT
        if (log.result === "PACK" || log.result === "OUT") {
          // Find the product by barcode
          const product = await tx.product.findUnique({
            where: { barcode: log.barcode }
          });

          if (product) {
            // Find an available inventory record for this product in the warehouse
            const inv = await tx.inventory.findFirst({
              where: { 
                productId: product.id, 
                warehouseId: log.warehouseId,
                quantityOnHand: { gt: 0 }
              }
            });

            if (inv) {
              // Execute Optimistic Locking update
              const updatedRows = await tx.$executeRaw`
                UPDATE inventory
                SET quantity_on_hand = quantity_on_hand - 1,
                    version = version + 1
                WHERE id = ${inv.id}::uuid
                  AND version = ${inv.version}
              `;

              if (updatedRows === 0) {
                // If 0 rows updated, it means another transaction modified it concurrently
                throw new ConflictException(`Conflict updating inventory for barcode ${log.barcode}. Please sync and try again.`);
              }
            }
          }
        }
        processedCount++;
      }

      return { ok: true, processedCount };
    });
  }
}

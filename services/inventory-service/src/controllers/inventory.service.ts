import { Injectable, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getLedger(params: { warehouseId?: string, productId?: string, page?: number, limit?: number }) {
    const skip = (Number(params.page || 1) - 1) * Number(params.limit || 20);
    const take = Number(params.limit || 20);

    const where: any = {};
    if (params.warehouseId) where.warehouseId = params.warehouseId;
    if (params.productId) {
      where.inventory = { productId: params.productId };
    }

    const [data, total] = await Promise.all([
      this.prisma.tenantClient.stockMovement.findMany({
        where,
        skip,
        take,
        include: { 
          inventory: { include: { product: true, bin: true } },
          warehouse: true 
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenantClient.stockMovement.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: params.page || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async adjustStock(inventoryId: string, qtyChange: number, reason: string, actorId: string) {
    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      // 1. Get current inventory
      const inv = await tx.inventory.findUnique({ where: { id: inventoryId } });
      if (!inv) throw new ConflictException("Inventory not found");

      if (inv.quantityOnHand + qtyChange < 0) {
        throw new ConflictException("Insufficient stock");
      }

      // 2. Optimistic Locking Update
      const result = await tx.$executeRaw`
        UPDATE inventory
        SET quantity_on_hand = quantity_on_hand + ${qtyChange},
            version = version + 1
        WHERE id = ${inventoryId}::uuid
          AND version = ${inv.version}
      `;

      if (result === 0) {
        throw new ConflictException("Inventory was modified by another transaction. Please reload.");
      }

      // 3. Insert Stock Movement
      await tx.stockMovement.create({
        data: {
          inventoryId,
          warehouseId: inv.warehouseId,
          transactionType: "ADJUSTMENT",
          quantityChange: qtyChange,
          balanceAfter: inv.quantityOnHand + qtyChange,
          reasonCode: reason,
          actorId,
        }
      });

      // 4. Insert into Adjustment table for specific audit
      await tx.adjustment.create({
        data: {
          inventoryId,
          warehouseId: inv.warehouseId,
          quantityChange: qtyChange,
          reasonCode: reason,
          createdBy: actorId,
        }
      });

      return { ok: true, newBalance: inv.quantityOnHand + qtyChange };
    });
  }

  async receiveStock(data: { warehouseId: string, binId: string, productId: string, batchNumber?: string, lpn?: string, quantity: number, reason: string }, actorId: string) {
    if (data.quantity <= 0) throw new ConflictException("Receive quantity must be > 0");

    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      // Find existing inventory
      let inv = await tx.inventory.findFirst({
        where: {
          warehouseId: data.warehouseId,
          binId: data.binId,
          productId: data.productId,
          batchNumber: data.batchNumber || null,
          lpn: data.lpn || null,
        }
      });

      if (!inv) {
        // Create new
        inv = await tx.inventory.create({
          data: {
            warehouseId: data.warehouseId,
            binId: data.binId,
            productId: data.productId,
            batchNumber: data.batchNumber || null,
            lpn: data.lpn || null,
            quantityOnHand: data.quantity,
            version: 1,
          }
        });
      } else {
        // Upsert with Optimistic Lock
        const result = await tx.$executeRaw`
          UPDATE inventory
          SET quantity_on_hand = quantity_on_hand + ${data.quantity},
              version = version + 1
          WHERE id = ${inv.id}::uuid
            AND version = ${inv.version}
        `;
        if (result === 0) {
          throw new ConflictException("Inventory was modified by another transaction. Please reload.");
        }
        inv.quantityOnHand += data.quantity;
      }

      await tx.stockMovement.create({
        data: {
          inventoryId: inv.id,
          warehouseId: data.warehouseId,
          transactionType: "RECEIPT",
          quantityChange: data.quantity,
          balanceAfter: inv.quantityOnHand,
          reasonCode: data.reason,
          actorId,
        }
      });

      return { ok: true, inventoryId: inv.id, newBalance: inv.quantityOnHand };
    });
  }

  async transferStock(data: { sourceInventoryId: string, targetBinId: string, quantity: number, reason: string }, actorId: string) {
    if (data.quantity <= 0) throw new ConflictException("Transfer quantity must be > 0");

    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      // 1. Source Inventory
      const sourceInv = await tx.inventory.findUnique({ where: { id: data.sourceInventoryId } });
      if (!sourceInv) throw new Error("Source inventory not found");
      if (sourceInv.quantityOnHand < data.quantity) {
        throw new ConflictException("Insufficient stock in source bin");
      }

      // Deduct source (Optimistic Lock)
      const sourceResult = await tx.$executeRaw`
        UPDATE inventory
        SET quantity_on_hand = quantity_on_hand - ${data.quantity},
            version = version + 1
        WHERE id = ${sourceInv.id}::uuid
          AND version = ${sourceInv.version}
      `;
      if (sourceResult === 0) {
        throw new ConflictException("Source inventory was modified by another transaction. Please reload.");
      }

      // 2. Target Inventory
      let targetInv = await tx.inventory.findFirst({
        where: {
          warehouseId: sourceInv.warehouseId,
          binId: data.targetBinId,
          productId: sourceInv.productId,
          batchNumber: sourceInv.batchNumber || null,
          lpn: sourceInv.lpn || null,
        }
      });

      if (!targetInv) {
        targetInv = await tx.inventory.create({
          data: {
            warehouseId: sourceInv.warehouseId,
            binId: data.targetBinId,
            productId: sourceInv.productId,
            batchNumber: sourceInv.batchNumber || null,
            lpn: sourceInv.lpn || null,
            quantityOnHand: data.quantity,
            version: 1,
          }
        });
      } else {
        // Add to target (Optimistic Lock)
        const targetResult = await tx.$executeRaw`
          UPDATE inventory
          SET quantity_on_hand = quantity_on_hand + ${data.quantity},
              version = version + 1
          WHERE id = ${targetInv.id}::uuid
            AND version = ${targetInv.version}
        `;
        if (targetResult === 0) {
          throw new ConflictException("Target inventory was modified by another transaction. Please reload.");
        }
        targetInv.quantityOnHand += data.quantity;
      }

      // 3. Stock Movements
      await tx.stockMovement.createMany({
        data: [
          {
            inventoryId: sourceInv.id,
            warehouseId: sourceInv.warehouseId,
            transactionType: "TRANSFER_OUT",
            quantityChange: -data.quantity,
            balanceAfter: sourceInv.quantityOnHand - data.quantity,
            reasonCode: data.reason,
            actorId,
          },
          {
            inventoryId: targetInv.id,
            warehouseId: targetInv.warehouseId,
            transactionType: "TRANSFER_IN",
            quantityChange: data.quantity,
            balanceAfter: targetInv.quantityOnHand,
            reasonCode: data.reason,
            actorId,
          }
        ]
      });

      return { ok: true, sourceBalance: sourceInv.quantityOnHand - data.quantity, targetBalance: targetInv.quantityOnHand };
    });
  }

  async getAdjustments(params: { page?: number; limit?: number }) {
    const skip = (Number(params.page || 1) - 1) * Number(params.limit || 20);
    const take = Number(params.limit || 20);

    const [data, total] = await Promise.all([
      this.prisma.tenantClient.adjustment.findMany({
        skip,
        take,
        include: { inventory: { include: { product: true } }, creator: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenantClient.adjustment.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page: params.page || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  // --- Cycle Count Methods ---

  async createCycleCount(data: { warehouseId: string, scheduledAt?: Date, actorId: string }) {
    return this.prisma.tenantClient.cycleCount.create({
      data: {
        warehouseId: data.warehouseId,
        scheduledAt: data.scheduledAt,
        createdBy: data.actorId,
        status: "PENDING"
      }
    });
  }

  async getCycleCounts(warehouseId: string, params: { page?: number; limit?: number }) {
    const skip = (Number(params.page || 1) - 1) * Number(params.limit || 20);
    const take = Number(params.limit || 20);

    const [data, total] = await Promise.all([
      this.prisma.tenantClient.cycleCount.findMany({
        where: { warehouseId },
        skip,
        take,
        include: { creator: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenantClient.cycleCount.count({ where: { warehouseId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page: params.page || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async updateCycleCountStatus(id: string, status: string) {
    return this.prisma.tenantClient.cycleCount.update({
      where: { id },
      data: { status }
    });
  }

  // --- Warehouse Operations Methods ---

  async startShift(warehouseId: string, staffId: string) {
    if (!warehouseId) {
      const wh = await this.prisma.tenantClient.warehouse.findFirst();
      if (!wh) throw new Error("No warehouse available");
      warehouseId = wh.id;
    }
    return this.prisma.tenantClient.staffShift.create({
      data: {
        warehouseId,
        staffId,
        shiftStart: new Date(),
        status: "OPEN"
      }
    });
  }

  async endShift(shiftId: string) {
    return this.prisma.tenantClient.staffShift.update({
      where: { id: shiftId },
      data: {
        shiftEnd: new Date(),
        status: "CLOSED"
      }
    });
  }

  async checkoutEquipment(warehouseId: string, equipmentCode: string, staffId: string) {
    if (!warehouseId) {
      const wh = await this.prisma.tenantClient.warehouse.findFirst();
      if (!wh) throw new Error("No warehouse available");
      warehouseId = wh.id;
    }
    return this.prisma.tenantClient.equipmentCheckout.create({
      data: {
        warehouseId,
        equipmentCode,
        staffId,
        checkedOutAt: new Date(),
        status: "OUT"
      }
    });
  }

  async returnEquipment(checkoutId: string) {
    return this.prisma.tenantClient.equipmentCheckout.update({
      where: { id: checkoutId },
      data: {
        returnedAt: new Date(),
        status: "RETURNED"
      }
    });
  }

  async getEquipmentLogs() {
    return this.prisma.tenantClient.equipmentCheckout.findMany({
      orderBy: { checkedOutAt: 'desc' },
      take: 50
    });
  }

  async createPackLog(data: { warehouseId: string, orderId?: string, weightGrams?: number, dimensionCm?: string, deviceId?: string }) {
    return this.prisma.tenantClient.packStationLog.create({
      data: {
        warehouseId: data.warehouseId,
        orderId: data.orderId,
        weightGrams: data.weightGrams,
        dimensionCm: data.dimensionCm,
        deviceId: data.deviceId
      }
    });
  }

  async reserveStock(inventoryId: string, quantity: number) {
    if (quantity <= 0) throw new ConflictException("Reservation quantity must be > 0");

    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      const inv = await tx.inventory.findUnique({ where: { id: inventoryId } });
      if (!inv) throw new ConflictException("Inventory not found");

      const available = inv.quantityOnHand - inv.quantityAllocated;
      if (available < quantity) {
        throw new ConflictException(`Insufficient available stock. Available: ${available}, Requested: ${quantity}`);
      }

      const result = await tx.$executeRaw`
        UPDATE inventory
        SET quantity_allocated = quantity_allocated + ${quantity},
            version = version + 1
        WHERE id = ${inventoryId}::uuid
          AND version = ${inv.version}
      `;

      if (result === 0) {
        throw new ConflictException("Inventory was modified by another transaction. Please reload.");
      }

      return { ok: true, reserved: quantity, newAvailable: available - quantity };
    });
  }

  async releaseReservation(inventoryId: string, quantity: number) {
    if (quantity <= 0) throw new ConflictException("Release quantity must be > 0");

    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      const inv = await tx.inventory.findUnique({ where: { id: inventoryId } });
      if (!inv) throw new ConflictException("Inventory not found");

      if (inv.quantityAllocated < quantity) {
        throw new ConflictException("Cannot release more than reserved");
      }

      const result = await tx.$executeRaw`
        UPDATE inventory
        SET quantity_allocated = quantity_allocated - ${quantity},
            version = version + 1
        WHERE id = ${inventoryId}::uuid
          AND version = ${inv.version}
      `;

      if (result === 0) {
        throw new ConflictException("Inventory was modified by another transaction. Please reload.");
      }

      return { ok: true, released: quantity, newAvailable: inv.quantityOnHand - (inv.quantityAllocated - quantity) };
    });
  }

  async getLowStockAlerts(warehouseId: string, threshold: number = 10) {
    const lowStockItems = await this.prisma.tenantClient.inventory.findMany({
      where: {
        warehouseId,
        quantityOnHand: { lte: threshold },
        status: 'AVAILABLE',
      },
      include: { product: true, bin: true },
      orderBy: { quantityOnHand: 'asc' },
    });

    return {
      alerts: lowStockItems.map((item: any) => ({
        inventoryId: item.id,
        productSku: item.product.sku,
        productName: item.product.name,
        binBarcode: item.bin.barcode,
        quantityOnHand: item.quantityOnHand,
        quantityAllocated: item.quantityAllocated,
        available: item.quantityOnHand - item.quantityAllocated,
        threshold,
      })),
      count: lowStockItems.length,
    };
  }

  async getStockSummary(warehouseId: string) {
    const summary = await this.prisma.tenantClient.inventory.groupBy({
      by: ['productId'],
      where: { warehouseId },
      _sum: {
        quantityOnHand: true,
        quantityAllocated: true,
      },
      _count: true,
    });

    const products = await this.prisma.tenantClient.product.findMany({
      where: { id: { in: summary.map((s: any) => s.productId) } },
    });

    const productMap = new Map(products.map((p: any) => [p.id, p as any]));

    return summary.map((s: any) => {
      const product = productMap.get(s.productId) as any;
      return {
        productId: s.productId,
        productSku: product?.sku,
        productName: product?.name,
        totalOnHand: s._sum.quantityOnHand || 0,
        totalAllocated: s._sum.quantityAllocated || 0,
        totalAvailable: (s._sum.quantityOnHand || 0) - (s._sum.quantityAllocated || 0),
        binCount: s._count,
      };
    });
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WmsAllocationEngine, AllocationStrategy, InventoryItem } from 'wms-engine';

@Injectable()
export class WavesService {
  constructor(private readonly prisma: PrismaService) {}

  async generateWave(warehouseId: string, orderIds: string[], strategy: AllocationStrategy = AllocationStrategy.FIFO) {
    let warehouse = await this.prisma.tenantClient.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) {
      warehouse = await this.prisma.tenantClient.warehouse.findFirst();
      if (!warehouse) throw new BadRequestException("No warehouses available.");
      warehouseId = warehouse.id;
    }

    if (!orderIds || orderIds.length === 0) {
      const orders = await this.prisma.tenantClient.order.findMany({ where: { status: 'PENDING' }, take: 10 });
      orderIds = orders.map((o: any) => o.id);
    }
    if (orderIds.length === 0) {
      throw new BadRequestException("No pending orders available to generate wave.");
    }
    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      const wave = await tx.wavePicking.create({
        data: {
          warehouseId,
          waveNumber: `WAVE-${Date.now()}`,
          status: 'ALLOCATING',
          totalOrders: orderIds.length,
          createdBy: '00000000-0000-0000-0000-000000000000',
        },
      });

      const orderItems = await tx.orderItem.findMany({
        where: { orderId: { in: orderIds } },
        include: { product: true },
      });

      const productDemands = orderItems.reduce((acc: any, item: any) => {
        acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
        return acc;
      }, {});

      for (const [productId, requiredQty] of Object.entries(productDemands)) {
        const stocks = await tx.inventory.findMany({
          where: { warehouseId, productId, quantityOnHand: { gt: 0 } },
          orderBy: { createdAt: 'asc' } // Base sort
        });

        const engineStocks: InventoryItem[] = stocks.map((s: any) => ({
          id: s.id,
          binId: s.binId,
          productId: s.productId,
          quantityAvailable: s.quantityOnHand - s.quantityAllocated,
          createdAt: s.createdAt, // DĂ¹ng ngĂ y thá»±c táº¿ Ä‘á»ƒ FIFO/LIFO hoáº¡t Ä‘á»™ng
          expiryDate: s.expiryDate,
        }));

        try {
          const allocations = WmsAllocationEngine.allocate(engineStocks, requiredQty as number, strategy);

          for (const alloc of allocations) {
            // 1. Táº¡o Task láº¥y hĂ ng
            await tx.task.create({
              data: {
                warehouseId,
                waveId: wave.id,
                taskType: 'PICK',
                status: 'PENDING',
                productId: productId as string,
                sourceBinId: alloc.binId,
                quantityRequested: alloc.allocatedQuantity,
              },
            });

            // 2. Cáº­p nháº­t sá»‘ lÆ°á»£ng Ä‘Ă£ cáº¥p phĂ¡t (Allocated) dĂ¹ng Optimistic Locking
            const inv = stocks.find((s: any) => s.id === alloc.inventoryId);
            const updateResult = await tx.$executeRawUnsafe(
              `UPDATE inventory 
              SET quantity_allocated = quantity_allocated + $1,
                  version = version + 1
              WHERE id = $2::uuid AND version = $3`,
              alloc.allocatedQuantity, alloc.inventoryId, inv.version
            );

            if (updateResult === 0) {
              throw new Error(`Inventory ${alloc.inventoryId} was modified. Retry required.`);
            }
          }
        } catch (error: any) {
          throw new BadRequestException(`Cáº¥p phĂ¡t tháº¥t báº¡i cho SP ${productId}: ${error?.message || 'Unknown error'}`);
        }
      }

      return tx.wavePicking.update({
        where: { id: wave.id },
        data: { status: 'READY' },
        include: { tasks: true },
      });
    });
  }

  async listWaves() {
    return this.prisma.tenantClient.wavePicking.findMany({
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

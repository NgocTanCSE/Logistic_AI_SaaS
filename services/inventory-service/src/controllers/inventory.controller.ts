import { Controller, Get, Post, Body, UseGuards, Request, Query, NotFoundException } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types"
import { InventoryService } from "./inventory.service"
import { PrismaService } from "../prisma/prisma.service"

@ApiTags("Inventory")
@Controller("inventory")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly prisma: PrismaService
  ) {}

  @Get("ledger")
  @RequirePermissions(Permissions.InventoryRead)
  async getLedger(@Query("page") page: number, @Query("limit") limit: number) {
    return this.inventoryService.getLedger({ page: Number(page), limit: Number(limit) })
  }

  @Post("adjust")
  @RequirePermissions(Permissions.InventoryAdjust)
  async adjustStock(@Body() body: { inventoryId?: string, sku?: string, qtyChange: number, reason: string }, @Request() req: any) {
    let inventoryId = body.inventoryId;
    if (!inventoryId && body.sku) {
      const product = await this.prisma.tenantClient.product.findUnique({ where: { sku: body.sku } });
      if (!product) throw new NotFoundException(`Product SKU ${body.sku} not found`);
      const inventory = await this.prisma.tenantClient.inventory.findFirst({ where: { productId: product.id } });
      if (!inventory) throw new NotFoundException(`No inventory record found for SKU ${body.sku}`);
      inventoryId = inventory.id;
    }
    return this.inventoryService.adjustStock(inventoryId!, body.qtyChange, body.reason, req.user?.sub || "00000000-0000-0000-0000-000000000000")
  }

  @Post("receive")
  @RequirePermissions(Permissions.InventoryAdjust)
  async receiveStock(@Body() body: { sku?: string, binBarcode?: string, warehouseId?: string, binId?: string, productId?: string, quantity: number, reason?: string }, @Request() req: any) {
    let { warehouseId, binId, productId } = body;
    
    if (body.sku) {
      const product = await this.prisma.tenantClient.product.findUnique({ where: { sku: body.sku } });
      if (!product) throw new NotFoundException(`Product SKU ${body.sku} not found`);
      productId = product.id;
    }
    
    if (body.binBarcode) {
      const bin = await this.prisma.tenantClient.bin.findUnique({ where: { barcode: body.binBarcode } });
      if (!bin) throw new NotFoundException(`Bin barcode ${body.binBarcode} not found`);
      binId = bin.id;
      warehouseId = bin.warehouseId;
    }

    if (!warehouseId || !binId || !productId) {
      throw new NotFoundException("Missing required IDs or could not resolve them from SKU/Barcode");
    }

    return this.inventoryService.receiveStock({
      warehouseId, binId, productId, quantity: body.quantity, reason: body.reason || "RECEIVE"
    }, req.user?.sub || "00000000-0000-0000-0000-000000000000");
  }

  @Post("transfer")
  @RequirePermissions(Permissions.InventoryAdjust)
  async transferStock(@Body() body: { barcode?: string, sourceBin?: string, destBin?: string, sourceInventoryId?: string, targetBinId?: string, quantity: number, reason?: string }, @Request() req: any) {
    let { sourceInventoryId, targetBinId } = body;

    if (body.barcode && body.sourceBin) {
      // Find inventory by product barcode or SKU in source bin
      const product = await this.prisma.tenantClient.product.findFirst({
        where: { OR: [{ barcode: body.barcode }, { sku: body.barcode }] }
      });
      if (!product) throw new NotFoundException(`Product ${body.barcode} not found`);

      const srcBin = await this.prisma.tenantClient.bin.findUnique({ where: { barcode: body.sourceBin } });
      if (!srcBin) throw new NotFoundException(`Source bin ${body.sourceBin} not found`);

      const inv = await this.prisma.tenantClient.inventory.findFirst({
        where: { productId: product.id, binId: srcBin.id }
      });
      if (!inv) throw new NotFoundException(`Inventory for ${body.barcode} in ${body.sourceBin} not found`);
      
      sourceInventoryId = inv.id;
    }

    if (body.destBin) {
      const dstBin = await this.prisma.tenantClient.bin.findUnique({ where: { barcode: body.destBin } });
      if (!dstBin) throw new NotFoundException(`Destination bin ${body.destBin} not found`);
      targetBinId = dstBin.id;
    }

    if (!sourceInventoryId || !targetBinId) {
      throw new NotFoundException("Missing required IDs or could not resolve them from barcodes");
    }

    return this.inventoryService.transferStock({
      sourceInventoryId, targetBinId, quantity: body.quantity, reason: body.reason || "TRANSFER"
    }, req.user?.sub || "00000000-0000-0000-0000-000000000000");
  }
}

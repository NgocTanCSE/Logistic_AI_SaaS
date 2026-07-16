import { Controller, Get, Param, Post, Patch, Body, Query, UseGuards, NotFoundException, BadRequestException } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { IsString, IsNumber, IsOptional, Min } from "class-validator"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types"
import { PrismaService } from "../prisma/prisma.service"

class CreateBinDto {
  @IsString()
  rackId!: string

  @IsString()
  warehouseId!: string

  @IsString()
  barcode!: string

  @IsNumber()
  @Min(1)
  rowIndex!: number

  @IsNumber()
  @Min(1)
  levelIndex!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWeightKg?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxVolumeCbm?: number
}

@ApiTags("Bins")
@Controller("bins")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BinsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.InventoryRead)
  async list(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("warehouseId") warehouseId?: string,
    @Query("rackId") rackId?: string,
    @Query("search") search?: string,
  ) {
    const skip = (Number(page || 1) - 1) * Number(limit || 20)
    const take = Number(limit || 20)
    const where: any = {}
    if (warehouseId) where.warehouseId = warehouseId
    if (rackId) where.rackId = rackId
    if (search) {
      where.OR = [
        { barcode: { contains: search, mode: "insensitive" } },
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.tenantClient.bin.findMany({
        where,
        skip,
        take,
        include: { rack: { include: { zone: true } }, warehouse: true },
        orderBy: [{ warehouseId: "asc" }, { rackId: "asc" }, { rowIndex: "asc" }, { levelIndex: "asc" }],
      }),
      this.prisma.tenantClient.bin.count({ where }),
    ])

    return {
      data,
      meta: { total, page: Number(page || 1), limit: take, totalPages: Math.ceil(total / take) },
    }
  }

  @Get(":id")
  @RequirePermissions(Permissions.InventoryRead)
  async detail(@Param("id") id: string) {
    const bin = await this.prisma.tenantClient.bin.findUnique({
      where: { id },
      include: { rack: { include: { zone: true } }, warehouse: true, inventory: { include: { product: true } } },
    })
    if (!bin) throw new NotFoundException(`Bin ${id} not found`)
    return bin
  }

  @Post()
  @RequirePermissions(Permissions.InventoryAdjust)
  async create(@Body() body: CreateBinDto) {
    const rack = await this.prisma.tenantClient.rack.findUnique({ where: { id: body.rackId } })
    if (!rack) throw new NotFoundException(`Rack ${body.rackId} not found`)

    const existing = await this.prisma.tenantClient.bin.findUnique({ where: { barcode: body.barcode } })
    if (existing) throw new BadRequestException(`Bin with barcode ${body.barcode} already exists`)

    return this.prisma.tenantClient.bin.create({ data: body })
  }

  @Patch(":id")
  @RequirePermissions(Permissions.InventoryAdjust)
  async update(@Param("id") id: string, @Body() body: Partial<CreateBinDto>) {
    const bin = await this.prisma.tenantClient.bin.findUnique({ where: { id } })
    if (!bin) throw new NotFoundException(`Bin ${id} not found`)
    return this.prisma.tenantClient.bin.update({ where: { id }, data: body })
  }
}

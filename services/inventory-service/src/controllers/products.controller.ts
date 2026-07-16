import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, NotFoundException, BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";

class CreateProductDto {
  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  volumeCbm?: number;
}

@ApiTags("Products")
@Controller("products")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.InventoryRead)
  async list(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
  ) {
    try {
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where = search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {};

      const [data, total] = await Promise.all([
        this.prisma.tenantClient.product.findMany({
          where,
          skip,
          take,
          orderBy: { name: 'asc' },
        }),
        this.prisma.tenantClient.product.count({ where }),
      ]);

      return {
        data,
        meta: {
          total,
          page: Number(page),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch products");
    }
  }

  @Get(":id")
  @RequirePermissions(Permissions.InventoryRead)
  async detail(@Param("id") id: string) {
    try {
      const product = await this.prisma.tenantClient.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      return product;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to fetch product");
    }
  }

  @Post()
  @RequirePermissions(Permissions.InventoryAdjust)
  async create(@Body() body: CreateProductDto) {
    try {
      return await this.prisma.tenantClient.product.create({ data: body });
    } catch (error) {
      throw new BadRequestException("Failed to create product");
    }
  }

  @Post("import")
  @RequirePermissions(Permissions.InventoryAdjust)
  async importExcel() {
    return { success: true, message: "Products import endpoint available. Use POST /products with body to create products individually." };
  }

  @Patch(":id")
  @RequirePermissions(Permissions.InventoryAdjust)
  async update(@Param("id") id: string, @Body() body: Partial<CreateProductDto>) {
    try {
      const product = await this.prisma.tenantClient.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      return await this.prisma.tenantClient.product.update({
        where: { id },
        data: body,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException("Failed to update product");
    }
  }

  @Patch(":id/soft-delete")
  @RequirePermissions(Permissions.InventoryAdjust)
  async softDelete(@Param("id") id: string) {
    try {
      const product = await this.prisma.tenantClient.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      return await this.prisma.tenantClient.product.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException("Failed to delete product");
    }
  }
}

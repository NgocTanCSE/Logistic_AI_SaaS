import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, InternalServerErrorException, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from "class-validator";
import { Type } from "class-transformer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { KafkaEventService } from "../services/kafka-event.service";
import { ApiTags } from "@nestjs/swagger";

class OrderItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

class CreateOrderDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientOrderRef?: string;

  @IsString()
  recipientName!: string;

  @IsString()
  recipientPhone!: string;

  @IsString()
  recipientAddress!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  codAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFee?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

@ApiTags("Orders")
@Controller("orders")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrdersController {
  private readonly logger = new Logger('OrdersController');

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaEvent: KafkaEventService
  ) {}

  @Post()
  @RequirePermissions(Permissions.OrdersCreate)
  async createOrder(@Body() body: CreateOrderDto) {
    if (!body.items || body.items.length === 0) {
      throw new BadRequestException("Order must have at least one item");
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const trackingCode = `SLG-${dateStr}-${randomSuffix}`;

    try {
      return await this.prisma.tenantClient.$transaction(async (tx: any) => {
        const order = await tx.order.create({
          data: {
            trackingCode,
            clientId: body.clientId,
            clientOrderRef: body.clientOrderRef,
            status: "NEW",
            recipientName: body.recipientName,
            recipientPhone: body.recipientPhone,
            recipientAddress: body.recipientAddress,
            codAmount: body.codAmount || 0,
            shippingFee: body.shippingFee || 0,
            items: {
              create: body.items
            }
          }
        });

        await tx.orderTrackingEvent.create({
          data: {
            orderId: order.id,
            status: 'NEW',
            location: 'System',
            description: 'Order created via API',
          }
        });

        this.kafkaEvent.emit('order.created', order)
        
        return order;
      });
    } catch (error) {
      this.logger.error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown'}`);
      throw new InternalServerErrorException('Failed to create order');
    }
  }

  @Get()
  @RequirePermissions(Permissions.OrdersRead)
  async listOrders(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    try {
      const skip = (Number(page || 1) - 1) * Number(limit || 20);
      const take = Number(limit || 20);

      const where: any = {};
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { trackingCode: { contains: search, mode: "insensitive" } },
          { recipientName: { contains: search, mode: "insensitive" } },
          { recipientPhone: { contains: search } },
        ];
      }

      const [data, total] = await Promise.all([
        this.prisma.tenantClient.order.findMany({
          where,
          skip,
          take,
          include: { items: true },
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.tenantClient.order.count({ where }),
      ]);

      return {
        data,
        meta: {
          total,
          page: Number(page || 1),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch orders: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      throw new InternalServerErrorException("Failed to fetch orders");
    }
  }

  @Get(":id")
  @RequirePermissions(Permissions.OrdersRead)
  async getOrder(@Param("id") id: string) {
    try {
      const order = await this.prisma.tenantClient.order.findUnique({
        where: { id },
        include: { items: true, events: { orderBy: { timestamp: "desc" } } },
      });
      if (!order) throw new NotFoundException(`Order ${id} not found`);
      return order;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to fetch order");
    }
  }

  @Patch(":id")
  @RequirePermissions(Permissions.OrdersCreate)
  async updateOrder(
    @Param("id") id: string,
    @Body() body: { recipientName?: string; recipientPhone?: string; recipientAddress?: string; codAmount?: number; shippingFee?: number; notes?: string },
  ) {
    try {
      const order = await this.prisma.tenantClient.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundException(`Order ${id} not found`);
      const updated = await this.prisma.tenantClient.order.update({
        where: { id },
        data: body,
      });
      this.kafkaEvent.emit('order.updated', updated)
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to update order");
    }
  }

  @Post(":id/cancel")
  @RequirePermissions(Permissions.OrdersCreate)
  async cancelOrder(@Param("id") id: string) {
    try {
      const order = await this.prisma.tenantClient.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundException(`Order ${id} not found`);
      const cancelled = await this.prisma.tenantClient.order.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });
      this.kafkaEvent.emit('order.cancelled', cancelled)
      return cancelled;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to cancel order");
    }
  }

  @Get(":id/tracking")
  @RequirePermissions(Permissions.OrdersRead)
  async getTracking(@Param("id") id: string) {
    try {
      const order = await this.prisma.tenantClient.order.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found.`);
      }

      return this.prisma.tenantClient.orderTrackingEvent.findMany({ 
        where: { orderId: id }, 
        orderBy: { timestamp: 'desc' } 
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to fetch tracking");
    }
  }
}

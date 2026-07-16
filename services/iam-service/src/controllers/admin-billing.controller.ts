import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, NotFoundException, BadRequestException } from "@nestjs/common";
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from "class-validator";
import { Type } from "class-transformer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags } from '@nestjs/swagger';

class PlanDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsNumber()
  priceMonthly: number;

  @IsNumber()
  maxUsers: number;

  @IsNumber()
  maxWarehouses: number;

  @IsNumber()
  maxVehicles: number;

  @IsOptional()
  @IsString()
  featuresJson?: string;

  @IsOptional()
  @IsString()
  priceCurrency?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class InvoiceLineItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

class CreateInvoiceDto {
  @IsString()
  tenantId: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  items: InvoiceLineItemDto[];
}

class CreatePaymentDto {
  @IsString()
  tenantId: string;

  @IsString()
  invoiceId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  method: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}

@ApiTags('Admin Billing')
@Controller("admin/billing")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminBillingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.BillingRead)
  async listInvoicesPaginated(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 15,
  ) {
    try {
      const skip = (Number(page) - 1) * Number(limit)
      const take = Number(limit)

      const [data, total] = await Promise.all([
        this.prisma.invoice.findMany({
          skip,
          take,
          include: { items: true, tenant: { select: { id: true, name: true } }, client: { select: { id: true, name: true } } },
          orderBy: { issuedAt: "desc" },
        }),
        this.prisma.invoice.count(),
      ])

      const totalAmount = data.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)

      return {
        data: data.map(inv => ({
          id: inv.id,
          tenant: inv.tenant?.name || "N/A",
          plan: "—",
          amount: `$${Number(inv.totalAmount).toFixed(2)}`,
          issuedAt: inv.issuedAt?.toISOString().split("T")[0] || "—",
          status: inv.status,
        })),
        meta: {
          total,
          page: Number(page),
          limit: take,
          totalPages: Math.ceil(total / take),
          mrr: totalAmount,
        },
      }
    } catch (error) {
      throw new BadRequestException("Failed to fetch invoices")
    }
  }

  @Get("plans")
  @RequirePermissions(Permissions.BillingRead)
  async listPlans() {
    try {
      return await this.prisma.subscriptionPlan.findMany();
    } catch (error) {
      throw new BadRequestException("Failed to fetch plans");
    }
  }

  @Post("plans")
  @RequirePermissions(Permissions.PlansManage)
  async createPlan(@Body() body: PlanDto) {
    try {
      return await this.prisma.subscriptionPlan.create({ data: body });
    } catch (error) {
      throw new BadRequestException("Failed to create plan");
    }
  }

  @Put("plans/:id")
  @RequirePermissions(Permissions.PlansManage)
  async updatePlan(@Param("id") id: string, @Body() body: Partial<PlanDto>) {
    try {
      return await this.prisma.subscriptionPlan.update({ where: { id }, data: body });
    } catch (error) {
      throw new NotFoundException("Plan not found");
    }
  }

  @Delete("plans/:id")
  @RequirePermissions(Permissions.PlansManage)
  async deletePlan(@Param("id") id: string) {
    try {
      return await this.prisma.subscriptionPlan.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundException("Plan not found");
    }
  }

  @Get("invoices")
  @RequirePermissions(Permissions.BillingRead)
  async listInvoices() {
    try {
      return await this.prisma.invoice.findMany({ include: { items: true, tenant: true, client: true } });
    } catch (error) {
      throw new BadRequestException("Failed to fetch invoices");
    }
  }

  @Post("invoices")
  @RequirePermissions(Permissions.BillingRead)
  async createInvoice(@Body() body: CreateInvoiceDto) {
    if (!body.items || body.items.length === 0) {
      throw new BadRequestException("Invoice must have at least one item");
    }

    try {
      const lineItems = body.items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: Number(i.unitPrice) * i.quantity,
      }));
      const totalAmount = lineItems.reduce((sum, li) => sum + Number(li.lineTotal), 0);

      return await this.prisma.invoice.create({
        data: {
          tenantId: body.tenantId,
          clientId: body.clientId,
          invoiceNumber: `INV-${Date.now()}`,
          totalAmount,
          status: "UNPAID",
          items: { create: lineItems },
        },
        include: { items: true },
      });
    } catch (error) {
      throw new BadRequestException("Failed to create invoice");
    }
  }

  @Post("payments")
  @RequirePermissions(Permissions.BillingRead)
  async createPayment(@Body() body: CreatePaymentDto) {
    try {
      const payment = await this.prisma.paymentTransaction.create({
        data: {
          tenantId: body.tenantId,
          invoiceId: body.invoiceId,
          amount: body.amount,
          method: body.method,
          transactionId: body.transactionId,
          status: "INITIATED"
        },
      });

      const invoice = await this.prisma.invoice.findUnique({ where: { id: body.invoiceId } });
      if (invoice && Number(body.amount) >= Number(invoice.totalAmount)) {
        await this.prisma.invoice.update({
          where: { id: body.invoiceId },
          data: { status: "PAID", paidAt: new Date() }
        });
      }

      return payment;
    } catch (error) {
      throw new BadRequestException("Failed to create payment");
    }
  }
}

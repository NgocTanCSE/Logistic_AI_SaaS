import { Controller, Get, Post, Body, UseGuards, Request, NotFoundException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { StripeService } from "../payments/stripe.service";
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Tenant Billing')
@Controller("tenant/billing")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantBillingController {
  constructor(private readonly prisma: PrismaService, private readonly stripeService: StripeService) {}

  @Get("plan")
  @RequirePermissions(Permissions.BillingRead)
  async getPlan(@Request() req: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: { planId: true },
    });
    if (!tenant?.planId) {
      return { plan: null };
    }
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: tenant.planId },
      select: {
        id: true,
        name: true,
        code: true,
        priceMonthly: true,
        maxUsers: true,
        maxWarehouses: true,
        maxVehicles: true,
        featuresJson: true,
        isActive: true,
        // description omitted for compatibility
      },
    });
    return { plan: plan ?? null };
  }

   @Get("invoices")
   @RequirePermissions(Permissions.BillingRead)
   async getInvoices(@Request() req: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: { planId: true },
    });
    let planName: string | null = null;
    if (tenant?.planId) {
      const planRec = await this.prisma.subscriptionPlan.findUnique({
        where: { id: tenant.planId },
        select: { name: true },
      });
      planName = planRec?.name ?? null;
    }

    const invoices = await this.prisma.tenantClient.invoice.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { issuedAt: "desc" },
    });

    // Map to shape expected by frontend
    return invoices.map(inv => ({
      id: inv.id,
      planName: planName,
      amount: Number(inv.totalAmount),
      dueDate: inv.dueAt,
      status: inv.status,
    }));
    }
    @Post("payments")
    @RequirePermissions(Permissions.BillingRead)
    async payInvoice(@Request() req: any, @Body() body: any) {
        const { invoiceId, amount, method, transactionId } = body;
        const tenantId = req.tenantId;
        const payment = await this.prisma.tenantClient.paymentTransaction.create({
            data: { tenantId, invoiceId, amount, method, transactionId, status: "INITIATED" },
        });
        const invoice = await this.prisma.tenantClient.invoice.findUnique({ where: { id: invoiceId } });
        if (invoice && Number(amount) >= Number(invoice.totalAmount)) {
            await this.prisma.tenantClient.invoice.update({
                where: { id: invoiceId },
                data: { status: "PAID", paidAt: new Date() },
            });
        }
        return payment;
    }
    @Post("payment-intent")
    @RequirePermissions(Permissions.BillingRead)
    async createPaymentIntent(@Request() req: any, @Body() body: any) {
        const { invoiceId } = body;
        const invoice = await this.prisma.tenantClient.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }
        const amountCents = Math.round(Number(invoice.totalAmount) * 100);
        const clientSecret = await this.stripeService.createPaymentIntent(amountCents, 'usd', {
            invoiceId,
            tenantId: req.tenantId,
        });
        return { clientSecret };
    }
}

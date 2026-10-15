import { Body, Controller, Get, Param, Post, UseGuards, NotFoundException, BadRequestException, Request } from "@nestjs/common"
import { Permissions, PermissionsGuard, RequirePermissions } from "shared-types"
import { InvoicePayDto } from "../dtos/invoice-pay.dto"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { PrismaService } from "../prisma/prisma.service"
import { ApiTags } from "@nestjs/swagger"

@ApiTags('Client Invoices')
@Controller("client/invoices")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientInvoicesController {
  constructor(private readonly prisma: PrismaService) {}

  private async getClientId(req: any): Promise<string> {
    const email = req.user?.email;
    if (!email) throw new NotFoundException("User email not found in token");
    
    const clientUser = await this.prisma.tenantClient.clientUser.findFirst({
      where: { email },
    });

    if (!clientUser) {
      throw new NotFoundException("Client account not found for this user");
    }

    return clientUser.clientId;
  }

  @Get()
  @RequirePermissions(Permissions.BillingRead)
  async list(@Request() req: any) {
    const clientId = await this.getClientId(req);
    return this.prisma.tenantClient.invoice.findMany({
      where: { clientId },
      include: { items: true, payments: true },
      orderBy: { issuedAt: 'desc' },
      take: 50,
    });
  }

  @Post(":id/pay")
  @RequirePermissions(Permissions.BillingRead)
  async pay(@Param("id") id: string, @Body() body: InvoicePayDto, @Request() req: any) {
    const clientId = await this.getClientId(req);

    const invoice = await this.prisma.tenantClient.invoice.findFirst({
      where: { id, clientId },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException("Invoice is already paid");
    }

    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      const payment = await tx.paymentTransaction.create({
        data: {
          tenantId: invoice.tenantId,
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          method: body.method || 'CARD',
          status: 'COMPLETED',
          transactionId: `TXN-${Date.now()}`,
        },
      });

      await tx.invoice.update({
        where: { id },
        data: { status: 'PAID', paidAt: new Date() },
      });

      return { ok: true, payment };
    });
  }
}


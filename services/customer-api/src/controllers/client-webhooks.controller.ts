import { Body, Controller, Get, Post, Request, UseGuards, NotFoundException, BadRequestException, Delete, Param } from "@nestjs/common"
import { Permissions, PermissionsGuard, RequirePermissions } from "shared-types"
import { WebhookCreateDto } from "../dtos/webhook-create.dto"
import { PrismaService } from "../prisma/prisma.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { ApiTags } from "@nestjs/swagger"

@ApiTags('Client Webhooks')
@Controller("client/webhooks")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientWebhooksController {
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
  @RequirePermissions(Permissions.OrdersRead)
  async list(@Request() req: any) {
    const clientId = await this.getClientId(req);
    return this.prisma.tenantClient.clientWebhook.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Post()
  @RequirePermissions(Permissions.OrdersCreate)
  async create(@Body() body: WebhookCreateDto, @Request() req: any) {
    const clientId = await this.getClientId(req);

    if (!body.url || !body.url.startsWith('https://')) {
      throw new BadRequestException("Webhook URL must be a valid HTTPS URL");
    }

    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      throw new BadRequestException("At least one event must be subscribed to");
    }

    // Kiểm tra giới hạn số lượng webhook (VD: max 10 webhooks per client)
    const count = await this.prisma.tenantClient.clientWebhook.count({ where: { clientId } });
    if (count >= 10) {
      throw new BadRequestException("Maximum webhook limit reached (10)");
    }

    return this.prisma.tenantClient.clientWebhook.create({
      data: {
        clientId,
        url: body.url,
        secretToken: `whsec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        events: JSON.stringify(body.events),
        isActive: true,
      }
    });
  }

  @Delete(":id")
  @RequirePermissions(Permissions.OrdersCreate)
  async remove(@Param("id") id: string, @Request() req: any) {
    const clientId = await this.getClientId(req);

    const webhook = await this.prisma.tenantClient.clientWebhook.findFirst({
      where: { id, clientId }
    });

    if (!webhook) {
      throw new NotFoundException("Webhook not found");
    }

    await this.prisma.tenantClient.clientWebhook.delete({
      where: { id }
    });

    return { ok: true, message: "Webhook deleted successfully" };
  }
}

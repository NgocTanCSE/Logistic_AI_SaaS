import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, NotFoundException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Webhooks")
@Controller("webhooks")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WebhooksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.SettingsManage)
  async listWebhooks(@Request() req: any) {
    const clientId = req.user?.client_id;
    if (!clientId) {
      return this.prisma.tenantClient.clientWebhook.findMany({
        orderBy: { id: 'desc' },
        take: 50,
      });
    }
    return this.prisma.tenantClient.clientWebhook.findMany({
      where: { clientId },
      orderBy: { id: 'desc' },
    });
  }

  @Post()
  @RequirePermissions(Permissions.SettingsManage)
  async registerWebhook(@Body() body: { clientId: string, url: string, events: string[] }) {
    if (!body.url || !body.url.startsWith('https://')) {
      throw new NotFoundException("Webhook URL must be a valid HTTPS URL");
    }

    return this.prisma.tenantClient.clientWebhook.create({
      data: {
        clientId: body.clientId,
        url: body.url,
        events: JSON.stringify(body.events),
        secretToken: `whsec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        isActive: true,
      }
    });
  }

  @Delete(":id")
  @RequirePermissions(Permissions.SettingsManage)
  async removeWebhook(@Param("id") id: string) {
    const webhook = await this.prisma.tenantClient.clientWebhook.findUnique({ where: { id } });
    if (!webhook) {
      throw new NotFoundException("Webhook not found");
    }
    await this.prisma.tenantClient.clientWebhook.delete({ where: { id } });
    return { ok: true, message: "Webhook deleted" };
  }
}

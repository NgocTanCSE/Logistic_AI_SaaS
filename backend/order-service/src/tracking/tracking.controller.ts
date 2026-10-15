import { Controller, Post, Body, UseGuards, Logger } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Tracking")
@Controller("tracking")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService
  ) {}

  @Post("events")
  @RequirePermissions(Permissions.OrdersCreate)
  async addEvent(@Body() body: { orderId: string, status: string, location: string, description: string }) {
    return await this.prisma.tenantClient.$transaction(async (tx: any) => {
      // 1. Táº¡o sá»± kiá»‡n tracking
      const event = await tx.orderTrackingEvent.create({ data: body });
      
      // 2. Cáº­p nháº­t tráº¡ng thĂ¡i Ä‘Æ¡n hĂ ng
      const order = await tx.order.update({ 
        where: { id: body.orderId }, 
        data: { status: body.status } 
      });

      // 3. Dispatch Webhooks (Fire and Forget or Async)
      this.dispatchWebhooks(order.clientId, event);

      return event;
    });
  }

  private async dispatchWebhooks(clientId: string, event: any) {
    if (!clientId) return;

    // TĂ¬m cĂ¡c webhook Ä‘Äƒng kĂ½ cho client nĂ y
    const webhooks = await this.prisma.tenantClient.clientWebhook.findMany({
      where: { clientId, isActive: true }
    });

    for (const webhook of webhooks) {
      // Kiá»ƒm tra xem sá»± kiá»‡n cĂ³ náº±m trong danh sĂ¡ch Ä‘Äƒng kĂ½ khĂ´ng
      if (webhook.events.includes(event.status) || webhook.events.includes('*')) {
        try {
          this.logger.log(`đŸ“¡ Dispatching webhook to ${webhook.url} for Order ${event.orderId}`);
          
          // Gá»­i request HTTP thá»±c táº¿
          await firstValueFrom(
            this.httpService.post(webhook.url, {
              trackingCode: event.orderId, // Should ideally be trackingCode from order
              status: event.status,
              location: event.location,
              description: event.description,
              timestamp: event.timestamp
            }, {
              headers: { 'X-SLG-Signature': webhook.secretToken || 'unsigned' }
            })
          );
        } catch (error: any) {
          this.logger.error(`âŒ Webhook dispatch failed for ${webhook.url}: ${error.message}`);
          // Trong thá»±c táº¿, ta nĂªn lÆ°u vĂ o báº£ng WebhookLogs Ä‘á»ƒ retry
        }
      }
    }
  }
}

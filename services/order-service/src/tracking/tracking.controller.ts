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
      // 1. Tạo sự kiện tracking
      const event = await tx.orderTrackingEvent.create({ data: body });
      
      // 2. Cập nhật trạng thái đơn hàng
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

    // Tìm các webhook đăng ký cho client này
    const webhooks = await this.prisma.tenantClient.clientWebhook.findMany({
      where: { clientId, isActive: true }
    });

    for (const webhook of webhooks) {
      // Kiểm tra xem sự kiện có nằm trong danh sách đăng ký không
      if (webhook.events.includes(event.status) || webhook.events.includes('*')) {
        try {
          this.logger.log(`📡 Dispatching webhook to ${webhook.url} for Order ${event.orderId}`);
          
          // Gửi request HTTP thực tế
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
          this.logger.error(`❌ Webhook dispatch failed for ${webhook.url}: ${error.message}`);
          // Trong thực tế, ta nên lưu vào bảng WebhookLogs để retry
        }
      }
    }
  }
}

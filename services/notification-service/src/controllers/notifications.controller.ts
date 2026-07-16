import { Controller, Post, Get, Put, Body, Request, UseGuards, BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { IsString, IsArray, IsOptional } from "class-validator";
import { NotificationService } from "../services/notification.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiTags } from "@nestjs/swagger";

class SendNotificationDto {
  @IsString()
  type!: string;

  payload: any;
}

class MarkAsReadDto {
  @IsArray()
  notificationIds!: string[];
}

@ApiTags('Notifications')
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService
  ) {}

  @Post("send")
  async sendNotification(@Body() body: SendNotificationDto) {
    try {
      if (body.type === "EMAIL") {
        return await this.notificationService.sendEmail(body.payload.to, body.payload.subject, body.payload.body, body.payload.userId);
      }
      else if (body.type === "SMS") {
        return await this.notificationService.sendSms(body.payload.phone, body.payload.message, body.payload.userId);
      }
      else if (body.type === "PUSH") {
        return await this.notificationService.sendPush(body.payload.userId, body.payload.title, body.payload.body);
      }
      else if (body.type === "WEBHOOK") {
        const webhookUrl = process.env.WEBHOOK_SERVICE_URL || "http://webhook-service:8092";
        const response = await fetch(`${webhookUrl}/deliver`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body.payload)
        });
        if (response.ok) {
          return { ok: true, message: "Webhook delegated" };
        } else {
          return { ok: false, message: "Failed to delegate webhook" };
        }
      }

      return { ok: false, error: "Unsupported notification type" };
    } catch (error) {
      throw new InternalServerErrorException("Failed to send notification");
    }
  }

  @Get()
  async getMyNotifications(@Request() req: any) {
    const userId = req.user?.sub || req.headers['x-user-id'];
    if (!userId) {
      throw new BadRequestException("Missing userId context");
    }

    try {
      const notifications = await this.prisma.tenantClient.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return { ok: true, data: notifications };
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch notifications");
    }
  }

  @Get("unread-count")
  async getUnreadCount(@Request() req: any) {
    const userId = req.user?.sub || req.headers['x-user-id'];
    if (!userId) {
      throw new BadRequestException("Missing userId context");
    }

    try {
      const count = await this.prisma.tenantClient.notification.count({
        where: { userId, isRead: false }
      });

      return { ok: true, count };
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch unread count");
    }
  }

  @Put("read")
  async markAsRead(@Body() body: MarkAsReadDto, @Request() req: any) {
    const userId = req.user?.sub || req.headers['x-user-id'];
    if (!userId) {
      throw new BadRequestException("Missing userId context");
    }

    if (!body.notificationIds || body.notificationIds.length === 0) {
      throw new BadRequestException("notificationIds array is required");
    }

    try {
      const result = await this.prisma.tenantClient.notification.updateMany({
        where: {
          id: { in: body.notificationIds },
          userId: userId
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return { ok: true, message: `Marked ${result.count} notifications as read` };
    } catch (error) {
      throw new InternalServerErrorException("Failed to mark notifications as read");
    }
  }

  @Put("read-all")
  async markAllAsRead(@Request() req: any) {
    const userId = req.user?.sub || req.headers['x-user-id'];
    if (!userId) {
      throw new BadRequestException("Missing userId context");
    }

    try {
      const result = await this.prisma.tenantClient.notification.updateMany({
        where: { userId, isRead: false },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return { ok: true, message: `Marked ${result.count} notifications as read` };
    } catch (error) {
      throw new InternalServerErrorException("Failed to mark all notifications as read");
    }
  }
}

import { Controller, Get, Param, NotFoundException, UseInterceptors } from "@nestjs/common";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { Throttle } from "@nestjs/throttler";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Public Tracking')
@Controller("public")
@UseInterceptors(CacheInterceptor)
export class PublicTrackingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("track/:trackingCode")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async track(@Param("trackingCode") trackingCode: string) {
    const order = await this.prisma.tenantClient.order.findUnique({
      where: { trackingCode },
      include: { events: { orderBy: { timestamp: "desc" } } }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return {
      trackingCode: order.trackingCode,
      status: order.status,
      recipientName: order.recipientName.substring(0, 1) + "***",
      shippingFee: order.shippingFee,
      events: order.events,
    };
  }

  @Get("verify/:trackingCode")
  async verify(@Param("trackingCode") trackingCode: string) {
    const order = await this.prisma.tenantClient.order.findUnique({
      where: { trackingCode },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const deliveries = await this.prisma.tenantClient.delivery.findMany({
      where: { orderId: order.id },
      orderBy: { syncVersion: "desc" },
      take: 1
    });

    if (deliveries.length === 0) {
      return { ok: false, message: "No delivery info found" };
    }

    const delivery = deliveries[0];
    return {
      ok: true,
      podImageUrl: delivery.podImageUrl,
      podSignatureUrl: delivery.podSignatureUrl,
      checkinLat: delivery.checkinLat,
      checkinLng: delivery.checkinLng,
      status: delivery.status,
    };
  }
}

@Controller("track")
@UseInterceptors(CacheInterceptor)
export class TrackingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":trackingCode")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async track(@Param("trackingCode") trackingCode: string) {
    const order = await this.prisma.tenantClient.order.findUnique({
      where: { trackingCode },
      include: { events: { orderBy: { timestamp: "desc" } } }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return {
      trackingCode: order.trackingCode,
      status: order.status,
      recipientName: order.recipientName.substring(0, 1) + "***",
      shippingFee: order.shippingFee,
      events: order.events,
    };
  }
}

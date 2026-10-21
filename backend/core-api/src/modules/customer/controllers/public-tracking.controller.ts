import { Controller, Get, Param, NotFoundException, UseInterceptors } from "@nestjs/common";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { Throttle } from "@nestjs/throttler";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Public Tracking')
@Controller("public")
@UseInterceptors(CacheInterceptor)
export class PublicTrackingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("track/:trackingCode")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async track(@Param("trackingCode") trackingCode: string) {
    // Public tracking is a cross-tenant lookup: the visitor only knows the
    // tracking code, not the tenant. It therefore runs on the platform path
    // (row-level security lifted) instead of a tenant scope.
    const order = await this.prisma.runAsPlatform<any>((db) =>
      db.order.findUnique({
        where: { trackingCode },
        include: { events: { orderBy: { timestamp: "desc" } } }
      }),
    );

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
    const { order, delivery } = await this.prisma.runAsPlatform<any>(async (db) => {
      const found = await db.order.findUnique({
        where: { trackingCode },
      });
      if (!found) {
        return { order: null, delivery: null };
      }
      const deliveries = await db.delivery.findMany({
        where: { orderId: found.id },
        orderBy: { syncVersion: "desc" },
        take: 1
      });
      return { order: found, delivery: deliveries[0] ?? null };
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (!delivery) {
      return { ok: false, message: "No delivery info found" };
    }

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
    const order = await this.prisma.runAsPlatform<any>((db) =>
      db.order.findUnique({
        where: { trackingCode },
        include: { events: { orderBy: { timestamp: "desc" } } }
      }),
    );

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

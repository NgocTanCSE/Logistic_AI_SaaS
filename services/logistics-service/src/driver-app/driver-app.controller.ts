import { Controller, Get, Post, Body, Param, UseGuards, Request, Inject, NotFoundException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { LogisticsService } from "../services/logistics.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Driver App')
@Controller("driver-app")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DriverAppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logisticsService: LogisticsService
  ) {}

  @Get("profile")
  @RequirePermissions(Permissions.TripsRead)
  async getProfile(@Request() req: any) {
    const driver = await this.prisma.tenantClient.driver.findUnique({
      where: { userId: req.user?.sub },
      include: { user: { select: { id: true, email: true, fullName: true, phone: true } } },
    })
    if (!driver) throw new NotFoundException("Driver not found")
    return {
      id: driver.id,
      userId: driver.userId,
      fullName: driver.user.fullName,
      email: driver.user.email,
      phone: driver.user.phone,
      licenseClass: driver.licenseClass,
      licenseExpiry: driver.licenseExpiry,
      status: driver.status,
    }
  }

  @Post("deliveries/:id/check-in")
  @RequirePermissions(Permissions.MobileUploads)
  async checkIn(@Param("id") id: string, @Body() body: { lat: number, lng: number }) {
    return this.prisma.tenantClient.delivery.update({
      where: { id },
      data: {
        checkinLat: body.lat,
        checkinLng: body.lng,
        status: "ARRIVED",
      }
    });
  }

  @Post("deliveries/:id/complete")
  @RequirePermissions(Permissions.MobileUploads)
  async completeDelivery(@Param("id") id: string, @Body() body: { codCollected: number, podUrl?: string, syncVersion: number }) {
    return this.logisticsService.completeDelivery(id, body);
  }

  @Post("expenses")
  @RequirePermissions(Permissions.MobileUploads)
  async reportExpense(@Body() body: any, @Request() req: any) {
    const driver = await this.prisma.tenantClient.driver.findUnique({ where: { userId: req.user?.sub } });
    if (!driver) throw new NotFoundException("Driver not found");

    return this.prisma.tenantClient.driverExpense.create({
      data: {
        driverId: driver.id,
        tripId: body.tripId,
        amount: body.amount,
        category: body.category,
        note: body.note,
      }
    });
  }

  @Post("sos")
  @RequirePermissions(Permissions.MobileSos)
  async triggerSos(@Body() body: any, @Request() req: any) {
    const driver = await this.prisma.tenantClient.driver.findUnique({ where: { userId: req.user?.sub } });
    if (!driver) throw new NotFoundException("Driver not found");

    return this.prisma.tenantClient.sosAlert.create({
      data: {
        driverId: driver.id,
        tripId: body.tripId,
        message: body.message,
      }
    });
  }

  @Post("remittance")
  @RequirePermissions(Permissions.MobileUploads)
  async createRemittance(@Body() body: any, @Request() req: any) {
    const driver = await this.prisma.tenantClient.driver.findUnique({ where: { userId: req.user?.sub } });
    if (!driver) throw new NotFoundException("Driver not found");

    return this.logisticsService.createRemittance({
      driverId: driver.id,
      totalCod: body.totalCod,
      expenses: body.expenses,
      amount: body.amount
    });
  }
}

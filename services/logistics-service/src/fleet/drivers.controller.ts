import { Controller, Get, Post, Patch, Param, Body, UseGuards, BadRequestException, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Drivers')
@Controller("drivers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DriversController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @RequirePermissions(Permissions.TenantsManage)
  async createDriver(@Body() body: any) {
    let { userId, licenseClass, licenseExpiry } = body;
    if (!userId) {
      const anyUser = await this.prisma.tenantClient.tenantUser.findFirst({
        where: {
          driver: null,
          status: 'ACTIVE'
        }
      });
      if (!anyUser) throw new NotFoundException('userId is required and no available user found.');
      userId = anyUser.id;
    }
    if (!licenseClass) licenseClass = body.licenseNumber ? "B2" : "C";
    if (!licenseExpiry) {
      licenseExpiry = new Date();
      licenseExpiry.setFullYear(licenseExpiry.getFullYear() + 5);
    }
    const expiryDate = new Date(licenseExpiry);
    if (expiryDate < new Date()) {
      throw new BadRequestException("License expiry date cannot be in the past");
    }

    return this.prisma.tenantClient.driver.create({
      data: {
        userId,
        licenseClass,
        licenseExpiry: expiryDate,
        status: "OFFLINE",
      }
    });
  }

  @Get()
  @RequirePermissions(Permissions.TripsRead)
  async listDrivers() {
    const drivers = await this.prisma.tenantClient.driver.findMany({
      include: {
        user: true,
        trips: {
          where: { status: 'IN_PROGRESS' },
          include: { vehicle: true }
        }
      }
    });

    return drivers.map((d: any) => {
      const activeTrip = d.trips && d.trips.length > 0 ? d.trips[0] : null;
      return {
        id: d.id,
        name: d.user?.fullName || 'Unknown Driver',
        phone: d.user?.phone || d.user?.email || 'N/A',
        licenseNumber: d.licenseClass + '-' + d.id.substring(0, 6).toUpperCase(),
        status: d.status,
        vehicleAssigned: activeTrip?.vehicle?.plateNumber || undefined,
        currentLocation: d.lastKnownLocation || undefined
      };
    });
  }

  @Get(":id")
  @RequirePermissions(Permissions.TripsRead)
  async getDriver(@Param("id") id: string) {
    try {
      const driver = await this.prisma.tenantClient.driver.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, email: true, fullName: true, phone: true, status: true } },
          trips: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      });
      if (!driver) throw new NotFoundException(`Driver ${id} not found`);
      return driver;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to fetch driver");
    }
  }

  @Patch(":id")
  @RequirePermissions(Permissions.TenantsManage)
  async updateDriver(@Param("id") id: string, @Body() body: { licenseClass?: string; licenseExpiry?: string; status?: string }) {
    try {
      const driver = await this.prisma.tenantClient.driver.findUnique({ where: { id } });
      if (!driver) throw new NotFoundException(`Driver ${id} not found`);
      return await this.prisma.tenantClient.driver.update({ where: { id }, data: body });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to update driver");
    }
  }
}

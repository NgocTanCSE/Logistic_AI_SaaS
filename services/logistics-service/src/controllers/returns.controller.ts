import { Body, Controller, Get, Param, Post, Patch, Query, UseGuards, Logger, InternalServerErrorException, NotFoundException, BadRequestException } from "@nestjs/common"
import { Permissions, PermissionsGuard, RequirePermissions } from "shared-types"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { LogisticsService } from "../services/logistics.service"
import { PrismaService } from "../prisma/prisma.service"
import { ApiTags } from "@nestjs/swagger"

@ApiTags('Returns')
@Controller("logistics/returns")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReturnsController {
  private readonly logger = new Logger("ReturnsController")

  constructor(
    private readonly prisma: PrismaService,
    private readonly logisticsService: LogisticsService
  ) {}

  @Get()
  @RequirePermissions(Permissions.ReturnsRead)
  async listReturnRequests(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("status") status?: string
  ) {
    try {
      const skip = (Number(page) - 1) * Number(limit)
      const take = Number(limit)
      const where: any = {}
      if (status) where.status = status

      const [data, total] = await Promise.all([
        this.prisma.tenantClient.returnRequest.findMany({
          where,
          skip,
          take,
          include: {
            order: { select: { trackingCode: true, recipientName: true } },
            reason: true,
            items: true,
            pickupDriver: { include: { user: { select: { fullName: true } } } },
          },
          orderBy: { createdAt: "desc" }
        }),
        this.prisma.tenantClient.returnRequest.count({ where })
      ])

      return {
        data,
        meta: { total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) }
      }
    } catch (error) {
      this.logger.error(`Failed to list return requests: ${error instanceof Error ? error.message : "Unknown"}`)
      throw new InternalServerErrorException("Failed to list return requests")
    }
  }

  @Get(":id")
  @RequirePermissions(Permissions.ReturnsRead)
  async getReturnRequest(@Param("id") id: string) {
    try {
      const request = await this.prisma.tenantClient.returnRequest.findUnique({
        where: { id },
        include: {
          order: true,
          reason: true,
          items: { include: { orderItem: { include: { product: true } } } },
          inspections: true,
          refunds: true,
          pickupTrip: true,
          pickupDriver: { include: { user: true } },
        }
      })
      if (!request) throw new NotFoundException(`Return request ${id} not found`)
      return request
    } catch (error) {
      if (error instanceof NotFoundException) throw error
      throw new InternalServerErrorException("Failed to fetch return request")
    }
  }

  @Post(":id/create-pickup-trip")
  @RequirePermissions(Permissions.ReturnsApprove)
  async createPickupTrip(
    @Param("id") id: string,
    @Body() body: { driverId: string; vehicleId?: string; scheduledAt?: string }
  ) {
    try {
      const request = await this.prisma.tenantClient.returnRequest.findUnique({
        where: { id },
        include: { order: true, items: true }
      })
      if (!request) throw new NotFoundException(`Return request ${id} not found`)
      if (request.status !== "APPROVED" && request.status !== "PICKUP_SCHEDULED") {
        throw new BadRequestException(`Cannot create pickup trip for return with status ${request.status}`)
      }

      return await this.prisma.tenantClient.$transaction(async (tx: any) => {
        const trip = await tx.trip.create({
          data: {
            tripCode: `RMA-${request.returnCode}`,
            status: "NEW",
            driverId: body.driverId,
            vehicleId: body.vehicleId,
            metadata: JSON.stringify({ returnRequestId: id, type: "return_pickup" })
          }
        })

        await tx.returnRequest.update({
          where: { id },
          data: {
            pickupTripId: trip.id,
            pickupDriverId: body.driverId,
            pickupScheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
            status: "PICKUP_SCHEDULED"
          }
        })

        return trip
      })
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error
      this.logger.error(`Failed to create pickup trip: ${error instanceof Error ? error.message : "Unknown"}`)
      throw new InternalServerErrorException("Failed to create pickup trip")
    }
  }

  @Post(":id/confirm-pickup")
  @RequirePermissions(Permissions.ReturnsApprove)
  async confirmPickup(@Param("id") id: string) {
    try {
      const request = await this.prisma.tenantClient.returnRequest.findUnique({
        where: { id },
        include: { pickupTrip: true, order: true }
      })
      if (!request) throw new NotFoundException(`Return request ${id} not found`)
      if (request.status !== "PICKUP_SCHEDULED" && request.status !== "APPROVED") {
        throw new BadRequestException(`Cannot confirm pickup for return with status ${request.status}`)
      }

      return await this.prisma.tenantClient.$transaction(async (tx: any) => {
        const updated = await tx.returnRequest.update({
          where: { id },
          data: { status: "PICKED_UP", pickedUpAt: new Date() }
        })

        if (request.pickupTripId) {
          await tx.trip.update({
            where: { id: request.pickupTripId },
            data: { status: "COMPLETED", returnTime: new Date() }
          })
        }

        await tx.orderTrackingEvent.create({
          data: {
            orderId: request.orderId,
            status: "RETURN_PICKED_UP",
            description: `Items picked up for return ${request.returnCode}`
          }
        })

        return updated
      })
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error
      this.logger.error(`Failed to confirm pickup: ${error instanceof Error ? error.message : "Unknown"}`)
      throw new InternalServerErrorException("Failed to confirm pickup")
    }
  }

  @Post(":id/complete-return")
  @RequirePermissions(Permissions.ReturnsInspect)
  async completeReturn(
    @Param("id") id: string,
    @Body() body: { warehouseId: string; binId?: string }
  ) {
    try {
      const request = await this.prisma.tenantClient.returnRequest.findUnique({
        where: { id },
        include: { order: { include: { items: true } }, items: true }
      })
      if (!request) throw new NotFoundException(`Return request ${id} not found`)
      if (request.status !== "INSPECTED" && request.status !== "PICKED_UP") {
        throw new BadRequestException(`Cannot complete return with status ${request.status}`)
      }

      return await this.prisma.tenantClient.$transaction(async (tx: any) => {
        const updated = await tx.returnRequest.update({
          where: { id },
          data: { status: "CLOSED" }
        })

        for (const returnItem of request.items) {
          if (returnItem.quantityApproved && returnItem.quantityApproved > 0) {
            await tx.orderItem.updateMany({
              where: { orderId: request.orderId, productId: returnItem.productId },
              data: { returnedQuantity: { increment: returnItem.quantityApproved } }
            })
          }
        }

        await tx.orderTrackingEvent.create({
          data: {
            orderId: request.orderId,
            status: "RETURNED",
            description: `Return ${request.returnCode} completed at warehouse ${body.warehouseId}`
          }
        })

        return updated
      })
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error
      this.logger.error(`Failed to complete return: ${error instanceof Error ? error.message : "Unknown"}`)
      throw new InternalServerErrorException("Failed to complete return")
    }
  }
}

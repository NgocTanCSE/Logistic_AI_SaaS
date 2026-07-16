import { Controller, Get, Post, Patch, Body, Param, UseGuards, Logger, InternalServerErrorException, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types"
import { PrismaService } from "../prisma/prisma.service"
import { KafkaEventService } from "../services/kafka-event.service"
import { ApiTags } from "@nestjs/swagger"

@ApiTags("Returns")
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReturnsController {
  private readonly logger = new Logger("ReturnsController")

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaEvent: KafkaEventService
  ) {}

  private generateReturnCode(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const randomSuffix = Math.floor(Math.random() * 100000).toString().padStart(5, "0")
    return `RMA-${dateStr}-${randomSuffix}`
  }

  @Post("orders/:orderId/return-requests")
  @RequirePermissions(Permissions.ReturnsCreate)
  async createReturnRequest(
    @Param("orderId") orderId: string,
    @Body() body: { reasonId?: string; reasonNote?: string; returnType?: string; items: { productId: string; quantity: number }[] }
  ) {
    try {
      const order = await this.prisma.tenantClient.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      })
      if (!order) throw new NotFoundException(`Order ${orderId} not found`)
      if (order.status === "CANCELLED" || order.status === "RETURNED") {
        throw new BadRequestException(`Cannot create return for order with status ${order.status}`)
      }

      if (!body.items || body.items.length === 0) {
        throw new BadRequestException("Return request must have at least one item")
      }

      return await this.prisma.tenantClient.$transaction(async (tx: any) => {
        const returnRequest = await tx.returnRequest.create({
          data: {
            returnCode: this.generateReturnCode(),
            orderId,
            reasonId: body.reasonId,
            reasonNote: body.reasonNote,
            returnType: body.returnType || "REFUND",
            status: "PENDING",
            items: {
              create: body.items.map((item: any) => ({
                productId: item.productId,
                quantityRequested: item.quantity,
              }))
            }
          },
          include: { items: true }
        })

        await tx.orderTrackingEvent.create({
          data: {
            orderId,
            status: "RETURN_REQUESTED",
            description: `Return request ${returnRequest.returnCode} created`
          }
        })

        this.kafkaEvent.emit("return.requested", returnRequest)

        return returnRequest
      })
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error
      this.logger.error(`Failed to create return request: ${error instanceof Error ? error.message : "Unknown"}`)
      throw new InternalServerErrorException("Failed to create return request")
    }
  }

  @Get("orders/:orderId/return-requests")
  @RequirePermissions(Permissions.ReturnsRead)
  async listReturnRequests(@Param("orderId") orderId: string) {
    try {
      const order = await this.prisma.tenantClient.order.findUnique({
        where: { id: orderId },
        select: { id: true }
      })
      if (!order) throw new NotFoundException(`Order ${orderId} not found`)

      return this.prisma.tenantClient.returnRequest.findMany({
        where: { orderId },
        include: { items: true, inspections: true, refunds: true },
        orderBy: { createdAt: "desc" }
      })
    } catch (error) {
      if (error instanceof NotFoundException) throw error
      throw new InternalServerErrorException("Failed to fetch return requests")
    }
  }

  @Get("return-requests/:id")
  @RequirePermissions(Permissions.ReturnsRead)
  async getReturnRequest(@Param("id") id: string) {
    try {
      const request = await this.prisma.tenantClient.returnRequest.findUnique({
        where: { id },
        include: { items: true, inspections: true, refunds: true, reason: true }
      })
      if (!request) throw new NotFoundException(`Return request ${id} not found`)
      return request
    } catch (error) {
      if (error instanceof NotFoundException) throw error
      throw new InternalServerErrorException("Failed to fetch return request")
    }
  }

  @Patch("return-requests/:id/approve")
  @RequirePermissions(Permissions.ReturnsApprove)
  async approveReturnRequest(
    @Param("id") id: string,
    @Body() body: { approvedItems?: { itemId: string; quantityApproved: number; unitRefundAmount: number }[] }
  ) {
    try {
      const request = await this.prisma.tenantClient.returnRequest.findUnique({
        where: { id },
        include: { items: true }
      })
      if (!request) throw new NotFoundException(`Return request ${id} not found`)
      if (request.status !== "PENDING") {
        throw new BadRequestException(`Cannot approve return with status ${request.status}`)
      }

      return await this.prisma.tenantClient.$transaction(async (tx: any) => {
        const updated = await tx.returnRequest.update({
          where: { id },
          data: {
            status: "APPROVED",
            approvedAt: new Date(),
            items: body.approvedItems ? {
              updateMany: body.approvedItems.map((item: any) => ({
                where: { id: item.itemId },
                data: {
                  quantityApproved: item.quantityApproved,
                  unitRefundAmount: item.unitRefundAmount
                }
              }))
            } : undefined
          },
          include: { items: true }
        })

        await tx.orderTrackingEvent.create({
          data: {
            orderId: request.orderId,
            status: "RETURN_APPROVED",
            description: `Return request ${request.returnCode} approved`
          }
        })

        this.kafkaEvent.emit("return.approved", updated)

        return updated
      })
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error
      this.logger.error(`Failed to approve return: ${error instanceof Error ? error.message : "Unknown"}`)
      throw new InternalServerErrorException("Failed to approve return request")
    }
  }

  @Patch("return-requests/:id/reject")
  @RequirePermissions(Permissions.ReturnsApprove)
  async rejectReturnRequest(
    @Param("id") id: string,
    @Body() body: { rejectionReason: string }
  ) {
    if (!body.rejectionReason) {
      throw new BadRequestException("Rejection reason is required")
    }

    try {
      const request = await this.prisma.tenantClient.returnRequest.findUnique({
        where: { id }
      })
      if (!request) throw new NotFoundException(`Return request ${id} not found`)
      if (request.status !== "PENDING") {
        throw new BadRequestException(`Cannot reject return with status ${request.status}`)
      }

      return await this.prisma.tenantClient.$transaction(async (tx: any) => {
        const updated = await tx.returnRequest.update({
          where: { id },
          data: {
            status: "REJECTED",
            rejectionReason: body.rejectionReason
          }
        })

        await tx.orderTrackingEvent.create({
          data: {
            orderId: request.orderId,
            status: "RETURN_REJECTED",
            description: `Return request ${request.returnCode} rejected: ${body.rejectionReason}`
          }
        })

        this.kafkaEvent.emit("return.rejected", updated)

        return updated
      })
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error
      this.logger.error(`Failed to reject return: ${error instanceof Error ? error.message : "Unknown"}`)
      throw new InternalServerErrorException("Failed to reject return request")
    }
  }

  @Post("return-requests/:id/pickup")
  @RequirePermissions(Permissions.ReturnsApprove)
  async assignReturnPickup(
    @Param("id") id: string,
    @Body() body: { pickupAddress: string; pickupLat?: number; pickupLng?: number; pickupDriverId: string; pickupScheduledAt: string }
  ) {
    try {
      const request = await this.prisma.tenantClient.returnRequest.findUnique({
        where: { id }
      })
      if (!request) throw new NotFoundException(`Return request ${id} not found`)
      if (request.status !== "APPROVED") {
        throw new BadRequestException(`Cannot schedule pickup for return with status ${request.status}`)
      }

      const updated = await this.prisma.tenantClient.returnRequest.update({
        where: { id },
        data: {
          status: "PICKUP_SCHEDULED",
          pickupAddress: body.pickupAddress,
          pickupLat: body.pickupLat,
          pickupLng: body.pickupLng,
          pickupDriverId: body.pickupDriverId,
          pickupScheduledAt: new Date(body.pickupScheduledAt)
        }
      })

      this.kafkaEvent.emit("return.pickup_scheduled", updated)

      return updated
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error
      this.logger.error(`Failed to assign pickup: ${error instanceof Error ? error.message : "Unknown"}`)
      throw new InternalServerErrorException("Failed to assign return pickup")
    }
  }

  @Post("return-requests/:id/inspect")
  @RequirePermissions(Permissions.ReturnsInspect)
  async inspectReturn(
    @Param("id") id: string,
    @Body() body: { condition: string; damageNotes?: string; imagesJson?: string; approvedRefund?: number; warehouseId?: string; binId?: string }
  ) {
    try {
      const request = await this.prisma.tenantClient.returnRequest.findUnique({
        where: { id }
      })
      if (!request) throw new NotFoundException(`Return request ${id} not found`)
      const allowedStatuses = ["PICKED_UP", "IN_TRANSIT"]
      if (!allowedStatuses.includes(request.status)) {
        throw new BadRequestException(`Cannot inspect return with status ${request.status}`)
      }

      return await this.prisma.tenantClient.$transaction(async (tx: any) => {
        await tx.returnInspection.create({
          data: {
            returnRequestId: id,
            condition: body.condition,
            damageNotes: body.damageNotes,
            imagesJson: body.imagesJson,
            approvedRefund: body.approvedRefund,
            warehouseId: body.warehouseId,
            binId: body.binId
          }
        })

        const updated = await tx.returnRequest.update({
          where: { id },
          data: { status: "INSPECTED" },
          include: { items: true, inspections: true }
        })

        await tx.orderTrackingEvent.create({
          data: {
            orderId: request.orderId,
            status: "RETURN_INSPECTED",
            description: `Return ${request.returnCode} inspected: ${body.condition}`
          }
        })

        return updated
      })
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error
      this.logger.error(`Failed to inspect return: ${error instanceof Error ? error.message : "Unknown"}`)
      throw new InternalServerErrorException("Failed to inspect return")
    }
  }

  @Post("return-requests/:id/refund")
  @RequirePermissions(Permissions.ReturnsRefund)
  async processRefund(
    @Param("id") id: string,
    @Body() body: { amount: number; method?: string; invoiceId?: string; transactionId?: string }
  ) {
    try {
      const request = await this.prisma.tenantClient.returnRequest.findUnique({
        where: { id },
        include: { refunds: true }
      })
      if (!request) throw new NotFoundException(`Return request ${id} not found`)
      if (request.status !== "INSPECTED" && request.status !== "APPROVED") {
        throw new BadRequestException(`Cannot process refund for return with status ${request.status}`)
      }

      if (!body.amount || body.amount <= 0) {
        throw new BadRequestException("Refund amount must be greater than 0")
      }

      const existingRefunds = request.refunds || []
      const totalRefunded = existingRefunds.reduce((sum: number, r: any) => sum + Number(r.amount), 0)
      if (totalRefunded + body.amount > Number(request.items?.reduce((sum: number, i: any) => sum + (Number(i.unitRefundAmount) * (i.quantityApproved || i.quantityRequested)), 0) || 0)) {
        throw new BadRequestException("Total refund amount exceeds eligible refund amount")
      }

      return await this.prisma.tenantClient.$transaction(async (tx: any) => {
        const refund = await tx.refund.create({
          data: {
            returnRequestId: id,
            invoiceId: body.invoiceId,
            amount: body.amount,
            method: body.method || "ORIGINAL",
            status: "PROCESSED",
            transactionId: body.transactionId,
            processedAt: new Date()
          }
        })

        const allRefunds = await tx.refund.findMany({ where: { returnRequestId: id } })
        const totalRefundedAfter = allRefunds.reduce((sum: number, r: any) => sum + Number(r.amount), 0)
        const eligibleAmount = Number(request.items?.reduce((sum: number, i: any) => sum + (Number(i.unitRefundAmount) * (i.quantityApproved || i.quantityRequested)), 0) || 0)

        if (totalRefundedAfter >= eligibleAmount) {
          await tx.returnRequest.update({
            where: { id },
            data: {
              status: "REFUNDED"
            }
          })
        }

        await tx.orderTrackingEvent.create({
          data: {
            orderId: request.orderId,
            status: "REFUND_PROCESSED",
            description: `Refund of ${body.amount} processed for return ${request.returnCode}`
          }
        })

        return refund
      })
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error
      this.logger.error(`Failed to process refund: ${error instanceof Error ? error.message : "Unknown"}`)
      throw new InternalServerErrorException("Failed to process refund")
    }
  }

  @Get("return-reasons")
  async listReturnReasons() {
    try {
      return this.prisma.tenantClient.returnReason.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" }
      })
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch return reasons")
    }
  }
}

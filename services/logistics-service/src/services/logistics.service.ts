import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { GeocodingService } from "./geocoding.service"

@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geocodingService: GeocodingService,
    @InjectQueue('routing') private routingQueue: Queue,
    private readonly httpService: HttpService,
  ) {}

  async listTrips(params: { page?: number; limit?: number }) {
    const skip = (Number(params.page || 1) - 1) * Number(params.limit || 20);
    const take = Number(params.limit || 20);

    const [data, total] = await Promise.all([
      this.prisma.tenantClient.trip.findMany({
        skip,
        take,
        include: { driver: { include: { user: true } }, vehicle: true },
        orderBy: { tripCode: 'desc' },
      }),
      this.prisma.tenantClient.trip.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page: params.page || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getUnassignedOrders() {
    return this.prisma.tenantClient.order.findMany({
      where: { status: 'PENDING', driverId: null },
      take: 50,
    });
  }

  async optimizeRouting(dto: any) {
    const orderIds = dto.orderIds || [];
    this.logger.log(` Báº¯t Ä‘áº§u táº¡o Job tá»‘i Æ°u lá»™ trĂ¬nh cho ${orderIds.length} Ä‘Æ¡n hĂ ng...`);

    // 1. Láº¥y thĂ´ng tin Ä‘Æ¡n hĂ ng
    const orders = await this.prisma.tenantClient.order.findMany({
      where: { id: { in: orderIds } },
    });

    // 2. Láº¥y thĂ´ng tin Ä‘á»™i xe
    const vehicles = await this.prisma.tenantClient.vehicle.findMany({
      where: { status: 'ACTIVE' },
      take: 10,
    });

    // 3. Chuáº©n bá»‹ payload vá»›i tá»a Ä‘á»™ thá»±c (Geocoding thá»±c táº¿ tá»« Ä‘á»‹a chá»‰)
    const locations = await Promise.all(orders.map(async (o: any) => {
      let lat = o.lat ? Number(o.lat) : null;
      let lng = o.lng ? Number(o.lng) : null;

      // Náº¿u thiáº¿u tá»a Ä‘á»™, thá»±c hiá»‡n Geocoding thá»±c táº¿
      if (!lat || !lng) {
        this.logger.log(`đŸŒ Äang Geocoding Ä‘á»‹a chá»‰: ${o.recipientAddress} cho Ä‘Æ¡n hĂ ng ${o.trackingCode}`);
        const coords = await this.geocodingService.geocode(o.recipientAddress);
        
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
          // LÆ°u láº¡i tá»a Ä‘á»™ vĂ o DB Ä‘á»ƒ dĂ¹ng cho láº§n sau (Cache)
          await this.prisma.tenantClient.order.update({
            where: { id: o.id },
            data: { lat, lng }
          });
        } else {
          // Fallback cuá»‘i cĂ¹ng náº¿u Geocode tháº¥t báº¡i: Ghim vá» trung tĂ¢m khu vá»±c (trĂ¡nh drift ngáº«u nhiĂªn quĂ¡ xa)
          this.logger.warn(` KhĂ´ng thá»ƒ geocode Ä‘á»‹a chá»‰: ${o.recipientAddress}. Sá»­ dá»¥ng tá»a Ä‘á»™ máº·c Ä‘á»‹nh.`);
          lat = 10.762622 + (Math.random() - 0.5) * 0.01; 
          lng = 106.660172 + (Math.random() - 0.5) * 0.01;
        }
      }

      return {
        id: o.id,
        lat,
        lng,
        demand: 1,
      };
    }));

    const payload = {
      locations,
      vehicles: vehicles.map((v: any) => ({
        id: v.id,
        capacity: Number(v.capacityKg) || 100,
      })),
      depot_index: 0,
    };

    payload.locations.unshift({
      id: 'DEPOT',
      lat: 10.762622,
      lng: 106.660172,
      demand: 0,
    });

    // 4. Táº¡o Job trong DB vá»›i tráº¡ng thĂ¡i PENDING
    const job = await this.prisma.tenantClient.routeOptimizationJob.create({
        data: {
          status: 'PENDING',
          payload: JSON.stringify(payload),
          result: JSON.stringify({}),
        },
    });

    // 5. Äáº©y vĂ o BullMQ
    await this.routingQueue.add('optimize', {
      jobId: job.id,
      payload,
    });

    this.logger.log(` Job ${job.id} Ä‘Ă£ Ä‘Æ°á»£c Ä‘Æ°a vĂ o Queue!`);

    // Tráº£ vá» ngay láº­p tá»©c cho Frontend
    return {
      ok: true,
      message: 'Routing optimization job queued successfully',
      jobId: job.id,
    };
  }
  async startTrip(id: string) {
    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw new NotFoundException(`Trip ${id} not found`);
      if (trip.status !== 'DISPATCHED') {
        throw new BadRequestException(`Cannot start trip that is not DISPATCHED (current: ${trip.status})`);
      }
      return tx.trip.update({
        where: { id },
        data: { status: 'IN_TRANSIT', departureTime: new Date() },
      });
    });
  }

  async completeTrip(id: string) {
    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw new NotFoundException(`Trip ${id} not found`);
      if (trip.status !== 'IN_TRANSIT') {
        throw new BadRequestException(`Cannot complete trip that is not IN_TRANSIT (current: ${trip.status})`);
      }
      return tx.trip.update({
        where: { id },
        data: { status: 'COMPLETED', returnTime: new Date() },
      });
    });
  }

  async updateTripStatus(id: string, status: string) {
    const allowedTransitions: Record<string, string[]> = {
      'DRAFT': ['NEW', 'CANCELLED'],
      'NEW': ['DISPATCHED', 'CANCELLED'],
      'DISPATCHED': ['IN_TRANSIT', 'CANCELLED'],
      'IN_TRANSIT': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': [],
    };
    const trip = await this.prisma.tenantClient.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException(`Trip ${id} not found`);
    const allowed = allowedTransitions[trip.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${trip.status} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`);
    }
    return this.prisma.tenantClient.trip.update({
      where: { id },
      data: { status },
    });
  }

  async dispatchTrip(id: string, driverId?: string, vehicleId?: string, targetStatus: string = 'DISPATCHED') {
    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      const trip = await tx.trip.findUnique({
        where: { id },
      });

      if (!trip) {
        throw new NotFoundException(`Trip with ID ${id} not found`);
      }

      if (trip.status !== 'NEW' && trip.status !== 'PENDING' && trip.status !== 'DRAFT') {
        throw new BadRequestException(`Trip is already in status ${trip.status} and cannot be dispatched again`);
      }

      if (driverId) {
        const driver = await tx.driver.findUnique({ where: { id: driverId } });
        if (!driver) throw new NotFoundException(`Driver ${driverId} not found`);
        
        if (driver.status !== 'ACTIVE' && driver.status !== 'ONLINE') {
          throw new BadRequestException(`Driver is not ACTIVE/ONLINE. Current status: ${driver.status}`);
        }

        if (driver.licenseExpiry < new Date()) {
          throw new BadRequestException(`Driver's license has expired since ${driver.licenseExpiry.toISOString()}`);
        }

        const activeTrip = await tx.trip.findFirst({
          where: {
            driverId,
            status: { in: ['ASSIGNED', 'DISPATCHED', 'IN_TRANSIT'] }
          }
        });
        if (activeTrip) {
          throw new BadRequestException(`Driver is already assigned to active trip ${activeTrip.tripCode}`);
        }
      }

      if (vehicleId) {
        const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle) throw new NotFoundException(`Vehicle ${vehicleId} not found`);

        if (vehicle.status !== 'ACTIVE') {
          throw new BadRequestException(`Vehicle is not ACTIVE. Current status: ${vehicle.status}`);
        }

        const activeTrip = await tx.trip.findFirst({
          where: {
            vehicleId,
            status: { in: ['ASSIGNED', 'DISPATCHED', 'IN_TRANSIT'] }
          }
        });
        if (activeTrip) {
          throw new BadRequestException(`Vehicle is already assigned to active trip ${activeTrip.tripCode}`);
        }
      }

      return tx.trip.update({
        where: { id },
        data: {
          driverId: driverId || trip.driverId,
          vehicleId: vehicleId || trip.vehicleId,
          status: targetStatus,
        },
      });
    });
  }

  async getRoutingJob(jobId: string) {
    const job = await this.prisma.tenantClient.routeOptimizationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Routing job ${jobId} not found`);
    }

    return job;
  }

  async applyRoutingJob(jobId: string) {
    const job = await this.prisma.tenantClient.routeOptimizationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Routing job ${jobId} not found`);
    }

    if (job.status !== 'COMPLETED') {
      throw new BadRequestException(`Routing job ${jobId} is not COMPLETED (current status: ${job.status})`);
    }

    const routes = job.result as any[];
    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      throw new BadRequestException(`Job ${jobId} has no valid routes to apply`);
    }

    this.logger.log(`đŸ› ï¸ Applying routing job ${jobId} with ${routes.length} routes...`);

    // DĂ¹ng transaction Ä‘á»ƒ Ä‘áº£m báº£o táº¡o Trips vĂ  Deliveries Ä‘á»“ng bá»™, khĂ´ng táº¡o ra data rĂ¡c náº¿u lá»—i giá»¯a chá»«ng
    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      let createdTripsCount = 0;

      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        const vehicleId = route.vehicle_id;
        const locations = route.route || [];

        // Lá»c ra cĂ¡c location lĂ  Ä‘Æ¡n hĂ ng (bá» qua DEPOT)
        const orderIds = locations
          .filter((loc: any) => loc.id && loc.id !== 'DEPOT')
          .map((loc: any) => loc.id);

        if (orderIds.length === 0) continue;

        // Táº¡o Trip má»›i
        const trip = await tx.trip.create({
          data: {
            tripCode: `TRIP-AI-${Date.now().toString().slice(-6)}-${i + 1}`,
            status: 'NEW',
            vehicleId: vehicleId !== 'UNKNOWN' && vehicleId ? vehicleId : null,
          },
        });
        createdTripsCount++;

        // Táº¡o Deliveries (stops) vĂ  Cáº­p nháº­t tráº¡ng thĂ¡i Orders
        let sequence = 1;
        for (const orderId of orderIds) {
          // Kiá»ƒm tra xem Order cĂ³ tá»“n táº¡i khĂ´ng
          const order = await tx.order.findUnique({ where: { id: orderId } });
          if (!order) {
            throw new NotFoundException(`Order ${orderId} in route not found. Aborting transaction.`);
          }

          // Cáº­p nháº­t Order status
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'DISPATCHED' },
          });

          // Táº¡o Delivery stop
await tx.delivery.create({
                data: {
                  tripId: trip.id,
                  orderId: orderId,
                  stopSequence: sequence++,
                  stopType: 'ORDER',
                  status: 'PENDING',
                },
              });
        }
      }

      // ÄĂ¡nh dáº¥u job Ä‘Ă£ apply
      await tx.routeOptimizationJob.update({
        where: { id: jobId },
        data: { status: 'APPLIED' },
      });

      return { ok: true, jobId, appliedRoutes: routes.length, createdTripsCount };
    });
  }

  // --- Delivery & Driver Methods ---

  async completeDelivery(id: string, data: { codCollected: number, podUrl?: string, syncVersion: number }) {
    return this.prisma.tenantClient.$transaction(async (tx: any) => {
      const delivery = await tx.delivery.findUnique({ where: { id } });
      if (!delivery) throw new NotFoundException(`Delivery ${id} not found`);

      // Offline Sync / Optimistic Locking Check
      if (data.syncVersion < delivery.syncVersion) {
        throw new ConflictException(`Sync conflict: Your data is stale (Version ${data.syncVersion} vs Server ${delivery.syncVersion}). Please refresh.`);
      }

      return tx.delivery.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          codAmountCollected: data.codCollected,
          podImageUrl: data.podUrl,
          syncVersion: delivery.syncVersion + 1,
        }
      });
    });
  }

  // --- Financial & Remittance Methods ---

  async createRemittance(data: { driverId: string, totalCod: number, expenses: number, amount: number }) {
    const expectedAmount = data.totalCod - data.expenses;
    if (Math.abs(expectedAmount - data.amount) > 0.01) {
      throw new BadRequestException(`Remittance amount (${data.amount}) does not match expected calculation (${data.totalCod} - ${data.expenses} = ${expectedAmount})`);
    }

    return this.prisma.tenantClient.codRemittance.create({
      data: {
        driverId: data.driverId,
        totalCodCollected: data.totalCod,
        totalExpensesDeducted: data.expenses,
        amountRemitted: data.amount,
        status: "PENDING",
        qrCodeToken: `REM-${Date.now()}`
      }
    });
  }

  async getRemittances(params: { driverId?: string, status?: string, page?: number, limit?: number }) {
    const skip = (Number(params.page || 1) - 1) * Number(params.limit || 20);
    const take = Number(params.limit || 20);
    const where: any = {};
    if (params.driverId) where.driverId = params.driverId;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.tenantClient.codRemittance.findMany({
        where,
        skip,
        take,
        include: { driver: { include: { user: true } } },
        orderBy: { id: 'desc' },
      }),
      this.prisma.tenantClient.codRemittance.count({ where }),
    ]);

    return { data, total, page: params.page, limit: take };
  }

  async updateRemittanceStatus(id: string, status: string) {
    return this.prisma.tenantClient.codRemittance.update({
      where: { id },
      data: { status }
    });
  }

  /**
   * đŸ¦ Logic Äá»‘i soĂ¡t NgĂ¢n hĂ ng (Bank Reconciliation)
   * GiĂºp tá»± Ä‘á»™ng hĂ³a viá»‡c kiá»ƒm tra tiá»n Ä‘Ă£ vá» tĂ i khoáº£n hay chÆ°a.
   */
  async reconcileBankStatement(entries: { reference: string, amount: number, transactionDate: string }[]) {
    const results = {
      total: entries.length,
      matched: 0,
      mismatchAmount: 0,
      notFound: 0,
      alreadyReconciled: 0,
    };

    for (const entry of entries) {
      // 1. TĂ¬m phiáº¿u quyáº¿t toĂ¡n dá»±a trĂªn mĂ£ QR/Reference (Ghi trĂªn ná»™i dung chuyá»ƒn khoáº£n)
      const remittance = await this.prisma.tenantClient.codRemittance.findFirst({
        where: { qrCodeToken: entry.reference }
      });

      if (!remittance) {
        results.notFound++;
        continue;
      }

      if (remittance.status === 'RECONCILED') {
        results.alreadyReconciled++;
        continue;
      }

      // 2. Kiá»ƒm tra sá»‘ tiá»n (Cho phĂ©p sai sá»‘ nhá» do phĂ­ chuyá»ƒn khoáº£n náº¿u cáº§n)
      const expectedAmount = Number(remittance.amountRemitted);
      if (Math.abs(expectedAmount - entry.amount) < 0.01) {
        // Khá»›p hoĂ n toĂ n
        await this.prisma.tenantClient.codRemittance.update({
          where: { id: remittance.id },
          data: { 
            status: 'RECONCILED',
            // CĂ³ thá»ƒ lÆ°u thĂªm thĂ´ng tin ngĂ y giao dá»‹ch ngĂ¢n hĂ ng vĂ o metadata náº¿u schema há»— trá»£
          }
        });
        results.matched++;
      } else {
        // Sai lá»‡ch sá»‘ tiá»n
        results.mismatchAmount++;
      }
    }

    return results;
  }

  // --- SOS & Expense Management ---

  async getSosAlerts(status?: string) {
    return this.prisma.tenantClient.sosAlert.findMany({
      where: status ? { status } : {},
      include: { driver: { include: { user: true } }, trip: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async resolveSos(id: string, status: string) {
    return this.prisma.tenantClient.sosAlert.update({
      where: { id },
      data: { status }
    });
  }

  async getDriverExpenses(driverId?: string) {
    return this.prisma.tenantClient.driverExpense.findMany({
      where: driverId ? { driverId } : {},
      include: { driver: { include: { user: true } }, trip: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  // --- Reports Methods ---

  async getTripReport(range: string = "7d") {
    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 }
    const days = daysMap[range] || 7
    const since = new Date()
    since.setDate(since.getDate() - days)

    const [total, completed, inTransit] = await Promise.all([
      this.prisma.tenantClient.trip.count({ where: { createdAt: { gte: since } } }),
      this.prisma.tenantClient.trip.count({ where: { status: "COMPLETED", createdAt: { gte: since } } }),
      this.prisma.tenantClient.trip.count({ where: { status: "IN_TRANSIT", createdAt: { gte: since } } }),
    ])

    const delayed = total - completed - inTransit

    return {
      summary: { total, completed, inTransit, delayed: Math.max(0, delayed) }
    }
  }

  async getFleetReport(range: string = "7d") {
    const [totalVehicles, active] = await Promise.all([
      this.prisma.tenantClient.vehicle.count(),
      this.prisma.tenantClient.vehicle.count({ where: { status: "ACTIVE" } }),
    ])

    const utilization = totalVehicles > 0 ? active / totalVehicles : 0

    return { totalVehicles, active, utilization }
  }

  // --- AI Model & Feedback Methods ---

  async listAiModels(type?: string) {
    return this.prisma.tenantClient.aiModel.findMany({
      where: type ? { type } : {},
      orderBy: { trainedAt: 'desc' }
    });
  }

  async createAiModel(data: { name: string; version: string; type: string; accuracy?: number; modelPath: string; metadata?: string }) {
    return this.prisma.tenantClient.aiModel.create({
      data: {
        name: data.name,
        version: data.version,
        type: data.type,
        accuracy: data.accuracy,
        modelPath: data.modelPath,
        metadata: data.metadata,
        isCurrent: false,
      }
    });
  }

  async updateAiModel(id: string, data: { name?: string; version?: string; accuracy?: number; isCurrent?: boolean; metadata?: string }) {
    return this.prisma.tenantClient.aiModel.update({
      where: { id },
      data
    });
  }

  async createAiFeedback(data: {
    modelId: string,
    resourceType: string,
    resourceId: string,
    aiPrediction: any,
    humanCorrected: any,
    confidence?: number
  }) {
    return this.prisma.tenantClient.aiFeedback.create({
      data: {
        modelId: data.modelId,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        aiPrediction: data.aiPrediction,
        humanCorrected: data.humanCorrected,
        confidence: data.confidence,
        isUsedForTrain: false
      }
    });
  }

  async getAiFeedbacks(params: { modelId?: string, isUsedForTrain?: boolean }) {
    return this.prisma.tenantClient.aiFeedback.findMany({
      where: {
        modelId: params.modelId,
        isUsedForTrain: params.isUsedForTrain
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async markFeedbackAsUsed(id: string) {
    return this.prisma.tenantClient.aiFeedback.update({
      where: { id },
      data: { isUsedForTrain: true }
    });
  }

  /**
   * đŸ§  SAI: Bridge human feedback to the AI Service for self-learning.
   */
  async submitAiFeedback(body: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
    
    // 1. Record in our DB for tracking
    const localFeedback = await this.prisma.tenantClient.aiFeedback.create({
      data: {
        modelId: body.modelId || 'demand-v1',
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        aiPrediction: body.aiPrediction,
        humanCorrected: body.humanCorrected,
        confidence: body.confidence || 1.0,
      }
    });

    // 2. Forward to AI Service for potential immediate retraining task
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/ai/v1/feedback`, body)
      );
      return { ok: true, localId: localFeedback.id, aiResponse: response.data };
    } catch (error: any) {
      this.logger.error(`âŒ Failed to forward feedback to AI Service: ${error.message}`);
      // We still return ok because we saved it locally and the AI Service will pick it up eventually
      return { ok: true, localId: localFeedback.id, warning: 'AI Service unreachable, feedback saved locally' };
    }
  }
}

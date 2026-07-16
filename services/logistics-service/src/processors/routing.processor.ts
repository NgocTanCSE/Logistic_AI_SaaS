import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Processor('routing')
export class RoutingProcessor extends WorkerHost {
  private readonly logger = new Logger(RoutingProcessor.name);
  private readonly aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { jobId, payload } = job.data;
    this.logger.log(`đŸ‘· Processing routing job: ${jobId}`);

    try {
      // Gá»i sang AI Service
      const response: any = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/routing/solve`, payload)
      );

      if (response.data.ok) {
        // Cáº­p nháº­t Database thĂ nh cĂ´ng
        await this.prisma.tenantClient.routeOptimizationJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            result: response.data.routes as any,
            completedAt: new Date(),
          },
        });
        this.logger.log(` Routing job ${jobId} COMPLETED`);
      } else {
        // Cáº­p nháº­t Database tháº¥t báº¡i
        await this.prisma.tenantClient.routeOptimizationJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
          },
        });
        this.logger.error(`âŒ Routing job ${jobId} FAILED inside AI Service`);
      }
    } catch (error: any) {
      this.logger.error(`đŸ”¥ Lá»—i khi gá»i AI Service cho job ${jobId}: ${error.message}`);
      await this.prisma.tenantClient.routeOptimizationJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });
      throw error;
    }
    
    return {};
  }
}

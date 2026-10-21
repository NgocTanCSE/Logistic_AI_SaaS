import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Processor('routing')
export class RoutingProcessor extends WorkerHost {
  private readonly logger = new Logger(RoutingProcessor.name);
  private readonly aiServiceUrl = process.env.AI_WORKER_URL || 'http://localhost:8787';

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { jobId, payload, tenantId, schemaName } = job.data;
    this.logger.log(`🧭 Processing routing job: ${jobId}`);

    // Worker chạy ngoài HTTP request: phải tự mở lại tenant context để ghi
    // đúng schema của tenant, nếu không sẽ ghi nhầm bảng của tenant khác.
    // Gọi AI worker ngoài transaction để không giữ kết nối DB trong lúc
    // chờ mạng.
    let ok = false;
    let routes: any[] = [];

    try {
      const response: any = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/routing/solve`, payload, {
          headers: { 'x-ai-api-key': process.env.AI_API_KEY || '' },
        })
      );
      ok = Boolean(response.data?.ok);
      routes = response.data?.routes ?? [];
    } catch (error: any) {
      this.logger.error(`Lỗi khi gọi AI Service cho job ${jobId}: ${error.message}`);
    }

    await this.prisma.runWithTenantRequest(tenantId, schemaName, async () => {
      await this.prisma.getTenantDb().routeOptimizationJob.update({
        where: { id: jobId },
        data: ok
          ? {
              status: 'COMPLETED',
              result: JSON.stringify(routes),
              completedAt: new Date(),
            }
          : {
              status: 'FAILED',
              completedAt: new Date(),
            },
      });
    });

    if (ok) {
      this.logger.log(` Routing job ${jobId} COMPLETED`);
    } else {
      this.logger.error(`⌛ Routing job ${jobId} FAILED inside AI Service`);
      throw new Error(`Routing job ${jobId} failed`);
    }

    return {};
  }
}

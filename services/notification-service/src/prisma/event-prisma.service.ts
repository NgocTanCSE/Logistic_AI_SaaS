import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class EventPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static _isSqlite: boolean | null = null;
  private readonly logger = new Logger(EventPrismaService.name);

  static get isSqlite(): boolean {
    if (EventPrismaService._isSqlite === null) {
      EventPrismaService._isSqlite = (process.env.DATABASE_URL || '').startsWith('file:');
    }
    return EventPrismaService._isSqlite;
  }

  async onModuleInit() {
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.$connect();
        this.logger.log(`Database connected successfully (attempt ${attempt})`);
        return;
      } catch (err: any) {
        lastError = err;
        this.logger.error(`Database connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }
    throw lastError;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  public switchSchema(schemaName: string): any {
    if (EventPrismaService.isSqlite) {
      return this;
    }
    const self = this as any;
    return self.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }: any) {
            await self.$executeRawUnsafe(
              `SET search_path TO "${schemaName}", public`
            );
            return query(args);
          },
        },
      },
    });
  }
}

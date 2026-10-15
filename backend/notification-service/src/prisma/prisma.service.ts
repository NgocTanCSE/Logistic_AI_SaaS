import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

interface SchemaContext {
  schemaName: string;
}

export const schemaContext = new AsyncLocalStorage<SchemaContext>();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static _isSqlite: boolean | null = null;
  private readonly logger = new Logger(PrismaService.name);

  static get isSqlite(): boolean {
    if (PrismaService._isSqlite === null) {
      PrismaService._isSqlite = (process.env.DATABASE_URL || '').startsWith('file:');
    }
    return PrismaService._isSqlite;
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
          const delay = attempt * 1000;
          this.logger.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    this.logger.error('All database connection attempts failed');
    throw lastError;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  public runWithSchema<T>(schemaName: string, callback: () => Promise<T>): Promise<T> {
    return schemaContext.run({ schemaName }, callback);
  }

  public get currentSchema(): string {
    const store = schemaContext.getStore();
    return store?.schemaName || 'public';
  }

  public get tenantClient(): any {
    return this.switchSchema(this.currentSchema);
  }

  public switchSchema(schemaName?: string): any {
    if (PrismaService.isSqlite) {
      return (this as any).$extends({});
    }
    const schema = schemaName || 'public';
    if (!schema || schema === 'public') {
      return this;
    }
    const self = this as any;
    const extended = self.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }: any) {
            await self.$executeRawUnsafe(
              `SET search_path TO "${schema}", public`
            );
            return query(args);
          },
        },
      },
    });
    return extended || this;
  }
}


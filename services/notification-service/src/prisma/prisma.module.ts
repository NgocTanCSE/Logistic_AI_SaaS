import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EventPrismaService } from './event-prisma.service';

@Global()
@Module({
  providers: [PrismaService, EventPrismaService],
  exports: [PrismaService, EventPrismaService],
})
export class PrismaModule {}

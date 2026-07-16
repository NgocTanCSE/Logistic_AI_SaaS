import { Controller, Get, Post, Patch, Param, Body, UseGuards, NotFoundException, InternalServerErrorException, Query } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('AI Models')
@Controller("ai/models")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiModelsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.TripsRead)
  async listAiModels(@Query('type') type?: string) {
    try {
      return await this.prisma.tenantClient.aiModel.findMany({
        where: type ? { type } : {},
        orderBy: { trainedAt: 'desc' }
      });
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch AI models");
    }
  }

  @Get(":id")
  @RequirePermissions(Permissions.TripsRead)
  async getAiModel(@Param("id") id: string) {
    try {
      const model = await this.prisma.tenantClient.aiModel.findUnique({
        where: { id }
      });
      if (!model) throw new NotFoundException(`AI Model with ID ${id} not found`);
      return model;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to fetch AI model");
    }
  }

  @Post()
  @RequirePermissions(Permissions.TripsDispatch)
  async createAiModel(@Body() body: { name: string, version: string, type: string, accuracy?: number, modelPath: string, metadata?: string }) {
    try {
      const existingCurrent = await this.prisma.tenantClient.aiModel.findFirst({
        where: { isCurrent: true, type: body.type }
      });
      if (existingCurrent) {
        await this.prisma.tenantClient.aiModel.update({
          where: { id: existingCurrent.id },
          data: { isCurrent: false }
        });
      }

      return await this.prisma.tenantClient.aiModel.create({
        data: {
          name: body.name,
          version: body.version,
          type: body.type,
          accuracy: body.accuracy,
          modelPath: body.modelPath,
          metadata: body.metadata,
          isCurrent: true
        }
      });
    } catch (error) {
      throw new InternalServerErrorException("Failed to create AI model");
    }
  }

  @Patch(":id")
  @RequirePermissions(Permissions.TripsDispatch)
  async updateAiModel(@Param("id") id: string, @Body() body: { name?: string, version?: string, accuracy?: number, isCurrent?: boolean, metadata?: string }) {
    try {
      const model = await this.prisma.tenantClient.aiModel.findUnique({ where: { id } });
      if (!model) throw new NotFoundException(`AI Model with ID ${id} not found`);

      if (body.isCurrent) {
        await this.prisma.tenantClient.aiModel.updateMany({
          where: { type: model.type, id: { not: id } },
          data: { isCurrent: false }
        });
      }

      return await this.prisma.tenantClient.aiModel.update({
        where: { id },
        data: body
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Failed to update AI model");
    }
  }
}
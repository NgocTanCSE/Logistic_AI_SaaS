import { Controller, Get, Post, Param, Body, UseGuards, InternalServerErrorException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Clients")
@Controller("clients")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @RequirePermissions(Permissions.TenantsManage)
  async createClient(@Body() body: { name: string }) {
    try {
      return await this.prisma.tenantClient.client.create({ data: { name: body.name } });
    } catch (error) {
      throw new InternalServerErrorException("Failed to create client");
    }
  }

  @Post(":id/users")
  @RequirePermissions(Permissions.TenantsManage)
  async createClientUser(@Param("id") id: string, @Body() body: { email: string, fullName: string }) {
    try {
      return await this.prisma.tenantClient.clientUser.create({ data: { clientId: id, ...body } });
    } catch (error) {
      throw new InternalServerErrorException("Failed to create client user");
    }
  }

  @Get()
  @RequirePermissions(Permissions.TenantsManage)
  async listClients() {
    try {
      return await this.prisma.tenantClient.client.findMany({ include: { users: true } });
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch clients");
    }
  }
}

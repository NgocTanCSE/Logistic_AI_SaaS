import { Controller, Get, Query, UseGuards, InternalServerErrorException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { Permissions, PermissionsGuard, RequirePermissions } from "../shared-types"
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Tenant Audit Logs')
@Controller("tenant/audit-logs")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantAuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.AuditLogsRead)
  async list(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("action") action?: string,
    @Query("actorEmail") actorEmail?: string,
  ) {
    try {
      const skip = (Number(page) - 1) * Number(limit)
      const take = Number(limit)

      const where: any = {}
      if (action) where.action = action
      if (actorEmail) where.actorEmail = { contains: actorEmail, mode: "insensitive" }

      const [data, total] = await Promise.all([
        this.prisma.systemAuditLog.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.systemAuditLog.count({ where }),
      ])

      return {
        data,
        meta: {
          total,
          page: Number(page),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      }
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch audit logs")
    }
  }

  @Get("actions")
  @RequirePermissions(Permissions.AuditLogsRead)
  async distinctActions() {
    const results: any[] = await this.prisma.$queryRaw`
      SELECT DISTINCT action FROM system_audit_logs ORDER BY action
    `
    return results.map((r: any) => r.action)
  }
}

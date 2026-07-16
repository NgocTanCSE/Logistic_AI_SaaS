import { Body, Controller, Get, Patch, UseGuards, Request } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions, Permissions } from "../shared-types";
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Tenant Settings')
@Controller("tenant/settings")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.SettingsManage)
  async getSettings(@Request() req: any) {
    const tenantId = req.user.tenant_id;
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, settingsJson: true }
    });

    let settings = {};
    if (tenant?.settingsJson) {
      try {
        settings = JSON.parse(tenant.settingsJson);
      } catch (e) {
        console.error(`Failed to parse settingsJson for tenant ${tenantId}:`, e);
      }
    }

    return {
      tenantName: tenant?.name || '',
      ...settings
    };
  }

  @Patch()
  @RequirePermissions(Permissions.SettingsManage)
  async updateSettings(@Request() req: any, @Body() body: any) {
    const tenantId = req.user.tenant_id;
    const { tenantName, ...settings } = body;

    const dataToUpdate: any = {
      settingsJson: JSON.stringify(settings)
    };

    if (tenantName) {
      dataToUpdate.name = tenantName;
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: dataToUpdate
    });

    return { ok: true };
  }
}

import { Controller, Get, Query, UseGuards, UseInterceptors, InternalServerErrorException } from "@nestjs/common"
import { CacheInterceptor, CacheKey } from "@nestjs/cache-manager"
import { PrismaService } from "../prisma/prisma.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { Permissions, PermissionsGuard, RequirePermissions } from "shared-types";
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Admin Dashboard')
@Controller("admin/dashboard")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(CacheInterceptor)
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("stats")
  @RequirePermissions(Permissions.BillingRead)
  @CacheKey('admin_dashboard_stats')
  async stats() {
    try {
      const [allTenants, plans, usersCount] = await Promise.all([
        this.prisma.tenant.findMany({ select: { id: true, status: true, createdAt: true } }),
        this.prisma.subscriptionPlan.findMany({
          include: {
            tenants: { select: { id: true, status: true, createdAt: true } },
          },
        }),
        this.prisma.tenantUser.count(),
      ])

      const activeTenants = allTenants.filter(t => t.status === "ACTIVE").length;
      const totalTenants = allTenants.length;
      const pendingTenants = allTenants.filter(t => t.status === "PENDING").length;

      const totalMrr = plans.reduce((sum: number, plan: any) => {
        const activeCount = plan.tenants.filter((t: any) => t.status === "ACTIVE").length;
        return sum + activeCount * Number(plan.priceMonthly || 0);
      }, 0)

      const growthData: any[] = [];
      const revenueData: any[] = [];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = monthNames[date.getMonth()];
        
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const activeUpToMonth = allTenants.filter(t => t.createdAt <= endOfMonth && t.status === "ACTIVE").length;
        growthData.push({ month: monthStr, tenants: activeUpToMonth });

        let mrrMonth = 0;
        plans.forEach((plan: any) => {
          const activeTForPlan = plan.tenants.filter((t: any) => t.createdAt <= endOfMonth && t.status === "ACTIVE").length;
          mrrMonth += activeTForPlan * Number(plan.priceMonthly || 0);
        });
        revenueData.push({ month: monthStr, amount: mrrMonth });
      }

      return {
        mrr: totalMrr,
        totalMrr,
        activeTenants,
        totalTenants,
        totalUsers: usersCount,
        apiCalls: 0,
        alerts: pendingTenants,
        growthData,
        revenueData
      }
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch dashboard stats");
    }
  }
}

import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permissions, PermissionsGuard, RequirePermissions } from 'shared-types';
import { JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * Wallet summary for the driver app.
 *
 * The mobile home screen needs a single number it can render without loading
 * every delivery: the COD the driver is currently carrying. The breakdown is
 * returned alongside it so the wallet screen can show pending/remitted amounts
 * without a second round trip.
 */
@ApiTags('Mobile Wallet')
@Controller('mobile/wallet')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MobileWalletController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permissions.TripsRead)
  async wallet(@Request() req: any) {
    const db = this.prisma.getTenantDb();
    const driver = await db.driver.findUnique({ where: { userId: req.user.sub } });

    if (!driver) {
      return {
        codAmount: 0,
        codCollected: 0,
        codPending: 0,
        expenses: 0,
        remitted: 0,
        currency: 'VND',
      };
    }

    const [collected, openDeliveries, expenses, remitted] = await Promise.all([
      db.delivery.aggregate({
        _sum: { codAmountCollected: true },
        where: { driverId: driver.id },
      }),
      db.delivery.aggregate({
        _sum: { codAmountExpected: true, codAmountCollected: true },
        where: {
          driverId: driver.id,
          status: { notIn: ['DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED'] },
        },
      }),
      db.driverExpense.aggregate({
        _sum: { amount: true },
        where: { driverId: driver.id, status: { not: 'REJECTED' } },
      }),
      db.codRemittance.aggregate({
        _sum: { amountRemitted: true },
        where: { driverId: driver.id, status: { in: ['APPROVED', 'COMPLETED', 'SETTLED'] } },
      }),
    ]);

    const codCollected = Number(collected._sum.codAmountCollected || 0);
    const pendingExpected = Number(openDeliveries._sum.codAmountExpected || 0);
    const pendingCollected = Number(openDeliveries._sum.codAmountCollected || 0);

    return {
      codAmount: codCollected,
      codCollected,
      codPending: Math.max(0, pendingExpected - pendingCollected),
      expenses: Number(expenses._sum.amount || 0),
      remitted: Number(remitted._sum.amountRemitted || 0),
      currency: 'VND',
    };
  }
}

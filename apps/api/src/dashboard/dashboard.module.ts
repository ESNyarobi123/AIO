import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { ok } from '../common/utils/api-response.js';
import {
  AssetStatus,
  InvoiceStatus,
  RentalStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [
      totalEquipment,
      available,
      rented,
      maintenance,
      activeRentals,
      overdueRentals,
      payments,
      outstandingRentals,
      recentRentals,
      recentPayments,
    ] = await Promise.all([
      this.prisma.equipmentAsset.count(),
      this.prisma.equipmentAsset.count({
        where: { status: AssetStatus.AVAILABLE },
      }),
      this.prisma.equipmentAsset.count({
        where: { status: AssetStatus.RENTED },
      }),
      this.prisma.equipmentAsset.count({
        where: { status: AssetStatus.MAINTENANCE },
      }),
      this.prisma.rental.count({
        where: {
          status: {
            in: [RentalStatus.ACTIVE, RentalStatus.DISPATCHED, RentalStatus.CONFIRMED],
          },
        },
      }),
      this.prisma.rental.count({ where: { status: RentalStatus.OVERDUE } }),
      this.prisma.payment.aggregate({
        where: { status: { not: 'REVERSED' } },
        _sum: { amount: true },
      }),
      this.prisma.rental.aggregate({
        where: { status: { notIn: ['CANCELLED'] } },
        _sum: { balanceCached: true, grandTotal: true },
      }),
      this.prisma.rental.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { fullName: true, phone: true } },
        },
      }),
      this.prisma.payment.findMany({
        take: 8,
        orderBy: { receivedAt: 'desc' },
        include: {
          customer: { select: { fullName: true } },
        },
      }),
    ]);

    const openInvoices = await this.prisma.invoice.count({
      where: {
        status: {
          in: [
            InvoiceStatus.ISSUED,
            InvoiceStatus.PARTIALLY_PAID,
          ],
        },
      },
    });

    return ok({
      inventory: {
        totalEquipment,
        available,
        currentlyRented: rented,
        maintenance,
      },
      operations: {
        activeRentals,
        overdueReturns: overdueRentals,
        openInvoices,
      },
      finance: {
        rentalRevenue: Number(outstandingRentals._sum.grandTotal ?? 0),
        paymentsReceived: Number(payments._sum.amount ?? 0),
        outstanding: Number(outstandingRentals._sum.balanceCached ?? 0),
      },
      recentRentals,
      recentPayments,
    });
  }
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  @Permissions('dashboard.read')
  @ApiOperation({ summary: 'Admin/Staff business overview metrics' })
  overview() {
    return this.service.overview();
  }
}

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

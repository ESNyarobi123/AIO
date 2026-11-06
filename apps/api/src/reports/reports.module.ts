import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { ok } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';

class DateRangeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  to?: string;
}

@Injectable()
class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private range(from?: string, to?: string) {
    return {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };
  }

  async rentals(from?: string, to?: string) {
    const rows = await this.prisma.rental.findMany({
      where: this.range(from, to),
      include: {
        customer: true,
        items: { include: { model: true, asset: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return ok(rows);
  }

  async revenue(from?: string, to?: string) {
    const rentals = await this.prisma.rental.findMany({
      where: {
        ...this.range(from, to),
        status: { not: 'CANCELLED' },
      },
      select: {
        grandTotal: true,
        amountPaidCached: true,
        balanceCached: true,
        discountTotal: true,
        deliveryTotal: true,
      },
    });
    return ok({
      rentalCount: rentals.length,
      grossRevenue: rentals.reduce((s, r) => s + Number(r.grandTotal), 0),
      collected: rentals.reduce((s, r) => s + Number(r.amountPaidCached), 0),
      outstanding: rentals.reduce((s, r) => s + Number(r.balanceCached), 0),
      discounts: rentals.reduce((s, r) => s + Number(r.discountTotal), 0),
      delivery: rentals.reduce((s, r) => s + Number(r.deliveryTotal), 0),
    });
  }

  async payments(from?: string, to?: string) {
    const rows = await this.prisma.payment.findMany({
      where: {
        ...(from || to
          ? {
              receivedAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { customer: true, allocations: true },
      orderBy: { receivedAt: 'desc' },
    });
    return ok(rows);
  }

  async outstanding() {
    const rows = await this.prisma.rental.findMany({
      where: {
        balanceCached: { gt: 0 },
        status: { notIn: ['CANCELLED'] },
      },
      include: { customer: true },
      orderBy: { balanceCached: 'desc' },
    });
    return ok(rows);
  }

  async inventory() {
    const byStatus = await this.prisma.equipmentAsset.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const assets = await this.prisma.equipmentAsset.findMany({
      include: { model: { include: { category: true } } },
      orderBy: { assetCode: 'asc' },
    });
    return ok({ byStatus, assets });
  }

  async utilization() {
    const models = await this.prisma.equipmentModel.findMany({
      include: {
        assets: true,
        _count: { select: { rentalItems: true } },
      },
    });
    return ok(
      models.map((m) => ({
        modelId: m.id,
        name: m.name,
        assetCount: m.assets.length,
        rentedNow: m.assets.filter((a) => a.status === 'RENTED').length,
        rentalItemCount: m._count.rentalItems,
      })),
    );
  }

  async maintenance() {
    const jobs = await this.prisma.maintenanceJob.findMany({
      include: { asset: { include: { model: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const totalCost = jobs.reduce((s, j) => s + Number(j.totalCost), 0);
    return ok({ totalCost, jobs });
  }

  async profitability(from?: string, to?: string) {
    const revenue = await this.revenue(from, to);
    const expenses = await this.prisma.expense.findMany({
      where: {
        status: { in: ['APPROVED', 'PAID'] },
        ...(from || to
          ? {
              expenseDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
    });
    const maintenance = await this.prisma.maintenanceJob.aggregate({
      _sum: { totalCost: true },
    });
    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const maintenanceTotal = Number(maintenance._sum.totalCost ?? 0);
    const collected = (revenue.data as { collected: number }).collected;
    return ok({
      collectedRevenue: collected,
      expenses: expenseTotal,
      maintenanceCosts: maintenanceTotal,
      estimatedNetProfit: collected - expenseTotal - maintenanceTotal,
    });
  }
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('rentals')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Rental report' })
  rentals(@Query() query: DateRangeDto) {
    return this.service.rentals(query.from, query.to);
  }

  @Get('revenue')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Revenue report' })
  revenue(@Query() query: DateRangeDto) {
    return this.service.revenue(query.from, query.to);
  }

  @Get('payments')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Payments report' })
  payments(@Query() query: DateRangeDto) {
    return this.service.payments(query.from, query.to);
  }

  @Get('outstanding')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Outstanding balances / debt report' })
  outstanding() {
    return this.service.outstanding();
  }

  @Get('inventory')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Inventory / stock report' })
  inventory() {
    return this.service.inventory();
  }

  @Get('utilization')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Equipment utilization report' })
  utilization() {
    return this.service.utilization();
  }

  @Get('maintenance')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Maintenance cost report' })
  maintenance() {
    return this.service.maintenance();
  }

  @Get('profitability')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Estimated profitability report' })
  profitability(@Query() query: DateRangeDto) {
    return this.service.profitability(query.from, query.to);
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

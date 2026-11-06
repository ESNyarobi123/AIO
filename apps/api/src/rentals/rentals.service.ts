import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  AssetStatus,
  Prisma,
  RentalItemStatus,
  RentalStatus,
} from '../generated/prisma/client.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { AuditService } from '../common/services/audit.service.js';
import { DocumentNumberService } from '../common/services/document-number.service.js';
import { ok, paginated } from '../common/utils/api-response.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CancelRentalDto,
  CreateRentalDto,
  ExtendRentalDto,
} from './dto/rental.dto.js';

@Injectable()
export class RentalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
  ) {}

  async findAll(page = 1, limit = 20, search?: string, status?: RentalStatus) {
    const where: Prisma.RentalWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { rentalNumber: { contains: search, mode: 'insensitive' } },
              { siteLocation: { contains: search, mode: 'insensitive' } },
              {
                customer: {
                  fullName: { contains: search, mode: 'insensitive' },
                },
              },
              { customer: { phone: { contains: search } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.rental.count({ where }),
      this.prisma.rental.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          createdBy: { select: { id: true, fullName: true, username: true } },
          items: {
            include: {
              model: true,
              asset: true,
            },
          },
        },
      }),
    ]);

    return paginated(rows, total, page, limit);
  }

  async findOne(id: string) {
    const rental = await this.getRentalOrThrow(id);
    return ok(rental);
  }

  async create(dto: CreateRentalDto, actor: AuthUser) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one rental item is required');
    }

    const startAt = new Date(dto.startAt);
    const expectedReturnAt = new Date(dto.expectedReturnAt);
    if (!(startAt < expectedReturnAt)) {
      throw new BadRequestException('startAt must be before expectedReturnAt');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const rentalNumber = await this.numbers.next('rental');
    let needsApproval = false;

    const computedItems = dto.items.map((item) => {
      const lineSubtotal = item.unitPrice * item.agreedDuration * item.quantity;
      const discountAmount = item.discountAmount ?? 0;
      const standardPrice = item.standardPrice ?? item.unitPrice;
      if (item.unitPrice < standardPrice || discountAmount > 0) {
        needsApproval = true;
      }
      return { ...item, lineSubtotal, discountAmount, standardPrice };
    });

    const subtotal = computedItems.reduce(
      (sum, item) => sum + item.lineSubtotal,
      0,
    );
    const discountTotal = computedItems.reduce(
      (sum, item) => sum + item.discountAmount,
      0,
    );
    const deliveryTotal = dto.deliveryTotal ?? 0;
    const taxTotal = dto.taxTotal ?? 0;
    const grandTotal = subtotal - discountTotal + deliveryTotal + taxTotal;

    const rental = await this.prisma.$transaction(async (tx) => {
      for (const item of computedItems) {
        if (item.assetId) {
          await this.inventory.assertAssetAvailableForWindow(
            tx,
            item.assetId,
            startAt,
            expectedReturnAt,
          );
        }
      }

      const created = await tx.rental.create({
        data: {
          rentalNumber,
          customerId: dto.customerId,
          quotationId: dto.quotationId,
          startAt,
          expectedReturnAt,
          siteLocation: dto.siteLocation,
          subtotal: new Prisma.Decimal(subtotal),
          discountTotal: new Prisma.Decimal(discountTotal),
          deliveryTotal: new Prisma.Decimal(deliveryTotal),
          taxTotal: new Prisma.Decimal(taxTotal),
          grandTotal: new Prisma.Decimal(grandTotal),
          balanceCached: new Prisma.Decimal(grandTotal),
          amountPaidCached: new Prisma.Decimal(0),
          status: needsApproval
            ? RentalStatus.PENDING_APPROVAL
            : RentalStatus.DRAFT,
          remarks: dto.remarks,
          createdById: actor.id,
          items: {
            create: computedItems.map((item) => ({
              modelId: item.modelId,
              assetId: item.assetId,
              quantity: item.quantity,
              pricingUnit: item.pricingUnit,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              agreedDuration: new Prisma.Decimal(item.agreedDuration),
              lineSubtotal: new Prisma.Decimal(item.lineSubtotal),
              discountAmount: new Prisma.Decimal(item.discountAmount),
              status: RentalItemStatus.PENDING,
            })),
          },
          guarantors:
            dto.guarantorFullName && dto.guarantorPhone
              ? {
                  create: {
                    customerId: dto.customerId,
                    fullName: dto.guarantorFullName,
                    phone: dto.guarantorPhone,
                  },
                }
              : undefined,
        },
        include: {
          customer: true,
          items: { include: { model: true, asset: true } },
          guarantors: true,
        },
      });

      for (const item of created.items) {
        const source = computedItems.find(
          (c) =>
            c.modelId === item.modelId &&
            (c.assetId ?? null) === (item.assetId ?? null) &&
            c.unitPrice === Number(item.unitPrice),
        );
        if (
          source &&
          (source.unitPrice < source.standardPrice || source.discountAmount > 0)
        ) {
          await tx.priceApproval.create({
            data: {
              rentalId: created.id,
              rentalItemId: item.id,
              standardPrice: new Prisma.Decimal(source.standardPrice),
              proposedPrice: new Prisma.Decimal(source.unitPrice),
              discountReason: source.discountReason ?? 'Negotiated price',
              requestedById: actor.id,
              status: ApprovalStatus.PENDING,
            },
          });
        }
      }

      return created;
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'rental.create',
      entityType: 'rental',
      entityId: rental.id,
      after: { rentalNumber, status: rental.status, grandTotal },
    });

    return ok(rental, { created: true });
  }

  async confirm(id: string, actor: AuthUser) {
    const existing = await this.getRentalOrThrow(id);
    if (
      !(
        [RentalStatus.DRAFT, RentalStatus.PENDING_APPROVAL] as RentalStatus[]
      ).includes(existing.status)
    ) {
      throw new BadRequestException(
        `Cannot confirm rental in status ${existing.status}`,
      );
    }

    const pendingApprovals = await this.prisma.priceApproval.count({
      where: { rentalId: id, status: ApprovalStatus.PENDING },
    });
    if (pendingApprovals > 0 && !actor.roles.includes('ADMIN')) {
      throw new ForbiddenException(
        'Pending price approvals must be resolved by Admin before confirmation',
      );
    }
    if (pendingApprovals > 0 && actor.roles.includes('ADMIN')) {
      await this.prisma.priceApproval.updateMany({
        where: { rentalId: id, status: ApprovalStatus.PENDING },
        data: {
          status: ApprovalStatus.APPROVED,
          approvedById: actor.id,
          approvedAt: new Date(),
        },
      });
    }

    const rental = await this.prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        if (item.assetId) {
          await this.inventory.assertAssetAvailableForWindow(
            tx,
            item.assetId,
            existing.startAt,
            existing.expectedReturnAt,
            existing.id,
          );
          await tx.equipmentAsset.update({
            where: { id: item.assetId },
            data: { status: AssetStatus.RESERVED },
          });
        }
      }

      return tx.rental.update({
        where: { id },
        data: {
          status: RentalStatus.CONFIRMED,
          approvedById: actor.id,
        },
        include: {
          customer: true,
          items: { include: { model: true, asset: true } },
          priceApprovals: true,
        },
      });
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'rental.confirm',
      entityType: 'rental',
      entityId: id,
      before: { status: existing.status },
      after: { status: rental.status },
    });

    return ok(rental);
  }

  async cancel(id: string, dto: CancelRentalDto, actor: AuthUser) {
    const existing = await this.getRentalOrThrow(id);
    if (
      ([RentalStatus.CLOSED, RentalStatus.CANCELLED, RentalStatus.RETURNED] as RentalStatus[]).includes(existing.status)
    ) {
      throw new BadRequestException(`Cannot cancel rental in ${existing.status}`);
    }
    if (
      ([RentalStatus.DISPATCHED, RentalStatus.ACTIVE, RentalStatus.OVERDUE] as RentalStatus[]).includes(existing.status)
    ) {
      throw new BadRequestException(
        'Return equipment before cancelling an active/dispatched rental',
      );
    }

    const rental = await this.prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        if (item.assetId) {
          await tx.equipmentAsset.update({
            where: { id: item.assetId },
            data: { status: AssetStatus.AVAILABLE },
          });
        }
      }
      return tx.rental.update({
        where: { id },
        data: {
          status: RentalStatus.CANCELLED,
          remarks: existing.remarks
            ? `${existing.remarks}\nCancel: ${dto.reason}`
            : `Cancel: ${dto.reason}`,
        },
        include: { customer: true, items: true },
      });
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'rental.cancel',
      entityType: 'rental',
      entityId: id,
      reason: dto.reason,
    });

    return ok(rental);
  }

  async requestExtension(
    id: string,
    dto: ExtendRentalDto,
    actor: AuthUser,
  ) {
    const existing = await this.getRentalOrThrow(id);
    if (
      !( [RentalStatus.ACTIVE, RentalStatus.DISPATCHED, RentalStatus.OVERDUE, RentalStatus.CONFIRMED] as RentalStatus[]).includes(existing.status)
    ) {
      throw new BadRequestException('Rental cannot be extended in current status');
    }

    const newExpectedReturnAt = new Date(dto.newExpectedReturnAt);
    if (!(newExpectedReturnAt > existing.expectedReturnAt)) {
      throw new BadRequestException(
        'newExpectedReturnAt must be after current expected return',
      );
    }

    const additional = dto.additionalCharge ?? 0;
    const rental = await this.prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        if (item.assetId) {
          await this.inventory.assertAssetAvailableForWindow(
            tx,
            item.assetId,
            existing.expectedReturnAt,
            newExpectedReturnAt,
            existing.id,
          );
        }
      }

      const grandTotal = Number(existing.grandTotal) + additional;
      const balance =
        grandTotal - Number(existing.amountPaidCached);

      return tx.rental.update({
        where: { id },
        data: {
          expectedReturnAt: newExpectedReturnAt,
          grandTotal: new Prisma.Decimal(grandTotal),
          balanceCached: new Prisma.Decimal(balance),
          status:
            existing.status === RentalStatus.OVERDUE
              ? RentalStatus.ACTIVE
              : existing.status,
          remarks: existing.remarks
            ? `${existing.remarks}\nExtension: ${dto.reason ?? 'extended'}`
            : `Extension: ${dto.reason ?? 'extended'}`,
        },
        include: {
          customer: true,
          items: { include: { model: true, asset: true } },
        },
      });
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'rental.extend',
      entityType: 'rental',
      entityId: id,
      after: { newExpectedReturnAt, additionalCharge: additional },
      reason: dto.reason,
    });

    return ok(rental);
  }

  async markOverdue() {
    const now = new Date();
    const result = await this.prisma.rental.updateMany({
      where: {
        status: { in: [RentalStatus.ACTIVE, RentalStatus.DISPATCHED] },
        expectedReturnAt: { lt: now },
        actualReturnAt: null,
      },
      data: { status: RentalStatus.OVERDUE },
    });
    return ok({ updated: result.count });
  }

  private async getRentalOrThrow(id: string) {
    const rental = await this.prisma.rental.findUnique({
      where: { id },
      include: {
        customer: true,
        guarantors: true,
        createdBy: { select: { id: true, fullName: true, username: true } },
        approvedBy: { select: { id: true, fullName: true, username: true } },
        items: { include: { model: true, asset: true } },
        priceApprovals: true,
        dispatches: { include: { items: true } },
        returns: { include: { items: true } },
        invoices: true,
        securityDeposits: true,
      },
    });
    if (!rental) throw new NotFoundException('Rental not found');
    return rental;
  }
}

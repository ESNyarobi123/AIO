import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetCondition,
  AssetStatus,
  InspectionOutcome,
  MovementType,
  Prisma,
  RentalItemStatus,
  RentalStatus,
  ReturnStatus,
} from '../generated/prisma/client.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { AuditService } from '../common/services/audit.service.js';
import { DocumentNumberService } from '../common/services/document-number.service.js';
import { ok, paginated } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateReturnDto,
  InspectReturnDto,
} from './dto/return.dto.js';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.return.count(),
      this.prisma.return.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          rental: { include: { customer: true } },
          receivedBy: { select: { id: true, fullName: true, username: true } },
          items: true,
        },
      }),
    ]);
    return paginated(rows, total, page, limit);
  }

  async findOne(id: string) {
    const row = await this.prisma.return.findUnique({
      where: { id },
      include: {
        rental: { include: { customer: true } },
        receivedBy: { select: { id: true, fullName: true, username: true } },
        items: {
          include: {
            asset: true,
            rentalItem: true,
            inspections: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Return not found');
    return ok(row);
  }

  async create(dto: CreateReturnDto, actor: AuthUser) {
    if (!dto.items?.length) {
      throw new BadRequestException('Return items are required');
    }

    const rental = await this.prisma.rental.findUnique({
      where: { id: dto.rentalId },
      include: { items: true },
    });
    if (!rental) throw new NotFoundException('Rental not found');
    if (
      !( [RentalStatus.ACTIVE, RentalStatus.DISPATCHED, RentalStatus.OVERDUE] as RentalStatus[]).includes(rental.status)
    ) {
      throw new BadRequestException(
        `Rental cannot be returned from status ${rental.status}`,
      );
    }

    const returnNumber = await this.numbers.next('return');
    const receivedAt = new Date(dto.receivedAt);
    const extraCharges = dto.items.reduce(
      (sum, item) => sum + (item.additionalChargeDraft ?? 0),
      0,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.return.create({
        data: {
          returnNumber,
          rentalId: rental.id,
          receivedAt,
          receivedById: actor.id,
          notes: dto.notes,
          status: ReturnStatus.INSPECTING,
          items: {
            create: dto.items.map((item) => ({
              rentalItemId: item.rentalItemId,
              assetId:
                item.assetId ??
                rental.items.find((ri) => ri.id === item.rentalItemId)?.assetId,
              quantityReturned: item.quantityReturned,
              conditionIn: item.conditionIn,
              accessoriesReturnedJson: item.accessoriesReturnedJson as
                | Prisma.InputJsonValue
                | undefined,
              damageNotes: item.damageNotes,
              missingItemsJson: item.missingItemsJson as
                | Prisma.InputJsonValue
                | undefined,
              additionalChargeDraft:
                item.additionalChargeDraft !== undefined
                  ? new Prisma.Decimal(item.additionalChargeDraft)
                  : undefined,
              notes: item.notes,
              inspectionStatus: 'PENDING',
            })),
          },
        },
        include: {
          items: { include: { asset: true, rentalItem: true } },
          receivedBy: { select: { id: true, fullName: true, username: true } },
          rental: { include: { customer: true } },
        },
      });

      for (const item of created.items) {
        await tx.rentalItem.update({
          where: { id: item.rentalItemId },
          data: {
            status:
              item.conditionIn === AssetCondition.DAMAGED ||
              item.conditionIn === AssetCondition.MISSING
                ? RentalItemStatus.DAMAGED
                : RentalItemStatus.RETURNED,
          },
        });

        if (item.assetId) {
          const asset = await tx.equipmentAsset.findUniqueOrThrow({
            where: { id: item.assetId },
          });

          const needsInspection =
            item.conditionIn === AssetCondition.DAMAGED ||
            item.conditionIn === AssetCondition.FAIR ||
            Boolean(item.damageNotes);

          const nextStatus = needsInspection
            ? AssetStatus.INSPECTION
            : item.conditionIn === AssetCondition.MISSING
              ? AssetStatus.LOST
              : AssetStatus.AVAILABLE;

          await tx.equipmentAsset.update({
            where: { id: item.assetId },
            data: {
              status: nextStatus,
              condition: item.conditionIn,
              currentLocation: 'Goba Store',
            },
          });

          await tx.inventoryMovement.create({
            data: {
              assetId: item.assetId,
              modelId: asset.modelId,
              movementType: MovementType.RETURN,
              quantityDelta: 1,
              fromStatus: asset.status,
              toStatus: nextStatus,
              referenceType: 'return',
              referenceId: created.id,
              reason: `Returned on ${created.returnNumber}`,
              performedById: actor.id,
            },
          });
        }
      }

      const grandTotal = Number(rental.grandTotal) + extraCharges;
      const balance = grandTotal - Number(rental.amountPaidCached);

      await tx.rental.update({
        where: { id: rental.id },
        data: {
          actualReturnAt: receivedAt,
          status: ReturnStatus.INSPECTING
            ? RentalStatus.RETURNED
            : RentalStatus.RETURNED,
          grandTotal: new Prisma.Decimal(grandTotal),
          balanceCached: new Prisma.Decimal(balance),
        },
      });

      return created;
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'return.create',
      entityType: 'return',
      entityId: result.id,
      after: { returnNumber, rentalId: rental.id },
    });

    return ok(result, { created: true });
  }

  async inspect(id: string, dto: InspectReturnDto, actor: AuthUser) {
    const returnRow = await this.prisma.return.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!returnRow) throw new NotFoundException('Return not found');

    const item = returnRow.items.find((i) => i.id === dto.returnItemId);
    if (!item) throw new NotFoundException('Return item not found');
    if (!item.assetId) {
      throw new BadRequestException('Return item has no linked asset');
    }

    const inspection = await this.prisma.$transaction(async (tx) => {
      const created = await tx.inspection.create({
        data: {
          assetId: item.assetId!,
          returnItemId: item.id,
          checklistJson: dto.checklistJson as Prisma.InputJsonValue | undefined,
          outcome: dto.outcome,
          notes: dto.notes,
          inspectedById: actor.id,
        },
      });

      await tx.returnItem.update({
        where: { id: item.id },
        data: { inspectionStatus: dto.outcome },
      });

      let nextStatus: AssetStatus = AssetStatus.AVAILABLE;
      if (dto.outcome === InspectionOutcome.NEEDS_MAINTENANCE) {
        nextStatus = AssetStatus.MAINTENANCE;
      } else if (dto.outcome === InspectionOutcome.FAIL) {
        nextStatus = AssetStatus.MAINTENANCE;
      }

      await tx.equipmentAsset.update({
        where: { id: item.assetId! },
        data: { status: nextStatus },
      });

      return created;
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'return.inspect',
      entityType: 'inspection',
      entityId: inspection.id,
      after: { outcome: dto.outcome, assetId: item.assetId },
    });

    return ok(inspection);
  }

  async complete(id: string, actor: AuthUser) {
    const returnRow = await this.prisma.return.findUnique({
      where: { id },
      include: { items: true, rental: true },
    });
    if (!returnRow) throw new NotFoundException('Return not found');

    const pending = returnRow.items.filter(
      (i) => !i.inspectionStatus || i.inspectionStatus === 'PENDING',
    );
    const needsInspection = returnRow.items.some(
      (i) =>
        i.conditionIn === AssetCondition.DAMAGED ||
        i.conditionIn === AssetCondition.FAIR ||
        Boolean(i.damageNotes),
    );
    if (needsInspection && pending.length > 0) {
      throw new BadRequestException(
        'Complete inspections for damaged/fair items before closing return',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.return.update({
        where: { id },
        data: { status: ReturnStatus.COMPLETED },
        include: { items: true, rental: true },
      });

      const openBalance = Number(returnRow.rental.balanceCached);
      await tx.rental.update({
        where: { id: returnRow.rentalId },
        data: {
          status:
            openBalance <= 0 ? RentalStatus.CLOSED : RentalStatus.RETURNED,
        },
      });

      return row;
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'return.complete',
      entityType: 'return',
      entityId: id,
    });

    return ok(updated);
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetStatus,
  DispatchStatus,
  MovementType,
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
import { CreateDispatchDto } from './dto/dispatch.dto.js';

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.dispatch.count(),
      this.prisma.dispatch.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          rental: { include: { customer: true } },
          issuedBy: { select: { id: true, fullName: true, username: true } },
          items: true,
        },
      }),
    ]);
    return paginated(rows, total, page, limit);
  }

  async findOne(id: string) {
    const row = await this.prisma.dispatch.findUnique({
      where: { id },
      include: {
        rental: { include: { customer: true, items: true } },
        issuedBy: { select: { id: true, fullName: true, username: true } },
        items: { include: { asset: true, rentalItem: true } },
      },
    });
    if (!row) throw new NotFoundException('Dispatch not found');
    return ok(row);
  }

  async create(dto: CreateDispatchDto, actor: AuthUser) {
    if (!dto.items?.length) {
      throw new BadRequestException('Dispatch items are required');
    }

    const rental = await this.prisma.rental.findUnique({
      where: { id: dto.rentalId },
      include: { items: true },
    });
    if (!rental) throw new NotFoundException('Rental not found');
    if (
      !( [RentalStatus.CONFIRMED, RentalStatus.DISPATCHED] as RentalStatus[]).includes(rental.status)
    ) {
      throw new BadRequestException(
        `Rental must be CONFIRMED before dispatch (current: ${rental.status})`,
      );
    }

    const dispatchNumber = await this.numbers.next('dispatch');
    const dispatchedAt = new Date(dto.dispatchedAt);

    const dispatch = await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const rentalItem = rental.items.find((ri) => ri.id === item.rentalItemId);
        if (!rentalItem) {
          throw new BadRequestException(
            `Rental item ${item.rentalItemId} not on this rental`,
          );
        }
        const assetId = item.assetId ?? rentalItem.assetId;
        if (assetId) {
          await this.inventory.assertAssetAvailableForWindow(
            tx,
            assetId,
            rental.startAt,
            rental.expectedReturnAt,
            rental.id,
          );
        }
      }

      const created = await tx.dispatch.create({
        data: {
          dispatchNumber,
          rentalId: rental.id,
          dispatchedAt,
          issuedById: actor.id,
          recipientName: dto.recipientName,
          siteLocation: dto.siteLocation ?? rental.siteLocation,
          notes: dto.notes,
          status: DispatchStatus.CONFIRMED,
          items: {
            create: dto.items.map((item) => ({
              rentalItemId: item.rentalItemId,
              assetId:
                item.assetId ??
                rental.items.find((ri) => ri.id === item.rentalItemId)?.assetId,
              quantity: item.quantity,
              conditionOut: item.conditionOut,
              accessoriesJson: item.accessoriesJson as
                | Prisma.InputJsonValue
                | undefined,
              meterReading: item.meterReading,
              notes: item.notes,
            })),
          },
        },
        include: {
          items: { include: { asset: true, rentalItem: true } },
          issuedBy: { select: { id: true, fullName: true, username: true } },
          rental: { include: { customer: true } },
        },
      });

      for (const item of created.items) {
        await tx.rentalItem.update({
          where: { id: item.rentalItemId },
          data: {
            status: RentalItemStatus.DISPATCHED,
            assetId: item.assetId ?? undefined,
          },
        });

        if (item.assetId) {
          const asset = await tx.equipmentAsset.findUniqueOrThrow({
            where: { id: item.assetId },
          });
          await tx.equipmentAsset.update({
            where: { id: item.assetId },
            data: {
              status: AssetStatus.RENTED,
              condition: item.conditionOut,
              currentLocation: created.siteLocation ?? asset.currentLocation,
            },
          });
          await tx.inventoryMovement.create({
            data: {
              assetId: item.assetId,
              modelId: asset.modelId,
              movementType: MovementType.DISPATCH,
              quantityDelta: -1,
              fromStatus: asset.status,
              toStatus: AssetStatus.RENTED,
              referenceType: 'dispatch',
              referenceId: created.id,
              reason: `Dispatched on ${created.dispatchNumber}`,
              performedById: actor.id,
            },
          });
        }
      }

      await tx.rental.update({
        where: { id: rental.id },
        data: { status: RentalStatus.ACTIVE },
      });

      return created;
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'dispatch.confirm',
      entityType: 'dispatch',
      entityId: dispatch.id,
      after: { dispatchNumber, rentalId: rental.id },
    });

    return ok(dispatch, { created: true });
  }

  async confirm(id: string, actor: AuthUser) {
    const existing = await this.prisma.dispatch.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dispatch not found');
    if (existing.status === DispatchStatus.CONFIRMED) {
      return this.findOne(id);
    }
    const updated = await this.prisma.dispatch.update({
      where: { id },
      data: { status: DispatchStatus.CONFIRMED, issuedById: actor.id },
      include: { items: true, rental: true },
    });
    return ok(updated);
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetStatus,
  MovementType,
  Prisma,
} from '../generated/prisma/client.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { ok } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/services/audit.service.js';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async availability(params: {
    modelId?: string;
    assetId?: string;
    startAt: string;
    endAt: string;
  }) {
    const startAt = new Date(params.startAt);
    const endAt = new Date(params.endAt);
    if (!(startAt < endAt)) {
      throw new BadRequestException('startAt must be before endAt');
    }

    if (params.assetId) {
      const asset = await this.prisma.equipmentAsset.findUnique({
        where: { id: params.assetId },
        include: { model: true },
      });
      if (!asset) throw new NotFoundException('Asset not found');

      const conflict = await this.findAssetConflict(
        params.assetId,
        startAt,
        endAt,
      );
      return ok({
        assetId: asset.id,
        assetCode: asset.assetCode,
        status: asset.status,
        available:
          asset.status === AssetStatus.AVAILABLE && conflict === null,
        conflictRentalId: conflict?.rentalId ?? null,
        conflictRentalNumber: conflict?.rental.rentalNumber ?? null,
      });
    }

    if (!params.modelId) {
      throw new BadRequestException('modelId or assetId is required');
    }

    const assets = await this.prisma.equipmentAsset.findMany({
      where: {
        modelId: params.modelId,
        status: { in: [AssetStatus.AVAILABLE, AssetStatus.RESERVED, AssetStatus.RENTED] },
      },
      orderBy: { assetCode: 'asc' },
    });

    const results = [];
    for (const asset of assets) {
      const conflict = await this.findAssetConflict(asset.id, startAt, endAt);
      results.push({
        assetId: asset.id,
        assetCode: asset.assetCode,
        status: asset.status,
        available:
          asset.status === AssetStatus.AVAILABLE && conflict === null,
        conflictRentalId: conflict?.rentalId ?? null,
      });
    }

    return ok({
      modelId: params.modelId,
      startAt,
      endAt,
      availableCount: results.filter((r) => r.available).length,
      assets: results,
    });
  }

  async adjust(input: {
    assetId: string;
    toStatus: AssetStatus;
    reason: string;
    actor: AuthUser;
  }) {
    if (!input.reason?.trim()) {
      throw new BadRequestException('Adjustment reason is required');
    }

    const asset = await this.prisma.equipmentAsset.findUnique({
      where: { id: input.assetId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.equipmentAsset.update({
        where: { id: asset.id },
        data: { status: input.toStatus },
      });
      await tx.inventoryMovement.create({
        data: {
          assetId: asset.id,
          modelId: asset.modelId,
          movementType: MovementType.ADJUSTMENT,
          quantityDelta: 0,
          fromStatus: asset.status,
          toStatus: input.toStatus,
          reason: input.reason,
          performedById: input.actor.id,
          referenceType: 'manual_adjustment',
          referenceId: asset.id,
        },
      });
      return row;
    });

    await this.audit.log({
      actorUserId: input.actor.id,
      action: 'inventory.adjust',
      entityType: 'equipment_asset',
      entityId: asset.id,
      before: { status: asset.status },
      after: { status: updated.status },
      reason: input.reason,
    });

    return ok(updated);
  }

  async assertAssetAvailableForWindow(
    tx: Prisma.TransactionClient,
    assetId: string,
    startAt: Date,
    endAt: Date,
    excludeRentalId?: string,
  ) {
    const asset = await tx.equipmentAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (
      asset.status === AssetStatus.MAINTENANCE ||
      asset.status === AssetStatus.RETIRED ||
      asset.status === AssetStatus.LOST ||
      asset.status === AssetStatus.INSPECTION
    ) {
      throw new ConflictException(
        `Asset ${asset.assetCode} is not rentable (status: ${asset.status})`,
      );
    }

    const conflict = await tx.rentalItem.findFirst({
      where: {
        assetId,
        status: { in: ['PENDING', 'DISPATCHED', 'ACTIVE'] },
        rental: {
          id: excludeRentalId ? { not: excludeRentalId } : undefined,
          status: {
            in: ['CONFIRMED', 'DISPATCHED', 'ACTIVE', 'OVERDUE', 'PENDING_APPROVAL'],
          },
          AND: [
            { startAt: { lt: endAt } },
            { expectedReturnAt: { gt: startAt } },
          ],
        },
      },
      include: { rental: true },
    });

    if (conflict) {
      throw new ConflictException(
        `Asset ${asset.assetCode} already booked on rental ${conflict.rental.rentalNumber}`,
      );
    }

    return asset;
  }

  private async findAssetConflict(
    assetId: string,
    startAt: Date,
    endAt: Date,
  ) {
    return this.prisma.rentalItem.findFirst({
      where: {
        assetId,
        status: { in: ['PENDING', 'DISPATCHED', 'ACTIVE'] },
        rental: {
          status: {
            in: ['CONFIRMED', 'DISPATCHED', 'ACTIVE', 'OVERDUE', 'PENDING_APPROVAL'],
          },
          AND: [
            { startAt: { lt: endAt } },
            { expectedReturnAt: { gt: startAt } },
          ],
        },
      },
      include: { rental: true },
    });
  }
}

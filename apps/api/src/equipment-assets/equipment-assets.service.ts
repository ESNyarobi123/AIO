import {
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
import { AuditService } from '../common/services/audit.service.js';
import {
  assertCanDelete,
  blockedByHistory,
  describeCounts,
} from '../common/utils/delete-guard.js';
import { ok, paginated } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto.js';

@Injectable()
export class EquipmentAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    search?: string,
    status?: AssetStatus,
    modelId?: string,
  ) {
    const where: Prisma.EquipmentAssetWhereInput = {
      ...(status ? { status } : {}),
      ...(modelId ? { modelId } : {}),
      ...(search
        ? {
            OR: [
              { assetCode: { contains: search, mode: 'insensitive' } },
              { serialNumber: { contains: search, mode: 'insensitive' } },
              { qrCodeValue: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.equipmentAsset.count({ where }),
      this.prisma.equipmentAsset.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { assetCode: 'asc' },
        include: {
          model: { include: { category: true } },
          images: { orderBy: { createdAt: 'desc' }, take: 4 },
        },
      }),
    ]);

    return paginated(rows, total, page, limit);
  }

  async findOne(id: string) {
    const asset = await this.prisma.equipmentAsset.findUnique({
      where: { id },
      include: {
        model: { include: { category: true, prices: { where: { isActive: true } } } },
        images: { orderBy: { createdAt: 'desc' } },
        inventoryMovements: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        maintenanceJobs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return ok(asset);
  }

  async create(dto: CreateAssetDto, actor: AuthUser) {
    const model = await this.prisma.equipmentModel.findUnique({
      where: { id: dto.modelId },
    });
    if (!model) throw new NotFoundException('Equipment model not found');

    const exists = await this.prisma.equipmentAsset.findUnique({
      where: { assetCode: dto.assetCode.toUpperCase() },
    });
    if (exists) throw new ConflictException('Asset code already exists');

    const assetCode = dto.assetCode.toUpperCase();
    const asset = await this.prisma.$transaction(async (tx) => {
      const created = await tx.equipmentAsset.create({
        data: {
          assetCode,
          modelId: dto.modelId,
          serialNumber: dto.serialNumber,
          qrCodeValue: `AIQ:${assetCode}`,
          purchaseDate: dto.purchaseDate
            ? new Date(dto.purchaseDate)
            : undefined,
          purchaseCost:
            dto.purchaseCost !== undefined
              ? new Prisma.Decimal(dto.purchaseCost)
              : undefined,
          currentLocation: dto.currentLocation,
          condition: dto.condition,
          status: dto.status ?? AssetStatus.AVAILABLE,
          notes: dto.notes,
        },
        include: { model: { include: { category: true } } },
      });

      await tx.inventoryMovement.create({
        data: {
          assetId: created.id,
          modelId: created.modelId,
          movementType: MovementType.INTAKE,
          quantityDelta: 1,
          toStatus: created.status,
          reason: 'Asset registered',
          performedById: actor.id,
          referenceType: 'equipment_asset',
          referenceId: created.id,
        },
      });

      return created;
    });

    return ok(asset, { created: true });
  }

  async update(id: string, dto: UpdateAssetDto) {
    const existing = await this.prisma.equipmentAsset.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Asset not found');

    const asset = await this.prisma.equipmentAsset.update({
      where: { id },
      data: {
        assetCode: dto.assetCode?.toUpperCase(),
        modelId: dto.modelId,
        serialNumber: dto.serialNumber,
        purchaseDate: dto.purchaseDate
          ? new Date(dto.purchaseDate)
          : undefined,
        purchaseCost:
          dto.purchaseCost !== undefined
            ? new Prisma.Decimal(dto.purchaseCost)
            : undefined,
        currentLocation: dto.currentLocation,
        condition: dto.condition,
        status: dto.status,
        notes: dto.notes,
        qrCodeValue: dto.assetCode
          ? `AIQ:${dto.assetCode.toUpperCase()}`
          : undefined,
      },
      include: { model: { include: { category: true } } },
    });

    return ok(asset);
  }

  async history(id: string) {
    await this.ensureExists(id);
    const movements = await this.prisma.inventoryMovement.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        performedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });
    return ok(movements);
  }

  async summary() {
    const grouped = await this.prisma.equipmentAsset.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
    return ok({
      total,
      byStatus: Object.fromEntries(
        grouped.map((row) => [row.status, row._count._all]),
      ),
    });
  }

  private async ensureExists(id: string) {
    const asset = await this.prisma.equipmentAsset.findUnique({
      where: { id },
      include: { model: true },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  /**
   * Machines with hire, dispatch, inspection or repair history stay in the
   * system for traceability. Only a never-used unit can be removed outright.
   */
  async remove(id: string, actor: AuthUser) {
    assertCanDelete(actor);
    const asset = await this.ensureExists(id);

    const [
      rentalItems,
      dispatchItems,
      returnItems,
      inspections,
      maintenanceJobs,
      staffHireItems,
      expenses,
      movements,
    ] = await Promise.all([
      this.prisma.rentalItem.count({ where: { assetId: id } }),
      this.prisma.dispatchItem.count({ where: { assetId: id } }),
      this.prisma.returnItem.count({ where: { assetId: id } }),
      this.prisma.inspection.count({ where: { assetId: id } }),
      this.prisma.maintenanceJob.count({ where: { assetId: id } }),
      this.prisma.staffHireItem.count({ where: { assetId: id } }),
      this.prisma.expense.count({ where: { relatedAssetId: id } }),
      this.prisma.inventoryMovement.count({ where: { assetId: id } }),
    ]);

    if (rentalItems > 0) {
      blockedByHistory(
        `${asset.assetCode} appears on ${describeCounts([[rentalItems, 'hire card line']])}. Delete is blocked — set its status to Retired instead.`,
      );
    }
    if (
      dispatchItems + returnItems + inspections + maintenanceJobs + staffHireItems + expenses >
      0
    ) {
      const detail = describeCounts([
        [dispatchItems, 'dispatch line'],
        [returnItems, 'return line'],
        [inspections, 'inspection'],
        [maintenanceJobs, 'maintenance job'],
        [staffHireItems, 'staff issue line'],
        [expenses, 'expense'],
      ]);
      blockedByHistory(
        `${asset.assetCode} has ${detail}. Delete is blocked — set its status to Retired instead.`,
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Movements are the only soft link; detach them so the codes stay clean.
        await tx.inventoryMovement.updateMany({
          where: { assetId: id },
          data: { assetId: null },
        });
        await tx.equipmentAsset.delete({ where: { id } });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          `${asset.assetCode} is still linked to other records. Set its status to Retired instead.`,
        );
      }
      throw error;
    }

    await this.audit.log({
      actorUserId: actor.id,
      action: 'equipment_asset.delete',
      entityType: 'equipment_asset',
      entityId: id,
      before: {
        assetCode: asset.assetCode,
        model: asset.model.name,
        status: asset.status,
      },
    });

    return ok({ id, deleted: true });
  }
}

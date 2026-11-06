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
import { ok, paginated } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto.js';

@Injectable()
export class EquipmentAssetsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const asset = await this.prisma.equipmentAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
  }
}

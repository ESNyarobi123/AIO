import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { AuditService } from '../common/services/audit.service.js';
import {
  assertCanDelete,
  blockedByHistory,
  describeCounts,
} from '../common/utils/delete-guard.js';
import { ok, paginated } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateModelDto, UpdateModelDto } from './dto/model.dto.js';

@Injectable()
export class EquipmentModelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, limit = 20, search?: string, categoryId?: string) {
    const where: Prisma.EquipmentModelWhereInput = {
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { modelNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.equipmentModel.count({ where }),
      this.prisma.equipmentModel.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: true,
          prices: { where: { isActive: true } },
          _count: { select: { assets: true } },
        },
      }),
    ]);

    return paginated(rows, total, page, limit);
  }

  async findOne(id: string) {
    const model = await this.prisma.equipmentModel.findUnique({
      where: { id },
      include: {
        category: true,
        prices: { where: { isActive: true } },
        assets: { orderBy: { assetCode: 'asc' } },
        accessories: true,
      },
    });
    if (!model) throw new NotFoundException('Equipment model not found');
    return ok(model);
  }

  async create(dto: CreateModelDto) {
    await this.ensureCategory(dto.categoryId);
    const model = await this.prisma.equipmentModel.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        brand: dto.brand,
        modelNumber: dto.modelNumber,
        description: dto.description,
        defaultDeposit:
          dto.defaultDeposit !== undefined
            ? new Prisma.Decimal(dto.defaultDeposit)
            : undefined,
        prices: dto.prices?.length
          ? { create: this.priceRows(dto.prices) }
          : undefined,
        accessories: dto.accessories?.length
          ? { create: this.accessoryRows(dto.accessories) }
          : undefined,
      },
      include: {
        category: true,
        prices: { where: { isActive: true } },
        accessories: true,
      },
    });
    return ok(model, { created: true });
  }

  async update(id: string, dto: UpdateModelDto) {
    await this.ensureExists(id);
    if (dto.categoryId) await this.ensureCategory(dto.categoryId);

    const model = await this.prisma.equipmentModel.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        brand: dto.brand,
        modelNumber: dto.modelNumber,
        description: dto.description,
        defaultDeposit:
          dto.defaultDeposit !== undefined
            ? new Prisma.Decimal(dto.defaultDeposit)
            : undefined,
        prices: dto.prices
          ? { deleteMany: {}, create: this.priceRows(dto.prices) }
          : undefined,
        accessories: dto.accessories
          ? { deleteMany: {}, create: this.accessoryRows(dto.accessories) }
          : undefined,
      },
      include: {
        category: true,
        prices: { where: { isActive: true } },
        accessories: true,
      },
    });
    return ok(model);
  }

  private priceRows(prices: CreateModelDto['prices']) {
    return (prices ?? []).map((price) => ({
      pricingUnit: price.pricingUnit,
      amount: new Prisma.Decimal(price.amount),
      minimumDuration: price.minimumDuration,
    }));
  }

  private accessoryRows(accessories: CreateModelDto['accessories']) {
    return (accessories ?? []).map((accessory) => ({
      name: accessory.name,
      description: accessory.description,
      isRequired: accessory.isRequired ?? false,
    }));
  }

  private async ensureExists(id: string) {
    const model = await this.prisma.equipmentModel.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!model) throw new NotFoundException('Equipment model not found');
    return model;
  }

  /**
   * A model is the catalogue entry behind hire cards and stock. Remove it only
   * when no machine, rate history or hire line still points at it.
   */
  async remove(id: string, actor: AuthUser) {
    assertCanDelete(actor);
    const model = await this.ensureExists(id);

    const [assets, rentalItems, staffHireItems, requestItems, movements] =
      await Promise.all([
        this.prisma.equipmentAsset.count({ where: { modelId: id } }),
        this.prisma.rentalItem.count({ where: { modelId: id } }),
        this.prisma.staffHireItem.count({ where: { modelId: id } }),
        this.prisma.rentalRequestItem.count({ where: { modelId: id } }),
        this.prisma.inventoryMovement.count({ where: { modelId: id } }),
      ]);

    if (assets + rentalItems + staffHireItems + requestItems + movements > 0) {
      const detail = describeCounts([
        [assets, 'machine'],
        [rentalItems, 'hire card line'],
        [staffHireItems, 'staff issue line'],
        [requestItems, 'rental request line'],
        [movements, 'stock movement'],
      ]);
      blockedByHistory(
        `${model.name} is still used by ${detail}. Delete the machines or retire the model instead.`,
      );
    }

    try {
      await this.prisma.equipmentModel.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          `${model.name} is still linked to hire history and cannot be deleted.`,
        );
      }
      throw error;
    }

    await this.audit.log({
      actorUserId: actor.id,
      action: 'equipment_model.delete',
      entityType: 'equipment_model',
      entityId: id,
      before: {
        name: model.name,
        brand: model.brand,
        category: model.category.name,
      },
    });

    return ok({ id, deleted: true });
  }

  private async ensureCategory(id: string) {
    const category = await this.prisma.equipmentCategory.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException('Category not found');
  }
}

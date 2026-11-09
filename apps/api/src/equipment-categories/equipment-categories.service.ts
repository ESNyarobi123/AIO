import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { AuditService } from '../common/services/audit.service.js';
import {
  assertCanDelete,
  blockedByHistory,
  isForeignKeyViolation,
} from '../common/utils/delete-guard.js';
import { ok, paginated } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto.js';

@Injectable()
export class EquipmentCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, limit = 50, search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { code: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.equipmentCategory.count({ where }),
      this.prisma.equipmentCategory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { models: true } } },
      }),
    ]);

    return paginated(rows, total, page, limit);
  }

  async create(dto: CreateCategoryDto) {
    const exists = await this.prisma.equipmentCategory.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (exists) throw new ConflictException('Category code already exists');

    const category = await this.prisma.equipmentCategory.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        description: dto.description,
        trackingMode: dto.trackingMode,
      },
    });
    return ok(category, { created: true });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    const category = await this.prisma.equipmentCategory.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code?.toUpperCase(),
        description: dto.description,
        trackingMode: dto.trackingMode,
      },
    });
    return ok(category);
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.equipmentCategory.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  /** Only empty categories can be removed; models must be moved or deleted first. */
  async remove(id: string, actor: AuthUser) {
    assertCanDelete(actor);
    const category = await this.ensureExists(id);

    const models = await this.prisma.equipmentModel.count({
      where: { categoryId: id },
    });
    if (models > 0) {
      blockedByHistory(
        `${category.name} still holds ${models} ${models === 1 ? 'model' : 'models'}. Move or delete ${models === 1 ? 'it' : 'them'} first.`,
      );
    }

    try {
      await this.prisma.equipmentCategory.delete({ where: { id } });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          `${category.name} is still linked to other records and cannot be deleted.`,
        );
      }
      throw error;
    }

    await this.audit.log({
      actorUserId: actor.id,
      action: 'equipment_category.delete',
      entityType: 'equipment_category',
      entityId: id,
      before: { code: category.code, name: category.name },
    });

    return ok({ id, deleted: true });
  }
}

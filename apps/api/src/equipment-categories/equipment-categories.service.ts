import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ok, paginated } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto.js';

@Injectable()
export class EquipmentCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

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
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { ok } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const settings = await this.prisma.companySettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (!settings) throw new NotFoundException('Company settings not configured');
    return ok(settings);
  }

  async update(dto: UpdateSettingsDto) {
    const existing = await this.prisma.companySettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (!existing) throw new NotFoundException('Company settings not configured');

    const settings = await this.prisma.companySettings.update({
      where: { id: existing.id },
      data: dto,
    });
    return ok(settings);
  }
}

import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { paginated } from '../common/utils/api-response.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;
}

@Injectable()
class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AuditQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.AuditLogWhereInput = {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.action ? { action: { contains: query.action } } : {}),
      ...(query.search
        ? {
            OR: [
              { action: { contains: query.search, mode: 'insensitive' } },
              { entityType: { contains: query.search, mode: 'insensitive' } },
              { entityId: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, fullName: true, username: true } },
        },
      }),
    ]);
    return paginated(rows, total, page, limit);
  }
}

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  @Permissions('audit.read')
  @ApiOperation({ summary: 'List audit trail events' })
  findAll(@Query() query: AuditQueryDto) {
    return this.service.findAll(query);
  }
}

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
})
export class AuditLogsModule {}

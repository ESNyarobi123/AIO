import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/permissions.decorator.js';
import { ok } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'API and database health check' })
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return ok({
      status: 'ok',
      service: 'aiq-hireflow-api',
      timestamp: new Date().toISOString(),
    });
  }
}

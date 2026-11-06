import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { AssetStatus } from '../generated/prisma/client.js';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto.js';
import { EquipmentAssetsService } from './equipment-assets.service.js';

class AssetQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  modelId?: string;
}

@ApiTags('Equipment Assets')
@ApiBearerAuth()
@Controller()
export class EquipmentAssetsController {
  constructor(private readonly service: EquipmentAssetsService) {}

  @Get('equipment/assets')
  @Permissions('equipment.read')
  @ApiOperation({ summary: 'List individual equipment assets' })
  findAll(@Query() query: AssetQueryDto) {
    return this.service.findAll(
      query.page,
      query.limit,
      query.search,
      query.status,
      query.modelId,
    );
  }

  @Get('inventory/summary')
  @Permissions('equipment.read')
  @ApiOperation({ summary: 'Inventory status summary' })
  summary() {
    return this.service.summary();
  }

  @Get('equipment/assets/:id')
  @Permissions('equipment.read')
  @ApiOperation({ summary: 'Get asset details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get('equipment/assets/:id/history')
  @Permissions('equipment.read')
  @ApiOperation({ summary: 'Get asset inventory movement history' })
  history(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.history(id);
  }

  @Post('equipment/assets')
  @Permissions('equipment.create')
  @ApiOperation({ summary: 'Register a physical equipment asset' })
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch('equipment/assets/:id')
  @Permissions('equipment.update')
  @ApiOperation({ summary: 'Update equipment asset' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.service.update(id, dto);
  }
}

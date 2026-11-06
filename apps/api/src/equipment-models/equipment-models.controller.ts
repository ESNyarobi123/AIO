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
import { IsOptional, IsUUID } from 'class-validator';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { CreateModelDto, UpdateModelDto } from './dto/model.dto.js';
import { EquipmentModelsService } from './equipment-models.service.js';

class ModelQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

@ApiTags('Equipment Models')
@ApiBearerAuth()
@Controller('equipment/models')
export class EquipmentModelsController {
  constructor(private readonly service: EquipmentModelsService) {}

  @Get()
  @Permissions('equipment.read')
  @ApiOperation({ summary: 'List equipment models/products' })
  findAll(@Query() query: ModelQueryDto) {
    return this.service.findAll(
      query.page,
      query.limit,
      query.search,
      query.categoryId,
    );
  }

  @Get(':id')
  @Permissions('equipment.read')
  @ApiOperation({ summary: 'Get equipment model with assets and pricing' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('equipment.create')
  @ApiOperation({ summary: 'Create equipment model' })
  create(@Body() dto: CreateModelDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('equipment.update')
  @ApiOperation({ summary: 'Update equipment model' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateModelDto,
  ) {
    return this.service.update(id, dto);
  }
}

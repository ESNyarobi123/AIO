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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto.js';
import { EquipmentCategoriesService } from './equipment-categories.service.js';

@ApiTags('Equipment Categories')
@ApiBearerAuth()
@Controller('equipment/categories')
export class EquipmentCategoriesController {
  constructor(private readonly service: EquipmentCategoriesService) {}

  @Get()
  @Permissions('equipment.read')
  @ApiOperation({ summary: 'List equipment categories' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query.page, query.limit, query.search);
  }

  @Post()
  @Permissions('equipment.create')
  @ApiOperation({ summary: 'Create equipment category' })
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('equipment.update')
  @ApiOperation({ summary: 'Update equipment category' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.update(id, dto);
  }
}

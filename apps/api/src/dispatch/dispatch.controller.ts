import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { CreateDispatchDto } from './dto/dispatch.dto.js';
import { DispatchService } from './dispatch.service.js';

@ApiTags('Dispatch')
@ApiBearerAuth()
@Controller('dispatches')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get()
  @Permissions('rentals.read')
  @ApiOperation({ summary: 'List equipment dispatches / check-outs' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.dispatchService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @Permissions('rentals.read')
  @ApiOperation({ summary: 'Get dispatch details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.dispatchService.findOne(id);
  }

  @Post()
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Create and confirm equipment dispatch (issued by)' })
  create(@Body() dto: CreateDispatchDto, @CurrentUser() user: AuthUser) {
    return this.dispatchService.create(dto, user);
  }

  @Post(':id/confirm')
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Confirm a draft dispatch' })
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.dispatchService.confirm(id, user);
  }
}

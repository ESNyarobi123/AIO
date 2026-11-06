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
import { CreateReturnDto, InspectReturnDto } from './dto/return.dto.js';
import { ReturnsService } from './returns.service.js';

@ApiTags('Returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @Permissions('rentals.read')
  @ApiOperation({ summary: 'List equipment returns / check-ins' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.returnsService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @Permissions('rentals.read')
  @ApiOperation({ summary: 'Get return details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.returnsService.findOne(id);
  }

  @Post()
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Record equipment return (received by)' })
  create(@Body() dto: CreateReturnDto, @CurrentUser() user: AuthUser) {
    return this.returnsService.create(dto, user);
  }

  @Post(':id/inspect')
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Inspect a returned asset' })
  inspect(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InspectReturnDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.returnsService.inspect(id, dto, user);
  }

  @Post(':id/complete')
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Complete return and close rental if paid' })
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.returnsService.complete(id, user);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { StaffHireStatus } from '../generated/prisma/client.js';
import {
  CancelStaffHireDto,
  CreateStaffHireDto,
  ReturnStaffHireDto,
  UpdateStaffHireDto,
} from './dto/staff-hire.dto.js';
import { StaffHiresService } from './staff-hires.service.js';

class StaffHireQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StaffHireStatus })
  @IsOptional()
  @IsEnum(StaffHireStatus)
  status?: StaffHireStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Only the signed-in staff member’s own hires' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  mine?: boolean;
}

@ApiTags('Staff Hires')
@ApiBearerAuth()
@Controller('staff-hires')
export class StaffHiresController {
  constructor(private readonly service: StaffHiresService) {}

  @Get()
  @Permissions('equipment.read')
  @ApiOperation({
    summary:
      'List internal staff hires (equipment taken to site by staff — no money involved)',
  })
  findAll(@Query() query: StaffHireQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.findAll(
      query.page,
      query.limit,
      query.status,
      query.mine ? user.id : query.userId,
      query.search,
    );
  }

  @Get('summary')
  @Permissions('equipment.read')
  @ApiOperation({ summary: 'Counters for staff hires out, overdue and returned today' })
  summary(@Query() query: StaffHireQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.summary(query.mine ? user.id : undefined);
  }

  @Get(':id')
  @Permissions('equipment.read')
  @ApiOperation({ summary: 'Get one staff hire with its assets' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('rentals.create')
  @ApiOperation({
    summary:
      'Issue equipment to a staff member for internal work (no pricing, no invoice)',
  })
  create(@Body() dto: CreateStaffHireDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Edit the header of a staff hire card' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffHireDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Delete a closed staff hire card' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user);
  }

  @Post(':id/return')  @Permissions('rentals.update')
  @ApiOperation({
    summary: 'Punch equipment back in at the office — records who returned it',
  })
  returnItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnStaffHireDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.returnItems(id, dto, user);
  }

  @Post(':id/cancel')
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Cancel a staff hire and free the assets' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelStaffHireDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.cancel(id, dto, user);
  }
}

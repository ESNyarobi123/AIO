import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { RentalStatus } from '../generated/prisma/client.js';
import {
  CancelRentalDto,
  CreateRentalDto,
  ExtendRentalDto,
} from './dto/rental.dto.js';
import { RentalsService } from './rentals.service.js';

class RentalQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RentalStatus })
  @IsOptional()
  @IsEnum(RentalStatus)
  status?: RentalStatus;
}

@ApiTags('Rentals')
@ApiBearerAuth()
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Get()
  @Permissions('rentals.read')
  @ApiOperation({ summary: 'List rentals (hire contracts)' })
  findAll(@Query() query: RentalQueryDto) {
    return this.rentalsService.findAll(
      query.page,
      query.limit,
      query.search,
      query.status,
    );
  }

  @Post('jobs/mark-overdue')
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Mark overdue rentals based on expected return' })
  markOverdue() {
    return this.rentalsService.markOverdue();
  }

  @Get(':id')
  @Permissions('rentals.read')
  @ApiOperation({ summary: 'Get rental details (digital hire card)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rentalsService.findOne(id);
  }

  @Post()
  @Permissions('rentals.create')
  @ApiOperation({ summary: 'Create rental draft / pending approval' })
  create(@Body() dto: CreateRentalDto, @CurrentUser() user: AuthUser) {
    return this.rentalsService.create(dto, user);
  }

  @Post(':id/confirm')
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Confirm rental and reserve assets' })
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rentalsService.confirm(id, user);
  }

  @Post(':id/cancel')
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Cancel a non-dispatched rental' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRentalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rentalsService.cancel(id, dto, user);
  }

  @Post(':id/request-extension')
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Extend rental period' })
  requestExtension(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendRentalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rentalsService.requestExtension(id, dto, user);
  }

  @Post(':id/approve-extension')
  @Permissions('rentals.update')
  @ApiOperation({
    summary: 'Approve extension (same as apply for Admin/Staff with permission)',
  })
  approveExtension(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendRentalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rentalsService.requestExtension(id, dto, user);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, Min, MinLength } from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { CreatePriceDto, UpdatePriceDto } from './dto/pricing.dto.js';
import { PricingService } from './pricing.service.js';

class PriceOverrideRequestDto {
  @ApiProperty()
  @IsUUID()
  rentalItemId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  proposedPrice!: number;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  discountReason!: string;
}

@ApiTags('Pricing')
@ApiBearerAuth()
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('models/:modelId')
  @Permissions('pricing.read')
  @ApiOperation({ summary: 'List prices for an equipment model' })
  listForModel(@Param('modelId', ParseUUIDPipe) modelId: string) {
    return this.pricingService.listForModel(modelId);
  }

  @Post()
  @Permissions('pricing.manage')
  @ApiOperation({ summary: 'Create rental price' })
  create(@Body() dto: CreatePriceDto) {
    return this.pricingService.create(dto);
  }

  @Patch(':id')
  @Permissions('pricing.manage')
  @ApiOperation({ summary: 'Update rental price' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriceDto,
  ) {
    return this.pricingService.update(id, dto);
  }

  @Post('price-override-requests')
  @Permissions('rentals.create')
  @ApiOperation({ summary: 'Request negotiated price override' })
  requestOverride(
    @Body() dto: PriceOverrideRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pricingService.requestOverride({ ...dto, actor: user });
  }

  @Post('price-override-requests/:id/approve')
  @Permissions('pricing.manage')
  @ApiOperation({ summary: 'Admin approve price override' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pricingService.decideOverride(id, 'approve', user);
  }

  @Post('price-override-requests/:id/reject')
  @Permissions('pricing.manage')
  @ApiOperation({ summary: 'Admin reject price override' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pricingService.decideOverride(id, 'reject', user);
  }
}

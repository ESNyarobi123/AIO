import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { AssetStatus } from '../generated/prisma/client.js';
import { InventoryService } from './inventory.service.js';

class AvailabilityQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  modelId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiProperty()
  @IsISO8601()
  startAt!: string;

  @ApiProperty()
  @IsISO8601()
  endAt!: string;
}

class AdjustInventoryDto {
  @ApiProperty()
  @IsUUID()
  assetId!: string;

  @ApiProperty({ enum: AssetStatus })
  @IsEnum(AssetStatus)
  toStatus!: AssetStatus;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason!: string;
}

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('availability')
  @Permissions('equipment.read')
  @ApiOperation({ summary: 'Check equipment availability for a date window' })
  availability(@Query() query: AvailabilityQueryDto) {
    return this.inventoryService.availability(query);
  }

  @Post('adjustments')
  @Permissions('equipment.update')
  @ApiOperation({ summary: 'Manual inventory status adjustment with reason' })
  adjust(@Body() dto: AdjustInventoryDto, @CurrentUser() user: AuthUser) {
    return this.inventoryService.adjust({ ...dto, actor: user });
  }
}

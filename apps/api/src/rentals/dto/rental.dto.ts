import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PricingUnit } from '../../generated/prisma/client.js';

export class CreateRentalItemDto {
  @ApiProperty()
  @IsUUID()
  modelId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ enum: PricingUnit })
  @IsEnum(PricingUnit)
  pricingUnit!: PricingUnit;

  @ApiProperty({ example: 30000 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({
    description: 'Standard/default price before negotiation',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  standardPrice?: number;

  @ApiProperty({ example: 1, description: 'Duration in pricing units' })
  @IsNumber()
  @Min(0.25)
  agreedDuration!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discountReason?: string;
}

export class CreateRentalDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  quotationId?: string;

  @ApiProperty({ example: '2026-11-01T11:48:00.000Z' })
  @IsISO8601()
  startAt!: string;

  @ApiProperty({ example: '2026-11-03T11:48:00.000Z' })
  @IsISO8601()
  expectedReturnAt!: string;

  @ApiPropertyOptional({ example: 'Dangote' })
  @IsOptional()
  @IsString()
  siteLocation?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryTotal?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guarantorFullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guarantorPhone?: string;

  @ApiProperty({ type: [CreateRentalItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRentalItemDto)
  items!: CreateRentalItemDto[];
}

export class ExtendRentalDto {
  @ApiProperty()
  @IsISO8601()
  newExpectedReturnAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional charge for extension' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalCharge?: number;
}

export class CancelRentalDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason!: string;
}

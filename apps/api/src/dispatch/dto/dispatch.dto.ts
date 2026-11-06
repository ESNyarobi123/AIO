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
  ValidateNested,
} from 'class-validator';
import { AssetCondition } from '../../generated/prisma/client.js';

export class DispatchItemDto {
  @ApiProperty()
  @IsUUID()
  rentalItemId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ enum: AssetCondition })
  @IsEnum(AssetCondition)
  conditionOut!: AssetCondition;

  @ApiPropertyOptional()
  @IsOptional()
  accessoriesJson?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meterReading?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDispatchDto {
  @ApiProperty()
  @IsUUID()
  rentalId!: string;

  @ApiProperty()
  @IsISO8601()
  dispatchedAt!: string;

  @ApiPropertyOptional({ example: 'Kitambulisho' })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional({ example: 'Dangote' })
  @IsOptional()
  @IsString()
  siteLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [DispatchItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DispatchItemDto)
  items!: DispatchItemDto[];
}

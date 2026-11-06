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
import {
  AssetCondition,
  InspectionOutcome,
} from '../../generated/prisma/client.js';

export class ReturnItemDto {
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
  quantityReturned!: number;

  @ApiProperty({ enum: AssetCondition })
  @IsEnum(AssetCondition)
  conditionIn!: AssetCondition;

  @ApiPropertyOptional()
  @IsOptional()
  accessoriesReturnedJson?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  damageNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  missingItemsJson?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalChargeDraft?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateReturnDto {
  @ApiProperty()
  @IsUUID()
  rentalId!: string;

  @ApiProperty()
  @IsISO8601()
  receivedAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];
}

export class InspectReturnDto {
  @ApiProperty()
  @IsUUID()
  returnItemId!: string;

  @ApiProperty({ enum: InspectionOutcome })
  @IsEnum(InspectionOutcome)
  outcome!: InspectionOutcome;

  @ApiPropertyOptional()
  @IsOptional()
  checklistJson?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PricingUnit } from '../../generated/prisma/client.js';

export class CreateModelPriceDto {
  @ApiProperty({ enum: PricingUnit, example: PricingUnit.DAY })
  @IsEnum(PricingUnit)
  pricingUnit!: PricingUnit;

  @ApiProperty({ example: 30000 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumDuration?: number;
}

export class CreateModelAccessoryDto {
  @ApiProperty({ example: 'Poker 38mm' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class CreateModelDto {
  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 'Poker Vibrator' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: 'Honda' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'GX160' })
  @IsOptional()
  @IsString()
  modelNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultDeposit?: number;

  @ApiPropertyOptional({
    type: [CreateModelPriceDto],
    description: 'Rate card rows. One per pricing unit.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModelPriceDto)
  prices?: CreateModelPriceDto[];

  @ApiPropertyOptional({ type: [CreateModelAccessoryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModelAccessoryDto)
  accessories?: CreateModelAccessoryDto[];
}

export class UpdateModelDto extends PartialType(CreateModelDto) {}

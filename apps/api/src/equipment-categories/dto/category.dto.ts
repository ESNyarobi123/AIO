import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { TrackingMode } from '../../generated/prisma/client.js';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Concrete Equipment' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'CONCRETE' })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TrackingMode, default: TrackingMode.INDIVIDUAL })
  @IsEnum(TrackingMode)
  trackingMode!: TrackingMode;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

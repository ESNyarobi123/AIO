import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AssetCondition } from '../../generated/prisma/client.js';

export class CreateStaffHireItemDto {
  @ApiProperty()
  @IsUUID()
  assetId!: string;

  @ApiPropertyOptional({ enum: AssetCondition, default: AssetCondition.GOOD })
  @IsOptional()
  @IsEnum(AssetCondition)
  conditionOut?: AssetCondition;

  @ApiPropertyOptional({ example: 'Poker, hose, wheel kit' })
  @IsOptional()
  @IsString()
  accessories?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateStaffHireDto {
  @ApiPropertyOptional({
    description: 'Staff member taking the equipment. Defaults to the signed-in user.',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: '2026-11-08T06:30:00.000Z' })
  @IsOptional()
  @IsISO8601()
  issuedAt?: string;

  @ApiPropertyOptional({ example: '2026-11-10T16:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  expectedReturnAt?: string;

  @ApiPropertyOptional({ example: 'Concrete works — slab level 2' })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ example: 'Goba site' })
  @IsOptional()
  @IsString()
  siteLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateStaffHireItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStaffHireItemDto)
  items!: CreateStaffHireItemDto[];
}

export class ReturnStaffHireItemDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiPropertyOptional({ enum: AssetCondition, default: AssetCondition.GOOD })
  @IsOptional()
  @IsEnum(AssetCondition)
  conditionIn?: AssetCondition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnStaffHireDto {
  @ApiPropertyOptional({
    description: 'Return every outstanding item in one punch-out.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  returnAll?: boolean;

  @ApiPropertyOptional({ type: [ReturnStaffHireItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnStaffHireItemDto)
  items?: ReturnStaffHireItemDto[];

  @ApiPropertyOptional({
    description: 'Staff member at the office who received the equipment. Defaults to the signed-in user.',
  })
  @IsOptional()
  @IsUUID()
  receivedById?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelStaffHireDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason!: string;
}

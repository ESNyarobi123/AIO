import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CustomerType } from '../../generated/prisma/client.js';

export class CreateCustomerDto {
  @ApiProperty({ enum: CustomerType, default: CustomerType.INDIVIDUAL })
  @IsEnum(CustomerType)
  customerType!: CustomerType;

  @ApiProperty({ example: 'Kitambulisho' })
  @IsString()
  @MinLength(2)
  fullName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiProperty({ example: '0705313476' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingAddress?: string;

  @ApiPropertyOptional({ example: 'Dangote' })
  @IsOptional()
  @IsString()
  siteAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Optional guarantor' })
  @IsOptional()
  @IsString()
  guarantorFullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guarantorPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guarantorRelationship?: string;
}

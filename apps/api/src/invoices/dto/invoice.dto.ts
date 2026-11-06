import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty()
  @IsUUID()
  rentalId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  dueAt?: string;
}

export class VoidInvoiceDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason!: string;
}

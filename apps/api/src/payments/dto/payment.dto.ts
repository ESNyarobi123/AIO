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
import { PaymentMethod } from '../../generated/prisma/client.js';

export class PaymentAllocationDto {
  @ApiProperty()
  @IsUUID()
  invoiceId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  allocatedAmount!: number;
}

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({ example: 'M-Pesa' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty()
  @IsISO8601()
  receivedAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [PaymentAllocationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations?: PaymentAllocationDto[];
}

export class AllocatePaymentDto {
  @ApiProperty({ type: [PaymentAllocationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations!: PaymentAllocationDto[];
}

export class ReversePaymentDto {
  @ApiProperty()
  @IsString()
  reason!: string;
}

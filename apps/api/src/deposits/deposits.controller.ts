import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { DepositsService } from './deposits.service.js';

class CreateDepositDto {
  @ApiProperty()
  @IsUUID()
  rentalId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  requiredAmount!: number;
}

class AmountDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('Deposits')
@ApiBearerAuth()
@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Post()
  @Permissions('payments.create')
  @ApiOperation({ summary: 'Create security deposit for a rental' })
  create(@Body() dto: CreateDepositDto, @CurrentUser() user: AuthUser) {
    return this.depositsService.create({ ...dto, actor: user });
  }

  @Get(':id')
  @Permissions('payments.read')
  @ApiOperation({ summary: 'Get security deposit ledger' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.depositsService.findOne(id);
  }

  @Post(':id/collect')
  @Permissions('payments.create')
  @ApiOperation({ summary: 'Collect security deposit' })
  collect(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AmountDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.depositsService.collect(id, dto.amount, dto.reference, user);
  }

  @Post(':id/refund')
  @Permissions('payments.create')
  @ApiOperation({ summary: 'Refund held security deposit' })
  refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AmountDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.depositsService.refund(id, dto.amount, dto.reason, user);
  }

  @Post(':id/apply-charge')
  @Permissions('payments.create')
  @ApiOperation({ summary: 'Apply deposit to damage/late charges' })
  applyCharge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AmountDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.depositsService.applyCharge(id, dto.amount, dto.reason, user);
  }
}

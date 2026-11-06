import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import {
  AllocatePaymentDto,
  CreatePaymentDto,
  ReversePaymentDto,
} from './dto/payment.dto.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Permissions('payments.read')
  @ApiOperation({ summary: 'List payments ledger' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.paymentsService.findAll(query.page, query.limit, query.search);
  }

  @Get(':id')
  @Permissions('payments.read')
  @ApiOperation({ summary: 'Get payment / receipt details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Post()
  @Permissions('payments.create')
  @ApiOperation({
    summary: 'Record payment (cash / mobile money / bank / other)',
  })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthUser) {
    return this.paymentsService.create(dto, user);
  }

  @Post(':id/allocate')
  @Permissions('payments.create')
  @ApiOperation({ summary: 'Allocate payment to invoices' })
  allocate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AllocatePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.allocate(id, dto, user);
  }

  @Post(':id/reverse')
  @Permissions('payments.create')
  @ApiOperation({ summary: 'Reverse a payment (ledger event, not delete)' })
  reverse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReversePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.reverse(id, dto, user);
  }
}

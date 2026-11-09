import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Permissions('customers.read')
  @ApiOperation({ summary: 'List customers' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.customersService.findAll(query.page, query.limit, query.search);
  }

  @Get(':id')
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Get customer details and recent rentals' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Get(':id/rentals')
  @Permissions('customers.read')
  @ApiOperation({ summary: 'List customer rental history' })
  rentals(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.rentals(id);
  }

  @Get(':id/balance')
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Get customer outstanding balance' })
  balance(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.balance(id);
  }

  @Get(':id/statement')
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Get customer financial statement' })
  statement(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.statement(id);
  }

  @Post()
  @Permissions('customers.create')
  @ApiOperation({ summary: 'Register a customer' })
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: AuthUser) {
    return this.customersService.create(dto, user);
  }

  @Patch(':id')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Update customer' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Delete a customer that has no history' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.remove(id, user);
  }
}

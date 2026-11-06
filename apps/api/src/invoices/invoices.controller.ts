import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { CreateInvoiceDto, VoidInvoiceDto } from './dto/invoice.dto.js';
import { InvoicesService } from './invoices.service.js';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Permissions('invoices.read')
  @ApiOperation({ summary: 'List invoices' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.invoicesService.findAll(query.page, query.limit, query.search);
  }

  @Get(':id')
  @Permissions('invoices.read')
  @ApiOperation({ summary: 'Get invoice with balance' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findOne(id);
  }

  @Get(':id/pdf')
  @Permissions('invoices.read')
  @Header('Content-Type', 'application/pdf')
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Download rental invoice PDF' })
  async pdf(@Param('id', ParseUUIDPipe) id: string) {
    const buffer = await this.invoicesService.renderPdf(id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="invoice-${id}.pdf"`,
    });
  }

  @Post()
  @Permissions('invoices.create')
  @ApiOperation({ summary: 'Create rental invoice from confirmed rental' })
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.invoicesService.create(dto, user);
  }

  @Post(':id/issue')
  @Permissions('invoices.create')
  @ApiOperation({ summary: 'Issue invoice (immutable thereafter except void)' })
  issue(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoicesService.issue(id, user);
  }

  @Post(':id/void')
  @Permissions('invoices.create')
  @ApiOperation({ summary: 'Void an issued invoice without payments' })
  void(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoicesService.void(id, dto, user);
  }
}

import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { AuditService } from '../common/services/audit.service.js';
import { DocumentNumberService } from '../common/services/document-number.service.js';
import { ok, paginated } from '../common/utils/api-response.js';
import {
  ExpenseStatus,
  PaymentMethod,
  Prisma,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

class CreateExpenseDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  category!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  description!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty()
  @IsISO8601()
  expenseDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedAssetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedRentalId?: string;
}

@Injectable()
class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.expense.count(),
      this.prisma.expense.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { expenseDate: 'desc' },
      }),
    ]);
    return paginated(rows, total, page, limit);
  }

  async create(dto: CreateExpenseDto, actor: AuthUser) {
    const expenseNumber = await this.numbers.next('expense');
    const row = await this.prisma.expense.create({
      data: {
        expenseNumber,
        category: dto.category,
        description: dto.description,
        amount: new Prisma.Decimal(dto.amount),
        expenseDate: new Date(dto.expenseDate),
        supplier: dto.supplier,
        paymentMethod: dto.paymentMethod,
        referenceNumber: dto.referenceNumber,
        relatedAssetId: dto.relatedAssetId,
        relatedRentalId: dto.relatedRentalId,
        status: ExpenseStatus.SUBMITTED,
        createdById: actor.id,
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: 'expense.create',
      entityType: 'expense',
      entityId: row.id,
    });
    return ok(row, { created: true });
  }

  async update(id: string, dto: Partial<CreateExpenseDto>) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense not found');
    const row = await this.prisma.expense.update({
      where: { id },
      data: {
        category: dto.category,
        description: dto.description,
        amount:
          dto.amount !== undefined
            ? new Prisma.Decimal(dto.amount)
            : undefined,
        expenseDate: dto.expenseDate
          ? new Date(dto.expenseDate)
          : undefined,
        supplier: dto.supplier,
        paymentMethod: dto.paymentMethod,
        referenceNumber: dto.referenceNumber,
      },
    });
    return ok(row);
  }

  async approve(id: string, actor: AuthUser) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense not found');
    const row = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.APPROVED,
        approvedById: actor.id,
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: 'expense.approve',
      entityType: 'expense',
      entityId: id,
    });
    return ok(row);
  }
}

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  @Permissions('reports.read')
  @ApiOperation({ summary: 'List expenses' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query.page, query.limit);
  }

  @Post()
  @Permissions('payments.create')
  @ApiOperation({ summary: 'Create expense' })
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Permissions('payments.create')
  @ApiOperation({ summary: 'Update expense' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/approve')
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Approve expense (Admin)' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.approve(id, user);
  }
}

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}

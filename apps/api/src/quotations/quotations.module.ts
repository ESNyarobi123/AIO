import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
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
import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { DocumentNumberService } from '../common/services/document-number.service.js';
import { ok } from '../common/utils/api-response.js';
import {
  Prisma,
  QuotationStatus,
  RentalRequestStatus,
  RentalStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RentalsModule } from '../rentals/rentals.module.js';
import { RentalsService } from '../rentals/rentals.service.js';
import { PricingUnit } from '../generated/prisma/client.js';

class CreateQuotationDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  rentalRequestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountTotal?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryTotal?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxTotal?: number;
}

@Injectable()
class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly rentals: RentalsService,
  ) {}

  async findOne(id: string) {
    const row = await this.prisma.quotation.findUnique({
      where: { id },
      include: { customer: true, rentalRequest: true, rentals: true },
    });
    if (!row) throw new NotFoundException('Quotation not found');
    return ok(row);
  }

  async create(dto: CreateQuotationDto, actor: AuthUser) {
    const quotationNumber = await this.numbers.next('quotation');
    const discountTotal = dto.discountTotal ?? 0;
    const deliveryTotal = dto.deliveryTotal ?? 0;
    const taxTotal = dto.taxTotal ?? 0;
    const grandTotal =
      dto.subtotal - discountTotal + deliveryTotal + taxTotal;

    const row = await this.prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: dto.customerId,
        rentalRequestId: dto.rentalRequestId,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        subtotal: new Prisma.Decimal(dto.subtotal),
        discountTotal: new Prisma.Decimal(discountTotal),
        deliveryTotal: new Prisma.Decimal(deliveryTotal),
        taxTotal: new Prisma.Decimal(taxTotal),
        grandTotal: new Prisma.Decimal(grandTotal),
        status: QuotationStatus.DRAFT,
        preparedById: actor.id,
      },
      include: { customer: true },
    });
    return ok(row, { created: true });
  }

  async issue(id: string, actor: AuthUser) {
    const existing = await this.prisma.quotation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Quotation not found');
    if (existing.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Only draft quotations can be issued');
    }
    const row = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.ISSUED,
        approvedById: actor.id,
      },
    });
    return ok(row);
  }

  async convertToRental(id: string, actor: AuthUser) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        rentalRequest: { include: { items: true } },
      },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (
      !( [QuotationStatus.ISSUED, QuotationStatus.ACCEPTED] as QuotationStatus[]).includes(quotation.status)
    ) {
      throw new BadRequestException(
        'Quotation must be ISSUED/ACCEPTED before conversion',
      );
    }

    const request = quotation.rentalRequest;
    if (!request?.items?.length) {
      throw new BadRequestException(
        'Quotation conversion requires a rental request with items',
      );
    }

    const startAt = request.requestedStartAt.toISOString();
    const expectedReturnAt = request.requestedEndAt.toISOString();
    const durationDays = Math.max(
      1,
      (request.requestedEndAt.getTime() - request.requestedStartAt.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const unitPrice =
      Number(quotation.subtotal) /
      request.items.reduce((sum, i) => sum + i.quantity, 0) /
      durationDays;

    const created = await this.rentals.create(
      {
        customerId: quotation.customerId,
        quotationId: quotation.id,
        startAt,
        expectedReturnAt,
        siteLocation: request.siteLocation ?? undefined,
        deliveryTotal: Number(quotation.deliveryTotal),
        taxTotal: Number(quotation.taxTotal),
        items: request.items.map((item) => ({
          modelId: item.modelId,
          assetId: item.requestedAssetId ?? undefined,
          quantity: item.quantity,
          pricingUnit: PricingUnit.DAY,
          unitPrice,
          agreedDuration: durationDays,
          discountAmount: 0,
        })),
      },
      actor,
    );

    await this.prisma.$transaction([
      this.prisma.quotation.update({
        where: { id },
        data: { status: QuotationStatus.CONVERTED },
      }),
      this.prisma.rentalRequest.update({
        where: { id: request.id },
        data: { status: RentalRequestStatus.CONVERTED },
      }),
    ]);

    // Confirm immediately after conversion for operational flow
    const rentalId = (created as { data: { id: string } }).data.id;
    await this.prisma.rental.update({
      where: { id: rentalId },
      data: { status: RentalStatus.DRAFT },
    });

    return created;
  }
}

@ApiTags('Quotations')
@ApiBearerAuth()
@Controller('quotations')
class QuotationsController {
  constructor(private readonly service: QuotationsService) {}

  @Post()
  @Permissions('rentals.create')
  @ApiOperation({ summary: 'Create quotation' })
  create(@Body() dto: CreateQuotationDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get(':id')
  @Permissions('rentals.read')
  @ApiOperation({ summary: 'Get quotation' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/issue')
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Issue quotation to customer' })
  issue(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.issue(id, user);
  }

  @Post(':id/convert-to-rental')
  @Permissions('rentals.create')
  @ApiOperation({ summary: 'Convert issued quotation into rental draft' })
  convert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.convertToRental(id, user);
  }
}

@Module({
  imports: [RentalsModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
})
export class QuotationsModule {}

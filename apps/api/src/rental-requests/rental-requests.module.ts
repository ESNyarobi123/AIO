import { Module } from '@nestjs/common';
import {
  Body,
  Controller,
  Get,
  Injectable,
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
import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { DocumentNumberService } from '../common/services/document-number.service.js';
import { ok, paginated } from '../common/utils/api-response.js';
import { RentalRequestStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

class RequestItemDto {
  @ApiProperty()
  @IsUUID()
  modelId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requestedAssetId?: string;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

class CreateRentalRequestDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiProperty()
  @IsISO8601()
  requestedStartAt!: string;

  @ApiProperty()
  @IsISO8601()
  requestedEndAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [RequestItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestItemDto)
  items!: RequestItemDto[];
}

@Injectable()
class RentalRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.rentalRequest.count(),
      this.prisma.rentalRequest.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, items: { include: { model: true } } },
      }),
    ]);
    return paginated(rows, total, page, limit);
  }

  async findOne(id: string) {
    const row = await this.prisma.rentalRequest.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { model: true } },
        quotations: true,
      },
    });
    if (!row) throw new NotFoundException('Rental request not found');
    return ok(row);
  }

  async create(dto: CreateRentalRequestDto, actor: AuthUser) {
    const requestNumber = await this.numbers.next('rentalRequest');
    const row = await this.prisma.rentalRequest.create({
      data: {
        requestNumber,
        customerId: dto.customerId,
        requestedStartAt: new Date(dto.requestedStartAt),
        requestedEndAt: new Date(dto.requestedEndAt),
        siteLocation: dto.siteLocation,
        notes: dto.notes,
        status: RentalRequestStatus.SUBMITTED,
        createdById: actor.id,
        items: {
          create: dto.items.map((item) => ({
            modelId: item.modelId,
            requestedAssetId: item.requestedAssetId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        },
      },
      include: { customer: true, items: { include: { model: true } } },
    });
    return ok(row, { created: true });
  }

  async update(id: string, notes?: string, siteLocation?: string) {
    const existing = await this.prisma.rentalRequest.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Rental request not found');
    const row = await this.prisma.rentalRequest.update({
      where: { id },
      data: { notes, siteLocation },
      include: { customer: true, items: true },
    });
    return ok(row);
  }
}

@ApiTags('Rental Requests')
@ApiBearerAuth()
@Controller('rental-requests')
class RentalRequestsController {
  constructor(private readonly service: RentalRequestsService) {}

  @Get()
  @Permissions('rentals.read')
  @ApiOperation({ summary: 'List rental requests' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query.page, query.limit);
  }

  @Get(':id')
  @Permissions('rentals.read')
  @ApiOperation({ summary: 'Get rental request' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('rentals.create')
  @ApiOperation({ summary: 'Create rental request' })
  create(@Body() dto: CreateRentalRequestDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Permissions('rentals.update')
  @ApiOperation({ summary: 'Update rental request notes/location' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { notes?: string; siteLocation?: string },
  ) {
    return this.service.update(id, body.notes, body.siteLocation);
  }
}

@Module({
  controllers: [RentalRequestsController],
  providers: [RentalRequestsService],
  exports: [RentalRequestsService],
})
export class RentalRequestsModule {}

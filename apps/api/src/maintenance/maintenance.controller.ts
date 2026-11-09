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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsEnum,
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
import {
  MaintenancePriority,
  MaintenanceStatus,
} from '../generated/prisma/client.js';
import { MaintenanceService } from './maintenance.service.js';

class CreateMaintenanceDto {
  @ApiProperty()
  @IsUUID()
  assetId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  issueDescription!: string;

  @ApiPropertyOptional({ enum: MaintenancePriority })
  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  laborCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  partsCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCost?: number;
}

class UpdateMaintenanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issueDescription?: string;

  @ApiPropertyOptional({ enum: MaintenancePriority })
  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @ApiPropertyOptional({ enum: MaintenanceStatus })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  laborCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  partsCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCost?: number;
}

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @Permissions('equipment.read')
  @ApiOperation({ summary: 'List maintenance jobs' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.maintenanceService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @Permissions('equipment.read')
  @ApiOperation({ summary: 'Get maintenance job' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenanceService.findOne(id);
  }

  @Post()
  @Permissions('equipment.update')
  @ApiOperation({ summary: 'Open maintenance job and lock asset' })
  create(@Body() dto: CreateMaintenanceDto, @CurrentUser() user: AuthUser) {
    return this.maintenanceService.create(dto, user);
  }

  @Patch(':id')
  @Permissions('equipment.update')
  @ApiOperation({ summary: 'Update maintenance job' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceDto,
  ) {
    return this.maintenanceService.update(id, dto);
  }

  @Post(':id/complete')
  @Permissions('equipment.update')
  @ApiOperation({ summary: 'Mark maintenance completed' })
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.maintenanceService.complete(id, user);
  }

  @Post(':id/return-to-service')
  @Permissions('equipment.update')
  @ApiOperation({ summary: 'Return asset to Available after maintenance' })
  returnToService(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.maintenanceService.returnToService(id, user);
  }

  @Delete(':id')
  @Permissions('equipment.update')
  @ApiOperation({ summary: 'Delete a maintenance job and free the asset' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.maintenanceService.remove(id, user);
  }
}

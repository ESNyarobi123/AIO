import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { SettingsService } from './settings.service.js';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('company')
  @Permissions('settings.read')
  @ApiOperation({ summary: 'Get company settings' })
  get() {
    return this.settingsService.get();
  }

  @Patch('company')
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Update company settings' })
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }
}

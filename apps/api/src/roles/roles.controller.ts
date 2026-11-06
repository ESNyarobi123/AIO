import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { RolesService } from './roles.service.js';

@ApiTags('Roles & Permissions')
@ApiBearerAuth()
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  @Permissions('users.read')
  @ApiOperation({ summary: 'List roles with permissions' })
  listRoles() {
    return this.rolesService.listRoles();
  }

  @Get('permissions')
  @Permissions('users.read')
  @ApiOperation({ summary: 'List all permissions' })
  listPermissions() {
    return this.rolesService.listPermissions();
  }
}

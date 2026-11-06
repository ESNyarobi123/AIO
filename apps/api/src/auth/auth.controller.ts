import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/permissions.decorator.js';
import { ok } from '../common/utils/api-response.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email/username and password' })
  async login(@Body() dto: LoginDto) {
    return ok(await this.authService.login(dto));
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshDto) {
    return ok(await this.authService.refresh(dto.refreshToken));
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout (client should discard tokens; server is stateless JWT)',
  })
  logout() {
    return ok({ success: true });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@CurrentUser() user: AuthUser) {
    return ok(await this.authService.me(user.id));
  }
}

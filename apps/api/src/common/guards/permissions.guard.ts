import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '../decorators/current-user.decorator.js';
import {
  PERMISSIONS_KEY,
  ROLES_KEY,
} from '../decorators/permissions.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0 && requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.roles.includes('ADMIN')) {
      return true;
    }

    if (
      requiredRoles.length > 0 &&
      !requiredRoles.some((role) => user.roles.includes(role))
    ) {
      throw new ForbiddenException('Insufficient role');
    }

    if (
      requiredPermissions.length > 0 &&
      !requiredPermissions.every((permission) =>
        user.permissions.includes(permission),
      )
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

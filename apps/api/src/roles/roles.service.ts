import { Injectable } from '@nestjs/common';
import { ok } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });

    return ok(
      roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        userCount: role._count.userRoles,
        permissions: role.rolePermissions.map((rp) => rp.permission.key),
      })),
    );
  }

  async listPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
    });
    return ok(permissions);
  }
}

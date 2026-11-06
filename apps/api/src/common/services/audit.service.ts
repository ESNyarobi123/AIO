import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? undefined,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? undefined,
        beforeJson:
          input.before === undefined
            ? undefined
            : (input.before as Prisma.InputJsonValue),
        afterJson:
          input.after === undefined
            ? undefined
            : (input.after as Prisma.InputJsonValue),
        reason: input.reason,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetCondition,
  AssetStatus,
  MovementType,
  Prisma,
  StaffHireStatus,
  UserStatus,
} from '../generated/prisma/client.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { AuditService } from '../common/services/audit.service.js';
import { DocumentNumberService } from '../common/services/document-number.service.js';
import { ok, paginated } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CancelStaffHireDto,
  CreateStaffHireDto,
  ReturnStaffHireDto,
  UpdateStaffHireDto,
} from './dto/staff-hire.dto.js';

const staffSelect = { id: true, fullName: true, username: true } as const;

function assetStatusFor(condition: AssetCondition): AssetStatus {
  switch (condition) {
    case AssetCondition.MISSING:
      return AssetStatus.LOST;
    case AssetCondition.DAMAGED:
    case AssetCondition.FAIR:
      return AssetStatus.INSPECTION;
    default:
      return AssetStatus.AVAILABLE;
  }
}

@Injectable()
export class StaffHiresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    status?: StaffHireStatus,
    userId?: string,
    search?: string,
  ) {
    const where: Prisma.StaffHireWhereInput = {
      ...(status ? { status } : {}),
      ...(userId ? { userId } : {}),
      ...(search
        ? {
            OR: [
              { hireNumber: { contains: search, mode: 'insensitive' } },
              { siteLocation: { contains: search, mode: 'insensitive' } },
              { purpose: { contains: search, mode: 'insensitive' } },
              { user: { fullName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.staffHire.count({ where }),
      this.prisma.staffHire.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          user: { select: staffSelect },
          issuedBy: { select: staffSelect },
          receivedBy: { select: staffSelect },
          items: {
            include: {
              asset: true,
              model: { include: { category: true } },
            },
          },
        },
      }),
    ]);

    return paginated(rows, total, page, limit);
  }

  async findOne(id: string) {
    const hire = await this.getOrDefault(id);
    return ok(hire);
  }

  async summary(userId?: string) {
    const open: Prisma.StaffHireWhereInput = {
      status: { in: [StaffHireStatus.ISSUED, StaffHireStatus.PARTIAL] },
    };
    const scoped: Prisma.StaffHireWhereInput = userId
      ? { ...open, userId }
      : open;
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const [outNow, overdue, returnedToday, recent] =
      await this.prisma.$transaction([
        this.prisma.staffHire.count({ where: scoped }),
        this.prisma.staffHire.count({
          where: {
            ...scoped,
            expectedReturnAt: { lt: now },
          },
        }),
        this.prisma.staffHire.count({
          where: {
            ...(userId ? { userId } : {}),
            status: StaffHireStatus.RETURNED,
            returnedAt: { gte: startOfDay },
          },
        }),
        this.prisma.staffHire.findMany({
          where: open,
          take: 5,
          orderBy: { issuedAt: 'desc' },
          include: {
            user: { select: staffSelect },
            items: { include: { asset: true, model: true } },
          },
        }),
      ]);

    return ok({
      outNow,
      overdue,
      returnedToday,
      mineOpen: userId ? outNow : 0,
      recent,
    });
  }

  async create(dto: CreateStaffHireDto, actor: AuthUser) {
    if (!dto.items?.length) {
      throw new BadRequestException('Add at least one asset to the hire');
    }

    const borrowerId = dto.userId ?? actor.id;
    const borrower = await this.prisma.user.findUnique({
      where: { id: borrowerId },
    });
    if (!borrower) throw new NotFoundException('Staff member not found');
    if (borrower.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('That staff account is not active');
    }

    const assetIds = dto.items.map((item) => item.assetId);
    if (new Set(assetIds).size !== assetIds.length) {
      throw new BadRequestException('The same asset was added twice');
    }

    const assets = await this.prisma.equipmentAsset.findMany({
      where: { id: { in: assetIds } },
    });
    if (assets.length !== assetIds.length) {
      throw new NotFoundException('One or more assets were not found');
    }

    const unavailable = assets.filter(
      (asset) => asset.status !== AssetStatus.AVAILABLE,
    );
    if (unavailable.length) {
      throw new ConflictException(
        `Not available right now: ${unavailable
          .map((asset) => `${asset.assetCode} (${asset.status})`)
          .join(', ')}`,
      );
    }

    const issuedAt = dto.issuedAt ? new Date(dto.issuedAt) : new Date();
    if (Number.isNaN(issuedAt.getTime())) {
      throw new BadRequestException('issuedAt is not a valid date');
    }
    const expectedReturnAt = dto.expectedReturnAt
      ? new Date(dto.expectedReturnAt)
      : null;
    if (expectedReturnAt && expectedReturnAt <= issuedAt) {
      throw new BadRequestException(
        'Expected return must be after the issue time',
      );
    }

    const hireNumber = await this.numbers.next('staffHire');
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));

    const hire = await this.prisma.$transaction(async (tx) => {
      const created = await tx.staffHire.create({
        data: {
          hireNumber,
          userId: borrowerId,
          issuedById: actor.id,
          issuedAt,
          expectedReturnAt,
          purpose: dto.purpose,
          siteLocation: dto.siteLocation,
          notes: dto.notes,
          status: StaffHireStatus.ISSUED,
          items: {
            create: dto.items.map((item) => ({
              assetId: item.assetId,
              modelId: assetById.get(item.assetId)!.modelId,
              conditionOut: item.conditionOut ?? AssetCondition.GOOD,
              accessories: item.accessories,
              notes: item.notes,
            })),
          },
        },
        include: {
          user: { select: staffSelect },
          issuedBy: { select: staffSelect },
          items: { include: { asset: true, model: true } },
        },
      });

      for (const item of created.items) {
        await tx.equipmentAsset.update({
          where: { id: item.assetId },
          data: { status: AssetStatus.RENTED },
        });
        await tx.inventoryMovement.create({
          data: {
            assetId: item.assetId,
            modelId: item.modelId,
            movementType: MovementType.DISPATCH,
            fromStatus: AssetStatus.AVAILABLE,
            toStatus: AssetStatus.RENTED,
            referenceType: 'staff_hire',
            referenceId: created.id,
            reason: `Internal hire to ${borrower.fullName}${dto.siteLocation ? ` — ${dto.siteLocation}` : ''}`,
            performedById: actor.id,
          },
        });
      }

      return created;
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'staffHire.issue',
      entityType: 'staff_hire',
      entityId: hire.id,
      after: {
        hireNumber,
        borrower: borrower.fullName,
        assets: hire.items.map((item) => item.asset.assetCode),
      },
      reason: dto.purpose,
    });

    return ok(hire, { created: true });
  }

  /**
   * Edit the header of a hire card (who/where/when). Line items are locked to
   * the punch-out flow so stock counts never drift.
   */
  async update(id: string, dto: UpdateStaffHireDto) {
    const hire = await this.getOrDefault(id);
    if (hire.status === StaffHireStatus.CANCELLED) {
      throw new BadRequestException('A cancelled hire cannot be edited');
    }

    const expectedReturnAt = dto.expectedReturnAt
      ? new Date(dto.expectedReturnAt)
      : undefined;
    if (expectedReturnAt && Number.isNaN(expectedReturnAt.getTime())) {
      throw new BadRequestException('expectedReturnAt is not a valid date');
    }
    if (expectedReturnAt && expectedReturnAt <= hire.issuedAt) {
      throw new BadRequestException(
        'Expected return must be after the issue time',
      );
    }

    const updated = await this.prisma.staffHire.update({
      where: { id },
      data: {
        expectedReturnAt,
        purpose: dto.purpose,
        siteLocation: dto.siteLocation,
        notes: dto.notes,
      },
      include: {
        user: { select: staffSelect },
        issuedBy: { select: staffSelect },
        receivedBy: { select: staffSelect },
        items: { include: { asset: true, model: true } },
      },
    });

    await this.audit.log({
      actorUserId: hire.issuedById ?? hire.userId,
      action: 'staffHire.update',
      entityType: 'staff_hire',
      entityId: id,
      before: {
        purpose: hire.purpose,
        siteLocation: hire.siteLocation,
        expectedReturnAt: hire.expectedReturnAt,
      },
      after: {
        purpose: updated.purpose,
        siteLocation: updated.siteLocation,
        expectedReturnAt: updated.expectedReturnAt,
      },
    });

    return ok(updated);
  }

  /** Only closed hire cards are removed; open issues must be returned first. */
  async remove(id: string, actor: AuthUser) {
    if (!actor.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only an administrator can delete records');
    }
    const hire = await this.getOrDefault(id);
    if (
      hire.status === StaffHireStatus.ISSUED ||
      hire.status === StaffHireStatus.PARTIAL
    ) {
      throw new ConflictException(
        `${hire.hireNumber} still has equipment out. Record the return or cancel the hire before deleting it.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.staffHireItem.deleteMany({ where: { staffHireId: id } });
      await tx.staffHire.delete({ where: { id } });
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'staffHire.delete',
      entityType: 'staff_hire',
      entityId: id,
      before: { hireNumber: hire.hireNumber, status: hire.status },
    });

    return ok({ id, deleted: true });
  }

  async returnItems(id: string, dto: ReturnStaffHireDto, actor: AuthUser) {
    const hire = await this.getOrDefault(id);
    if (hire.status === StaffHireStatus.CANCELLED) {
      throw new BadRequestException('This hire was cancelled');
    }
    if (hire.status === StaffHireStatus.RETURNED) {
      throw new BadRequestException('Every asset on this hire is already back');
    }

    const outstanding = hire.items.filter((item) => !item.returnedAt);
    const requested =
      dto.returnAll || !dto.items?.length
        ? outstanding.map((item) => ({
            itemId: item.id,
            conditionIn: AssetCondition.GOOD,
            notes: undefined as string | undefined,
          }))
        : dto.items;

    if (!requested.length) {
      throw new BadRequestException('Select at least one asset to return');
    }

    const outstandingById = new Map(outstanding.map((item) => [item.id, item]));
    for (const entry of requested) {
      if (!outstandingById.has(entry.itemId)) {
        throw new BadRequestException(
          'One of the selected assets is not outstanding on this hire',
        );
      }
    }

    const receivedById = dto.receivedById ?? actor.id;
    const receivedBy = await this.prisma.user.findUnique({
      where: { id: receivedById },
    });
    if (!receivedBy) throw new NotFoundException('Receiving staff not found');

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const entry of requested) {
        const item = outstandingById.get(entry.itemId)!;
        const conditionIn = entry.conditionIn ?? AssetCondition.GOOD;
        const toStatus = assetStatusFor(conditionIn);

        await tx.staffHireItem.update({
          where: { id: item.id },
          data: {
            conditionIn,
            returnedAt: now,
            notes: entry.notes ?? item.notes,
          },
        });

        await tx.equipmentAsset.update({
          where: { id: item.assetId },
          data: {
            status: toStatus,
            condition: conditionIn,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            assetId: item.assetId,
            modelId: item.modelId,
            movementType: MovementType.RETURN,
            fromStatus: AssetStatus.RENTED,
            toStatus,
            referenceType: 'staff_hire',
            referenceId: hire.id,
            reason: `Returned by ${hire.user.fullName}, received by ${receivedBy.fullName}`,
            performedById: actor.id,
          },
        });
      }

      const remaining = outstanding.length - requested.length;
      return tx.staffHire.update({
        where: { id: hire.id },
        data: {
          ...(remaining <= 0
            ? {
                status: StaffHireStatus.RETURNED,
                returnedAt: now,
                receivedById,
                notes: dto.notes ?? hire.notes,
              }
            : { status: StaffHireStatus.PARTIAL }),
        },
        include: {
          user: { select: staffSelect },
          issuedBy: { select: staffSelect },
          receivedBy: { select: staffSelect },
          items: { include: { asset: true, model: true } },
        },
      });
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'staffHire.return',
      entityType: 'staff_hire',
      entityId: hire.id,
      after: {
        hireNumber: hire.hireNumber,
        returned: requested.map((entry) => entry.itemId),
        status: updated.status,
        receivedBy: receivedBy.fullName,
      },
    });

    return ok(updated);
  }

  async cancel(id: string, dto: CancelStaffHireDto, actor: AuthUser) {
    const hire = await this.getOrDefault(id);
    if (hire.status === StaffHireStatus.CANCELLED) {
      throw new BadRequestException('This hire is already cancelled');
    }
    if (hire.items.some((item) => item.returnedAt)) {
      throw new BadRequestException(
        'Assets have already started coming back — record a return instead',
      );
    }

    const cancelled = await this.prisma.$transaction(async (tx) => {
      for (const item of hire.items) {
        await tx.equipmentAsset.update({
          where: { id: item.assetId },
          data: { status: AssetStatus.AVAILABLE },
        });
        await tx.inventoryMovement.create({
          data: {
            assetId: item.assetId,
            modelId: item.modelId,
            movementType: MovementType.RESTORE,
            fromStatus: AssetStatus.RENTED,
            toStatus: AssetStatus.AVAILABLE,
            referenceType: 'staff_hire',
            referenceId: hire.id,
            reason: `Hire cancelled — ${dto.reason}`,
            performedById: actor.id,
          },
        });
      }
      return tx.staffHire.update({
        where: { id: hire.id },
        data: { status: StaffHireStatus.CANCELLED, notes: dto.reason },
        include: { items: { include: { asset: true, model: true } } },
      });
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'staffHire.cancel',
      entityType: 'staff_hire',
      entityId: hire.id,
      after: { hireNumber: hire.hireNumber, status: cancelled.status },
      reason: dto.reason,
    });

    return ok(cancelled);
  }

  private async getOrDefault(id: string) {
    const hire = await this.prisma.staffHire.findUnique({
      where: { id },
      include: {
        user: { select: staffSelect },
        issuedBy: { select: staffSelect },
        receivedBy: { select: staffSelect },
        items: {
          orderBy: { createdAt: 'asc' },
          include: { asset: true, model: { include: { category: true } } },
        },
      },
    });
    if (!hire) throw new NotFoundException('Staff hire not found');
    return hire;
  }
}

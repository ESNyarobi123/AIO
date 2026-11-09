import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetStatus,
  MaintenancePriority,
  MaintenanceStatus,
  MovementType,
  Prisma,
} from '../generated/prisma/client.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { AuditService } from '../common/services/audit.service.js';
import { DocumentNumberService } from '../common/services/document-number.service.js';
import { assertCanDelete } from '../common/utils/delete-guard.js';
import { ok, paginated } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.maintenanceJob.count(),
      this.prisma.maintenanceJob.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { asset: { include: { model: true } } },
      }),
    ]);
    return paginated(rows, total, page, limit);
  }

  async findOne(id: string) {
    const job = await this.prisma.maintenanceJob.findUnique({
      where: { id },
      include: {
        asset: { include: { model: true } },
        reportedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!job) throw new NotFoundException('Maintenance job not found');
    return ok(job);
  }

  async create(
    input: {
      assetId: string;
      issueDescription: string;
      priority?: MaintenancePriority;
      laborCost?: number;
      partsCost?: number;
      otherCost?: number;
    },
    actor: AuthUser,
  ) {
    const asset = await this.prisma.equipmentAsset.findUnique({
      where: { id: input.assetId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const maintenanceNumber = await this.numbers.next('maintenance');
    const labor = input.laborCost ?? 0;
    const parts = input.partsCost ?? 0;
    const other = input.otherCost ?? 0;
    const total = labor + parts + other;

    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceJob.create({
        data: {
          maintenanceNumber,
          assetId: asset.id,
          issueDescription: input.issueDescription,
          priority: input.priority ?? MaintenancePriority.MEDIUM,
          status: MaintenanceStatus.OPEN,
          laborCost: new Prisma.Decimal(labor),
          partsCost: new Prisma.Decimal(parts),
          otherCost: new Prisma.Decimal(other),
          totalCost: new Prisma.Decimal(total),
          reportedById: actor.id,
        },
        include: { asset: true },
      });

      await tx.equipmentAsset.update({
        where: { id: asset.id },
        data: { status: AssetStatus.MAINTENANCE },
      });
      await tx.inventoryMovement.create({
        data: {
          assetId: asset.id,
          modelId: asset.modelId,
          movementType: MovementType.MAINTENANCE,
          fromStatus: asset.status,
          toStatus: AssetStatus.MAINTENANCE,
          referenceType: 'maintenance',
          referenceId: created.id,
          reason: input.issueDescription,
          performedById: actor.id,
        },
      });
      return created;
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'maintenance.create',
      entityType: 'maintenance_job',
      entityId: job.id,
    });

    return ok(job, { created: true });
  }

  async update(
    id: string,
    data: {
      issueDescription?: string;
      priority?: MaintenancePriority;
      status?: MaintenanceStatus;
      laborCost?: number;
      partsCost?: number;
      otherCost?: number;
    },
  ) {
    const existing = await this.prisma.maintenanceJob.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Maintenance job not found');

    const labor = data.laborCost ?? Number(existing.laborCost);
    const parts = data.partsCost ?? Number(existing.partsCost);
    const other = data.otherCost ?? Number(existing.otherCost);

    const job = await this.prisma.maintenanceJob.update({
      where: { id },
      data: {
        issueDescription: data.issueDescription,
        priority: data.priority,
        status: data.status,
        laborCost: new Prisma.Decimal(labor),
        partsCost: new Prisma.Decimal(parts),
        otherCost: new Prisma.Decimal(other),
        totalCost: new Prisma.Decimal(labor + parts + other),
        startedAt:
          data.status === MaintenanceStatus.IN_PROGRESS && !existing.startedAt
            ? new Date()
            : undefined,
      },
      include: { asset: true },
    });
    return ok(job);
  }

  async complete(id: string, actor: AuthUser) {
    const existing = await this.prisma.maintenanceJob.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Maintenance job not found');

    const job = await this.prisma.maintenanceJob.update({
      where: { id },
      data: {
        status: MaintenanceStatus.COMPLETED,
        completedAt: new Date(),
        approvedById: actor.id,
      },
      include: { asset: true },
    });
    return ok(job);
  }

  async returnToService(id: string, actor: AuthUser) {
    const existing = await this.prisma.maintenanceJob.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Maintenance job not found');
    if (existing.status !== MaintenanceStatus.COMPLETED) {
      throw new BadRequestException(
        'Complete maintenance before returning asset to service',
      );
    }

    const job = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.equipmentAsset.findUniqueOrThrow({
        where: { id: existing.assetId },
      });
      await tx.equipmentAsset.update({
        where: { id: existing.assetId },
        data: { status: AssetStatus.AVAILABLE },
      });
      await tx.inventoryMovement.create({
        data: {
          assetId: existing.assetId,
          modelId: asset.modelId,
          movementType: MovementType.RESTORE,
          fromStatus: asset.status,
          toStatus: AssetStatus.AVAILABLE,
          referenceType: 'maintenance',
          referenceId: id,
          reason: 'Returned to service',
          performedById: actor.id,
        },
      });
      return tx.maintenanceJob.findUniqueOrThrow({
        where: { id },
        include: { asset: true },
      });
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'maintenance.return_to_service',
      entityType: 'maintenance_job',
      entityId: id,
    });

    return ok(job);
  }

  /**
   * Cancelling a maintenance record must not leave the machine stuck in
   * MAINTENANCE. If this was the only open job the asset goes back to Available.
   */
  async remove(id: string, actor: AuthUser) {
    assertCanDelete(actor);
    const job = await this.prisma.maintenanceJob.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!job) throw new NotFoundException('Maintenance job not found');

    const restored = await this.prisma.$transaction(async (tx) => {
      const otherOpen = await tx.maintenanceJob.count({
        where: {
          assetId: job.assetId,
          id: { not: id },
          status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS] },
        },
      });

      await tx.maintenanceJob.delete({ where: { id } });

      if (
        otherOpen === 0 &&
        job.asset.status === AssetStatus.MAINTENANCE
      ) {
        await tx.equipmentAsset.update({
          where: { id: job.assetId },
          data: { status: AssetStatus.AVAILABLE },
        });
        await tx.inventoryMovement.create({
          data: {
            assetId: job.assetId,
            modelId: job.asset.modelId,
            movementType: MovementType.RESTORE,
            fromStatus: AssetStatus.MAINTENANCE,
            toStatus: AssetStatus.AVAILABLE,
            referenceType: 'maintenance',
            reason: 'Maintenance cancelled',
            performedById: actor.id,
          },
        });
        return true;
      }
      return false;
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'maintenance.delete',
      entityType: 'maintenance_job',
      entityId: id,
      before: {
        maintenanceNumber: job.maintenanceNumber,
        status: job.status,
        assetId: job.assetId,
      },
    });

    return ok({ id, deleted: true, assetRestored: restored });
  }
}

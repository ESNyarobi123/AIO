import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, Prisma } from '../generated/prisma/client.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { AuditService } from '../common/services/audit.service.js';
import { ok } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePriceDto, UpdatePriceDto } from './dto/pricing.dto.js';

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listForModel(modelId: string) {
    const model = await this.prisma.equipmentModel.findUnique({
      where: { id: modelId },
    });
    if (!model) throw new NotFoundException('Equipment model not found');

    const prices = await this.prisma.equipmentPrice.findMany({
      where: { modelId },
      orderBy: [{ pricingUnit: 'asc' }, { createdAt: 'desc' }],
    });
    return ok(prices);
  }

  async create(dto: CreatePriceDto) {
    const model = await this.prisma.equipmentModel.findUnique({
      where: { id: dto.modelId },
    });
    if (!model) throw new NotFoundException('Equipment model not found');

    const price = await this.prisma.equipmentPrice.create({
      data: {
        modelId: dto.modelId,
        assetId: dto.assetId,
        pricingUnit: dto.pricingUnit,
        amount: new Prisma.Decimal(dto.amount),
        minimumDuration: dto.minimumDuration,
        isActive: dto.isActive ?? true,
      },
    });
    return ok(price, { created: true });
  }

  async update(id: string, dto: UpdatePriceDto) {
    const existing = await this.prisma.equipmentPrice.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Price not found');

    const price = await this.prisma.equipmentPrice.update({
      where: { id },
      data: {
        amount:
          dto.amount !== undefined
            ? new Prisma.Decimal(dto.amount)
            : undefined,
        minimumDuration: dto.minimumDuration,
        isActive: dto.isActive,
      },
    });
    return ok(price);
  }

  async requestOverride(input: {
    rentalItemId: string;
    proposedPrice: number;
    discountReason: string;
    actor: AuthUser;
  }) {
    const item = await this.prisma.rentalItem.findUnique({
      where: { id: input.rentalItemId },
      include: { rental: true },
    });
    if (!item) throw new NotFoundException('Rental item not found');

    const approval = await this.prisma.priceApproval.create({
      data: {
        rentalId: item.rentalId,
        rentalItemId: item.id,
        standardPrice: item.unitPrice,
        proposedPrice: new Prisma.Decimal(input.proposedPrice),
        discountReason: input.discountReason,
        requestedById: input.actor.id,
        status: ApprovalStatus.PENDING,
      },
    });

    await this.audit.log({
      actorUserId: input.actor.id,
      action: 'pricing.override_request',
      entityType: 'price_approval',
      entityId: approval.id,
    });

    return ok(approval, { created: true });
  }

  async decideOverride(
    id: string,
    decision: 'approve' | 'reject',
    actor: AuthUser,
  ) {
    if (!actor.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only Admin can approve/reject overrides');
    }

    const existing = await this.prisma.priceApproval.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Price override request not found');
    if (existing.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Override request is not pending');
    }
    if (existing.requestedById === actor.id) {
      throw new ForbiddenException(
        'Requester cannot approve their own price override',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.priceApproval.update({
        where: { id },
        data: {
          status:
            decision === 'approve'
              ? ApprovalStatus.APPROVED
              : ApprovalStatus.REJECTED,
          approvedById: actor.id,
          approvedAt: new Date(),
          approvedPrice:
            decision === 'approve' ? existing.proposedPrice : undefined,
        },
      });

      if (decision === 'approve') {
        await tx.rentalItem.update({
          where: { id: existing.rentalItemId },
          data: {
            unitPrice: existing.proposedPrice,
            lineSubtotal: new Prisma.Decimal(
              Number(existing.proposedPrice) *
                Number(
                  (
                    await tx.rentalItem.findUniqueOrThrow({
                      where: { id: existing.rentalItemId },
                    })
                  ).agreedDuration,
                ) *
                (
                  await tx.rentalItem.findUniqueOrThrow({
                    where: { id: existing.rentalItemId },
                  })
                ).quantity,
            ),
            discountAmount: new Prisma.Decimal(
              Number(existing.standardPrice) - Number(existing.proposedPrice),
            ),
          },
        });
      }

      return row;
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: `pricing.override_${decision}`,
      entityType: 'price_approval',
      entityId: id,
    });

    return ok(updated);
  }
}

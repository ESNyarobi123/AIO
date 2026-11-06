import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DepositStatus,
  DepositTransactionType,
  Prisma,
} from '../generated/prisma/client.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { AuditService } from '../common/services/audit.service.js';
import { ok } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DepositsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: {
    rentalId: string;
    requiredAmount: number;
    actor: AuthUser;
  }) {
    const rental = await this.prisma.rental.findUnique({
      where: { id: input.rentalId },
    });
    if (!rental) throw new NotFoundException('Rental not found');

    const deposit = await this.prisma.securityDeposit.create({
      data: {
        rentalId: rental.id,
        customerId: rental.customerId,
        requiredAmount: new Prisma.Decimal(input.requiredAmount),
        status: DepositStatus.PENDING,
      },
    });

    await this.audit.log({
      actorUserId: input.actor.id,
      action: 'deposit.create',
      entityType: 'security_deposit',
      entityId: deposit.id,
    });

    return ok(deposit, { created: true });
  }

  async findOne(id: string) {
    const deposit = await this.prisma.securityDeposit.findUnique({
      where: { id },
      include: { transactions: true, rental: true, customer: true },
    });
    if (!deposit) throw new NotFoundException('Deposit not found');
    return ok(deposit);
  }

  async collect(
    id: string,
    amount: number,
    reference: string | undefined,
    actor: AuthUser,
  ) {
    return this.mutate(id, DepositTransactionType.COLLECT, amount, reference, actor);
  }

  async refund(
    id: string,
    amount: number,
    reason: string | undefined,
    actor: AuthUser,
  ) {
    return this.mutate(id, DepositTransactionType.REFUND, amount, reason, actor);
  }

  async applyCharge(
    id: string,
    amount: number,
    reason: string | undefined,
    actor: AuthUser,
  ) {
    return this.mutate(
      id,
      DepositTransactionType.APPLY_TO_CHARGE,
      amount,
      reason,
      actor,
    );
  }

  private async mutate(
    id: string,
    type: DepositTransactionType,
    amount: number,
    reference: string | undefined,
    actor: AuthUser,
  ) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const deposit = await this.prisma.securityDeposit.findUnique({
      where: { id },
    });
    if (!deposit) throw new NotFoundException('Deposit not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.depositTransaction.create({
        data: {
          securityDepositId: id,
          transactionType: type,
          amount: new Prisma.Decimal(amount),
          reference,
          reason: reference,
          performedById: actor.id,
        },
      });

      let collected = Number(deposit.collectedAmount);
      let refunded = Number(deposit.refundedAmount);
      let applied = Number(deposit.appliedAmount);

      if (type === DepositTransactionType.COLLECT) collected += amount;
      if (type === DepositTransactionType.REFUND) {
        if (amount > collected - refunded - applied) {
          throw new BadRequestException('Refund exceeds held deposit');
        }
        refunded += amount;
      }
      if (type === DepositTransactionType.APPLY_TO_CHARGE) {
        if (amount > collected - refunded - applied) {
          throw new BadRequestException('Apply amount exceeds held deposit');
        }
        applied += amount;
      }

      let status: DepositStatus = DepositStatus.HELD;
      const held = collected - refunded - applied;
      if (collected <= 0) status = DepositStatus.PENDING;
      else if (held <= 0 && refunded > 0 && applied === 0)
        status = DepositStatus.REFUNDED;
      else if (held <= 0 && applied > 0) status = DepositStatus.APPLIED;
      else if (refunded > 0) status = DepositStatus.PARTIALLY_REFUNDED;
      else status = DepositStatus.HELD;

      return tx.securityDeposit.update({
        where: { id },
        data: {
          collectedAmount: new Prisma.Decimal(collected),
          refundedAmount: new Prisma.Decimal(refunded),
          appliedAmount: new Prisma.Decimal(applied),
          status,
        },
        include: { transactions: true },
      });
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: `deposit.${type.toLowerCase()}`,
      entityType: 'security_deposit',
      entityId: id,
      after: { amount, type },
    });

    return ok(updated);
  }
}

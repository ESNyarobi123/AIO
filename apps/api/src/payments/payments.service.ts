import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentStatus,
  Prisma,
} from '../generated/prisma/client.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { AuditService } from '../common/services/audit.service.js';
import { DocumentNumberService } from '../common/services/document-number.service.js';
import { ok, paginated } from '../common/utils/api-response.js';
import { InvoicesService } from '../invoices/invoices.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AllocatePaymentDto,
  CreatePaymentDto,
  ReversePaymentDto,
} from './dto/payment.dto.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
    private readonly invoices: InvoicesService,
  ) {}

  async findAll(page = 1, limit = 20, search?: string) {
    const where: Prisma.PaymentWhereInput = search
      ? {
          OR: [
            { paymentNumber: { contains: search, mode: 'insensitive' } },
            { referenceNumber: { contains: search, mode: 'insensitive' } },
            {
              customer: {
                fullName: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        }
      : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { receivedAt: 'desc' },
        include: {
          customer: true,
          allocations: { include: { invoice: true } },
          receivedBy: { select: { id: true, fullName: true, username: true } },
        },
      }),
    ]);
    return paginated(rows, total, page, limit);
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        allocations: { include: { invoice: true } },
        receivedBy: { select: { id: true, fullName: true, username: true } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return ok(payment);
  }

  async create(dto: CreatePaymentDto, actor: AuthUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const allocations = dto.allocations ?? [];
    const allocatedSum = allocations.reduce(
      (sum, a) => sum + a.allocatedAmount,
      0,
    );
    if (allocatedSum > dto.amount + 0.0001) {
      throw new BadRequestException(
        'Allocated amount cannot exceed payment amount',
      );
    }

    const paymentNumber = await this.numbers.next('payment');

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          paymentNumber,
          customerId: dto.customerId,
          amount: new Prisma.Decimal(dto.amount),
          method: dto.method,
          provider: dto.provider,
          referenceNumber: dto.referenceNumber,
          receivedAt: new Date(dto.receivedAt),
          notes: dto.notes,
          receivedById: actor.id,
          status:
            allocations.length > 0
              ? PaymentStatus.ALLOCATED
              : PaymentStatus.RECORDED,
          allocations: allocations.length
            ? {
                create: allocations.map((a) => ({
                  invoiceId: a.invoiceId,
                  allocatedAmount: new Prisma.Decimal(a.allocatedAmount),
                })),
              }
            : undefined,
        },
        include: {
          allocations: { include: { invoice: true } },
          customer: true,
          receivedBy: { select: { id: true, fullName: true, username: true } },
        },
      });

      for (const alloc of allocations) {
        const invoice = await tx.invoice.findUnique({
          where: { id: alloc.invoiceId },
        });
        if (!invoice) {
          throw new NotFoundException(`Invoice ${alloc.invoiceId} not found`);
        }
        if (invoice.customerId !== dto.customerId) {
          throw new BadRequestException(
            'Invoice does not belong to this customer',
          );
        }

        await this.invoices.recalculateStatus(alloc.invoiceId, tx);

        const rental = await tx.rental.findUnique({
          where: { id: invoice.rentalId },
        });
        if (rental) {
          const invoiceFull = await tx.invoice.findUnique({
            where: { id: invoice.id },
            include: { allocations: true },
          });
          const paidOnInvoice =
            invoiceFull?.allocations.reduce(
              (sum, a) => sum + Number(a.allocatedAmount),
              0,
            ) ?? 0;
          // Recompute rental paid/balance from all non-void invoices
          const invoices = await tx.invoice.findMany({
            where: {
              rentalId: rental.id,
              status: { not: 'VOID' },
            },
            include: { allocations: true },
          });
          const amountPaid = invoices.reduce(
            (sum, inv) =>
              sum +
              inv.allocations.reduce(
                (s, a) => s + Number(a.allocatedAmount),
                0,
              ),
            0,
          );
          const grand = Number(rental.grandTotal);
          await tx.rental.update({
            where: { id: rental.id },
            data: {
              amountPaidCached: new Prisma.Decimal(amountPaid),
              balanceCached: new Prisma.Decimal(grand - amountPaid),
            },
          });
          void paidOnInvoice;
        }
      }

      return created;
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'payment.create',
      entityType: 'payment',
      entityId: payment.id,
      after: {
        paymentNumber,
        amount: dto.amount,
        method: dto.method,
      },
    });

    return ok(payment, {
      created: true,
      receipt: {
        receiptNumber: payment.paymentNumber,
        amountReceived: payment.amount,
        method: payment.method,
        reference: payment.referenceNumber,
        receivedBy: payment.receivedBy,
      },
    });
  }

  async allocate(id: string, dto: AllocatePaymentDto, actor: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { allocations: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.REVERSED) {
      throw new BadRequestException('Cannot allocate a reversed payment');
    }

    const already = payment.allocations.reduce(
      (sum, a) => sum + Number(a.allocatedAmount),
      0,
    );
    const next = dto.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    if (already + next > Number(payment.amount) + 0.0001) {
      throw new BadRequestException('Allocation exceeds payment amount');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.paymentAllocation.createMany({
        data: dto.allocations.map((a) => ({
          paymentId: id,
          invoiceId: a.invoiceId,
          allocatedAmount: new Prisma.Decimal(a.allocatedAmount),
        })),
      });
      await tx.payment.update({
        where: { id },
        data: { status: PaymentStatus.ALLOCATED },
      });
      for (const a of dto.allocations) {
        await this.invoices.recalculateStatus(a.invoiceId, tx);
      }
      return tx.payment.findUniqueOrThrow({
        where: { id },
        include: { allocations: { include: { invoice: true } }, customer: true },
      });
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'payment.allocate',
      entityType: 'payment',
      entityId: id,
    });

    return ok(updated);
  }

  async reverse(id: string, dto: ReversePaymentDto, actor: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { allocations: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.REVERSED) {
      throw new BadRequestException('Payment already reversed');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const invoiceIds = payment.allocations.map((a) => a.invoiceId);
      await tx.paymentAllocation.deleteMany({ where: { paymentId: id } });
      const row = await tx.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.REVERSED,
          notes: payment.notes
            ? `${payment.notes}\nREVERSED: ${dto.reason}`
            : `REVERSED: ${dto.reason}`,
        },
      });
      for (const invoiceId of invoiceIds) {
        await this.invoices.recalculateStatus(invoiceId, tx);
      }
      return row;
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'payment.reverse',
      entityType: 'payment',
      entityId: id,
      reason: dto.reason,
    });

    return ok(updated);
  }
}

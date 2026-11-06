import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  InvoiceStatus,
  Prisma,
  RentalStatus,
} from '../generated/prisma/client.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { AuditService } from '../common/services/audit.service.js';
import { DocumentNumberService } from '../common/services/document-number.service.js';
import { ok, paginated } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInvoiceDto, VoidInvoiceDto } from './dto/invoice.dto.js';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, limit = 20, search?: string) {
    const where: Prisma.InvoiceWhereInput = search
      ? {
          OR: [
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
            {
              customer: {
                fullName: { contains: search, mode: 'insensitive' },
              },
            },
            {
              rental: {
                rentalNumber: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        }
      : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          rental: true,
          items: true,
          allocations: true,
        },
      }),
    ]);
    return paginated(rows, total, page, limit);
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        rental: true,
        items: true,
        allocations: { include: { payment: true } },
        issuedBy: { select: { id: true, fullName: true, username: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const paid = invoice.allocations.reduce(
      (sum, a) => sum + Number(a.allocatedAmount),
      0,
    );
    return ok({
      ...invoice,
      amountPaid: paid,
      balanceDue: Number(invoice.grandTotal) - paid,
    });
  }

  async create(dto: CreateInvoiceDto, actor: AuthUser) {
    const rental = await this.prisma.rental.findUnique({
      where: { id: dto.rentalId },
      include: { items: { include: { model: true } }, customer: true },
    });
    if (!rental) throw new NotFoundException('Rental not found');
    if (
      ([RentalStatus.DRAFT, RentalStatus.CANCELLED] as RentalStatus[]).includes(rental.status)
    ) {
      throw new BadRequestException(
        'Cannot invoice a draft or cancelled rental',
      );
    }

    const existing = await this.prisma.invoice.findFirst({
      where: {
        rentalId: rental.id,
        status: { not: InvoiceStatus.VOID },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Active invoice already exists: ${existing.invoiceNumber}`,
      );
    }

    const invoiceNumber = await this.numbers.next('invoice');
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: rental.customerId,
        rentalId: rental.id,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : rental.expectedReturnAt,
        subtotal: rental.subtotal,
        discountTotal: rental.discountTotal,
        deliveryTotal: rental.deliveryTotal,
        taxTotal: rental.taxTotal,
        grandTotal: rental.grandTotal,
        status: InvoiceStatus.DRAFT,
        issuedById: actor.id,
        items: {
          create: [
            ...rental.items.map((item) => ({
              description: `${item.model.name} (${item.pricingUnit} x ${item.agreedDuration})`,
              quantity: item.agreedDuration,
              unit: item.pricingUnit,
              unitPrice: item.unitPrice,
              lineTotal: new Prisma.Decimal(
                Number(item.lineSubtotal) - Number(item.discountAmount),
              ),
              sourceRentalItemId: item.id,
            })),
            ...(Number(rental.deliveryTotal) > 0
              ? [
                  {
                    description: 'Delivery / transport',
                    quantity: new Prisma.Decimal(1),
                    unit: 'SERVICE',
                    unitPrice: rental.deliveryTotal,
                    lineTotal: rental.deliveryTotal,
                  },
                ]
              : []),
          ],
        },
      },
      include: { items: true, customer: true, rental: true },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'invoice.create',
      entityType: 'invoice',
      entityId: invoice.id,
      after: { invoiceNumber },
    });

    return ok(invoice, { created: true });
  }

  async issue(id: string, actor: AuthUser) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT invoices can be issued');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.ISSUED,
        issuedAt: new Date(),
        issuedById: actor.id,
      },
      include: { items: true, customer: true, rental: true },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'invoice.issue',
      entityType: 'invoice',
      entityId: id,
    });

    return ok(updated);
  }

  async void(id: string, dto: VoidInvoiceDto, actor: AuthUser) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { allocations: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('Invoice already void');
    }
    if (invoice.allocations.length > 0) {
      throw new BadRequestException(
        'Cannot void invoice with payment allocations; reverse payments first',
      );
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.VOID },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'invoice.void',
      entityType: 'invoice',
      entityId: id,
      reason: dto.reason,
    });

    return ok(updated);
  }

  async renderPdf(id: string): Promise<Buffer> {
    const invoiceResponse = await this.findOne(id);
    const invoice = invoiceResponse.data;
    const settings = await this.prisma.companySettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text(settings?.displayName ?? 'AIQ Limited');
      doc.fontSize(10).fillColor('#444').text('Equipment Rental Division');
      if (settings?.address) doc.text(settings.address);
      if (settings?.phone) doc.text(settings.phone);
      if (settings?.website) doc.text(settings.website);
      doc.moveDown();
      doc.fillColor('#000').fontSize(16).text('RENTAL INVOICE');
      doc.fontSize(11);
      doc.text(`Invoice No: ${invoice.invoiceNumber}`);
      doc.text(`Status: ${invoice.status}`);
      doc.text(`Rental Ref: ${invoice.rental?.rentalNumber ?? ''}`);
      doc.text(`Bill To: ${invoice.customer?.fullName ?? ''}`);
      doc.text(`Phone: ${invoice.customer?.phone ?? ''}`);
      doc.moveDown();

      for (const item of invoice.items ?? []) {
        doc.text(
          `${item.description}    ${item.quantity} ${item.unit} x ${item.unitPrice} = ${item.lineTotal}`,
        );
      }

      doc.moveDown();
      doc.text(`Subtotal: ${invoice.subtotal} TZS`);
      doc.text(`Discount: ${invoice.discountTotal} TZS`);
      doc.text(`Delivery: ${invoice.deliveryTotal} TZS`);
      doc.text(`Tax: ${invoice.taxTotal} TZS`);
      doc.fontSize(13).text(`Total: ${invoice.grandTotal} TZS`);
      doc.fontSize(11).text(`Paid: ${invoice.amountPaid} TZS`);
      doc.text(`Balance Due: ${invoice.balanceDue} TZS`);
      doc.end();
    });
  }

  async recalculateStatus(invoiceId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { allocations: true },
    });
    if (!invoice || invoice.status === InvoiceStatus.VOID) return;

    const paid = invoice.allocations.reduce(
      (sum, a) => sum + Number(a.allocatedAmount),
      0,
    );
    const total = Number(invoice.grandTotal);
    let status: InvoiceStatus = InvoiceStatus.ISSUED;
    if (paid <= 0) status = InvoiceStatus.ISSUED;
    else if (paid < total) status = InvoiceStatus.PARTIALLY_PAID;
    else if (paid === total) status = InvoiceStatus.PAID;
    else status = InvoiceStatus.OVERPAID;

    await db.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });
  }
}

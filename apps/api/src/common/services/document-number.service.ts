import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

type DocumentKind =
  | 'rental'
  | 'rentalRequest'
  | 'quotation'
  | 'dispatch'
  | 'return'
  | 'invoice'
  | 'payment'
  | 'maintenance'
  | 'expense'
  | 'staffHire';

@Injectable()
export class DocumentNumberService {
  constructor(private readonly prisma: PrismaService) {}

  async next(kind: DocumentKind): Promise<string> {
    const settings = await this.prisma.companySettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const period = `${yy}${mm}`;

    const map: Record<
      DocumentKind,
      { prefix: string; count: () => Promise<number> }
    > = {
      rental: {
        prefix: settings?.rentalPrefix ?? 'RN',
        count: () => this.prisma.rental.count(),
      },
      rentalRequest: {
        prefix: 'RR',
        count: () => this.prisma.rentalRequest.count(),
      },
      quotation: {
        prefix: 'QT',
        count: () => this.prisma.quotation.count(),
      },
      dispatch: {
        prefix: 'DP',
        count: () => this.prisma.dispatch.count(),
      },
      return: {
        prefix: 'RT',
        count: () => this.prisma.return.count(),
      },
      invoice: {
        prefix: settings?.invoicePrefix ?? 'INV',
        count: () => this.prisma.invoice.count(),
      },
      payment: {
        prefix: 'PAY',
        count: () => this.prisma.payment.count(),
      },
      maintenance: {
        prefix: 'MNT',
        count: () => this.prisma.maintenanceJob.count(),
      },
      expense: {
        prefix: 'EXP',
        count: () => this.prisma.expense.count(),
      },
      staffHire: {
        prefix: 'SH',
        count: () => this.prisma.staffHire.count(),
      },
    };

    const entry = map[kind];
    const seq = (await entry.count()) + 1;
    return `${entry.prefix}:${period}-${String(seq).padStart(4, '0')}`;
  }
}

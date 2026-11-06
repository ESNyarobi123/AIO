import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { ok, paginated } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, search?: string) {
    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { customerCode: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { guarantors: true },
      }),
    ]);

    return paginated(rows, total, page, limit);
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        guarantors: true,
        rentals: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rentalNumber: true,
            status: true,
            siteLocation: true,
            startAt: true,
            expectedReturnAt: true,
            grandTotal: true,
            balanceCached: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return ok(customer);
  }

  async create(dto: CreateCustomerDto, actor: AuthUser) {
    const customerCode = await this.nextCustomerCode();

    const customer = await this.prisma.customer.create({
      data: {
        customerCode,
        customerType: dto.customerType,
        fullName: dto.fullName,
        companyName: dto.companyName,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        alternatePhone: dto.alternatePhone,
        email: dto.email,
        billingAddress: dto.billingAddress,
        siteAddress: dto.siteAddress,
        notes: dto.notes,
        createdById: actor.id,
        guarantors:
          dto.guarantorFullName && dto.guarantorPhone
            ? {
                create: {
                  fullName: dto.guarantorFullName,
                  phone: dto.guarantorPhone,
                  relationship: dto.guarantorRelationship,
                },
              }
            : undefined,
      },
      include: { guarantors: true },
    });

    return ok(customer, { created: true });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.ensureExists(id);
    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        customerType: dto.customerType,
        fullName: dto.fullName,
        companyName: dto.companyName,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        alternatePhone: dto.alternatePhone,
        email: dto.email,
        billingAddress: dto.billingAddress,
        siteAddress: dto.siteAddress,
        notes: dto.notes,
      },
      include: { guarantors: true },
    });
    return ok(customer);
  }

  private async ensureExists(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
  }

  async rentals(id: string) {
    await this.ensureExists(id);
    const rentals = await this.prisma.rental.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { model: true, asset: true } },
        invoices: true,
      },
    });
    return ok(rentals);
  }

  async balance(id: string) {
    await this.ensureExists(id);
    const rentals = await this.prisma.rental.findMany({
      where: {
        customerId: id,
        status: { notIn: ['CANCELLED'] },
      },
      select: {
        id: true,
        rentalNumber: true,
        grandTotal: true,
        amountPaidCached: true,
        balanceCached: true,
        status: true,
      },
    });
    const outstanding = rentals.reduce(
      (sum, r) => sum + Number(r.balanceCached),
      0,
    );
    const totalInvoiced = rentals.reduce(
      (sum, r) => sum + Number(r.grandTotal),
      0,
    );
    const totalPaid = rentals.reduce(
      (sum, r) => sum + Number(r.amountPaidCached),
      0,
    );
    return ok({
      customerId: id,
      totalInvoiced,
      totalPaid,
      outstanding,
      rentals,
    });
  }

  async statement(id: string) {
    await this.ensureExists(id);
    const [invoices, payments, deposits] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        include: { items: true, allocations: true },
      }),
      this.prisma.payment.findMany({
        where: { customerId: id },
        orderBy: { receivedAt: 'desc' },
        include: { allocations: true },
      }),
      this.prisma.securityDeposit.findMany({
        where: { customerId: id },
        include: { transactions: true },
      }),
    ]);
    return ok({ customerId: id, invoices, payments, deposits });
  }

  private async nextCustomerCode() {
    const count = await this.prisma.customer.count();
    return `CUS-${String(count + 1).padStart(5, '0')}`;
  }
}

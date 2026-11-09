/**
 * Extra demo records for a live AIQ HireFlow install.
 *
 * The main sample catalogue already ships the fleet, customers, hire cards and
 * invoices. This script tops up the screens that otherwise look empty — staff
 * hires, maintenance, expenses — and adds a couple of clean demo rows that the
 * admin can safely edit or delete while trying the new row actions.
 *
 *   pnpm --filter @aiq-hireflow/api exec tsx prisma/demo-extra.ts
 *
 * Safe to re-run: every record is matched on its natural key first.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function daysAhead(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

const DEMO_CUSTOMERS = [
  {
    customerCode: 'CUS-00009',
    customerType: 'COMPANY' as const,
    fullName: 'Bahari Builders Ltd',
    companyName: 'Bahari Builders Ltd',
    contactPerson: 'Halima Said',
    phone: '0713998877',
    email: 'site@baharibuilders.co.tz',
    billingAddress: 'Plot 12, Nyerere Road, Dar es Salaam',
    siteAddress: 'Kigamboni Ferry Project',
    notes: 'Demo record — safe to edit or delete.',
  },
  {
    customerCode: 'CUS-00010',
    customerType: 'INDIVIDUAL' as const,
    fullName: 'Rehema Mwakyusa',
    phone: '0765112233',
    email: 'rehema.mwakyusa@gmail.com',
    billingAddress: 'Kimara Mwisho, Dar es Salaam',
    siteAddress: 'Kimara Boko Plot 44',
    notes: 'Demo record — residential slab.',
  },
  {
    customerCode: 'CUS-00011',
    customerType: 'COMPANY' as const,
    fullName: 'Pwani Road Contractors',
    companyName: 'Pwani Road Contractors Ltd',
    contactPerson: 'Athumani Juma',
    phone: '0688223344',
    email: 'accounts@pwaniroad.co.tz',
    billingAddress: 'Mkuranga Road, Dar es Salaam',
    siteAddress: 'Mkuranga Access Road',
    notes: 'Demo record — pays on LPO.',
  },
];

async function main() {
  const admin =
    (await prisma.user.findUnique({
      where: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@aiqltd.co.tz' },
    })) ?? (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));
  if (!admin) throw new Error('No user found. Run pnpm db:seed first.');

  const staff = await prisma.user.findFirst({
    where: { email: { not: admin.email } },
    orderBy: { createdAt: 'asc' },
  });
  const borrower = staff ?? admin;

  // ── Extra customers ───────────────────────────────────────────────────────
  for (const customer of DEMO_CUSTOMERS) {
    await prisma.customer.upsert({
      where: { customerCode: customer.customerCode },
      update: {
        fullName: customer.fullName,
        customerType: customer.customerType,
        companyName: customer.companyName ?? null,
        contactPerson: customer.contactPerson ?? null,
        phone: customer.phone,
        email: customer.email ?? null,
        billingAddress: customer.billingAddress ?? null,
        siteAddress: customer.siteAddress ?? null,
        notes: customer.notes,
      },
      create: {
        ...customer,
        companyName: customer.companyName ?? null,
        contactPerson: customer.contactPerson ?? null,
        email: customer.email ?? null,
        billingAddress: customer.billingAddress ?? null,
        siteAddress: customer.siteAddress ?? null,
        createdById: admin.id,
      },
    });
  }

  // ── Demo category + model with no assets: safe to delete ─────────────────
  const demoCategory = await prisma.equipmentCategory.upsert({
    where: { code: 'DEMO' },
    update: { name: 'Demo Showcase', description: 'Sample rows for trying edits and deletes' },
    create: {
      code: 'DEMO',
      name: 'Demo Showcase',
      description: 'Sample rows for trying edits and deletes',
      trackingMode: 'INDIVIDUAL',
    },
  });
  const demoModel = await prisma.equipmentModel.findFirst({
    where: { categoryId: demoCategory.id, name: 'Demo Site Fan 600mm' },
  });
  if (!demoModel) {
    await prisma.equipmentModel.create({
      data: {
        categoryId: demoCategory.id,
        name: 'Demo Site Fan 600mm',
        brand: 'Demo',
        modelNumber: 'FAN-600',
        description: 'Sample model with no machines — press delete to try the new action.',
        defaultDeposit: 30000,
        prices: {
          create: [
            { pricingUnit: 'DAY', amount: 12000, minimumDuration: 1 },
            { pricingUnit: 'WEEK', amount: 65000, minimumDuration: 1 },
          ],
        },
        accessories: { create: [{ name: 'Stand', isRequired: true }] },
      },
    });
  }

  // ── Staff hires: one out now, one already returned ────────────────────────
  const available = await prisma.equipmentAsset.findMany({
    where: { status: 'AVAILABLE' },
    orderBy: { assetCode: 'asc' },
    take: 4,
  });

  if (available.length >= 3 && borrower) {
    const open = await prisma.staffHire.findUnique({
      where: { hireNumber: 'SH:2511-9001' },
    });
    if (!open) {
      await prisma.staffHire.create({
        data: {
          hireNumber: 'SH:2511-9001',
          userId: borrower.id,
          issuedById: admin.id,
          issuedAt: daysAgo(2),
          expectedReturnAt: daysAhead(2),
          purpose: 'Punch out to Goba site — compaction works',
          siteLocation: 'Goba Store',
          notes: 'Demo staff issue: no fee, no invoice.',
          status: 'ISSUED',
          items: {
            create: available.slice(0, 2).map((asset) => ({
              assetId: asset.id,
              modelId: asset.modelId,
              conditionOut: 'GOOD',
              accessories: 'Water kit, paving pad',
            })),
          },
        },
      });
      await prisma.equipmentAsset.updateMany({
        where: { id: { in: available.slice(0, 2).map((asset) => asset.id) } },
        data: { status: 'RENTED' },
      });
    }

    const closed = await prisma.staffHire.findUnique({
      where: { hireNumber: 'SH:2511-9002' },
    });
    if (!closed) {
      const returnedAsset = available[2];
      await prisma.staffHire.create({
        data: {
          hireNumber: 'SH:2511-9002',
          userId: borrower.id,
          issuedById: admin.id,
          receivedById: admin.id,
          issuedAt: daysAgo(9),
          expectedReturnAt: daysAgo(7),
          returnedAt: daysAgo(7),
          purpose: 'Survey level for Mkuranga setting out',
          siteLocation: 'Mkuranga Access Road',
          notes: 'Returned clean, tripod checked.',
          status: 'RETURNED',
          items: {
            create: [
              {
                assetId: returnedAsset.id,
                modelId: returnedAsset.modelId,
                conditionOut: 'GOOD',
                conditionIn: 'GOOD',
                returnedAt: daysAgo(7),
                accessories: 'Tripod and staff',
              },
            ],
          },
        },
      });
    }
  }

  // ── Maintenance: one in progress, one completed ──────────────────────────
  const fair = await prisma.equipmentAsset.findFirst({
    where: { condition: 'FAIR' },
    orderBy: { assetCode: 'asc' },
  });
  if (fair) {
    const existing = await prisma.maintenanceJob.findUnique({
      where: { maintenanceNumber: 'MNT:2511-9101' },
    });
    if (!existing) {
      await prisma.maintenanceJob.create({
        data: {
          maintenanceNumber: 'MNT:2511-9101',
          assetId: fair.id,
          issueDescription: 'Demo job — engine service and belt replacement before next hire.',
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          laborCost: 35000,
          partsCost: 80000,
          otherCost: 0,
          totalCost: 115000,
          reportedById: admin.id,
          startedAt: daysAgo(1),
        },
      });
      await prisma.equipmentAsset.update({
        where: { id: fair.id },
        data: { status: 'MAINTENANCE' },
      });
    }
  }

  const good = await prisma.equipmentAsset.findFirst({
    where: { status: 'AVAILABLE', condition: 'GOOD' },
    orderBy: { assetCode: 'desc' },
  });
  if (good) {
    const existing = await prisma.maintenanceJob.findUnique({
      where: { maintenanceNumber: 'MNT:2511-9102' },
    });
    if (!existing) {
      await prisma.maintenanceJob.create({
        data: {
          maintenanceNumber: 'MNT:2511-9102',
          assetId: good.id,
          issueDescription: 'Demo job — completed wheel and handle check.',
          priority: 'LOW',
          status: 'COMPLETED',
          laborCost: 15000,
          partsCost: 25000,
          otherCost: 0,
          totalCost: 40000,
          reportedById: admin.id,
          approvedById: admin.id,
          startedAt: daysAgo(6),
          completedAt: daysAgo(5),
        },
      });
    }
  }

  // ── Expenses so the finance screen is not empty ──────────────────────────
  const expenses = [
    {
      expenseNumber: 'EXP:2511-9001',
      category: 'Fuel',
      description: 'Demo — diesel for site generator delivery',
      amount: 65000,
      supplier: 'Puma Energy Goba',
      paymentMethod: 'CASH' as const,
      status: 'PAID' as const,
    },
    {
      expenseNumber: 'EXP:2511-9002',
      category: 'Repairs',
      description: 'Demo — replacement hose and fittings',
      amount: 48000,
      supplier: 'Goba Hardware',
      paymentMethod: 'MOBILE_MONEY' as const,
      status: 'APPROVED' as const,
    },
  ];
  for (const expense of expenses) {
    const existing = await prisma.expense.findUnique({
      where: { expenseNumber: expense.expenseNumber },
    });
    if (!existing) {
      await prisma.expense.create({
        data: {
          ...expense,
          expenseDate: daysAgo(2),
          createdById: admin.id,
          approvedById: admin.id,
        },
      });
    }
  }

  const totals = {
    customers: await prisma.customer.count(),
    models: await prisma.equipmentModel.count(),
    assets: await prisma.equipmentAsset.count(),
    staffHires: await prisma.staffHire.count(),
    maintenance: await prisma.maintenanceJob.count(),
    expenses: await prisma.expense.count(),
  };
  console.log('✅ Extra demo data ready');
  console.log(
    `   ${totals.customers} customers · ${totals.models} models · ${totals.assets} assets`,
  );
  console.log(
    `   ${totals.staffHires} staff hires · ${totals.maintenance} maintenance · ${totals.expenses} expenses`,
  );
}

main()
  .catch((error) => {
    console.error('❌ Extra demo data failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

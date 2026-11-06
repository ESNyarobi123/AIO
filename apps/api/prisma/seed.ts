import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PricingUnit,
  PrismaClient,
  RoleName,
  TrackingMode,
  AssetCondition,
  AssetStatus,
  CustomerType,
} from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const PERMISSIONS = [
  ['dashboard.read', 'View dashboards'],
  ['users.read', 'View users'],
  ['users.create', 'Create users'],
  ['users.update', 'Update users'],
  ['customers.read', 'View customers'],
  ['customers.create', 'Create customers'],
  ['customers.update', 'Update customers'],
  ['equipment.read', 'View equipment'],
  ['equipment.create', 'Create equipment'],
  ['equipment.update', 'Update equipment'],
  ['pricing.read', 'View pricing'],
  ['pricing.manage', 'Manage pricing'],
  ['rentals.read', 'View rentals'],
  ['rentals.create', 'Create rentals'],
  ['rentals.update', 'Update rentals'],
  ['payments.read', 'View payments'],
  ['payments.create', 'Record payments'],
  ['invoices.read', 'View invoices'],
  ['invoices.create', 'Create invoices'],
  ['settings.read', 'View settings'],
  ['settings.update', 'Update settings'],
  ['reports.read', 'View reports'],
  ['audit.read', 'View audit logs'],
] as const;

const STAFF_PERMISSIONS = new Set([
  'dashboard.read',
  'customers.read',
  'customers.create',
  'customers.update',
  'equipment.read',
  'pricing.read',
  'rentals.read',
  'rentals.create',
  'rentals.update',
  'payments.read',
  'payments.create',
  'invoices.read',
  'invoices.create',
  'settings.read',
  'reports.read',
]);

async function main() {
  console.log('🌱 Seeding AIQ HireFlow...');

  for (const [key, description] of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }

  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: { description: 'Full system controller' },
    create: {
      name: RoleName.ADMIN,
      description: 'Full system controller',
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: RoleName.STAFF },
    update: { description: 'Operational staff access' },
    create: {
      name: RoleName.STAFF,
      description: 'Operational staff access',
    },
  });

  const permissions = await prisma.permission.findMany();
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });

    if (STAFF_PERMISSIONS.has(permission.key)) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: staffRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: staffRole.id, permissionId: permission.id },
      });
    }
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
  const adminPassword = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? 'Admin@HireFlow1',
    saltRounds,
  );
  const staffPassword = await bcrypt.hash(
    process.env.SEED_STAFF_PASSWORD ?? 'Staff@HireFlow1',
    saltRounds,
  );

  const admin = await prisma.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@aiqltd.co.tz' },
    update: {
      passwordHash: adminPassword,
      fullName: 'AIQ Administrator',
      status: 'ACTIVE',
    },
    create: {
      fullName: 'AIQ Administrator',
      username: 'admin',
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@aiqltd.co.tz',
      phone: '0700000001',
      passwordHash: adminPassword,
      userRoles: { create: { roleId: adminRole.id } },
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: process.env.SEED_STAFF_EMAIL ?? 'staff@aiqltd.co.tz' },
    update: {
      passwordHash: staffPassword,
      fullName: 'Tony Staff',
      status: 'ACTIVE',
    },
    create: {
      fullName: 'Tony Staff',
      username: 'tony',
      email: process.env.SEED_STAFF_EMAIL ?? 'staff@aiqltd.co.tz',
      phone: '0700000002',
      passwordHash: staffPassword,
      userRoles: { create: { roleId: staffRole.id } },
    },
  });

  await prisma.companySettings.deleteMany();
  await prisma.companySettings.create({
    data: {
      legalName: process.env.COMPANY_LEGAL_NAME ?? 'AIQ Company Limited',
      displayName: process.env.COMPANY_DISPLAY_NAME ?? 'AIQ Limited',
      address: 'Goba, Dar es Salaam, Tanzania',
      phone: '+255700000000',
      email: 'info@aiqltd.co.tz',
      website: process.env.COMPANY_WEBSITE ?? 'https://www.aiqltd.co.tz/',
      invoicePrefix: process.env.INVOICE_PREFIX ?? 'INV',
      rentalPrefix: process.env.RENTAL_PREFIX ?? 'RN',
      currency: process.env.COMPANY_CURRENCY ?? 'TZS',
      timezone: process.env.COMPANY_TIMEZONE ?? 'Africa/Dar_es_Salaam',
    },
  });

  const concrete = await prisma.equipmentCategory.upsert({
    where: { code: 'CONCRETE' },
    update: {},
    create: {
      name: 'Concrete Equipment',
      code: 'CONCRETE',
      description: 'Poker vibrators, mixers and concrete tools',
      trackingMode: TrackingMode.INDIVIDUAL,
    },
  });

  await prisma.equipmentCategory.upsert({
    where: { code: 'SURVEY' },
    update: {},
    create: {
      name: 'Surveying Equipment',
      code: 'SURVEY',
      description: 'Theodolites, dumpy levels and total stations',
      trackingMode: TrackingMode.INDIVIDUAL,
    },
  });

  await prisma.equipmentCategory.upsert({
    where: { code: 'POWER' },
    update: {},
    create: {
      name: 'Power Equipment',
      code: 'POWER',
      description: 'Generators and power tools',
      trackingMode: TrackingMode.INDIVIDUAL,
    },
  });

  let poker = await prisma.equipmentModel.findFirst({
    where: { name: 'Poker Vibrator', categoryId: concrete.id },
  });
  if (!poker) {
    poker = await prisma.equipmentModel.create({
      data: {
        categoryId: concrete.id,
        name: 'Poker Vibrator',
        brand: 'Honda',
        modelNumber: 'GX160',
        description: 'Portable concrete poker vibrator',
        defaultDeposit: 50000,
      },
    });
  }

  const existingDayPrice = await prisma.equipmentPrice.findFirst({
    where: {
      modelId: poker.id,
      pricingUnit: PricingUnit.DAY,
      isActive: true,
    },
  });
  if (!existingDayPrice) {
    await prisma.equipmentPrice.createMany({
      data: [
        {
          modelId: poker.id,
          pricingUnit: PricingUnit.HOUR,
          amount: 5000,
          minimumDuration: 1,
        },
        {
          modelId: poker.id,
          pricingUnit: PricingUnit.DAY,
          amount: 30000,
          minimumDuration: 1,
        },
        {
          modelId: poker.id,
          pricingUnit: PricingUnit.WEEK,
          amount: 180000,
          minimumDuration: 1,
        },
      ],
    });
  }

  const assetCodes = ['AIQ-PK-001', 'AIQ-PK-002', 'AIQ-PK-003'];
  for (const assetCode of assetCodes) {
    await prisma.equipmentAsset.upsert({
      where: { assetCode },
      update: {},
      create: {
        assetCode,
        modelId: poker.id,
        qrCodeValue: `AIQ:${assetCode}`,
        currentLocation: 'Goba Store',
        condition: AssetCondition.GOOD,
        status: AssetStatus.AVAILABLE,
        purchaseCost: 850000,
      },
    });
  }

  const sampleCustomer = await prisma.customer.findFirst({
    where: { phone: '0700000999' },
  });
  if (!sampleCustomer) {
    await prisma.customer.create({
      data: {
        customerCode: 'CUS-00001',
        customerType: CustomerType.INDIVIDUAL,
        fullName: 'Demo Customer',
        phone: '0700000999',
        siteAddress: 'Demo Site, Dar es Salaam',
        notes: 'Demo customer for development only',
        createdById: admin.id,
      },
    });
  }

  console.log('✅ Seed complete');
  console.log(`   Admin: ${admin.email}`);
  console.log(`   Staff: ${staff.email}`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

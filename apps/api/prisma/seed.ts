import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RoleName } from '../src/generated/prisma/client.js';
import { seedCatalog } from './seed-catalog.js';

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

  const catalog = await seedCatalog(prisma, admin.id);

  console.log('✅ Seed complete');
  console.log(`   Admin: ${admin.email}`);
  console.log(`   Staff: ${staff.email}`);
  console.log(
    `   Catalogue: ${catalog.categories} categories, ${catalog.models} models, ${catalog.assets} assets, ${catalog.customers} customers`,
  );
}

main()
  .catch((error) => {
    console.error('❌ Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

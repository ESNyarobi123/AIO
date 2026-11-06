/**
 * Seeds only the demo catalogue (equipment + photos + customers + sample
 * rentals/invoices/payments). Safe to run on an existing database: every row is
 * upserted by its natural key and existing records are updated, not duplicated.
 *
 *   pnpm db:sample
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedCatalog } from './seed-catalog.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin =
    (await prisma.user.findUnique({
      where: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@aiqltd.co.tz' },
    })) ?? (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));

  if (!admin) {
    throw new Error('Run `pnpm db:seed` first: no user found to own the sample data.');
  }

  const totals = await seedCatalog(prisma, admin.id);
  console.log('✅ Sample catalogue ready');
  console.log(
    `   ${totals.categories} categories · ${totals.models} models · ${totals.assets} assets · ${totals.customers} customers`,
  );
  console.log('   Photos copied to uploads/sample-*.jpg');
}

main()
  .catch((error) => {
    console.error('❌ Sample catalogue failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

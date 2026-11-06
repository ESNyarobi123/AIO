/**
 * Demo catalogue for AIQ HireFlow.
 *
 * Adds a realistic Tanzanian equipment fleet with photos, pricing, accessories,
 * customers, rentals, invoices, payments and a maintenance job so every screen
 * (dashboard, equipment, rentals, invoices, payments, reports) has content.
 *
 * Photos live in `prisma/sample-images/` (Wikimedia Commons, CC licences) and are
 * copied into `uploads/` at seed time so they are served by the API as
 * `/uploads/sample-<slug>.jpg`.
 */
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { PrismaClient } from '../src/generated/prisma/client.js';

type PricingUnitSeed = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
type Condition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED';
type Status =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'RENTED'
  | 'IN_TRANSIT'
  | 'INSPECTION'
  | 'MAINTENANCE'
  | 'RETIRED';

type AssetSeed = {
  code: string;
  serial: string;
  purchaseYear: number;
  cost: number;
  location: string;
  condition: Condition;
  status: Status;
  notes?: string;
};

type ModelSeed = {
  name: string;
  /** Older seed / catalogue names that should be adopted instead of duplicated. */
  aliases?: string[];
  brand: string;
  modelNumber: string;
  description: string;
  image: string;
  specs: Record<string, string>;
  deposit: number;
  prices: { unit: PricingUnitSeed; amount: number; minimumDuration?: number }[];
  accessories: { name: string; required?: boolean }[];
  assets: AssetSeed[];
};

type CategorySeed = {
  code: string;
  name: string;
  description: string;
  models: ModelSeed[];
};

const IMAGE_SOURCE_DIR = join(process.cwd(), 'prisma', 'sample-images');
const UPLOAD_DIR = join(process.cwd(), 'uploads');

const CATALOG: CategorySeed[] = [
  {
    code: 'CONCRETE',
    name: 'Concrete Equipment',
    description: 'Poker vibrators, mixers, trowels and concrete finishing gear',
    models: [
      {
        name: 'Poker Vibrator 38mm',
        aliases: ['Poker Vibrator'],
        brand: 'Honda',
        modelNumber: 'GX160',
        description: 'Petrol poker vibrator for compacting fresh concrete in columns, beams and slabs.',
        image: 'poker-vibrator.jpg',
        specs: {
          Engine: 'Honda GX160, 5.5 HP',
          Needle: '38 mm x 5 m flexible shaft',
          Weight: '26 kg',
          Output: 'Up to 15 m³/h',
        },
        deposit: 50000,
        prices: [
          { unit: 'HOUR', amount: 5000, minimumDuration: 2 },
          { unit: 'DAY', amount: 30000 },
          { unit: 'WEEK', amount: 180000 },
        ],
        accessories: [
          { name: '38 mm poker needle + 5 m shaft', required: true },
          { name: 'Tool kit and spare belt' },
        ],
        assets: [
          { code: 'AIQ-PK-001', serial: 'GX160-8841201', purchaseYear: 2023, cost: 850000, location: 'Goba Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-PK-002', serial: 'GX160-8841202', purchaseYear: 2023, cost: 850000, location: 'Kigamboni Bridge Site', condition: 'EXCELLENT', status: 'RENTED', notes: 'On hire to Kamal Construction Ltd' },
          { code: 'AIQ-PK-003', serial: 'GX160-8841203', purchaseYear: 2024, cost: 920000, location: 'Goba Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-PK-004', serial: 'GX160-8841204', purchaseYear: 2021, cost: 780000, location: 'Mbezi Beach Plot 12', condition: 'FAIR', status: 'INSPECTION', notes: 'Needle vibration weak, screening due' },
        ],
      },
      {
        name: 'Concrete Mixer 350L',
        brand: 'Lion',
        modelNumber: 'CM-350',
        description: 'Diesel drum mixer, 350 litre batch, ideal for small to mid-size pours.',
        image: 'concrete-mixer.jpg',
        specs: {
          Drum: '350 L',
          Engine: 'Diesel, 6 HP',
          Output: '5 - 6 m³/h',
          Weight: '290 kg',
        },
        deposit: 100000,
        prices: [
          { unit: 'DAY', amount: 45000 },
          { unit: 'WEEK', amount: 260000 },
        ],
        accessories: [
          { name: 'Steel drum grate', required: true },
          { name: 'Tow bar and jockey wheel' },
        ],
        assets: [
          { code: 'AIQ-CM-001', serial: 'CM350-2022-014', purchaseYear: 2022, cost: 2100000, location: 'Goba Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-CM-002', serial: 'CM350-2022-015', purchaseYear: 2022, cost: 2100000, location: 'Kigamboni Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-CM-003', serial: 'CM350-2025-031', purchaseYear: 2025, cost: 2450000, location: 'Goba Store', condition: 'EXCELLENT', status: 'RESERVED', notes: 'Reserved for Coastal Paving, next week' },
        ],
      },
      {
        name: 'Power Trowel 24"',
        brand: 'Honda',
        modelNumber: 'PT-24',
        description: 'Walk-behind trowel for finishing concrete slabs and floors.',
        image: 'power-trowel.jpg',
        specs: {
          Engine: 'Honda GX160',
          Width: '24 in / 600 mm',
          Blades: '4 (adjustable pitch)',
          Weight: '85 kg',
        },
        deposit: 80000,
        prices: [
          { unit: 'DAY', amount: 70000 },
          { unit: 'WEEK', amount: 400000 },
        ],
        accessories: [
          { name: 'Finish blades set', required: true },
          { name: 'Float pan 600 mm' },
        ],
        assets: [
          { code: 'AIQ-PT-001', serial: 'PT24-5511', purchaseYear: 2024, cost: 1650000, location: 'Goba Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-PT-002', serial: 'PT24-5512', purchaseYear: 2024, cost: 1650000, location: 'Goba Store', condition: 'EXCELLENT', status: 'AVAILABLE' },
        ],
      },
    ],
  },
  {
    code: 'COMPACTION',
    name: 'Compaction Equipment',
    description: 'Plate compactors and rammers for sub-base and backfill',
    models: [
      {
        name: 'Plate Compactor 90kg',
        brand: 'Wacker Neuson',
        modelNumber: 'DPU 6555',
        description: 'Reversible plate compactor for trenches, paving and backfill compaction.',
        image: 'plate-compactor.jpg',
        specs: {
          Weight: '90 kg',
          'Centrifugal force': '15 kN',
          Plate: '500 x 360 mm',
          Engine: 'Hatz diesel',
        },
        deposit: 120000,
        prices: [
          { unit: 'DAY', amount: 60000 },
          { unit: 'WEEK', amount: 350000 },
        ],
        accessories: [
          { name: 'Water sprinkler kit' },
          { name: 'Paving pad', required: true },
        ],
        assets: [
          { code: 'AIQ-PC-001', serial: 'DPU6555-77120', purchaseYear: 2023, cost: 3400000, location: 'Kigamboni Bridge Site', condition: 'GOOD', status: 'RENTED', notes: 'On hire to Kamal Construction Ltd' },
          { code: 'AIQ-PC-002', serial: 'DPU6555-77121', purchaseYear: 2023, cost: 3400000, location: 'Goba Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-PC-003', serial: 'DPU6555-77122', purchaseYear: 2025, cost: 3750000, location: 'Goba Store', condition: 'EXCELLENT', status: 'AVAILABLE' },
        ],
      },
      {
        name: 'Vibratory Rammer 75kg',
        brand: 'Wacker Neuson',
        modelNumber: 'BS 60-4',
        description: 'Four-stroke rammer for cohesive soils and narrow trench work.',
        image: 'vibratory-rammer.jpg',
        specs: {
          Weight: '75 kg',
          'Impact force': '14 kN',
          Engine: 'Wacker WM 80',
          Shoe: '280 x 340 mm',
        },
        deposit: 120000,
        prices: [
          { unit: 'DAY', amount: 55000 },
          { unit: 'WEEK', amount: 320000 },
        ],
        accessories: [{ name: 'Trench shoe', required: true }],
        assets: [
          { code: 'AIQ-RM-001', serial: 'BS604-33891', purchaseYear: 2022, cost: 2950000, location: 'Goba Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-RM-002', serial: 'BS604-33892', purchaseYear: 2024, cost: 3150000, location: 'Kigamboni Store', condition: 'EXCELLENT', status: 'AVAILABLE' },
        ],
      },
    ],
  },
  {
    code: 'POWER',
    name: 'Power & Generators',
    description: 'Site power, dewatering pumps and breaking tools',
    models: [
      {
        name: 'Diesel Generator 15kVA',
        brand: 'Perkins',
        modelNumber: 'APD-15',
        description: 'Silent canopy diesel generator for site offices, lighting towers and tools.',
        image: 'generator.jpg',
        specs: {
          Output: '15 kVA / 12 kW',
          Fuel: 'Diesel',
          'Tank capacity': '45 L',
          'Runtime at 75%': '9 hours',
        },
        deposit: 300000,
        prices: [
          { unit: 'DAY', amount: 120000 },
          { unit: 'WEEK', amount: 700000 },
          { unit: 'MONTH', amount: 2400000 },
        ],
        accessories: [
          { name: 'Distribution board 63A', required: true },
          { name: 'Earthing kit', required: true },
          { name: '25 m cable reel' },
        ],
        assets: [
          { code: 'AIQ-GN-001', serial: 'APD15-2022-009', purchaseYear: 2022, cost: 9800000, location: 'Mbezi Beach Plot 12', condition: 'GOOD', status: 'RENTED', notes: 'Overdue with Juma Ibrahim - follow up' },
          { code: 'AIQ-GN-002', serial: 'APD15-2023-018', purchaseYear: 2023, cost: 10200000, location: 'Goba Store', condition: 'EXCELLENT', status: 'AVAILABLE' },
          { code: 'AIQ-GN-003', serial: 'APD15-2025-044', purchaseYear: 2025, cost: 12500000, location: 'Goba Store', condition: 'EXCELLENT', status: 'RESERVED' },
        ],
      },
      {
        name: 'Water Pump 2"',
        brand: 'Honda',
        modelNumber: 'WB20',
        description: 'Petrol trash-free water pump for dewatering excavations and tanks.',
        image: 'water-pump.jpg',
        specs: {
          Inlet: '2 in / 50 mm',
          'Max flow': '600 L/min',
          'Max head': '32 m',
          Engine: 'Honda GX160',
        },
        deposit: 60000,
        prices: [
          { unit: 'DAY', amount: 35000 },
          { unit: 'WEEK', amount: 190000 },
        ],
        accessories: [
          { name: 'Suction hose 3 m', required: true },
          { name: 'Delivery hose 20 m', required: true },
        ],
        assets: [
          { code: 'AIQ-WP-001', serial: 'WB20-66301', purchaseYear: 2023, cost: 980000, location: 'Goba Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-WP-002', serial: 'WB20-66302', purchaseYear: 2023, cost: 980000, location: 'Kigamboni Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-WP-003', serial: 'WB20-66303', purchaseYear: 2024, cost: 1050000, location: 'Goba Store', condition: 'EXCELLENT', status: 'AVAILABLE' },
        ],
      },
      {
        name: 'Jack Hammer 30kg',
        brand: 'Bosch',
        modelNumber: 'GSH 27 VC',
        description: 'Heavy electrical demolition hammer for concrete breaking and trenching.',
        image: 'jackhammer.jpg',
        specs: {
          Weight: '30 kg',
          Impact: '60 J',
          Power: '2000 W / 230 V',
          Bits: 'Point + flat chisel',
        },
        deposit: 150000,
        prices: [
          { unit: 'DAY', amount: 65000 },
          { unit: 'WEEK', amount: 360000 },
        ],
        accessories: [
          { name: 'Point chisel', required: true },
          { name: 'Flat chisel', required: true },
          { name: 'Trolley' },
        ],
        assets: [
          { code: 'AIQ-JH-001', serial: 'GSH27-11204', purchaseYear: 2023, cost: 1850000, location: 'Goba Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-JH-002', serial: 'GSH27-11205', purchaseYear: 2023, cost: 1850000, location: 'Goba Store', condition: 'FAIR', status: 'MAINTENANCE', notes: 'In workshop, hydraulic hose leak' },
        ],
      },
    ],
  },
  {
    code: 'SURVEY',
    name: 'Surveying Equipment',
    description: 'Total stations and levels for setting out and as-built surveys',
    models: [
      {
        name: 'Total Station',
        brand: 'Topcon',
        modelNumber: 'ES-105',
        description: 'Reflectorless total station with onboard memory for setting out and as-built work.',
        image: 'total-station.jpg',
        specs: {
          Accuracy: '5"',
          'Measuring range': '500 m reflectorless',
          Memory: '20 000 points',
          Battery: '8 hours',
        },
        deposit: 500000,
        prices: [
          { unit: 'DAY', amount: 150000 },
          { unit: 'WEEK', amount: 850000 },
        ],
        accessories: [
          { name: 'Prism + tribrach', required: true },
          { name: 'Carbon tripod', required: true },
          { name: 'Charging kit', required: true },
        ],
        assets: [
          { code: 'AIQ-TS-001', serial: 'ES105-44821', purchaseYear: 2024, cost: 6800000, location: 'Goba Store', condition: 'EXCELLENT', status: 'AVAILABLE' },
          { code: 'AIQ-TS-002', serial: 'ES105-44822', purchaseYear: 2022, cost: 5900000, location: 'Kigamboni Store', condition: 'GOOD', status: 'AVAILABLE' },
        ],
      },
      {
        name: 'Dumpy Level',
        brand: 'Leica',
        modelNumber: 'NA720',
        description: 'Automatic optical level with horizontal circle for levelling and profiles.',
        image: 'dumpy-level.jpg',
        specs: {
          Magnification: '20x',
          Accuracy: '±2.0 mm/km',
          Tripod: 'Aluminium dome head',
          'Working range': '60 m',
        },
        deposit: 150000,
        prices: [
          { unit: 'DAY', amount: 40000 },
          { unit: 'WEEK', amount: 220000 },
        ],
        accessories: [
          { name: '5 m staff', required: true },
          { name: 'Tripod', required: true },
        ],
        assets: [
          { code: 'AIQ-DL-001', serial: 'NA720-11839', purchaseYear: 2023, cost: 2450000, location: 'Goba Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-DL-002', serial: 'NA720-11840', purchaseYear: 2024, cost: 2600000, location: 'Goba Store', condition: 'EXCELLENT', status: 'AVAILABLE' },
        ],
      },
    ],
  },
  {
    code: 'ACCESS',
    name: 'Access & Site Support',
    description: 'Scaffolding and site handling equipment',
    models: [
      {
        name: 'Scaffolding Set 50 pcs',
        brand: 'Local steel',
        modelNumber: 'SCAF-50',
        description: 'Galvanised tube and coupler scaffolding set for a 3-bay working platform.',
        image: 'scaffolding.jpg',
        specs: {
          Standards: '20 x 2 m',
          Ledgers: '20 x 2 m',
          Boards: '10 x 2.5 m',
          Couplers: '40 pieces',
        },
        deposit: 200000,
        prices: [
          { unit: 'DAY', amount: 60000 },
          { unit: 'WEEK', amount: 250000 },
          { unit: 'MONTH', amount: 800000 },
        ],
        accessories: [
          { name: 'Base plates', required: true },
          { name: 'Safety nets' },
        ],
        assets: [
          { code: 'AIQ-SC-001', serial: 'SCAF-2023-001', purchaseYear: 2023, cost: 4200000, location: 'Goba Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-SC-002', serial: 'SCAF-2023-002', purchaseYear: 2023, cost: 4200000, location: 'Kigamboni Store', condition: 'GOOD', status: 'AVAILABLE' },
        ],
      },
      {
        name: 'Wheelbarrow Heavy Duty',
        brand: 'Local',
        modelNumber: 'WB-100',
        description: 'Steel tray wheelbarrow for concrete and aggregate handling on site.',
        image: 'wheelbarrow.jpg',
        specs: {
          Capacity: '100 L',
          Wheel: 'Pneumatic 4.00-8',
          Tray: '1.2 mm steel',
          Load: '150 kg',
        },
        deposit: 20000,
        prices: [
          { unit: 'DAY', amount: 8000 },
          { unit: 'WEEK', amount: 40000 },
        ],
        accessories: [{ name: 'Spare wheel' }],
        assets: [
          { code: 'AIQ-WB-001', serial: 'WB100-001', purchaseYear: 2024, cost: 95000, location: 'Goba Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-WB-002', serial: 'WB100-002', purchaseYear: 2024, cost: 95000, location: 'Goba Store', condition: 'GOOD', status: 'AVAILABLE' },
          { code: 'AIQ-WB-003', serial: 'WB100-003', purchaseYear: 2024, cost: 95000, location: 'Goba Store', condition: 'FAIR', status: 'AVAILABLE' },
          { code: 'AIQ-WB-004', serial: 'WB100-004', purchaseYear: 2025, cost: 110000, location: 'Kigamboni Store', condition: 'EXCELLENT', status: 'AVAILABLE' },
        ],
      },
    ],
  },
];

const CUSTOMERS = [
  {
    code: 'CUS-00001',
    type: 'COMPANY' as const,
    fullName: 'Kamal Construction Ltd',
    companyName: 'Kamal Construction Ltd',
    contactPerson: 'Kamal Hassan',
    phone: '0712345678',
    email: 'ops@kamalconstruction.co.tz',
    billingAddress: 'Plot 45, Nyerere Road, Dar es Salaam',
    siteAddress: 'Kigamboni Bridge Site, Dar es Salaam',
    notes: 'Key account, 3 active hire cards',
  },
  {
    code: 'CUS-00002',
    type: 'COMPANY' as const,
    fullName: 'Mwananchi Builders',
    companyName: 'Mwananchi Builders Co. Ltd',
    contactPerson: 'Grace Mushi',
    phone: '0754221330',
    email: 'accounts@mwananchibuilders.co.tz',
    billingAddress: 'Mbagala Rangi Tatu, Dar es Salaam',
    siteAddress: 'Mbagala Kizuiani Project',
    notes: 'Pays by CRDB bank transfer',
  },
  {
    code: 'CUS-00003',
    type: 'INDIVIDUAL' as const,
    fullName: 'Juma Ibrahim',
    phone: '0688112233',
    email: null,
    billingAddress: 'Mbezi Beach, Dar es Salaam',
    siteAddress: 'Mbezi Beach Plot 12',
    notes: 'Private residence build, generator overdue',
  },
  {
    code: 'CUS-00004',
    type: 'COMPANY' as const,
    fullName: 'Simba Engineering Co.',
    companyName: 'Simba Engineering Co. Ltd',
    contactPerson: 'Eng. Peter Lyimo',
    phone: '0765550099',
    email: 'procurement@simbaengineering.co.tz',
    billingAddress: 'Nyerere Road, Vingunguti, Dar es Salaam',
    siteAddress: 'Tazara Flyover Works',
    notes: 'Requires delivery to site',
  },
  {
    code: 'CUS-00005',
    type: 'INDIVIDUAL' as const,
    fullName: 'Neema Joseph',
    phone: '0767445990',
    email: 'neema.joseph@gmail.com',
    billingAddress: 'Sinza Madukani, Dar es Salaam',
    siteAddress: 'Sinza Kwa Remmy',
    notes: 'Small residential slab',
  },
  {
    code: 'CUS-00006',
    type: 'COMPANY' as const,
    fullName: 'Coastal Paving Ltd',
    companyName: 'Coastal Paving Ltd',
    contactPerson: 'Salim Rashid',
    phone: '0719887766',
    email: 'salim@coastalpaving.co.tz',
    billingAddress: 'Kigamboni, Dar es Salaam',
    siteAddress: 'Kigamboni Beach Road',
    notes: 'Compaction and paving works',
  },
  {
    code: 'CUS-00007',
    type: 'INDIVIDUAL' as const,
    fullName: 'Hamisi Ally',
    phone: '0672334455',
    email: null,
    billingAddress: 'Tabata Kimanga, Dar es Salaam',
    siteAddress: 'Tabata Kimanga Plot 88',
    notes: null,
  },
  {
    code: 'CUS-00008',
    type: 'COMPANY' as const,
    fullName: 'TAZARA Civil Works',
    companyName: 'TAZARA Civil Works Unit',
    contactPerson: 'Fatuma Ndunguru',
    phone: '0222861234',
    email: 'civil@tazara.co.tz',
    billingAddress: 'TAZARA HQ, Dar es Salaam',
    siteAddress: 'TAZARA Yard, Dar es Salaam',
    notes: 'Government client, LPO required',
  },
];

function docNumber(prefix: string, seq: number, date = new Date()) {
  const period = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `${prefix}:${period}-${String(seq).padStart(4, '0')}`;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysAhead(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function seedCatalog(prisma: PrismaClient, adminId: string) {
  await mkdir(UPLOAD_DIR, { recursive: true });

  // ── Equipment categories, models, prices, accessories, assets, photos ──────
  for (const category of CATALOG) {
    const createdCategory = await prisma.equipmentCategory.upsert({
      where: { code: category.code },
      update: { name: category.name, description: category.description },
      create: {
        code: category.code,
        name: category.name,
        description: category.description,
        trackingMode: 'INDIVIDUAL',
      },
    });

    for (const model of category.models) {
      let record = await prisma.equipmentModel.findFirst({
        where: {
          categoryId: createdCategory.id,
          name: { in: [model.name, ...(model.aliases ?? [])] },
        },
      });
      if (!record) {
        record = await prisma.equipmentModel.create({
          data: {
            categoryId: createdCategory.id,
            name: model.name,
            brand: model.brand,
            modelNumber: model.modelNumber,
            description: model.description,
            specifications: model.specs,
            defaultDeposit: model.deposit,
          },
        });
      } else {
        record = await prisma.equipmentModel.update({
          where: { id: record.id },
          data: {
            name: model.name,
            brand: model.brand,
            modelNumber: model.modelNumber,
            description: model.description,
            specifications: model.specs,
            defaultDeposit: model.deposit,
          },
        });
      }

      const existingPrices = await prisma.equipmentPrice.count({
        where: { modelId: record.id, assetId: null },
      });
      if (existingPrices === 0) {
        await prisma.equipmentPrice.createMany({
          data: model.prices.map((price) => ({
            modelId: record!.id,
            pricingUnit: price.unit,
            amount: price.amount,
            minimumDuration: price.minimumDuration ?? 1,
          })),
        });
      }

      for (const accessory of model.accessories) {
        const found = await prisma.equipmentAccessory.findFirst({
          where: { modelId: record.id, name: accessory.name },
        });
        if (!found) {
          await prisma.equipmentAccessory.create({
            data: {
              modelId: record.id,
              name: accessory.name,
              isRequired: accessory.required ?? false,
            },
          });
        }
      }

      const imageKey = await attachPhoto(prisma, model.image, adminId);

      const modelImage = await prisma.equipmentImage.findFirst({
        where: { modelId: record.id, fileKey: imageKey },
      });
      if (!modelImage) {
        await prisma.equipmentImage.create({
          data: {
            modelId: record.id,
            fileKey: imageKey,
            originalFilename: model.image,
            mimeType: 'image/jpeg',
            sizeBytes: await fileSize(imageKey),
            uploadedById: adminId,
          },
        });
      }

      for (const asset of model.assets) {
        const existing = await prisma.equipmentAsset.findUnique({
          where: { assetCode: asset.code },
        });
        const data = {
          modelId: record.id,
          serialNumber: asset.serial,
          purchaseDate: new Date(`${asset.purchaseYear}-03-15`),
          purchaseCost: asset.cost,
          currentLocation: asset.location,
          condition: asset.condition,
          status: asset.status,
          notes: asset.notes ?? null,
        };

        const saved = existing
          ? await prisma.equipmentAsset.update({
              where: { id: existing.id },
              data,
            })
          : await prisma.equipmentAsset.create({
              data: {
                ...data,
                assetCode: asset.code,
                qrCodeValue: `AIQ:${asset.code}`,
              },
            });

        if (!existing) {
          await prisma.inventoryMovement.create({
            data: {
              assetId: saved.id,
              modelId: record.id,
              movementType: 'INTAKE',
              quantityDelta: 1,
              toStatus: saved.status,
              reason: 'Asset registered (sample data)',
              performedById: adminId,
              referenceType: 'equipment_asset',
              referenceId: saved.id,
            },
          });
        }

        const assetImage = await prisma.equipmentImage.findFirst({
          where: { assetId: saved.id, fileKey: imageKey },
        });
        if (!assetImage) {
          await prisma.equipmentImage.create({
            data: {
              assetId: saved.id,
              fileKey: imageKey,
              originalFilename: model.image,
              mimeType: 'image/jpeg',
              sizeBytes: await fileSize(imageKey),
              uploadedById: adminId,
            },
          });
        }
      }
    }
  }

  // ── Customers ──────────────────────────────────────────────────────────────
  const customerIds = new Map<string, string>();
  for (const customer of CUSTOMERS) {
    const saved = await prisma.customer.upsert({
      where: { customerCode: customer.code },
      update: {
        fullName: customer.fullName,
        customerType: customer.type,
        companyName: customer.companyName ?? null,
        contactPerson: customer.contactPerson ?? null,
        phone: customer.phone,
        email: customer.email ?? null,
        billingAddress: customer.billingAddress ?? null,
        siteAddress: customer.siteAddress ?? null,
        notes: customer.notes ?? null,
      },
      create: {
        customerCode: customer.code,
        customerType: customer.type,
        fullName: customer.fullName,
        companyName: customer.companyName ?? null,
        contactPerson: customer.contactPerson ?? null,
        phone: customer.phone,
        email: customer.email ?? null,
        billingAddress: customer.billingAddress ?? null,
        siteAddress: customer.siteAddress ?? null,
        notes: customer.notes ?? null,
        createdById: adminId,
      },
    });
    customerIds.set(customer.code, saved.id);
  }

  const customerByCode = (code: string) => {
    const id = customerIds.get(code);
    if (!id) throw new Error(`Missing seed customer ${code}`);
    return id;
  };

  await prisma.customerGuarantor.deleteMany({
    where: { customerId: customerByCode('CUS-00003'), fullName: 'Hamisi Ally' },
  });
  await prisma.customerGuarantor.create({
    data: {
      customerId: customerByCode('CUS-00003'),
      fullName: 'Hamisi Ally',
      phone: '0672334455',
      relationship: 'Brother',
      identificationType: 'NIDA',
      identificationNumberEnc: '1990-0504-12345-01',
    },
  });

  // ── Rentals, dispatch, return, invoices, payments ──────────────────────────
  const plateCompactor = await assetByCode(prisma, 'AIQ-PC-001');
  const poker = await assetByCode(prisma, 'AIQ-PK-002');
  const mixer = await assetByCode(prisma, 'AIQ-CM-001');
  const trowel = await assetByCode(prisma, 'AIQ-PT-001');
  const generator = await assetByCode(prisma, 'AIQ-GN-001');

  const activeRental = await ensureRental(prisma, {
    number: docNumber('RN', 1),
    customerId: customerByCode('CUS-00001'),
    startAt: daysAgo(3),
    expectedReturnAt: daysAhead(4),
    siteLocation: 'Kigamboni Bridge Site',
    status: 'ACTIVE',
    deliveryTotal: 40000,
    amountPaid: 300000,
    remarks: 'Deliver before 8am, site contact Kamal 0712 345 678',
    adminId,
    items: [
      { modelId: plateCompactor.modelId, assetId: plateCompactor.id, unitPrice: 60000, duration: 5 },
      { modelId: poker.modelId, assetId: poker.id, unitPrice: 30000, duration: 5 },
    ],
  });

  const closedRental = await ensureRental(prisma, {
    number: docNumber('RN', 2),
    customerId: customerByCode('CUS-00002'),
    startAt: daysAgo(20),
    expectedReturnAt: daysAgo(13),
    actualReturnAt: daysAgo(12),
    siteLocation: 'Mbagala Kizuiani Project',
    status: 'CLOSED',
    deliveryTotal: 50000,
    amountPaid: 855000,
    remarks: 'Returned in good condition, one blade replaced',
    adminId,
    items: [
      { modelId: mixer.modelId, assetId: mixer.id, unitPrice: 45000, duration: 7 },
      { modelId: trowel.modelId, assetId: trowel.id, unitPrice: 70000, duration: 7 },
    ],
  });

  const overdueRental = await ensureRental(prisma, {
    number: docNumber('RN', 3),
    customerId: customerByCode('CUS-00003'),
    startAt: daysAgo(12),
    expectedReturnAt: daysAgo(1),
    siteLocation: 'Mbezi Beach Plot 12',
    status: 'OVERDUE',
    deliveryTotal: 0,
    amountPaid: 0,
    remarks: 'Customer requested two extra days - follow up on extension',
    adminId,
    items: [
      { modelId: generator.modelId, assetId: generator.id, unitPrice: 120000, duration: 12 },
    ],
  });

  await ensureDispatch(prisma, activeRental, adminId, 'Site Engineer - Ali Mwinyi');
  await ensureReturn(prisma, closedRental, adminId);

  const deposit = await prisma.securityDeposit.findFirst({
    where: { rentalId: activeRental.id },
  });
  if (!deposit) {
    const createdDeposit = await prisma.securityDeposit.create({
      data: {
        rentalId: activeRental.id,
        customerId: activeRental.customerId,
        requiredAmount: 200000,
        collectedAmount: 200000,
        status: 'HELD',
      },
    });
    await prisma.depositTransaction.create({
      data: {
        securityDepositId: createdDeposit.id,
        transactionType: 'COLLECT',
        amount: 200000,
        reference: 'MPESA-QW77HD22',
        reason: 'Deposit collected on dispatch',
        performedById: adminId,
      },
    });
  }

  const invoiceOne = await ensureInvoice(prisma, {
    number: docNumber('INV', 1),
    rentalId: activeRental.id,
    status: 'PARTIALLY_PAID',
    issuedAt: daysAgo(3),
    dueAt: daysAhead(4),
    adminId,
  });
  const invoiceTwo = await ensureInvoice(prisma, {
    number: docNumber('INV', 2),
    rentalId: closedRental.id,
    status: 'PAID',
    issuedAt: daysAgo(20),
    dueAt: daysAgo(13),
    adminId,
  });
  await ensureInvoice(prisma, {
    number: docNumber('INV', 3),
    rentalId: overdueRental.id,
    status: 'ISSUED',
    issuedAt: daysAgo(10),
    dueAt: daysAgo(3),
    adminId,
  });

  await ensurePayment(prisma, {
    number: docNumber('PAY', 1),
    customerId: activeRental.customerId,
    invoiceId: invoiceOne.id,
    amount: 300000,
    method: 'MOBILE_MONEY',
    provider: 'M-Pesa',
    reference: 'MPESA-QX81LK02',
    receivedAt: daysAgo(2),
    adminId,
  });

  await ensurePayment(prisma, {
    number: docNumber('PAY', 2),
    customerId: closedRental.customerId,
    invoiceId: invoiceTwo.id,
    amount: 855000,
    method: 'BANK_TRANSFER',
    provider: 'CRDB Bank',
    reference: 'CRDB-88214570',
    receivedAt: daysAgo(14),
    adminId,
  });

  // ── Maintenance + expense ─────────────────────────────────────────────────
  const jackHammer = await assetByCode(prisma, 'AIQ-JH-002');
  const maintenanceNumber = docNumber('MNT', 1);
  const existingMaintenance = await prisma.maintenanceJob.findUnique({
    where: { maintenanceNumber },
  });
  if (!existingMaintenance) {
    await prisma.maintenanceJob.create({
      data: {
        maintenanceNumber,
        assetId: jackHammer.id,
        issueDescription: 'Hydraulic hose leak and chisel retaining pin worn out.',
        priority: 'HIGH',
        status: 'OPEN',
        laborCost: 45000,
        partsCost: 120000,
        otherCost: 0,
        totalCost: 165000,
        reportedById: adminId,
      },
    });
  }

  const expenseNumber = docNumber('EXP', 1);
  const existingExpense = await prisma.expense.findUnique({
    where: { expenseNumber },
  });
  if (!existingExpense) {
    await prisma.expense.create({
      data: {
        expenseNumber,
        category: 'Transport',
        description: 'Delivery of plate compactor and poker to Kigamboni Bridge Site',
        amount: 40000,
        expenseDate: daysAgo(3),
        supplier: 'AIQ Internal Transport',
        paymentMethod: 'CASH',
        relatedRentalId: activeRental.id,
        status: 'PAID',
        createdById: adminId,
        approvedById: adminId,
      },
    });
  }

  // Drop the demo customer created by older versions of this seed.
  const legacyCustomer = await prisma.customer.findFirst({
    where: { phone: '0700000999', fullName: 'Demo Customer' },
    select: { id: true },
  });
  if (legacyCustomer) {
    const [rentalCount, invoiceCount] = await Promise.all([
      prisma.rental.count({ where: { customerId: legacyCustomer.id } }),
      prisma.invoice.count({ where: { customerId: legacyCustomer.id } }),
    ]);
    if (rentalCount === 0 && invoiceCount === 0) {
      await prisma.customer.delete({ where: { id: legacyCustomer.id } });
    }
  }

  // Collapse duplicate sample models that earlier seed versions may have created.
  const allModels = await prisma.equipmentModel.findMany({
    select: { id: true, name: true, categoryId: true },
  });
  const grouped = new Map<string, string[]>();
  for (const model of allModels) {
    const key = `${model.categoryId}::${model.name}`;
    grouped.set(key, [...(grouped.get(key) ?? []), model.id]);
  }
  for (const ids of grouped.values()) {
    if (ids.length < 2) continue;
    const scored = await Promise.all(
      ids.map(async (id) => ({
        id,
        assets: await prisma.equipmentAsset.count({ where: { modelId: id } }),
      })),
    );
    scored.sort((a, b) => b.assets - a.assets);
    const keeper = scored[0]!.id;
    for (const duplicate of scored.slice(1)) {
      await prisma.equipmentAsset.updateMany({
        where: { modelId: duplicate.id },
        data: { modelId: keeper },
      });
      await prisma.rentalItem.updateMany({
        where: { modelId: duplicate.id },
        data: { modelId: keeper },
      });
      await prisma.inventoryMovement.updateMany({
        where: { modelId: duplicate.id },
        data: { modelId: keeper },
      });
      await prisma.rentalRequestItem.updateMany({
        where: { modelId: duplicate.id },
        data: { modelId: keeper },
      });
      await prisma.equipmentModel.delete({ where: { id: duplicate.id } });
    }
  }

  const totals = {
    categories: CATALOG.length,
    models: CATALOG.reduce((sum, c) => sum + c.models.length, 0),
    assets: CATALOG.reduce(
      (sum, c) => sum + c.models.reduce((s, m) => s + m.assets.length, 0),
      0,
    ),
    customers: CUSTOMERS.length,
  };

  return totals;
}

async function assetByCode(prisma: PrismaClient, assetCode: string) {
  const asset = await prisma.equipmentAsset.findUnique({ where: { assetCode } });
  if (!asset) throw new Error(`Seed asset ${assetCode} missing`);
  return asset;
}

async function fileSize(fileKey: string) {
  const info = await stat(join(process.cwd(), fileKey));
  return info.size;
}

/** Copy a bundled sample photo into the uploads volume and register the file. */
async function attachPhoto(prisma: PrismaClient, filename: string, adminId: string) {
  const fileKey = `uploads/sample-${filename}`;
  const destination = join(process.cwd(), fileKey);
  await copyFile(join(IMAGE_SOURCE_DIR, filename), destination);
  const info = await stat(destination);

  const existing = await prisma.fileObject.findUnique({ where: { storageKey: fileKey } });
  if (!existing) {
    await prisma.fileObject.create({
      data: {
        storageKey: fileKey,
        originalFilename: filename,
        mimeType: 'image/jpeg',
        sizeBytes: info.size,
        uploadedById: adminId,
      },
    });
  }

  return fileKey;
}

type RentalSeedItem = {
  modelId: string;
  assetId: string;
  unitPrice: number;
  duration: number;
};

type RentalSeed = {
  number: string;
  customerId: string;
  startAt: Date;
  expectedReturnAt: Date;
  actualReturnAt?: Date;
  siteLocation: string;
  status: 'ACTIVE' | 'CLOSED' | 'OVERDUE' | 'CONFIRMED' | 'RETURNED';
  deliveryTotal: number;
  amountPaid: number;
  remarks: string;
  adminId: string;
  items: RentalSeedItem[];
};

async function ensureRental(prisma: PrismaClient, seed: RentalSeed) {
  const existing = await prisma.rental.findUnique({ where: { rentalNumber: seed.number } });
  if (existing) return existing;

  const subtotal = seed.items.reduce(
    (sum, item) => sum + item.unitPrice * item.duration,
    0,
  );
  const grandTotal = subtotal + seed.deliveryTotal;
  const balance = grandTotal - seed.amountPaid;

  return prisma.rental.create({
    data: {
      rentalNumber: seed.number,
      customerId: seed.customerId,
      startAt: seed.startAt,
      expectedReturnAt: seed.expectedReturnAt,
      actualReturnAt: seed.actualReturnAt ?? null,
      siteLocation: seed.siteLocation,
      subtotal,
      discountTotal: 0,
      deliveryTotal: seed.deliveryTotal,
      taxTotal: 0,
      grandTotal,
      amountPaidCached: seed.amountPaid,
      balanceCached: balance,
      status: seed.status,
      remarks: seed.remarks,
      termsSnapshot:
        'Equipment remains the property of AIQ Limited. Hire charges accrue daily until the asset is returned.',
      createdById: seed.adminId,
      approvedById: seed.adminId,
      items: {
        create: seed.items.map((item) => ({
          modelId: item.modelId,
          assetId: item.assetId,
          quantity: 1,
          pricingUnit: 'DAY',
          unitPrice: item.unitPrice,
          agreedDuration: item.duration,
          lineSubtotal: item.unitPrice * item.duration,
          discountAmount: 0,
          status: seed.status === 'CLOSED' ? 'RETURNED' : 'ACTIVE',
        })),
      },
    },
    include: { items: true },
  });
}

async function ensureDispatch(
  prisma: PrismaClient,
  rental: { id: string; items?: { id: string; assetId: string | null }[] },
  adminId: string,
  recipient: string,
) {
  const dispatchNumber = docNumber('DP', 1);
  const existing = await prisma.dispatch.findUnique({ where: { dispatchNumber } });
  if (existing) return existing;

  const items = rental.items ?? [];
  return prisma.dispatch.create({
    data: {
      dispatchNumber,
      rentalId: rental.id,
      dispatchedAt: daysAgo(3),
      issuedById: adminId,
      recipientName: recipient,
      siteLocation: 'Kigamboni Bridge Site',
      notes: 'Delivered by AIQ transport, signed hire card on file.',
      status: 'CONFIRMED',
      items: {
        create: items.map((item) => ({
          rentalItemId: item.id,
          assetId: item.assetId,
          quantity: 1,
          conditionOut: 'GOOD',
          accessoriesJson: { checked: true },
          meterReading: 'N/A',
        })),
      },
    },
  });
}

async function ensureReturn(
  prisma: PrismaClient,
  rental: { id: string; items?: { id: string; assetId: string | null }[]; customerId: string },
  adminId: string,
) {
  const returnNumber = docNumber('RT', 1);
  const existing = await prisma.return.findUnique({ where: { returnNumber } });
  if (existing) return existing;

  const items = rental.items ?? [];
  const record = await prisma.return.create({
    data: {
      returnNumber,
      rentalId: rental.id,
      receivedAt: daysAgo(12),
      receivedById: adminId,
      notes: 'Returned clean, blades replaced on the trowel.',
      status: 'COMPLETED',
      items: {
        create: items.map((item) => ({
          rentalItemId: item.id,
          assetId: item.assetId,
          quantityReturned: 1,
          conditionIn: 'GOOD',
          accessoriesReturnedJson: { checked: true },
          inspectionStatus: 'PASS',
          additionalChargeDraft: 0,
        })),
      },
    },
    include: { items: true },
  });

  for (const item of record.items) {
    if (!item.assetId) continue;
    const asset = await prisma.equipmentAsset.findUniqueOrThrow({
      where: { id: item.assetId },
      select: { modelId: true },
    });
    await prisma.inspection.create({
      data: {
        assetId: item.assetId,
        returnItemId: item.id,
        checklistJson: {
          engine: 'pass',
          body: 'pass',
          accessories: 'pass',
          safety: 'pass',
        },
        outcome: 'PASS',
        notes: 'Routine post-hire inspection',
        inspectedById: adminId,
        inspectedAt: daysAgo(12),
      },
    });
    await prisma.inventoryMovement.create({
      data: {
        assetId: item.assetId,
        modelId: asset.modelId,
        movementType: 'RETURN',
        quantityDelta: 1,
        toStatus: 'AVAILABLE',
        reason: 'Returned from hire',
        performedById: adminId,
        referenceType: 'return',
        referenceId: record.id,
      },
    });
  }

  return record;
}

type InvoiceSeed = {
  number: string;
  rentalId: string;
  status: 'ISSUED' | 'PARTIALLY_PAID' | 'PAID';
  issuedAt: Date;
  dueAt: Date;
  adminId: string;
};

async function ensureInvoice(prisma: PrismaClient, seed: InvoiceSeed) {
  const existing = await prisma.invoice.findUnique({
    where: { invoiceNumber: seed.number },
  });
  if (existing) return existing;

  const rental = await prisma.rental.findUniqueOrThrow({
    where: { id: seed.rentalId },
    select: {
      customerId: true,
      subtotal: true,
      deliveryTotal: true,
      grandTotal: true,
    },
  });

  return prisma.invoice.create({
    data: {
      invoiceNumber: seed.number,
      customerId: rental.customerId,
      rentalId: seed.rentalId,
      issuedAt: seed.issuedAt,
      dueAt: seed.dueAt,
      subtotal: rental.subtotal,
      discountTotal: 0,
      deliveryTotal: rental.deliveryTotal,
      taxTotal: 0,
      grandTotal: rental.grandTotal,
      status: seed.status,
      issuedById: seed.adminId,
    },
  });
}

type PaymentSeed = {
  number: string;
  customerId: string;
  invoiceId: string;
  amount: number;
  method: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'OTHER';
  provider: string;
  reference: string;
  receivedAt: Date;
  adminId: string;
};

async function ensurePayment(prisma: PrismaClient, seed: PaymentSeed) {
  const existing = await prisma.payment.findUnique({
    where: { paymentNumber: seed.number },
  });
  if (existing) return existing;

  return prisma.payment.create({
    data: {
      paymentNumber: seed.number,
      customerId: seed.customerId,
      amount: seed.amount,
      currency: 'TZS',
      method: seed.method,
      provider: seed.provider,
      referenceNumber: seed.reference,
      receivedAt: seed.receivedAt,
      status: 'ALLOCATED',
      notes: 'Sample receipt',
      receivedById: seed.adminId,
      allocations: {
        create: {
          invoiceId: seed.invoiceId,
          allocatedAmount: seed.amount,
        },
      },
    },
  });
}

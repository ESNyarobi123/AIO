#!/usr/bin/env node
/**
 * Demo data for AIQ HireFlow.
 *
 * Creates a small, realistic set of yard items through the public API so the
 * demo never bypasses business rules (codes, stock status, rates, invoices).
 * Every record is matched by a natural key first, so running it twice does not
 * duplicate anything.
 *
 *   AIO_API=https://aio.yunigo.online/api/v1 \
 *   AIO_USER=admin@aiqltd.co.tz AIO_PASS='Admin@HireFlow1' \
 *   node scripts/seed-demo.mjs
 */

const BASE = process.env.AIO_API ?? "https://aio.yunigo.online/api/v1";
const IDENTIFIER = process.env.AIO_USER ?? "admin@aiqltd.co.tz";
const PASSWORD = process.env.AIO_PASS ?? "Admin@HireFlow1";

let token = "";
const log = (...args) => console.log(...args);
const warn = (...args) => console.warn("  !", ...args);

async function call(path, method = "GET", body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = undefined;
  }
  if (!response.ok) {
    const message =
      payload?.error?.message ?? payload?.message ?? text.slice(0, 200);
    throw new Error(
      `${method} ${path} → ${response.status}: ${
        Array.isArray(message) ? message.join(", ") : message
      }`,
    );
  }
  return payload?.data ?? payload;
}

async function login() {
  const result = await call("/auth/login", "POST", {
    identifier: IDENTIFIER,
    password: PASSWORD,
  });
  token = result.accessToken;
  log(`Signed in as ${result.user.fullName} (${result.user.roles.join(", ")})`);
}

const IMAGES = [
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80",
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80",
  "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1200&q=80",
  "https://images.unsplash.com/photo-1487875961445-47a00398c267?w=1200&q=80",
  "https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=1200&q=80",
];

const CATEGORIES = [
  {
    code: "LIGHT",
    name: "Site Lighting",
    description: "Flood lights, light towers and site power for night work.",
  },
  {
    code: "TOOLS",
    name: "Small Plant & Tools",
    description: "Bench tools hired by the day for finishing works.",
  },
];

const MODELS = [
  {
    key: "light-tower",
    category: "LIGHT",
    name: "LED Light Tower 4x200W",
    brand: "Wacker",
    modelNumber: "LT4-200",
    description: "Four-head LED tower for night pours and yard lighting.",
    deposit: 100000,
    prices: { DAY: 45000, WEEK: 250000, MONTH: 900000 },
    accessories: ["Tripod mast", "Ballast", "Cable reel"],
    assets: [
      { code: "AIQ-LT-001", serial: "LT4-200-1145" },
      { code: "AIQ-LT-002", serial: "LT4-200-1146" },
    ],
  },
  {
    key: "genset-5",
    category: "POWER",
    name: "Silent Generator 5kVA",
    brand: "Honda",
    modelNumber: "EU70is",
    description: "Quiet petrol generator for offices and small tools.",
    deposit: 80000,
    prices: { DAY: 35000, WEEK: 190000 },
    accessories: ["Fuel can", "Extension board"],
    assets: [
      { code: "AIQ-GN-101", serial: "EU70-88231" },
      { code: "AIQ-GN-102", serial: "EU70-88232" },
    ],
  },
  {
    key: "tile-cutter",
    category: "TOOLS",
    name: "Tile Cutter 1200W",
    brand: "Bosch",
    modelNumber: "GDC 121",
    description: "Wet tile cutter for floors and wall finishes.",
    deposit: 30000,
    prices: { DAY: 15000, WEEK: 80000 },
    accessories: ["Diamond blade", "Water tray"],
    assets: [
      { code: "AIQ-TL-001", serial: "GDC121-5510" },
      { code: "AIQ-TL-002", serial: "GDC121-5511" },
    ],
  },
  {
    key: "rebar-bender",
    category: "TOOLS",
    name: "Rebar Bender 16mm",
    brand: "Makita",
    modelNumber: "RB16",
    description: "Bench bender for stirrups and column links.",
    deposit: 40000,
    prices: { DAY: 20000, WEEK: 110000 },
    accessories: ["Bending pins", "Stand"],
    assets: [{ code: "AIQ-RB-001", serial: "RB16-3301" }],
  },
  {
    key: "core-drill",
    category: "TOOLS",
    name: "Core Drill 200mm",
    brand: "Hilti",
    modelNumber: "DD 200",
    description: "Diamond core drilling for service penetrations.",
    deposit: 60000,
    prices: { DAY: 30000, WEEK: 160000 },
    accessories: ["Core bits", "Water hose", "Anchor stand"],
    assets: [{ code: "AIQ-CD-001", serial: "DD200-7742" }],
  },
];

const CUSTOMERS = [
  {
    type: "COMPANY",
    name: "Kilimanjaro Builders Ltd",
    company: "Kilimanjaro Builders Ltd",
    phone: "0754112200",
    email: "site@kilimanjarobuilders.co.tz",
    site: "Mbezi Beach — plot 44",
    notes: "Repeat customer. LPO required for every hire.",
  },
  {
    type: "INDIVIDUAL",
    name: "Ally Mwinyi",
    phone: "0713550044",
    email: "ally.mwinyi@gmail.com",
    site: "Kigamboni — Buyuni",
    notes: "Pays cash on collection.",
  },
  {
    type: "COMPANY",
    name: "Peninsula Contractors",
    company: "Peninsula Contractors Co. Ltd",
    phone: "0768990011",
    email: "desk@peninsulacontractors.co.tz",
    site: "Masaki — sea wall works",
    notes: "30 day credit terms.",
  },
  {
    type: "INDIVIDUAL",
    name: "Mariam Said",
    phone: "0788440011",
    email: "mariam.said@outlook.com",
    site: "Goba — family house",
    notes: "Prefers WhatsApp for return reminders.",
  },
];

async function ensureCategory(category) {
  const existing = await call("/equipment/categories?limit=100");
  const match = existing.find((row) => row.code === category.code);
  if (match) return match;
  return call("/equipment/categories", "POST", {
    name: category.name,
    code: category.code,
    description: category.description,
    trackingMode: "INDIVIDUAL",
  });
}

async function ensureModel(model, categoryId) {
  const existing = await call(
    `/equipment/models?limit=100&search=${encodeURIComponent(model.name)}`,
  );
  const match = existing.find(
    (row) => row.name.toLowerCase() === model.name.toLowerCase(),
  );
  if (match) return match;

  const prices = Object.entries(model.prices).map(([unit, amount]) => ({
    pricingUnit: unit,
    amount,
    minimumDuration: 1,
  }));
  const created = await call("/equipment/models", "POST", {
    categoryId,
    name: model.name,
    brand: model.brand,
    modelNumber: model.modelNumber,
    description: model.description,
    defaultDeposit: model.deposit,
    prices,
    accessories: model.accessories.map((name) => ({ name })),
  });
  return created;
}

async function ensureAsset(asset, model) {
  const existing = await call(
    `/equipment/assets?limit=100&search=${encodeURIComponent(asset.code)}`,
  );
  const match = existing.find(
    (row) => row.assetCode.toUpperCase() === asset.code.toUpperCase(),
  );
  if (match) return match;
  return call("/equipment/assets", "POST", {
    assetCode: asset.code,
    modelId: model.id,
    serialNumber: asset.serial,
    currentLocation: "Goba Store",
    condition: "GOOD",
    status: "AVAILABLE",
    notes: "Demo unit — ready for hire.",
  });
}

async function attachPhoto(assetId, url) {
  try {
    // The API stores the URL as the unique storage key, so each machine needs
    // its own query string to avoid a key collision.
    const unique = `${url}${url.includes("?") ? "&" : "?"}aiq=${assetId.slice(0, 8)}`;
    await call("/files/from-url", "POST", { url: unique, assetId });
  } catch (error) {
    warn(`photo skipped for ${assetId}: ${error.message}`);
  }
}

async function ensureCustomer(customer) {
  const existing = await call(
    `/customers?limit=100&search=${encodeURIComponent(customer.phone)}`,
  );
  const match = existing.find((row) => row.phone === customer.phone);
  if (match) return match;
  return call("/customers", "POST", {
    customerType: customer.type,
    fullName: customer.name,
    companyName: customer.company,
    phone: customer.phone,
    email: customer.email,
    siteAddress: customer.site,
    notes: customer.notes,
  });
}

async function main() {
  log(`AIQ HireFlow demo seed → ${BASE}`);
  await login();

  log("\nCategories");
  const categories = {};
  for (const category of CATEGORIES) {
    const row = await ensureCategory(category);
    categories[category.code] = row;
    log(`  ✓ ${row.code} — ${row.name}`);
  }

  const existingCategories = await call("/equipment/categories?limit=100");
  const categoryIdByCode = Object.fromEntries(
    existingCategories.map((row) => [row.code, row.id]),
  );

  log("\nModels & rates");
  const models = {};
  for (const model of MODELS) {
    const categoryId = categoryIdByCode[model.category];
    if (!categoryId) {
      warn(`category ${model.category} missing — skipped ${model.name}`);
      continue;
    }
    const row = await ensureModel(model, categoryId);
    models[model.key] = row;
    log(`  ✓ ${row.name} — ${row.category?.name ?? model.category}`);
  }

  log("\nMachines");
  const assets = {};
  for (const model of MODELS) {
    const row = models[model.key];
    if (!row) continue;
    assets[model.key] = [];
    let photoIndex = 0;
    for (const asset of model.assets) {
      const created = await ensureAsset(asset, row);
      assets[model.key].push(created);
      const url = IMAGES[photoIndex % IMAGES.length];
      photoIndex += 1;
      await attachPhoto(created.id, url);
      log(`  ✓ ${created.assetCode} (${row.name})`);
    }
  }

  log("\nCustomers");
  const customers = {};
  for (const customer of CUSTOMERS) {
    const row = await ensureCustomer(customer);
    customers[customer.phone] = row;
    log(`  ✓ ${row.customerCode} — ${row.fullName}`);
  }

  log("\nStaff hire (internal issue)");
  try {
    const users = await call("/users?limit=100");
    const staff = users.find((row) => row.roles.includes("STAFF")) ?? users[0];
    const hireAsset = assets["tile-cutter"]?.[0];
    if (staff && hireAsset) {
      const hires = await call("/staff-hires?limit=50&search=AIQ-TL-001");
      if (hires.length === 0) {
        const expected = new Date(Date.now() + 2 * 86_400_000).toISOString();
        const hire = await call("/staff-hires", "POST", {
          userId: staff.id,
          purpose: "Bathroom tiling — Goba site",
          siteLocation: "Goba site",
          expectedReturnAt: expected,
          notes: "Demo issue so the return flow can be tried.",
          items: [{ assetId: hireAsset.id, conditionOut: "GOOD" }],
        });
        log(`  ✓ ${hire.hireNumber} → ${staff.fullName}`);
      } else {
        log("  · staff hire already present");
      }
    } else {
      warn("no staff or available asset for a demo hire");
    }
  } catch (error) {
    warn(`staff hire skipped: ${error.message}`);
  }

  log("\nMaintenance job");
  try {
    const jobs = await call("/maintenance?limit=50");
    const target = assets["core-drill"]?.[0];
    if (target && jobs.length === 0) {
      const job = await call("/maintenance", "POST", {
        assetId: target.id,
        issueDescription: "Water seal leaking — needs a new gasket",
        priority: "MEDIUM",
        laborCost: 25000,
        partsCost: 18000,
      });
      log(`  ✓ ${job.maintenanceNumber} on ${target.assetCode}`);
    } else {
      log("  · maintenance already present or no core drill asset");
    }
  } catch (error) {
    warn(`maintenance skipped: ${error.message}`);
  }

  log("\nRental + invoice + part payment");
  try {
    const rentals = await call("/rentals?limit=50");
    const demoCustomer = customers["0754112200"] ?? Object.values(customers)[0];
    const mixer = models["genset-5"];
    const existing = rentals.find(
      (row) => row.customer?.id === demoCustomer?.id && row.siteLocation?.includes("Demo"),
    );
    if (!existing && demoCustomer && mixer) {
      const start = new Date();
      const end = new Date(start.getTime() + 4 * 86_400_000);
      const rental = await call("/rentals", "POST", {
        customerId: demoCustomer.id,
        startAt: start.toISOString(),
        expectedReturnAt: end.toISOString(),
        siteLocation: "Demo — Mbezi Beach",
        remarks: "Demo hire card created by the seed script.",
        items: [
          {
            modelId: mixer.id,
            quantity: 1,
            pricingUnit: "DAY",
            unitPrice: 35000,
            standardPrice: 35000,
            agreedDuration: 4,
          },
        ],
      });
      log(`  ✓ ${rental.rentalNumber} (draft)`);
      await call(`/rentals/${rental.id}/confirm`, "POST");
      log("  ✓ confirmed");
      const invoice = await call("/invoices", "POST", { rentalId: rental.id });
      log(`  ✓ ${invoice.invoiceNumber} · ${invoice.grandTotal}`);
      const payment = await call("/payments", "POST", {
        customerId: demoCustomer.id,
        amount: 70000,
        method: "MOBILE_MONEY",
        provider: "Vodacom M-Pesa",
        referenceNumber: `DEMO-${Date.now().toString().slice(-6)}`,
        receivedAt: new Date().toISOString(),
        notes: "Deposit paid at the desk (demo).",
      });
      log(`  ✓ receipt ${payment.paymentNumber} · ${payment.amount}`);
    } else {
      log("  · demo rental already present");
    }
  } catch (error) {
    warn(`rental demo skipped: ${error.message}`);
  }

  log("\nDone. Reload the console to see the new records.");
}

main().catch((error) => {
  console.error("\nDemo seed failed:", error.message);
  process.exit(1);
});

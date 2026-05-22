/**
 * Demo data seeder (opt-in — NOT part of `npm run db:seed`).
 *
 * Populates demo-shaped data across the flooring stack so the dashboard has
 * volume to look at. Skips reference tables that have their own canonical
 * seeds (unit-of-measures, categories). Job types are user-managed.
 *
 * Volumes (override the constants below to dial up/down):
 *   50   management companies
 *   300  properties
 *   3    warehouses
 *   10   manufacturers (real retailer names — upserted, won't duplicate)
 *   600  products
 *   2000 templates  + 10000 template material items (5 per)
 *   1200 work orders + 6000 work order material items (5 per, all status=IDLE, no files)
 *
 * Does NOT seed imports, staged filter rows, staged inventory rows, inventory
 * rows, or cut logs — those flow through real user actions.
 *
 * Idempotent-by-bail: skips if the first demo management company already exists.
 *
 * Prereq: `npm run db:seed:uoms` + `npm run db:seed:categories`
 * (or `npm run db:seed` for full canonical seed).
 */

const COMPANY_COUNT = 50
const PROPERTY_COUNT = 300
const WAREHOUSE_COUNT = 3
const MANUFACTURER_COUNT = 10
const PRODUCT_COUNT = 600
const TEMPLATE_COUNT = 2000
const TEMPLATE_ITEMS_PER = 5
const WORK_ORDER_COUNT = 1200
const WORK_ORDER_ITEMS_PER = 5

const COMPANY_NAME_PREFIX = "Demo Mgmt Co"
const PROPERTY_NAME_PREFIX = "Demo Property"
const PRODUCT_NAME_PREFIX = "Demo Product"
const WAREHOUSE_NAME_PREFIX = "Demo Warehouse"

const STATES = ["TX", "CA", "FL", "GA", "NC", "AZ", "WA", "CO", "OH", "VA", "NY", "IL", "MA", "OR", "NV", "UT", "PA", "MI", "MN", "TN"]
const CITIES = ["Austin", "Dallas", "Atlanta", "Phoenix", "Denver", "Seattle", "Tampa", "Raleigh", "Columbus", "Reston", "Houston", "Miami", "Boston", "Portland", "Las Vegas", "Salt Lake", "Pittsburgh", "Detroit", "Minneapolis", "Nashville"]
const UNIT_TYPES = ["1BR", "2BR", "3BR", "4BR", "Studio", "Townhome", "Penthouse", "Loft", "Duplex", "Garden"]
const STYLES = ["Oak", "Maple", "Walnut", "Cherry", "Ash", "Pine", "Birch", "Mahogany", "Hickory", "Bamboo"]
const COLORS = ["Natural", "Espresso", "Honey", "Charcoal", "Slate", "Cream", "Driftwood", "Mocha", "Smoke", "Sienna"]
const MANUFACTURER_NAMES = [
  "Home Depot",
  "Lowe's",
  "Floor & Decor",
  "Sherwin-Williams",
  "LL Flooring",
  "Menards",
  "Carpet One",
  "Empire Today",
  "50 Floor",
  "Costco",
]

function pad(n, width = 2) {
  return String(n).padStart(width, "0")
}

function pick(arr, i) {
  return arr[i % arr.length]
}

function normalizeCompanyName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function buildCompanies() {
  return Array.from({ length: COMPANY_COUNT }, (_, i) => {
    const n = i + 1
    return {
      name: `${COMPANY_NAME_PREFIX} ${pad(n)}`,
      streetAddress: `${100 + n * 7} Main St`,
      city: pick(CITIES, n),
      state: pick(STATES, n),
      postalCode: pad(10000 + n * 137, 5),
      phone: `512-555-${pad(1000 + n, 4)}`,
      email: `contact${n}@demo-mgmt-${pad(n)}.example`,
    }
  })
}

function buildPropertyInputs() {
  return Array.from({ length: PROPERTY_COUNT }, (_, i) => {
    const n = i + 1
    return {
      name: `${PROPERTY_NAME_PREFIX} ${pad(n, 3)}`,
      streetAddress: `${200 + n * 11} Oak Ave`,
      city: pick(CITIES, n + 3),
      state: pick(STATES, n + 3),
      postalCode: pad(20000 + n * 53, 5),
      phone: `512-555-${pad(2000 + n, 4)}`,
      email: `manager@demo-property-${pad(n, 3)}.example`,
      instructions: `Demo property ${pad(n, 3)} — standard install instructions.`,
      _companyIndex: i % COMPANY_COUNT,
    }
  })
}

function buildWarehouses(baseNumber) {
  return Array.from({ length: WAREHOUSE_COUNT }, (_, i) => {
    const n = i + 1
    return {
      number: baseNumber + n,
      name: `${WAREHOUSE_NAME_PREFIX} ${n}`,
      streetAddress: `${300 + n * 13} Industrial Pkwy`,
      city: pick(CITIES, n + 5),
      state: pick(STATES, n + 5),
      postalCode: pad(30000 + n * 41, 5),
      phone: `512-555-${pad(3000 + n, 4)}`,
    }
  })
}

function buildManufacturers() {
  return MANUFACTURER_NAMES.slice(0, MANUFACTURER_COUNT).map((name, i) => {
    const emailSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    return {
      companyName: name,
      companyNameNormalized: normalizeCompanyName(name),
      agentName: `Demo Agent ${i + 1}`,
      phone: `512-555-${pad(4000 + i + 1, 4)}`,
      email: `sales${i + 1}@${emailSlug}.example`,
    }
  })
}

async function nextWarehouseNumber(prisma) {
  const max = await prisma.flooringWarehouse.aggregate({ _max: { number: true } })
  return max._max.number ?? 0
}

async function seedDemoData({ prisma, logger = console }) {
  logger.log("Checking prerequisites...")

  const { buildStoredFlooringProductName } = await import("@builders/domain")

  const [uomCount, categoryCount, categories] = await Promise.all([
    prisma.flooringUnitOfMeasure.count(),
    prisma.flooringCategory.count(),
    prisma.flooringCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        sendUnit: { select: { name: true, abbreviation: true } },
        stockUnit: { select: { name: true, abbreviation: true } },
        itemCoverageUnit: { select: { name: true, abbreviation: true } },
      },
    }),
  ])

  if (uomCount === 0) {
    throw new Error("No flooring_unit_of_measure rows found. Run `npm run db:seed:uoms` first.")
  }
  if (categoryCount === 0) {
    throw new Error("No flooring_category rows found. Run `npm run db:seed:categories` first.")
  }

  const markerName = `${COMPANY_NAME_PREFIX} 01`
  const existingMarker = await prisma.flooringManagementCompany.findUnique({
    where: { name: markerName },
    select: { id: true },
  })

  if (existingMarker) {
    logger.log(`Demo marker "${markerName}" already exists — skipping. Delete demo rows manually to re-seed.`)
    return
  }

  // 1. Management companies
  logger.log(`Seeding ${COMPANY_COUNT} management companies...`)
  const companies = await prisma.flooringManagementCompany.createManyAndReturn({
    data: buildCompanies(),
    select: { id: true, name: true },
  })

  // 2. Properties
  logger.log(`Seeding ${PROPERTY_COUNT} properties...`)
  const propertyInputs = buildPropertyInputs()
  const properties = await prisma.property.createManyAndReturn({
    data: propertyInputs.map((p) => {
      const { _companyIndex, ...rest } = p
      return { ...rest, managementCompanyId: companies[_companyIndex].id }
    }),
    select: { id: true, managementCompanyId: true },
  })

  // 3. Warehouses
  logger.log(`Seeding ${WAREHOUSE_COUNT} warehouses...`)
  const baseWarehouseNumber = await nextWarehouseNumber(prisma)
  const warehouses = await prisma.flooringWarehouse.createManyAndReturn({
    data: buildWarehouses(baseWarehouseNumber),
    select: { id: true, number: true },
  })

  // 4. Manufacturers — upsert by normalized name so an existing real-store row
  // (e.g. Home Depot already added by a user) is reused rather than duplicated.
  logger.log(`Seeding ${MANUFACTURER_COUNT} manufacturers (upsert)...`)
  const manufacturerInputs = buildManufacturers()
  const manufacturers = []
  let manufacturersCreated = 0
  let manufacturersReused = 0
  for (const input of manufacturerInputs) {
    const existing = await prisma.flooringManufacturer.findUnique({
      where: { companyNameNormalized: input.companyNameNormalized },
      select: { id: true, companyName: true },
    })
    if (existing) {
      manufacturers.push(existing)
      manufacturersReused += 1
      continue
    }
    const created = await prisma.flooringManufacturer.create({
      data: input,
      select: { id: true, companyName: true },
    })
    manufacturers.push(created)
    manufacturersCreated += 1
  }
  logger.log(`  ${manufacturersCreated} created, ${manufacturersReused} reused.`)

  // 5. Products
  logger.log(`Seeding ${PRODUCT_COUNT} products...`)
  const productInputs = Array.from({ length: PRODUCT_COUNT }, (_, i) => {
    const n = i + 1
    const style = pick(STYLES, n)
    const color = pick(COLORS, n + 1)
    const category = categories[i % categories.length]
    const manufacturer = manufacturers[i % manufacturers.length]
    const note = `${PRODUCT_NAME_PREFIX} #${pad(n, 3)}`
    return {
      name: buildStoredFlooringProductName({
        categoryName: category.name,
        style,
        color,
        note,
      }),
      style,
      color,
      note,
      coveragePerUnit: 20 + (n % 10) * 2,
      categoryId: category.id,
      manufacturerId: manufacturer.id,
      manufacturerName: manufacturer.companyName,
      sendUnitName: category.sendUnit?.name ?? null,
      sendUnitAbbrev: category.sendUnit?.abbreviation ?? null,
      stockUnitName: category.stockUnit?.name ?? null,
      stockUnitAbbrev: category.stockUnit?.abbreviation ?? null,
      itemCoverageUnitName: category.itemCoverageUnit?.name ?? null,
      itemCoverageUnitAbbrev: category.itemCoverageUnit?.abbreviation ?? null,
    }
  })
  const products = await prisma.flooringProduct.createManyAndReturn({
    data: productInputs,
    select: {
      id: true,
      name: true,
      categoryId: true,
      sendUnitName: true,
      sendUnitAbbrev: true,
      stockUnitName: true,
      stockUnitAbbrev: true,
      itemCoverageUnitName: true,
      itemCoverageUnitAbbrev: true,
      coveragePerUnit: true,
    },
  })
  // Attach category metadata for downstream use
  const categoryById = new Map(categories.map((c) => [c.id, c]))
  for (const p of products) {
    p.category = categoryById.get(p.categoryId)
  }

  // 6. Templates + template items
  logger.log(`Seeding ${TEMPLATE_COUNT} templates with ${TEMPLATE_ITEMS_PER} material items each...`)
  const templateInputs = Array.from({ length: TEMPLATE_COUNT }, (_, i) => {
    const property = properties[i % properties.length]
    const warehouse = warehouses[i % warehouses.length]
    const unitType = pick(UNIT_TYPES, i)
    return {
      propertyId: property.id,
      managementCompanyId: property.managementCompanyId,
      warehouseId: warehouse.id,
      unitType,
      description: `Demo template ${pad(i + 1, 4)} — ${unitType}`,
      internalNotes: `Auto-seeded demo template #${i + 1}.`,
      installerInstructions: "Standard install per spec.",
    }
  })
  const templates = await prisma.flooringTemplate.createManyAndReturn({
    data: templateInputs,
    select: { id: true },
  })

  const templateItemInputs = []
  for (let i = 0; i < templates.length; i++) {
    for (let j = 0; j < TEMPLATE_ITEMS_PER; j++) {
      const product = products[(i * TEMPLATE_ITEMS_PER + j) % products.length]
      templateItemInputs.push({
        templateId: templates[i].id,
        productId: product.id,
        quantity: (10 + j * 5 + (i % 7)).toFixed(2),
        sendUnitName: product.sendUnitName,
        sendUnitAbbrev: product.sendUnitAbbrev,
        notes: j === 0 ? "Primary material." : null,
      })
    }
  }
  await batchedCreateMany(prisma.flooringTemplateItem, templateItemInputs)

  // 7. Work orders + work order items (all IDLE, no files)
  logger.log(`Seeding ${WORK_ORDER_COUNT} work orders with ${WORK_ORDER_ITEMS_PER} material items each (status=IDLE)...`)
  const workOrderInputs = Array.from({ length: WORK_ORDER_COUNT }, (_, i) => {
    const property = properties[i % properties.length]
    const warehouse = warehouses[i % warehouses.length]
    const template = i % 2 === 0 ? templates[i % templates.length] : null
    const unitType = pick(UNIT_TYPES, i)
    return {
      propertyId: property.id,
      templateId: template?.id ?? null,
      managementCompanyId: property.managementCompanyId,
      warehouseId: warehouse.id,
      status: "IDLE",
      isComplete: false,
      vacancy: i % 2 === 0 ? "VACANT" : "OCCUPIED",
      unitNumber: pad(100 + i, 3),
      unitType,
      description: `Demo work order ${pad(i + 1, 4)} — ${unitType}`,
      internalNotes: `Auto-seeded demo WO #${i + 1}.`,
      installerInstructions: "Standard install per spec.",
    }
  })
  const workOrders = await prisma.flooringWorkOrder.createManyAndReturn({
    data: workOrderInputs,
    select: { id: true },
  })

  const workOrderItemInputs = []
  for (let i = 0; i < workOrders.length; i++) {
    for (let j = 0; j < WORK_ORDER_ITEMS_PER; j++) {
      const product = products[(i * WORK_ORDER_ITEMS_PER + j) % products.length]
      workOrderItemInputs.push({
        workOrderId: workOrders[i].id,
        productId: product.id,
        quantity: (8 + j * 4 + (i % 5)).toFixed(2),
        sendUnitName: product.sendUnitName,
        sendUnitAbbrev: product.sendUnitAbbrev,
        notes: j === 0 ? "Primary material." : null,
      })
    }
  }
  await batchedCreateMany(prisma.flooringWorkOrderItem, workOrderItemInputs)

  logger.log("")
  logger.log("Demo data seeded:")
  logger.log(`  ${COMPANY_COUNT} management companies`)
  logger.log(`  ${PROPERTY_COUNT} properties`)
  logger.log(`  ${WAREHOUSE_COUNT} warehouses`)
  logger.log(`  ${MANUFACTURER_COUNT} manufacturers (${manufacturersCreated} created, ${manufacturersReused} reused)`)
  logger.log(`  ${PRODUCT_COUNT} products`)
  logger.log(`  ${TEMPLATE_COUNT} templates / ${templateItemInputs.length} template material items`)
  logger.log(`  ${WORK_ORDER_COUNT} work orders / ${workOrderItemInputs.length} work order items (all status=IDLE)`)
}

// Postgres has a parameter limit per query (~65535). Chunk inserts to stay
// comfortably under it. 1000 rows per chunk is plenty headroom for our widest
// tables.
const CHUNK_SIZE = 1000

async function batchedCreateMany(delegate, rows) {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    await delegate.createMany({ data: rows.slice(i, i + CHUNK_SIZE) })
  }
}

async function main() {
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  const start = Date.now()
  try {
    await seedDemoData({ prisma })
    const elapsedMs = Date.now() - start
    console.log(`Completed in ${(elapsedMs / 1000).toFixed(2)}s`)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = {
  seedDemoData,
}

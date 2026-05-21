/**
 * Demo data seeder (opt-in — NOT part of `npm run db:seed`).
 *
 * Populates demo-shaped data end-to-end across the flooring stack so the
 * dashboard has volume to look at. Skips reference tables that have their own
 * canonical seeds (unit-of-measures, categories, job types).
 *
 * Volumes (override the constants below to dial up/down):
 *   25  management companies
 *   150 properties
 *   4   warehouses
 *   10  manufacturers
 *   300 products
 *   1000 templates  + 5000 template material items (5 per)
 *   50  imports     + 500 filter rows + 3000 staged inventory rows (all IMPORTED)
 *   3000 inventory rows (one per staged row, totalCutSum precomputed)
 *   ~3600 cut logs (~60% of inventory rows get 1–3 final cut logs, sum ≤ startingStock)
 *   600 work orders + 3000 work order material items (5 per, all status=IDLE, no files)
 *
 * Idempotent-by-bail: skips if the first demo management company already exists.
 *
 * Prereq: `npm run db:seed:uoms` + `npm run db:seed:categories`
 * (or `npm run db:seed` for full canonical seed).
 */

const COMPANY_COUNT = 25
const PROPERTY_COUNT = 150
const WAREHOUSE_COUNT = 4
const MANUFACTURER_COUNT = 10
const PRODUCT_COUNT = 300
const TEMPLATE_COUNT = 1000
const TEMPLATE_ITEMS_PER = 5
const IMPORT_COUNT = 50
const FILTER_ROWS_PER_IMPORT = 10
const STAGED_ROWS_PER_FILTER = 6
const WORK_ORDER_COUNT = 600
const WORK_ORDER_ITEMS_PER = 5

// Cut log generation: balances are pre-computed so inventory.totalCutSum is
// set at insert time (no follow-up update). Each cut log is FINAL with a
// unique sequence per inventory row; sum of cuts never exceeds startingStock.
const CUT_LOG_INVENTORY_RATIO = 0.6 // 60% of inventory rows get cut logs
const CUT_LOGS_PER_INVENTORY_MIN = 1
const CUT_LOGS_PER_INVENTORY_MAX = 3

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
  "Demo Shaw Industries",
  "Demo Mohawk Group",
  "Demo Mannington Mills",
  "Demo Armstrong Flooring",
  "Demo Tarkett",
  "Demo Karndean",
  "Demo Interface",
  "Demo Milliken",
  "Demo Patcraft",
  "Demo Bentley Mills",
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

// Tiny deterministic PRNG so repeated runs against an empty DB produce the
// same shape (helps when eyeballing counts). Seeded off a fixed integer.
function makeRng(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0xffffffff
  }
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
  return MANUFACTURER_NAMES.slice(0, MANUFACTURER_COUNT).map((name, i) => ({
    companyName: name,
    companyNameNormalized: normalizeCompanyName(name),
    agentName: `Demo Agent ${i + 1}`,
    phone: `512-555-${pad(4000 + i + 1, 4)}`,
    email: `sales${i + 1}@${name.toLowerCase().replace(/\s+/g, "")}.example`,
  }))
}

async function nextWarehouseNumber(prisma) {
  const max = await prisma.flooringWarehouse.aggregate({ _max: { number: true } })
  return max._max.number ?? 0
}

async function seedDemoData({ prisma, logger = console }) {
  logger.log("Checking prerequisites...")

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

  const rng = makeRng(1234567)

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

  // 4. Manufacturers
  logger.log(`Seeding ${MANUFACTURER_COUNT} manufacturers...`)
  const manufacturers = await prisma.flooringManufacturer.createManyAndReturn({
    data: buildManufacturers(),
    select: { id: true, companyName: true },
  })

  // 5. Products
  logger.log(`Seeding ${PRODUCT_COUNT} products...`)
  const productInputs = Array.from({ length: PRODUCT_COUNT }, (_, i) => {
    const n = i + 1
    const style = pick(STYLES, n)
    const color = pick(COLORS, n + 1)
    const category = categories[i % categories.length]
    const manufacturer = manufacturers[i % manufacturers.length]
    return {
      name: `${PRODUCT_NAME_PREFIX} ${pad(n, 3)} — ${style} ${color}`,
      style,
      color,
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

  // 7. Imports + filter rows + staged rows + inventory rows + cut logs
  logger.log(
    `Seeding ${IMPORT_COUNT} imports (${FILTER_ROWS_PER_IMPORT} filter rows × ${STAGED_ROWS_PER_FILTER} staged rows each), all marked imported...`,
  )

  // 7a. Imports (need IDs + importNumber + createdAt downstream)
  const importInputs = Array.from({ length: IMPORT_COUNT }, (_, i) => ({
    warehouseId: warehouses[i % warehouses.length].id,
    manufacturerId: manufacturers[i % manufacturers.length].id,
    purchaseOrderNumber: `DEMO-PO-${pad(i + 1, 5)}`,
    internalNotes: `Auto-seeded demo import #${i + 1}.`,
  }))
  const imports = await prisma.flooringImportEntry.createManyAndReturn({
    data: importInputs,
    select: { id: true, importNumber: true, createdAt: true, warehouseId: true },
  })

  // 7b. Filter rows. Per @@unique([importEntryId, productId]) we need distinct
  // products within each import. With FILTER_ROWS_PER_IMPORT ≤ PRODUCT_COUNT
  // we just slice a different window per import.
  const filterRowInputs = []
  const filterRowMeta = [] // parallel array tracking importIdx + product for staged/inventory
  for (let i = 0; i < imports.length; i++) {
    const imp = imports[i]
    const offset = (i * FILTER_ROWS_PER_IMPORT) % products.length
    for (let f = 0; f < FILTER_ROWS_PER_IMPORT; f++) {
      const product = products[(offset + f) % products.length]
      filterRowInputs.push({
        importEntryId: imp.id,
        categoryFilterId: product.category.id,
        productId: product.id,
        stockOrdered: (STAGED_ROWS_PER_FILTER * (50 + f * 5)).toFixed(2),
        stockUnitName: product.stockUnitName,
        stockUnitAbbrev: product.stockUnitAbbrev,
      })
      filterRowMeta.push({ importIdx: i, product })
    }
  }
  const filterRows = await prisma.flooringImportStagedInventoryFilterRow.createManyAndReturn({
    data: filterRowInputs,
    select: { id: true },
  })

  // 7c. Staged rows + inventory rows + cut logs.
  // We pre-compute cut log specs per inventory row up front so totalCutSum can
  // be written at insert time (avoiding a follow-up UPDATE per inventory row).
  const stagedRowInputs = []
  const inventoryInputs = []
  const inventoryCutSpecs = [] // parallel: { numCuts, cuts: number[], totalCutSum: string } | null

  for (let fIdx = 0; fIdx < filterRows.length; fIdx++) {
    const meta = filterRowMeta[fIdx]
    const filterRow = filterRows[fIdx]
    const imp = imports[meta.importIdx]
    const product = meta.product
    const warehouse = warehouses[meta.importIdx % warehouses.length]

    for (let s = 0; s < STAGED_ROWS_PER_FILTER; s++) {
      const rollNumber = `${pad(meta.importIdx + 1, 3)}${pad(fIdx % FILTER_ROWS_PER_IMPORT + 1)}${pad(s + 1)}`
      const dyeLot = `DL-${pad(meta.importIdx + 1, 3)}${pad(fIdx % FILTER_ROWS_PER_IMPORT + 1)}`
      const location = `A-${pad(fIdx % FILTER_ROWS_PER_IMPORT + 1)}-${pad(s + 1)}`
      const startingStockNum = 50 + (fIdx % FILTER_ROWS_PER_IMPORT) * 5 + s
      const startingStock = startingStockNum.toFixed(2)

      stagedRowInputs.push({
        importEntryId: imp.id,
        filterRowId: filterRow.id,
        productId: product.id,
        warehouseId: warehouse.id,
        rollPrefix: "ROLL#",
        rollNumber,
        dyeLot,
        location,
        startingStock,
        stockUnitName: product.stockUnitName,
        stockUnitAbbrev: product.stockUnitAbbrev,
        isImported: true,
        status: "IMPORTED",
      })

      // Decide if this inventory row gets cut logs, and pre-compute them.
      const willHaveCuts = rng() < CUT_LOG_INVENTORY_RATIO
      let cutSpec = null
      let totalCutSum = "0.00"

      if (willHaveCuts) {
        const numCuts =
          CUT_LOGS_PER_INVENTORY_MIN +
          Math.floor(rng() * (CUT_LOGS_PER_INVENTORY_MAX - CUT_LOGS_PER_INVENTORY_MIN + 1))
        // Cap total cuts at 70% of startingStock so balance stays positive.
        const cutBudget = Math.floor(startingStockNum * 0.7 * 100) / 100
        const cuts = []
        let remaining = cutBudget
        for (let c = 0; c < numCuts; c++) {
          const isLast = c === numCuts - 1
          // Each cut: roughly even split with some jitter, but capped by remaining.
          const target = isLast ? remaining : Math.max(0.5, (remaining / (numCuts - c)) * (0.7 + rng() * 0.6))
          const cutVal = Math.min(remaining, Math.max(0.5, Math.round(target * 100) / 100))
          cuts.push(cutVal)
          remaining = Math.round((remaining - cutVal) * 100) / 100
          if (remaining <= 0) break
        }
        const sum = cuts.reduce((acc, v) => acc + v, 0)
        totalCutSum = sum.toFixed(2)
        cutSpec = { cuts, totalCutSum }
      }

      inventoryInputs.push({
        importEntryId: imp.id,
        importNumber: String(imp.importNumber),
        purchaseOrderNumber: `DEMO-PO-${pad(meta.importIdx + 1, 5)}`,
        productId: product.id,
        productName: product.name,
        categorySlug: product.category.slug,
        categoryName: product.category.name,
        stockUnitName: product.stockUnitName,
        stockUnitAbbrev: product.stockUnitAbbrev,
        itemCoverageUnitName: product.itemCoverageUnitName,
        itemCoverageUnitAbbrev: product.itemCoverageUnitAbbrev,
        sendUnitName: product.sendUnitName,
        sendUnitAbbrev: product.sendUnitAbbrev,
        rollPrefix: "ROLL#",
        rollNumber,
        dyeLot,
        location,
        startingStock,
        totalCutSum,
        coveragePerUnit: product.coveragePerUnit,
        warehouseId: warehouse.id,
        fifoReceivedAt: imp.createdAt,
      })
      inventoryCutSpecs.push(cutSpec)
    }
  }

  await batchedCreateMany(prisma.flooringImportStagedInventoryRow, stagedRowInputs)
  const inventoryRows = await batchedCreateManyAndReturn(
    prisma.flooringInventory,
    inventoryInputs,
    {
      select: {
        id: true,
        productId: true,
        warehouseId: true,
        categorySlug: true,
        productName: true,
        rollPrefix: true,
        rollNumber: true,
        dyeLot: true,
        location: true,
        stockUnitName: true,
        stockUnitAbbrev: true,
        itemCoverageUnitName: true,
        itemCoverageUnitAbbrev: true,
        inventoryNumber: true,
        startingStock: true,
      },
    },
  )

  // 7d. Cut logs — pre-computed per inventory, sum balances totalCutSum.
  logger.log("Building cut logs from precomputed balances...")
  const cutLogInputs = []
  for (let i = 0; i < inventoryRows.length; i++) {
    const spec = inventoryCutSpecs[i]
    if (!spec) continue
    const inv = inventoryRows[i]
    let beforeBalance = Number(inv.startingStock)
    for (let c = 0; c < spec.cuts.length; c++) {
      const cutVal = spec.cuts[c]
      const afterBalance = Math.round((beforeBalance - cutVal) * 100) / 100
      cutLogInputs.push({
        inventoryId: inv.id,
        inventoryItem: "",
        inventoryNumber: inv.inventoryNumber,
        rollPrefix: inv.rollPrefix,
        rollNumber: inv.rollNumber,
        dyeLot: inv.dyeLot,
        location: inv.location,
        categorySlug: inv.categorySlug,
        productId: inv.productId,
        productName: inv.productName,
        warehouseId: inv.warehouseId,
        before: beforeBalance.toFixed(2),
        cut: cutVal.toFixed(2),
        after: afterBalance.toFixed(2),
        stockUnitName: inv.stockUnitName,
        stockUnitAbbrev: inv.stockUnitAbbrev,
        itemCoverageUnitName: inv.itemCoverageUnitName,
        itemCoverageUnitAbbrev: inv.itemCoverageUnitAbbrev,
        status: "FINAL",
        isFinal: true,
        finalCutSequence: c + 1,
        isWaste: false,
        void: false,
      })
      beforeBalance = afterBalance
    }
  }
  await batchedCreateMany(prisma.flooringCutLog, cutLogInputs)

  // 8. Work orders + work order items (all IDLE, no files)
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
  logger.log(`  ${MANUFACTURER_COUNT} manufacturers`)
  logger.log(`  ${PRODUCT_COUNT} products`)
  logger.log(`  ${TEMPLATE_COUNT} templates / ${templateItemInputs.length} template material items`)
  logger.log(`  ${IMPORT_COUNT} imports / ${filterRowInputs.length} filter rows / ${stagedRowInputs.length} staged rows (all IMPORTED)`)
  logger.log(`  ${inventoryInputs.length} inventory rows`)
  logger.log(`  ${cutLogInputs.length} cut logs (FINAL, balanced against startingStock)`)
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

async function batchedCreateManyAndReturn(delegate, rows, options) {
  const out = []
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = await delegate.createManyAndReturn({ data: rows.slice(i, i + CHUNK_SIZE), ...options })
    out.push(...chunk)
  }
  return out
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

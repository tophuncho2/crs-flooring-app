/**
 * Demo data seeder (opt-in — NOT part of `npm run db:seed`).
 *
 * Populates demo-shaped data across the flooring stack so the dashboard has
 * something to look at end-to-end. Skips reference tables that have their own
 * canonical seeds (unit-of-measures, categories, job types).
 *
 * Creates (per fresh run):
 *   - 5  management companies
 *   - 10 properties
 *   - 2  warehouses
 *   - 3  manufacturers
 *   - 25 products
 *   - 50 templates  + 150 template material items (3 per)
 *   - 4  imports    + 16 filter rows + 48 staged inventory rows (all IMPORTED)
 *   - 48 inventory rows (one per staged row, no cut logs)
 *   - 20 work orders + 60 work order material items (3 per, no files)
 *
 * Idempotent-by-bail: skips if the first demo management company already exists.
 *
 * Prereq: `npm run db:seed:uoms` + `npm run db:seed:categories`
 * (or `npm run db:seed` for full canonical seed).
 */

const COMPANY_COUNT = 5
const PROPERTY_COUNT = 10
const WAREHOUSE_COUNT = 2
const MANUFACTURER_COUNT = 3
const PRODUCT_COUNT = 25
const TEMPLATE_COUNT = 50
const TEMPLATE_ITEMS_PER = 3
const IMPORT_COUNT = 4
const FILTER_ROWS_PER_IMPORT = 4
const STAGED_ROWS_PER_FILTER = 3
const WORK_ORDER_COUNT = 20
const WORK_ORDER_ITEMS_PER = 3

const COMPANY_NAME_PREFIX = "Demo Mgmt Co"
const PROPERTY_NAME_PREFIX = "Demo Property"
const PRODUCT_NAME_PREFIX = "Demo Product"
const WAREHOUSE_NAME_PREFIX = "Demo Warehouse"

const STATES = ["TX", "CA", "FL", "GA", "NC", "AZ", "WA", "CO", "OH", "VA"]
const CITIES = ["Austin", "Dallas", "Atlanta", "Phoenix", "Denver", "Seattle", "Tampa", "Raleigh", "Columbus", "Reston"]
const UNIT_TYPES = ["1BR", "2BR", "3BR", "Studio", "Townhome", "Penthouse"]
const STYLES = ["Oak", "Maple", "Walnut", "Cherry", "Ash", "Pine", "Birch", "Mahogany"]
const COLORS = ["Natural", "Espresso", "Honey", "Charcoal", "Slate", "Cream", "Driftwood", "Mocha"]
const MANUFACTURER_NAMES = ["Demo Shaw Industries", "Demo Mohawk Group", "Demo Mannington Mills"]
const WORK_ORDER_STATUSES = ["IDLE", "QUEUED", "WORKING", "COMPLETED"]
const VACANCY_STATUSES = ["VACANT", "OCCUPIED"]

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
      name: `${COMPANY_NAME_PREFIX} ${n}`,
      streetAddress: `${100 + n * 7} Main St`,
      city: pick(CITIES, n),
      state: pick(STATES, n),
      postalCode: `${10000 + n * 137}`,
      phone: `512-555-${pad(1000 + n, 4)}`,
      email: `contact${n}@demo-mgmt-${n}.example`,
    }
  })
}

function buildProperties() {
  return Array.from({ length: PROPERTY_COUNT }, (_, i) => {
    const n = i + 1
    return {
      name: `${PROPERTY_NAME_PREFIX} ${pad(n)}`,
      streetAddress: `${200 + n * 11} Oak Ave`,
      city: pick(CITIES, n + 3),
      state: pick(STATES, n + 3),
      postalCode: `${20000 + n * 53}`,
      phone: `512-555-${pad(2000 + n, 4)}`,
      email: `manager@demo-property-${pad(n)}.example`,
      instructions: `Demo property ${pad(n)} — standard install instructions.`,
      companyIndex: i % COMPANY_COUNT,
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
      postalCode: `${30000 + n * 41}`,
      phone: `512-555-${pad(3000 + n, 4)}`,
    }
  })
}

function buildManufacturers() {
  return MANUFACTURER_NAMES.map((name, i) => ({
    companyName: name,
    companyNameNormalized: normalizeCompanyName(name),
    agentName: `Demo Agent ${i + 1}`,
    phone: `512-555-${pad(4000 + i + 1, 4)}`,
    email: `sales${i + 1}@${name.toLowerCase().replace(/\s+/g, "")}.example`,
  }))
}

function buildProducts(categoryCount, manufacturerCount) {
  return Array.from({ length: PRODUCT_COUNT }, (_, i) => {
    const n = i + 1
    const style = pick(STYLES, n)
    const color = pick(COLORS, n + 1)
    return {
      name: `${PRODUCT_NAME_PREFIX} ${pad(n)} — ${style} ${color}`,
      style,
      color,
      coveragePerUnit: 20 + (n % 10) * 2,
      categoryIndex: i % categoryCount,
      manufacturerIndex: i % manufacturerCount,
    }
  })
}

async function nextWarehouseNumber(prisma) {
  const max = await prisma.flooringWarehouse.aggregate({ _max: { number: true } })
  return (max._max.number ?? 0)
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

  const markerName = `${COMPANY_NAME_PREFIX} 1`
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
  const companies = []
  for (const input of buildCompanies()) {
    companies.push(await prisma.flooringManagementCompany.create({ data: input, select: { id: true } }))
  }

  // 2. Properties
  logger.log(`Seeding ${PROPERTY_COUNT} properties...`)
  const properties = []
  for (const input of buildProperties()) {
    const { companyIndex, ...rest } = input
    properties.push(
      await prisma.property.create({
        data: { ...rest, managementCompanyId: companies[companyIndex].id },
        select: { id: true, managementCompanyId: true },
      }),
    )
  }

  // 3. Warehouses
  logger.log(`Seeding ${WAREHOUSE_COUNT} warehouses...`)
  const baseWarehouseNumber = await nextWarehouseNumber(prisma)
  const warehouses = []
  for (const input of buildWarehouses(baseWarehouseNumber)) {
    warehouses.push(await prisma.flooringWarehouse.create({ data: input, select: { id: true, number: true } }))
  }

  // 4. Manufacturers
  logger.log(`Seeding ${MANUFACTURER_COUNT} manufacturers...`)
  const manufacturers = []
  for (const input of buildManufacturers()) {
    manufacturers.push(await prisma.flooringManufacturer.create({ data: input, select: { id: true, companyName: true } }))
  }

  // 5. Products
  logger.log(`Seeding ${PRODUCT_COUNT} products...`)
  const products = []
  for (const input of buildProducts(categories.length, manufacturers.length)) {
    const { categoryIndex, manufacturerIndex, ...rest } = input
    const category = categories[categoryIndex]
    const manufacturer = manufacturers[manufacturerIndex]
    const row = await prisma.flooringProduct.create({
      data: {
        ...rest,
        categoryId: category.id,
        manufacturerId: manufacturer.id,
        manufacturerName: manufacturer.companyName,
        sendUnitName: category.sendUnit?.name ?? null,
        sendUnitAbbrev: category.sendUnit?.abbreviation ?? null,
        stockUnitName: category.stockUnit?.name ?? null,
        stockUnitAbbrev: category.stockUnit?.abbreviation ?? null,
        itemCoverageUnitName: category.itemCoverageUnit?.name ?? null,
        itemCoverageUnitAbbrev: category.itemCoverageUnit?.abbreviation ?? null,
      },
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
    products.push({ ...row, category })
  }

  // 6. Templates + template items
  logger.log(`Seeding ${TEMPLATE_COUNT} templates with ${TEMPLATE_ITEMS_PER} material items each...`)
  let templateItemCount = 0
  const templates = []
  for (let i = 0; i < TEMPLATE_COUNT; i++) {
    const property = properties[i % properties.length]
    const warehouse = warehouses[i % warehouses.length]
    const unitType = pick(UNIT_TYPES, i)
    const template = await prisma.flooringTemplate.create({
      data: {
        propertyId: property.id,
        managementCompanyId: property.managementCompanyId,
        warehouseId: warehouse.id,
        unitType,
        description: `Demo template ${pad(i + 1)} — ${unitType}`,
        internalNotes: `Auto-seeded demo template #${i + 1}.`,
        installerInstructions: "Standard install per spec.",
      },
      select: { id: true },
    })
    templates.push(template)

    for (let j = 0; j < TEMPLATE_ITEMS_PER; j++) {
      const product = products[(i * TEMPLATE_ITEMS_PER + j) % products.length]
      await prisma.flooringTemplateItem.create({
        data: {
          templateId: template.id,
          productId: product.id,
          quantity: (10 + j * 5 + (i % 7)).toFixed(2),
          sendUnitName: product.sendUnitName,
          sendUnitAbbrev: product.sendUnitAbbrev,
          notes: j === 0 ? "Primary material." : null,
        },
      })
      templateItemCount += 1
    }
  }

  // 7. Imports + filter rows + staged rows + inventory rows
  logger.log(
    `Seeding ${IMPORT_COUNT} imports (${FILTER_ROWS_PER_IMPORT} filter rows + ${FILTER_ROWS_PER_IMPORT * STAGED_ROWS_PER_FILTER} staged rows each), all marked imported...`,
  )
  let filterRowCount = 0
  let stagedRowCount = 0
  let inventoryCount = 0

  for (let importIdx = 0; importIdx < IMPORT_COUNT; importIdx++) {
    const warehouse = warehouses[importIdx % warehouses.length]
    const manufacturer = manufacturers[importIdx % manufacturers.length]

    // Pick a distinct set of products for this import (filter rows have @@unique([importEntryId, productId]))
    const productSet = []
    const usedProductIds = new Set()
    let cursor = importIdx * FILTER_ROWS_PER_IMPORT
    while (productSet.length < FILTER_ROWS_PER_IMPORT) {
      const candidate = products[cursor % products.length]
      if (!usedProductIds.has(candidate.id)) {
        productSet.push(candidate)
        usedProductIds.add(candidate.id)
      }
      cursor += 1
    }

    const importEntry = await prisma.flooringImportEntry.create({
      data: {
        warehouseId: warehouse.id,
        manufacturerId: manufacturer.id,
        purchaseOrderNumber: `DEMO-PO-${pad(importIdx + 1, 4)}`,
        internalNotes: `Auto-seeded demo import #${importIdx + 1}.`,
      },
      select: { id: true, importNumber: true, createdAt: true },
    })

    for (let f = 0; f < FILTER_ROWS_PER_IMPORT; f++) {
      const product = productSet[f]
      const stockOrdered = (STAGED_ROWS_PER_FILTER * (50 + f * 5)).toFixed(2)
      const filterRow = await prisma.flooringImportStagedInventoryFilterRow.create({
        data: {
          importEntryId: importEntry.id,
          categoryFilterId: product.category.id,
          productId: product.id,
          stockOrdered,
          stockUnitName: product.stockUnitName,
          stockUnitAbbrev: product.stockUnitAbbrev,
        },
        select: { id: true },
      })
      filterRowCount += 1

      for (let s = 0; s < STAGED_ROWS_PER_FILTER; s++) {
        const rollNumber = `${pad(importIdx + 1)}${pad(f + 1)}${pad(s + 1)}`
        const dyeLot = `DL-${pad(importIdx + 1)}${pad(f + 1)}`
        const location = `A-${pad(f + 1)}-${pad(s + 1)}`
        const startingStock = (50 + f * 5).toFixed(2)

        await prisma.flooringImportStagedInventoryRow.create({
          data: {
            importEntryId: importEntry.id,
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
            note: null,
          },
        })
        stagedRowCount += 1

        await prisma.flooringInventory.create({
          data: {
            importEntryId: importEntry.id,
            importNumber: String(importEntry.importNumber),
            purchaseOrderNumber: `DEMO-PO-${pad(importIdx + 1, 4)}`,
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
            coveragePerUnit: product.coveragePerUnit,
            warehouseId: warehouse.id,
            fifoReceivedAt: importEntry.createdAt,
          },
        })
        inventoryCount += 1
      }
    }
  }

  // 8. Work orders + work order items
  logger.log(`Seeding ${WORK_ORDER_COUNT} work orders with ${WORK_ORDER_ITEMS_PER} material items each...`)
  let workOrderItemCount = 0
  for (let i = 0; i < WORK_ORDER_COUNT; i++) {
    const property = properties[i % properties.length]
    const warehouse = warehouses[i % warehouses.length]
    // Half the work orders are linked to a template; the rest are standalone.
    const template = i % 2 === 0 ? templates[i % templates.length] : null
    const unitType = pick(UNIT_TYPES, i)
    const status = pick(WORK_ORDER_STATUSES, i)

    const workOrder = await prisma.flooringWorkOrder.create({
      data: {
        propertyId: property.id,
        templateId: template?.id ?? null,
        managementCompanyId: property.managementCompanyId,
        warehouseId: warehouse.id,
        status,
        isComplete: status === "COMPLETED",
        vacancy: pick(VACANCY_STATUSES, i),
        unitNumber: `${pad(100 + i, 3)}`,
        unitType,
        description: `Demo work order ${pad(i + 1)} — ${unitType}`,
        internalNotes: `Auto-seeded demo WO #${i + 1}.`,
        installerInstructions: "Standard install per spec.",
      },
      select: { id: true },
    })

    for (let j = 0; j < WORK_ORDER_ITEMS_PER; j++) {
      const product = products[(i * WORK_ORDER_ITEMS_PER + j) % products.length]
      await prisma.flooringWorkOrderItem.create({
        data: {
          workOrderId: workOrder.id,
          productId: product.id,
          quantity: (8 + j * 4 + (i % 5)).toFixed(2),
          sendUnitName: product.sendUnitName,
          sendUnitAbbrev: product.sendUnitAbbrev,
          notes: j === 0 ? "Primary material." : null,
        },
      })
      workOrderItemCount += 1
    }
  }

  logger.log("")
  logger.log("Demo data seeded:")
  logger.log(`  ${COMPANY_COUNT}  management companies`)
  logger.log(`  ${PROPERTY_COUNT} properties`)
  logger.log(`  ${WAREHOUSE_COUNT}  warehouses`)
  logger.log(`  ${MANUFACTURER_COUNT}  manufacturers`)
  logger.log(`  ${PRODUCT_COUNT} products`)
  logger.log(`  ${TEMPLATE_COUNT} templates / ${templateItemCount} template material items`)
  logger.log(`  ${IMPORT_COUNT}  imports / ${filterRowCount} filter rows / ${stagedRowCount} staged rows (all IMPORTED)`)
  logger.log(`  ${inventoryCount} inventory rows`)
  logger.log(`  ${WORK_ORDER_COUNT} work orders / ${workOrderItemCount} work order material items`)
}

async function main() {
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    await seedDemoData({ prisma })
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

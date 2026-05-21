/**
 * Demo data seeder.
 *
 * Creates 5 management companies, 10 properties, 25 products,
 * 50 templates, and 3 material items per template (150 items total).
 *
 * Idempotent-by-bail: if the first demo management company already exists
 * the script exits without writing. To re-seed, delete the existing demo rows first.
 *
 * Prerequisites: unit-of-measures + categories must already be seeded
 * (run `npm run db:seed:uoms` and `npm run db:seed:categories` first, or `npm run db:seed`).
 */

const COMPANY_COUNT = 5
const PROPERTY_COUNT = 10
const PRODUCT_COUNT = 25
const TEMPLATE_COUNT = 50
const ITEMS_PER_TEMPLATE = 3

const COMPANY_NAME_PREFIX = "Demo Mgmt Co"
const PROPERTY_NAME_PREFIX = "Demo Property"
const PRODUCT_NAME_PREFIX = "Demo Product"

const STATES = ["TX", "CA", "FL", "GA", "NC", "AZ", "WA", "CO", "OH", "VA"]
const CITIES = ["Austin", "Dallas", "Atlanta", "Phoenix", "Denver", "Seattle", "Tampa", "Raleigh", "Columbus", "Reston"]
const UNIT_TYPES = ["1BR", "2BR", "3BR", "Studio", "Townhome", "Penthouse"]
const STYLES = ["Oak", "Maple", "Walnut", "Cherry", "Ash", "Pine", "Birch", "Mahogany"]
const COLORS = ["Natural", "Espresso", "Honey", "Charcoal", "Slate", "Cream", "Driftwood", "Mocha"]
const MANUFACTURERS = ["Shaw", "Mohawk", "Mannington", "Armstrong", "Tarkett", null]

function pad(n, width = 2) {
  return String(n).padStart(width, "0")
}

function pick(arr, i) {
  return arr[i % arr.length]
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

function buildProducts(categoryCount) {
  return Array.from({ length: PRODUCT_COUNT }, (_, i) => {
    const n = i + 1
    const style = pick(STYLES, n)
    const color = pick(COLORS, n + 1)
    const manufacturer = pick(MANUFACTURERS, n)
    return {
      name: `${PRODUCT_NAME_PREFIX} ${pad(n)} — ${style} ${color}`,
      style,
      color,
      manufacturerName: manufacturer,
      coveragePerUnit: 20 + (n % 10) * 2,
      categoryIndex: i % categoryCount,
    }
  })
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
        sendUnit: { select: { name: true, abbreviation: true } },
        stockUnit: { select: { name: true, abbreviation: true } },
        itemCoverageUnit: { select: { name: true, abbreviation: true } },
      },
    }),
  ])

  if (uomCount === 0) {
    throw new Error(
      "No flooring_unit_of_measure rows found. Run `npm run db:seed:uoms` first.",
    )
  }
  if (categoryCount === 0) {
    throw new Error(
      "No flooring_category rows found. Run `npm run db:seed:categories` first.",
    )
  }

  const markerName = `${COMPANY_NAME_PREFIX} 1`
  const existingMarker = await prisma.flooringManagementCompany.findUnique({
    where: { name: markerName },
    select: { id: true },
  })

  if (existingMarker) {
    logger.log(
      `Demo data marker "${markerName}" already exists — skipping. Delete demo rows manually to re-seed.`,
    )
    return
  }

  logger.log(`Seeding ${COMPANY_COUNT} management companies...`)
  const companyInputs = buildCompanies()
  const companies = []
  for (const input of companyInputs) {
    const row = await prisma.flooringManagementCompany.create({ data: input, select: { id: true, name: true } })
    companies.push(row)
  }

  logger.log(`Seeding ${PROPERTY_COUNT} properties...`)
  const propertyInputs = buildProperties()
  const properties = []
  for (const input of propertyInputs) {
    const { companyIndex, ...rest } = input
    const row = await prisma.property.create({
      data: { ...rest, managementCompanyId: companies[companyIndex].id },
      select: { id: true, managementCompanyId: true },
    })
    properties.push(row)
  }

  logger.log(`Seeding ${PRODUCT_COUNT} products...`)
  const productInputs = buildProducts(categories.length)
  const products = []
  for (const input of productInputs) {
    const { categoryIndex, ...rest } = input
    const category = categories[categoryIndex]
    const row = await prisma.flooringProduct.create({
      data: {
        ...rest,
        categoryId: category.id,
        sendUnitName: category.sendUnit?.name ?? null,
        sendUnitAbbrev: category.sendUnit?.abbreviation ?? null,
        stockUnitName: category.stockUnit?.name ?? null,
        stockUnitAbbrev: category.stockUnit?.abbreviation ?? null,
        itemCoverageUnitName: category.itemCoverageUnit?.name ?? null,
        itemCoverageUnitAbbrev: category.itemCoverageUnit?.abbreviation ?? null,
      },
      select: { id: true, sendUnitName: true, sendUnitAbbrev: true },
    })
    products.push(row)
  }

  logger.log(`Seeding ${TEMPLATE_COUNT} templates with ${ITEMS_PER_TEMPLATE} material items each...`)
  let itemCount = 0
  for (let i = 0; i < TEMPLATE_COUNT; i++) {
    const property = properties[i % properties.length]
    const unitType = pick(UNIT_TYPES, i)
    const template = await prisma.flooringTemplate.create({
      data: {
        propertyId: property.id,
        managementCompanyId: property.managementCompanyId,
        unitType,
        description: `Demo template ${pad(i + 1)} — ${unitType}`,
        internalNotes: `Auto-seeded demo template #${i + 1}.`,
        installerInstructions: "Standard install per spec.",
      },
      select: { id: true },
    })

    for (let j = 0; j < ITEMS_PER_TEMPLATE; j++) {
      const product = products[(i * ITEMS_PER_TEMPLATE + j) % products.length]
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
      itemCount += 1
    }
  }

  logger.log("Demo data seeded:")
  logger.log(`  ${COMPANY_COUNT} management companies`)
  logger.log(`  ${PROPERTY_COUNT} properties`)
  logger.log(`  ${PRODUCT_COUNT} products`)
  logger.log(`  ${TEMPLATE_COUNT} templates`)
  logger.log(`  ${itemCount} template material items`)
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

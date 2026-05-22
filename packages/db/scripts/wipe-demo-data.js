/**
 * Wipe every table the demo seed writes to.
 *
 * Companion to seed-demo-data.js. Truncates (via deleteMany) all rows from the
 * 14 seed-touched tables in FK-safe order. Does NOT touch reference data
 * (units of measure, categories, job types, users).
 *
 * Tables cleared, in deletion order:
 *   1.  FlooringWorkOrderFile
 *   2.  FlooringCutLog
 *   3.  FlooringWorkOrderItem
 *   4.  FlooringWorkOrder
 *   5.  FlooringInventory
 *   6.  FlooringImportStagedInventoryRow
 *   7.  FlooringImportStagedInventoryFilterRow
 *   8.  FlooringImportEntry
 *   9.  FlooringTemplateItem
 *  10.  FlooringTemplate
 *  11.  FlooringProduct
 *  12.  FlooringManufacturer
 *  13.  FlooringWarehouse
 *  14.  Property
 *  15.  FlooringManagementCompany
 */

async function wipeDemoData({ prisma, logger = console }) {
  const steps = [
    ["flooringWorkOrderFile", () => prisma.flooringWorkOrderFile.deleteMany({})],
    ["flooringCutLog", () => prisma.flooringCutLog.deleteMany({})],
    ["flooringWorkOrderItem", () => prisma.flooringWorkOrderItem.deleteMany({})],
    ["flooringWorkOrder", () => prisma.flooringWorkOrder.deleteMany({})],
    ["flooringInventory", () => prisma.flooringInventory.deleteMany({})],
    ["flooringImportStagedInventoryRow", () => prisma.flooringImportStagedInventoryRow.deleteMany({})],
    ["flooringImportStagedInventoryFilterRow", () => prisma.flooringImportStagedInventoryFilterRow.deleteMany({})],
    ["flooringImportEntry", () => prisma.flooringImportEntry.deleteMany({})],
    ["flooringTemplateItem", () => prisma.flooringTemplateItem.deleteMany({})],
    ["flooringTemplate", () => prisma.flooringTemplate.deleteMany({})],
    ["flooringProduct", () => prisma.flooringProduct.deleteMany({})],
    ["flooringManufacturer", () => prisma.flooringManufacturer.deleteMany({})],
    ["flooringWarehouse", () => prisma.flooringWarehouse.deleteMany({})],
    ["property", () => prisma.property.deleteMany({})],
    ["flooringManagementCompany", () => prisma.flooringManagementCompany.deleteMany({})],
  ]

  for (const [name, run] of steps) {
    const { count } = await run()
    logger.log(`  cleared ${name}: ${count} rows`)
  }
}

async function main() {
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  const start = Date.now()
  try {
    await wipeDemoData({ prisma })
    const elapsedMs = Date.now() - start
    console.log(`Completed in ${(elapsedMs / 1000).toFixed(2)}s`)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { wipeDemoData }

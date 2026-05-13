import { createPrismaClient } from "@builders/db"

const prisma = createPrismaClient()

try {
  const inventoryCount = await prisma.flooringInventory.count()
  const cutLogCount = await prisma.flooringCutLog.count()
  const pendingCutLogCount = await prisma.flooringCutLog.count({
    where: { status: "PENDING", isFinal: false, void: false },
  })

  console.log("---DB SNAPSHOT (pre-smoke)---")
  console.table([
    { table: "flooring_inventory", count: inventoryCount },
    { table: "flooring_cut_log (total)", count: cutLogCount },
    { table: "flooring_cut_log (pending+editable)", count: pendingCutLogCount },
  ])

  const sampleInventory = await prisma.flooringInventory.findFirst({
    select: {
      id: true,
      inventoryNumber: true,
      startingStock: true,
      totalCutSum: true,
      coveragePerUnit: true,
      categorySlug: true,
    },
  })
  console.log("\nSample inventory row (first one — used for smoke if available):")
  console.log(sampleInventory)

  const samplePendingCutLog = await prisma.flooringCutLog.findFirst({
    where: { status: "PENDING", isFinal: false, void: false },
    select: {
      id: true,
      cutLogNumber: true,
      inventoryId: true,
      cut: true,
      status: true,
      isFinal: true,
      void: true,
    },
  })
  console.log("\nSample PENDING cut log (if any):")
  console.log(samplePendingCutLog)
} finally {
  await prisma.$disconnect()
}

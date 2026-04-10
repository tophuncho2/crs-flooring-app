/**
 * Canonical list of unit of measures.
 * Keep in sync with packages/db/src/seed/unit-of-measures.ts (the TypeScript source of truth).
 */
const SEEDED_UNIT_OF_MEASURES = [
  { name: "Linear Feet" },
  { name: "Square Feet" },
  { name: "Square Yard" },
  { name: "Buckets" },
  { name: "Boxes" },
  { name: "Units" },
  { name: "Bags" },
  { name: "Pieces" },
  { name: "Sheets" },
  { name: "Rolls" },
]

async function seedUnitOfMeasures({ prisma, logger = console }) {
  let created = 0
  let existed = 0

  for (const unit of SEEDED_UNIT_OF_MEASURES) {
    const existing = await prisma.flooringUnitOfMeasure.findUnique({
      where: { name: unit.name },
      select: { id: true },
    })

    if (existing) {
      existed += 1
    } else {
      await prisma.flooringUnitOfMeasure.create({
        data: { name: unit.name },
      })
      created += 1
    }
  }

  logger.log(
    `Seeded ${SEEDED_UNIT_OF_MEASURES.length} unit of measures (${created} created, ${existed} already existed)`,
  )
}

async function main() {
  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient()

  try {
    await seedUnitOfMeasures({ prisma })
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
  SEEDED_UNIT_OF_MEASURES,
  seedUnitOfMeasures,
}

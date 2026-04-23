// Seed script for FlooringJobType. Idempotent via upsert on the unique `name` column.
// TODO: replace INITIAL_JOB_TYPES with the canonical list before the first production seed.

const { PrismaClient } = require("@prisma/client")

const INITIAL_JOB_TYPES = [
  // TODO: user supplies canonical names here, e.g.:
  // "Turn",
  // "Paint",
  // "Carpet Cleaning",
]

async function main() {
  const prisma = new PrismaClient()
  try {
    if (INITIAL_JOB_TYPES.length === 0) {
      console.log("[seed-job-types] INITIAL_JOB_TYPES is empty — nothing to seed.")
      return
    }

    for (const name of INITIAL_JOB_TYPES) {
      await prisma.flooringJobType.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    }

    const count = await prisma.flooringJobType.count()
    console.log(`[seed-job-types] seeded ${INITIAL_JOB_TYPES.length} job types; total in DB: ${count}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

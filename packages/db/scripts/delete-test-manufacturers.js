/**
 * Deletes the 200 throwaway manufacturers seeded by seed-test-manufacturers.js.
 * Matches BOTH the human-readable prefix and the normalized (lowercased) prefix
 * as a double-check so a real manufacturer named like "manufacturer-test-foo"
 * would still need both conditions to match before being deleted.
 *
 * Will fail if any of the test rows have products / imports linked — the
 * relation is `onDelete: Restrict`. That's intentional. If it happens, the
 * caller should clean up the linked rows first.
 *
 * Run: `npm run db:delete:test-manufacturers --workspace @builders/db`
 */

const NAME_PREFIX = "MANUFACTURER-TEST-"
const NORMALIZED_PREFIX = NAME_PREFIX.toLowerCase()

async function main() {
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    const where = {
      AND: [
        { companyName: { startsWith: NAME_PREFIX } },
        { companyNameNormalized: { startsWith: NORMALIZED_PREFIX } },
      ],
    }

    const count = await prisma.flooringManufacturer.count({ where })
    if (count === 0) {
      console.log(`No manufacturers found with prefix "${NAME_PREFIX}". Nothing to delete.`)
      return
    }

    const result = await prisma.flooringManufacturer.deleteMany({ where })
    console.log(`Deleted ${result.count} manufacturers (prefix "${NAME_PREFIX}").`)
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

/**
 * Seeds 200 throwaway manufacturers (MANUFACTURER-TEST-1 .. MANUFACTURER-TEST-200)
 * against whatever DB the env points at. Idempotent — skipDuplicates means re-running
 * is a no-op if the rows already exist.
 *
 * Pair with `scripts/delete-test-manufacturers.js` to undo.
 * Run: `npm run db:seed:test-manufacturers --workspace @builders/db`
 */

const NAME_PREFIX = "MANUFACTURER-TEST-"
const COUNT = 200

function buildRows() {
  const rows = []
  for (let i = 1; i <= COUNT; i++) {
    const companyName = `${NAME_PREFIX}${i}`
    rows.push({
      companyName,
      companyNameNormalized: companyName.toLowerCase(),
    })
  }
  return rows
}

async function main() {
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    const rows = buildRows()
    const result = await prisma.flooringManufacturer.createMany({
      data: rows,
      skipDuplicates: true,
    })
    console.log(
      `Seeded ${result.count} manufacturers (skipped ${rows.length - result.count} duplicates). Name prefix: "${NAME_PREFIX}", count: ${COUNT}.`,
    )
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

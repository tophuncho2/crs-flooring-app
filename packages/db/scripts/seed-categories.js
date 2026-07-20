const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

/**
 * Canonical list of categories.
 * Keep in sync with packages/db/src/seed/categories.ts (the TypeScript source of truth).
 */
const SEEDED_CATEGORIES = [
  { name: "Plank" },
  { name: "Carpet Tile" },
  { name: "Covebase" },
  { name: "Pad" },
  { name: "Adhesive" },
  { name: "Baseboard" },
  { name: "Carpet" },
  { name: "Kilz" },
  { name: "Luan" },
  { name: "Metals" },
  { name: "Moisture Barrier" },
  { name: "Patch" },
  { name: "Plywood" },
  { name: "Primer" },
  { name: "Scent Stop" },
  { name: "Shoe Molding" },
  { name: "Trim" },
  { name: "VCT" },
  { name: "Vinyl Sheet" },
  { name: "Wax Ring" },
  { name: "Ceramic Tile" },
  { name: "Stair Treads" },
  { name: "Rubber Transition" },
  { name: "Rock/Stone" },
  { name: "Threshold" },
  { name: "Underlayment" },
]

function verifySyncWithTypeScriptSource() {
  const tsPath = resolve(__dirname, "../src/seed/categories.ts")
  const tsSource = readFileSync(tsPath, "utf8")

  const entryPattern = /\{\s*name:\s*"([^"]+)"\s*,?\s*\}/g
  const tsEntries = []
  let match
  while ((match = entryPattern.exec(tsSource)) !== null) {
    tsEntries.push({ name: match[1] })
  }

  const jsKey = (entry) => entry.name
  const jsKeys = SEEDED_CATEGORIES.map(jsKey)
  const tsKeys = tsEntries.map(jsKey)

  if (jsKeys.length !== tsKeys.length) {
    throw new Error(
      `Seed sync failure: .js has ${jsKeys.length} entries, .ts has ${tsKeys.length} entries. ` +
        `Update both files to match. TS source: src/seed/categories.ts`,
    )
  }

  for (let i = 0; i < jsKeys.length; i++) {
    if (jsKeys[i] !== tsKeys[i]) {
      throw new Error(
        `Seed sync failure at index ${i}: ` +
          `.js has "${jsKeys[i]}", .ts has "${tsKeys[i]}". ` +
          `Update both files to match. TS source: src/seed/categories.ts`,
      )
    }
  }
}

async function seedCategories({ prisma, logger = console }) {
  verifySyncWithTypeScriptSource()

  let created = 0
  let updated = 0

  await prisma.$transaction(async (tx) => {
    for (const entry of SEEDED_CATEGORIES) {
      const existing = await tx.flooringCategory.findUnique({
        where: { name: entry.name },
        select: { id: true },
      })

      if (existing) {
        updated += 1
      } else {
        await tx.flooringCategory.create({
          data: {
            name: entry.name,
          },
        })
        created += 1
      }
    }
  })

  logger.log(`Seeded ${SEEDED_CATEGORIES.length} categories (${created} created, ${updated} already existed)`)
}

async function main() {
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    await seedCategories({ prisma })
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
  SEEDED_CATEGORIES,
  seedCategories,
}

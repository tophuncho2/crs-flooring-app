const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

/**
 * Canonical list of categories.
 * Keep in sync with packages/db/src/seed/categories.ts (the TypeScript source of truth).
 */
const SEEDED_CATEGORIES = [
  // Slug retained for snapshot stability; display name changed from "Vinyl Plank" → "Plank" 2026-05-07.
  { slug: "vinyl-plank", name: "Plank" },
  { slug: "carpet-tile", name: "Carpet Tile" },
  { slug: "covebase", name: "Covebase" },
  { slug: "pad", name: "Pad" },
  { slug: "adhesive", name: "Adhesive" },
  { slug: "baseboard", name: "Baseboard" },
  { slug: "carpet", name: "Carpet" },
  { slug: "kilz", name: "Kilz" },
  { slug: "luan", name: "Luan" },
  { slug: "metals", name: "Metals" },
  { slug: "moisture-barrier", name: "Moisture Barrier" },
  { slug: "patch", name: "Patch" },
  { slug: "plywood", name: "Plywood" },
  { slug: "primer", name: "Primer" },
  { slug: "scent-stop", name: "Scent Stop" },
  { slug: "shoe-molding", name: "Shoe Molding" },
  { slug: "trim", name: "Trim" },
  { slug: "vct", name: "VCT" },
  { slug: "vinyl-sheet", name: "Vinyl Sheet" },
  { slug: "wax-ring", name: "Wax Ring" },
  { slug: "ceramic-tile", name: "Ceramic Tile" },
  { slug: "stair-treads", name: "Stair Treads" },
  { slug: "rubber-transition", name: "Rubber Transition" },
]

function verifySyncWithTypeScriptSource() {
  const tsPath = resolve(__dirname, "../src/seed/categories.ts")
  const tsSource = readFileSync(tsPath, "utf8")

  const entryPattern = /\{\s*slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"\s*,?\s*\}/g
  const tsEntries = []
  let match
  while ((match = entryPattern.exec(tsSource)) !== null) {
    tsEntries.push({ slug: match[1], name: match[2] })
  }

  const jsKey = (entry) => `${entry.slug}|${entry.name}`
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
        where: { slug: entry.slug },
        select: { id: true },
      })

      if (existing) {
        await tx.flooringCategory.update({
          where: { slug: entry.slug },
          data: { name: entry.name },
        })
        updated += 1
      } else {
        await tx.flooringCategory.create({
          data: {
            slug: entry.slug,
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

const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

/**
 * Canonical list of unit of measures.
 * Keep in sync with packages/db/src/seed/unit-of-measures.ts (the TypeScript source of truth).
 */
const SEEDED_UNIT_OF_MEASURES = [
  { slug: "linear-feet", name: "Linear Feet", abbreviation: "lf" },
  { slug: "square-feet", name: "Square Feet", abbreviation: "sqft" },
  { slug: "square-yard", name: "Square Yard", abbreviation: "sqyd" },
  { slug: "buckets", name: "Buckets", abbreviation: "bkt" },
  { slug: "boxes", name: "Boxes", abbreviation: "bx" },
  { slug: "units", name: "Units", abbreviation: "ea" },
  { slug: "bags", name: "Bags", abbreviation: "bag" },
  { slug: "pieces", name: "Pieces", abbreviation: "pc" },
  { slug: "sheets", name: "Sheets", abbreviation: "sht" },
  { slug: "rolls", name: "Rolls", abbreviation: "rl" },
  { slug: "gallons", name: "Gallons", abbreviation: "gal" },
]

function verifySyncWithTypeScriptSource() {
  const tsPath = resolve(__dirname, "../src/seed/unit-of-measures.ts")
  const tsSource = readFileSync(tsPath, "utf8")

  const entryPattern = /\{\s*slug:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*abbreviation:\s*"([^"]+)"\s*\}/g
  const tsEntries = []
  let match
  while ((match = entryPattern.exec(tsSource)) !== null) {
    tsEntries.push({ slug: match[1], name: match[2], abbreviation: match[3] })
  }

  const jsKey = (entry) => `${entry.slug}|${entry.name}|${entry.abbreviation}`
  const jsKeys = SEEDED_UNIT_OF_MEASURES.map(jsKey)
  const tsKeys = tsEntries.map(jsKey)

  if (jsKeys.length !== tsKeys.length) {
    throw new Error(
      `Seed sync failure: .js has ${jsKeys.length} entries, .ts has ${tsKeys.length} entries. ` +
      `Update both files to match. TS source: src/seed/unit-of-measures.ts`,
    )
  }

  for (let i = 0; i < jsKeys.length; i++) {
    if (jsKeys[i] !== tsKeys[i]) {
      throw new Error(
        `Seed sync failure at index ${i}: ` +
        `.js has "${jsKeys[i]}", .ts has "${tsKeys[i]}". ` +
        `Update both files to match. TS source: src/seed/unit-of-measures.ts`,
      )
    }
  }
}

async function seedUnitOfMeasures({ prisma, logger = console }) {
  verifySyncWithTypeScriptSource()

  let created = 0
  let existed = 0

  await prisma.$transaction(async (tx) => {
    for (const unit of SEEDED_UNIT_OF_MEASURES) {
      const existing = await tx.flooringUnitOfMeasure.findUnique({
        where: { slug: unit.slug },
        select: { id: true },
      })

      if (existing) {
        await tx.flooringUnitOfMeasure.update({
          where: { slug: unit.slug },
          data: { name: unit.name, abbreviation: unit.abbreviation },
        })
        existed += 1
      } else {
        await tx.flooringUnitOfMeasure.create({
          data: { slug: unit.slug, name: unit.name, abbreviation: unit.abbreviation },
        })
        created += 1
      }
    }
  })

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

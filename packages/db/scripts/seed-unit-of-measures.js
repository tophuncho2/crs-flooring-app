const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

/**
 * Canonical list of unit of measures.
 * Keep in sync with packages/db/src/seed/unit-of-measures.ts (the TypeScript source of truth).
 */
const SEEDED_UNIT_OF_MEASURES = [
  { name: "Linear Feet", abbreviation: "lf" },
  { name: "Square Feet", abbreviation: "sqft" },
  { name: "Square Yard", abbreviation: "sqyd" },
  { name: "Buckets", abbreviation: "bkt" },
  { name: "Boxes", abbreviation: "bx" },
  { name: "Units", abbreviation: "ea" },
  { name: "Bags", abbreviation: "bag" },
  { name: "Pieces", abbreviation: "pc" },
  { name: "Sheets", abbreviation: "sht" },
  { name: "Rolls", abbreviation: "rl" },
  { name: "Gallons", abbreviation: "gal" },
  { name: "Tubes", abbreviation: "tbs" },
]

function verifySyncWithTypeScriptSource() {
  const tsPath = resolve(__dirname, "../src/seed/unit-of-measures.ts")
  const tsSource = readFileSync(tsPath, "utf8")

  const entryPattern = /\{\s*name:\s*"([^"]+)",\s*abbreviation:\s*"([^"]+)"\s*\}/g
  const tsEntries = []
  let match
  while ((match = entryPattern.exec(tsSource)) !== null) {
    tsEntries.push({ name: match[1], abbreviation: match[2] })
  }

  const jsKey = (entry) => `${entry.name}|${entry.abbreviation}`
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
        where: { name: unit.name },
        select: { id: true },
      })

      if (existing) {
        await tx.flooringUnitOfMeasure.update({
          where: { name: unit.name },
          data: { abbreviation: unit.abbreviation },
        })
        existed += 1
      } else {
        await tx.flooringUnitOfMeasure.create({
          data: { name: unit.name, abbreviation: unit.abbreviation },
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
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

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

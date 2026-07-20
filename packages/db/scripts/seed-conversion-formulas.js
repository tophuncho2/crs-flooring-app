const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

/**
 * Canonical list of conversion formulas.
 * Keep in sync with packages/db/src/seed/conversion-formulas.ts (the TypeScript source of truth).
 *
 * Formulas A & B already exist on live DBs (migrations 20260714150000 +
 * 20260716140000); create-if-missing makes them no-ops and creates only the
 * new Sq Yd → Boxes. Unit ids are resolved by NAME at runtime (env-portable).
 */
const SEEDED_CONVERSION_FORMULAS = [
  {
    name: "Linear Ft → Sq Yd (×1.333)",
    fromUnitName: "Linear Feet",
    toUnitName: "Square Yard",
    operator: "MULTIPLY",
    factorMode: "CONSTANT",
    constantFactor: "1.3330",
  },
  {
    name: "Sq Ft → Boxes (÷ coverage)",
    fromUnitName: "Square Feet",
    toUnitName: "Boxes",
    operator: "DIVIDE",
    factorMode: "USE_COVERAGE_PER_UNIT",
    constantFactor: null,
  },
  {
    name: "Sq Yd → Boxes (÷ coverage)",
    fromUnitName: "Square Yard",
    toUnitName: "Boxes",
    operator: "DIVIDE",
    factorMode: "USE_COVERAGE_PER_UNIT",
    constantFactor: null,
  },
]

function verifySyncWithTypeScriptSource() {
  const tsPath = resolve(__dirname, "../src/seed/conversion-formulas.ts")
  const tsSource = readFileSync(tsPath, "utf8")

  // Each entry begins with `{ name: "..."`; `name:` is case-sensitive so it never
  // matches the sibling `fromUnitName:` / `toUnitName:` fields. `name` is the
  // unique key, so ordered-name equality is sufficient (mirrors seed-categories).
  const entryPattern = /\{\s*name:\s*"([^"]+)"/g
  const tsEntries = []
  let match
  while ((match = entryPattern.exec(tsSource)) !== null) {
    tsEntries.push({ name: match[1] })
  }

  const jsKey = (entry) => entry.name
  const jsKeys = SEEDED_CONVERSION_FORMULAS.map(jsKey)
  const tsKeys = tsEntries.map(jsKey)

  if (jsKeys.length !== tsKeys.length) {
    throw new Error(
      `Seed sync failure: .js has ${jsKeys.length} entries, .ts has ${tsKeys.length} entries. ` +
        `Update both files to match. TS source: src/seed/conversion-formulas.ts`,
    )
  }

  for (let i = 0; i < jsKeys.length; i++) {
    if (jsKeys[i] !== tsKeys[i]) {
      throw new Error(
        `Seed sync failure at index ${i}: ` +
          `.js has "${jsKeys[i]}", .ts has "${tsKeys[i]}". ` +
          `Update both files to match. TS source: src/seed/conversion-formulas.ts`,
      )
    }
  }
}

async function seedConversionFormulas({ prisma, logger = console }) {
  verifySyncWithTypeScriptSource()

  let created = 0
  let existed = 0

  await prisma.$transaction(async (tx) => {
    for (const formula of SEEDED_CONVERSION_FORMULAS) {
      const existing = await tx.flooringConversionFormula.findUnique({
        where: { name: formula.name },
        select: { id: true },
      })

      if (existing) {
        existed += 1
        continue
      }

      const fromUnit = await tx.flooringUnitOfMeasure.findUnique({
        where: { name: formula.fromUnitName },
        select: { id: true },
      })
      const toUnit = await tx.flooringUnitOfMeasure.findUnique({
        where: { name: formula.toUnitName },
        select: { id: true },
      })

      if (!fromUnit || !toUnit) {
        throw new Error(
          `Cannot seed formula "${formula.name}": missing unit ` +
            `${!fromUnit ? `"${formula.fromUnitName}"` : `"${formula.toUnitName}"`}. ` +
            `Seed units first (db:seed:uoms).`,
        )
      }

      await tx.flooringConversionFormula.create({
        data: {
          name: formula.name,
          fromUnitId: fromUnit.id,
          toUnitId: toUnit.id,
          operator: formula.operator,
          factorMode: formula.factorMode,
          constantFactor: formula.constantFactor,
        },
      })
      created += 1
    }
  })

  logger.log(
    `Seeded ${SEEDED_CONVERSION_FORMULAS.length} conversion formulas (${created} created, ${existed} already existed)`,
  )
}

async function main() {
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    await seedConversionFormulas({ prisma })
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
  SEEDED_CONVERSION_FORMULAS,
  seedConversionFormulas,
}

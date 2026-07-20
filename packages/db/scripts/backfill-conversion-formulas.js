// Backfill the conversion-formula link onto products (and the rows that
// snapshotted their trio before the link existed), by category.
//
// A product holds ONE formula; downstream inventory/adjustment/staged rows
// snapshot the formula FK + coverage basis at write time (not a live join), so
// setting the product FK does NOT reach existing rows — they get their own
// fill here. Everything is NULL-only (never clobbers a user-picked formula or
// an edited coverage value) and idempotent (safe to re-run on any env). Ids are
// resolved by NAME at runtime so the same script is env-portable.
//
// Run AFTER db:seed:formulas (the Sq Yd → Boxes formula must exist).

const CATEGORY_FORMULA_MAP = [
  { categoryName: "Plank", formulaName: "Sq Ft → Boxes (÷ coverage)" },
  { categoryName: "Carpet Tile", formulaName: "Sq Yd → Boxes (÷ coverage)" },
  { categoryName: "Carpet", formulaName: "Linear Ft → Sq Yd (×1.333)" },
  { categoryName: "Vinyl Sheet", formulaName: "Linear Ft → Sq Yd (×1.333)" },
]

// Downstream tables carrying the (conversionFormulaId, coverageUnitId,
// coveragePerUnit) trio + a direct productId FK to join on.
const ROW_TABLES = [
  "flooring_inventory",
  "flooring_inventory_adjustment",
  "flooring_import_staged_inventory_row",
  "flooring_import_staged_inventory_filter_row",
]

async function backfillConversionFormulas({ prisma, logger = console }) {
  for (const { categoryName, formulaName } of CATEGORY_FORMULA_MAP) {
    const category = await prisma.flooringCategory.findUnique({
      where: { name: categoryName },
      select: { id: true },
    })
    const formula = await prisma.flooringConversionFormula.findUnique({
      where: { name: formulaName },
      select: { id: true },
    })

    if (!category) {
      throw new Error(`Backfill aborted: category "${categoryName}" not found. Seed categories first.`)
    }
    if (!formula) {
      throw new Error(
        `Backfill aborted: formula "${formulaName}" not found. Run db:seed:formulas first.`,
      )
    }

    // 1) Product — set the FK where currently unset (never clobber a user pick).
    const productCount = await prisma.$executeRawUnsafe(
      `UPDATE "flooring_product"
         SET "conversionFormulaId" = $1
       WHERE "categoryId" = $2 AND "conversionFormulaId" IS NULL`,
      formula.id,
      category.id,
    )
    logger.log(`[${categoryName} → ${formulaName}] products linked: ${productCount}`)

    // 2) Existing rows — fill each row's trio from ITS product where NULL. Uses
    //    the product's actual formula (COALESCE), so rows always match their
    //    product; never overwrites an existing formula or coverage value.
    for (const table of ROW_TABLES) {
      const rowCount = await prisma.$executeRawUnsafe(
        `UPDATE "${table}" t
            SET "conversionFormulaId" = COALESCE(t."conversionFormulaId", p."conversionFormulaId"),
                "coverageUnitId"      = COALESCE(t."coverageUnitId", p."coverageUnitId"),
                "coveragePerUnit"     = COALESCE(t."coveragePerUnit", p."coveragePerUnit")
           FROM "flooring_product" p
          WHERE t."productId" = p."id"
            AND p."categoryId" = $1
            AND (t."conversionFormulaId" IS NULL
                 OR t."coverageUnitId" IS NULL
                 OR t."coveragePerUnit" IS NULL)`,
        category.id,
      )
      logger.log(`[${categoryName}] ${table} rows filled: ${rowCount}`)
    }
  }

  logger.log("Conversion-formula backfill complete.")
}

async function main() {
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    await backfillConversionFormulas({ prisma })
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
  CATEGORY_FORMULA_MAP,
  backfillConversionFormulas,
}

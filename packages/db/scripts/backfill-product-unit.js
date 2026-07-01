/**
 * Backfill `flooring_product.unitId` from the legacy stock-unit snapshot.
 *
 * Step 2 of the UoM FK-migration expand sequence (sub-plan 2A): run this AFTER
 * the `_product_unit_expand` migration (adds nullable `unitId`) and BEFORE the
 * `_product_unit_not_null` migration. It resolves each product's unit and, only
 * when zero rows are left unresolved, writes the FK.
 *
 *   Resolution order per product (idempotent — only touches unitId IS NULL):
 *     1. `stockUnitName` matched case-insensitively to a `flooring_unit_of_measure.name`
 *     2. fallback: the product's `category.stockUnitId` (already a UoM id)
 *
 * Anomaly-guard: `--apply` REFUSES to write if ANY product is unresolved — a
 * partial backfill would block the NOT NULL migration and leave silent gaps.
 *
 * Usage (mirrors the db:seed:* convention):
 *   npm run db:backfill:product-unit                 # dry-run (default, no writes)
 *   npm run db:backfill:product-unit -- --apply      # write after a clean dry-run
 */

const APPLY_FLAG = "--apply"

/**
 * Pure resolver — exported for unit tests.
 * @param {{ stockUnitName: string | null, category: { stockUnitId: string | null } | null }} product
 * @param {Map<string, string>} unitNameMap  lowercased UoM name -> UoM id
 * @returns {{ unitId: string | null, source: "name" | "category" | null }}
 */
function resolveProductUnitId(product, unitNameMap) {
  const name = product.stockUnitName ? product.stockUnitName.trim().toLowerCase() : null
  if (name && unitNameMap.has(name)) {
    return { unitId: unitNameMap.get(name), source: "name" }
  }
  if (product.category && product.category.stockUnitId) {
    return { unitId: product.category.stockUnitId, source: "category" }
  }
  return { unitId: null, source: null }
}

async function backfillProductUnit({ prisma, apply = false, logger = console }) {
  const report = { total: 0, byName: 0, byCategory: 0, unresolved: 0, updated: 0 }

  await prisma.$transaction(
    async (tx) => {
      const units = await tx.flooringUnitOfMeasure.findMany({ select: { id: true, name: true } })
      const unitNameMap = new Map(units.map((u) => [u.name.trim().toLowerCase(), u.id]))

      const products = await tx.flooringProduct.findMany({
        where: { unitId: null },
        select: {
          id: true,
          stockUnitName: true,
          category: { select: { stockUnitId: true } },
        },
      })
      report.total = products.length

      const resolved = []
      for (const product of products) {
        const { unitId, source } = resolveProductUnitId(product, unitNameMap)
        if (!unitId) {
          report.unresolved += 1
          logger.warn(
            `  UNRESOLVED product ${product.id} (stockUnitName=${JSON.stringify(product.stockUnitName)})`,
          )
          continue
        }
        if (source === "name") report.byName += 1
        else report.byCategory += 1
        resolved.push({ id: product.id, unitId })
      }

      // Anomaly-guard: never apply a partial backfill.
      if (apply && report.unresolved > 0) {
        throw new Error(
          `Refusing to apply: ${report.unresolved} of ${report.total} products could not resolve a unit. ` +
            `Seed the missing units (or fix stockUnitName/category) and re-run the dry-run until it is zero.`,
        )
      }

      if (apply) {
        for (const row of resolved) {
          await tx.flooringProduct.update({ where: { id: row.id }, data: { unitId: row.unitId } })
          report.updated += 1
        }
      }
    },
    { timeout: 120_000 },
  )

  const pad = (label, n) => `  ${label.padEnd(30)}${String(n).padStart(6)}`
  logger.log(apply ? "APPLIED product-unit backfill" : "DRY RUN product-unit backfill (no writes)")
  logger.log(pad("products missing unitId", report.total))
  logger.log(pad("resolved by name", report.byName))
  logger.log(pad("resolved by category fallback", report.byCategory))
  logger.log(pad("unresolved", report.unresolved))
  logger.log(pad("TOTAL updated", report.updated))
  return report
}

async function main() {
  const apply = process.argv.includes(APPLY_FLAG)
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    await backfillProductUnit({ prisma, apply })
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
  resolveProductUnitId,
  backfillProductUnit,
}

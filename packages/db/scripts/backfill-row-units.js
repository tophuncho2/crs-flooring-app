/**
 * Backfill `unitId` on the four row tables from their legacy stock-unit snapshot.
 *
 * Step 2 of the sub-plan 2B expand sequence: run AFTER `_row_units_expand`
 * (adds nullable `unitId` to inventory / adjustment / staged / filter) and
 * BEFORE `_row_units_not_null` (which flips inventory + adjustment to NOT NULL).
 *
 *   Resolution order per row (idempotent — only touches unitId IS NULL):
 *     1. `stockUnitName` matched case-insensitively to a `flooring_unit_of_measure.name`
 *     2. fallback: the row's `product.unitId` (product.unitId is NOT NULL post-2A,
 *        so this always resolves → expect zero unresolved)
 *
 * Anomaly-guard: `--apply` REFUSES to write (rolls back) if ANY row across all
 * four tables is unresolved.
 *
 * Usage (mirrors the seed / backfill script convention):
 *   npm run db:backfill:row-units                 # dry-run (default, no writes)
 *   npm run db:backfill:row-units -- --apply      # write after a clean dry-run
 */

const APPLY_FLAG = "--apply"

// Prisma model delegates + human labels, in dependency-safe order.
const TABLES = [
  { label: "inventory", model: "flooringInventory" },
  { label: "adjustment", model: "flooringInventoryAdjustment" },
  { label: "stagedRow", model: "flooringImportStagedInventoryRow" },
  { label: "filterRow", model: "flooringImportStagedInventoryFilterRow" },
]

/**
 * Pure resolver — exported for unit tests.
 * @param {{ stockUnitName: string | null, product: { unitId: string | null } | null }} row
 * @param {Map<string, string>} unitNameMap  lowercased UoM name -> UoM id
 * @returns {{ unitId: string | null, source: "name" | "product" | null }}
 */
function resolveRowUnitId(row, unitNameMap) {
  const name = row.stockUnitName ? row.stockUnitName.trim().toLowerCase() : null
  if (name && unitNameMap.has(name)) {
    return { unitId: unitNameMap.get(name), source: "name" }
  }
  if (row.product && row.product.unitId) {
    return { unitId: row.product.unitId, source: "product" }
  }
  return { unitId: null, source: null }
}

function emptyStats() {
  return { total: 0, byName: 0, byProduct: 0, unresolved: 0, updated: 0 }
}

async function backfillRowUnits({ prisma, apply = false, logger = console }) {
  const totals = emptyStats()
  const perTable = {}

  await prisma.$transaction(
    async (tx) => {
      const units = await tx.flooringUnitOfMeasure.findMany({ select: { id: true, name: true } })
      const unitNameMap = new Map(units.map((u) => [u.name.trim().toLowerCase(), u.id]))

      const plans = []
      for (const { label, model } of TABLES) {
        const delegate = tx[model]
        // The generated Prisma client types `unitId` per the schema end-state
        // (NOT NULL for inventory/adjustment), so a `where: { unitId: null }`
        // filter is rejected during the expand window while the column is still
        // nullable. Fetch all + JS-filter the un-backfilled rows for idempotency.
        const allRows = await delegate.findMany({
          select: {
            id: true,
            unitId: true,
            stockUnitName: true,
            product: { select: { unitId: true } },
          },
        })
        const rows = allRows.filter((r) => !r.unitId)

        const stats = emptyStats()
        stats.total = rows.length
        const resolved = []
        for (const row of rows) {
          const { unitId, source } = resolveRowUnitId(row, unitNameMap)
          if (!unitId) {
            stats.unresolved += 1
            logger.warn(
              `  [${label}] UNRESOLVED ${row.id} (stockUnitName=${JSON.stringify(row.stockUnitName)})`,
            )
            continue
          }
          if (source === "name") stats.byName += 1
          else stats.byProduct += 1
          resolved.push({ id: row.id, unitId })
        }

        perTable[label] = stats
        totals.total += stats.total
        totals.byName += stats.byName
        totals.byProduct += stats.byProduct
        totals.unresolved += stats.unresolved
        plans.push({ label, delegate, resolved })
      }

      // Anomaly-guard: never apply a partial backfill.
      if (apply && totals.unresolved > 0) {
        throw new Error(
          `Refusing to apply: ${totals.unresolved} rows across the four tables could not resolve a unit. ` +
            `Fix the data (or seed the missing units) and re-run the dry-run until it is zero.`,
        )
      }

      if (apply) {
        for (const { label, delegate, resolved } of plans) {
          for (const r of resolved) {
            await delegate.update({ where: { id: r.id }, data: { unitId: r.unitId } })
            perTable[label].updated += 1
            totals.updated += 1
          }
        }
      }
    },
    { timeout: 120_000 },
  )

  const pad = (label, n) => `  ${label.padEnd(34)}${String(n).padStart(6)}`
  logger.log(apply ? "APPLIED row-units backfill" : "DRY RUN row-units backfill (no writes)")
  for (const { label } of TABLES) {
    const s = perTable[label]
    logger.log(`  ${label}`)
    logger.log(pad("    missing unitId", s.total))
    logger.log(pad("    resolved by name", s.byName))
    logger.log(pad("    resolved by product fallback", s.byProduct))
    logger.log(pad("    unresolved", s.unresolved))
    logger.log(pad("    updated", s.updated))
  }
  logger.log(pad("TOTAL unresolved", totals.unresolved))
  logger.log(pad("TOTAL updated", totals.updated))
  return { totals, perTable }
}

async function main() {
  const apply = process.argv.includes(APPLY_FLAG)
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    await backfillRowUnits({ prisma, apply })
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
  TABLES,
  resolveRowUnitId,
  backfillRowUnits,
}

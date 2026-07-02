/**
 * Backfill `unitId` on the two material-item tables from their legacy send-unit
 * snapshot.
 *
 * Step 2 of the sub-plan 2C expand sequence: run AFTER `_item_units_expand`
 * (adds nullable `unitId` to template items + work-order items). 2C has NO
 * not-null flip — the item `unitId` stays nullable (mirrors nullable quantity).
 *
 *   Resolution order per item (idempotent — only touches unitId IS NULL):
 *     1. `sendUnitName` matched case-insensitively to a `flooring_unit_of_measure.name`
 *     2. fallback: the item's `product.unitId` (product.unitId is NOT NULL post-2A,
 *        so this always resolves -> expect zero unresolved)
 *
 * Anomaly-guard: `--apply` REFUSES to write (rolls back) if ANY item across
 * both tables is unresolved.
 *
 * Usage (mirrors the seed / backfill script convention):
 *   npm run db:backfill:item-units                 # dry-run (default, no writes)
 *   npm run db:backfill:item-units -- --apply      # write after a clean dry-run
 */

const APPLY_FLAG = "--apply"

// Prisma model delegates + human labels, in dependency-safe order.
const TABLES = [
  { label: "templateItem", model: "flooringTemplateItem" },
  { label: "workOrderItem", model: "flooringWorkOrderItem" },
]

/**
 * Pure resolver — exported for unit tests.
 * @param {{ sendUnitName: string | null, product: { unitId: string | null } | null }} item
 * @param {Map<string, string>} unitNameMap  lowercased UoM name -> UoM id
 * @returns {{ unitId: string | null, source: "name" | "product" | null }}
 */
function resolveItemUnitId(item, unitNameMap) {
  const name = item.sendUnitName ? item.sendUnitName.trim().toLowerCase() : null
  if (name && unitNameMap.has(name)) {
    return { unitId: unitNameMap.get(name), source: "name" }
  }
  if (item.product && item.product.unitId) {
    return { unitId: item.product.unitId, source: "product" }
  }
  return { unitId: null, source: null }
}

function emptyStats() {
  return { total: 0, byName: 0, byProduct: 0, unresolved: 0, updated: 0 }
}

async function backfillItemUnits({ prisma, apply = false, logger = console }) {
  const totals = emptyStats()
  const perTable = {}

  await prisma.$transaction(
    async (tx) => {
      const units = await tx.flooringUnitOfMeasure.findMany({ select: { id: true, name: true } })
      const unitNameMap = new Map(units.map((u) => [u.name.trim().toLowerCase(), u.id]))

      const plans = []
      for (const { label, model } of TABLES) {
        const delegate = tx[model]
        // The generated Prisma client types `unitId` per the schema, so a
        // `where: { unitId: null }` filter can be rejected during the expand
        // window. Fetch all + JS-filter the un-backfilled items for idempotency.
        const allItems = await delegate.findMany({
          select: {
            id: true,
            unitId: true,
            sendUnitName: true,
            product: { select: { unitId: true } },
          },
        })
        const items = allItems.filter((i) => !i.unitId)

        const stats = emptyStats()
        stats.total = items.length
        const resolved = []
        for (const item of items) {
          const { unitId, source } = resolveItemUnitId(item, unitNameMap)
          if (!unitId) {
            stats.unresolved += 1
            logger.warn(
              `  [${label}] UNRESOLVED ${item.id} (sendUnitName=${JSON.stringify(item.sendUnitName)})`,
            )
            continue
          }
          if (source === "name") stats.byName += 1
          else stats.byProduct += 1
          resolved.push({ id: item.id, unitId })
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
          `Refusing to apply: ${totals.unresolved} items across the two tables could not resolve a unit. ` +
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
  logger.log(apply ? "APPLIED item-units backfill" : "DRY RUN item-units backfill (no writes)")
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
    await backfillItemUnits({ prisma, apply })
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
  resolveItemUnitId,
  backfillItemUnits,
}

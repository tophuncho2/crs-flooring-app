/**
 * One-off recompute: rebuild every inventory adjustment's `before` / `after`
 * running balance in **createdAt order**.
 *
 * Background: the adjustment ledger used to freeze `before`/`after` at finalize
 * time, ordered by `finalSequence`. That mechanic is gone — the ledger is now
 * purely chronological and recomputed on every mutation (see
 * `recomputeAndPersistNetDeducted`). This script applies that same replay once
 * across the whole table so existing rows match the new ordering uniformly,
 * instead of waiting for each inventory's next edit to re-derive lazily.
 *
 * Replay (mirrors the domain's `computeLedgerBeforeAfter`):
 *   running        = startingStock
 *   before(row)    = running
 *   after(row)     = running − signedDelta(row)     (DEDUCTION +qty, INCREASE −qty)
 *   running        = after(row)
 * Rows are ordered by `createdAt` ASC, `id` ASC (the same order the runtime
 * recompute uses). `netDeducted`/on-hand are order-independent and untouched.
 *
 * NOTE: this intentionally REWRITES historical `before`/`after` for any
 * inventory that was finalized out of creation order — the accepted
 * consequence of moving the ledger key from `finalSequence` to `createdAt`.
 *
 * Dry-run by default (counts only). Pass --apply to write.
 *
 *   npm run db:recompute:ledger              # dry-run
 *   npm run db:recompute:ledger -- --apply   # write (one transaction)
 *
 * Idempotent: only rows whose stored before/after differ from the recomputed
 * values are updated, so a second --apply reports 0 changes.
 */

function signedDelta(quantity, adjustmentType) {
  if (quantity === null || quantity === undefined) return 0
  const value = Number(quantity)
  if (!Number.isFinite(value)) return 0
  return adjustmentType === "INCREASE" ? -value : value
}

/** Same shape as `Number(x).toFixed(2)`, tolerant of null. */
function fixed2OrNull(value) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(2) : null
}

/**
 * Replays one inventory's chain (rows pre-sorted createdAt ASC, id ASC) and
 * returns the rows whose before/after would change, as { id, before, after }.
 */
function computeInventoryLedgerUpdates(startingStock, rowsInOrder) {
  let running = Number(startingStock)
  if (!Number.isFinite(running)) running = 0
  const updates = []
  for (const row of rowsInOrder) {
    const before = running
    const after = before - signedDelta(row.quantity, row.adjustmentType)
    running = after
    const beforeStr = before.toFixed(2)
    const afterStr = after.toFixed(2)
    if (fixed2OrNull(row.before) !== beforeStr || fixed2OrNull(row.after) !== afterStr) {
      updates.push({ id: row.id, before: beforeStr, after: afterStr })
    }
  }
  return updates
}

async function recomputeAdjustmentLedger({ prisma, apply, logger = console }) {
  const inventories = await prisma.flooringInventory.findMany({
    select: { id: true, startingStock: true },
  })

  logger.log(`Inventories scanned: ${inventories.length}`)

  let inventoriesWithChanges = 0
  let rowsToUpdate = 0
  const allUpdates = []

  for (const inv of inventories) {
    const rows = await prisma.flooringInventoryAdjustment.findMany({
      where: { inventoryId: inv.id },
      select: { id: true, quantity: true, adjustmentType: true, before: true, after: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    if (rows.length === 0) continue

    const updates = computeInventoryLedgerUpdates(inv.startingStock, rows)
    if (updates.length > 0) {
      inventoriesWithChanges += 1
      rowsToUpdate += updates.length
      allUpdates.push(...updates)
    }
  }

  logger.log("")
  logger.log(`Inventories with rows to rewrite: ${inventoriesWithChanges}`)
  logger.log(`Adjustment rows to rewrite:       ${rowsToUpdate}`)
  logger.log("")

  if (!apply) {
    logger.log("Dry-run only. Re-run with --apply to write these before/after values.")
    return { inventoriesWithChanges, rowsToUpdate, applied: 0 }
  }

  if (rowsToUpdate === 0) {
    logger.log("Nothing to rewrite.")
    return { inventoriesWithChanges, rowsToUpdate, applied: 0 }
  }

  await prisma.$transaction(
    async (tx) => {
      for (const u of allUpdates) {
        await tx.flooringInventoryAdjustment.update({
          where: { id: u.id },
          data: { before: u.before, after: u.after },
          select: { id: true },
        })
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  )

  logger.log(`Applied: rewrote before/after on ${rowsToUpdate} row(s).`)
  logger.log("")
  logger.log("Done.")
  return { inventoriesWithChanges, rowsToUpdate, applied: rowsToUpdate }
}

async function main() {
  const apply = process.argv.includes("--apply")
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    await recomputeAdjustmentLedger({ prisma, apply })
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
  signedDelta,
  computeInventoryLedgerUpdates,
  recomputeAdjustmentLedger,
}

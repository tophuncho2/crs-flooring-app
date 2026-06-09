import { signedDelta, type SignedDeltaRowInput } from "./net-deducted-math.js"

export type LedgerReplayRow = SignedDeltaRowInput & { id: string }

/**
 * Replays an inventory's adjustment chain and returns the running-balance
 * `before` / `after` for each row. Callers pass the rows pre-sorted into ledger
 * order (`createdAt` ASC, `id` tiebreak).
 *
 *   before(first) = startingStock
 *   after(row)    = before(row) − signedDelta(row)   (DEDUCTION lowers, INCREASE raises)
 *   before(next)  = after(prev)
 *
 * Pure computation — no I/O. This is the single source of truth for the ledger
 * chain; the data layer calls it on every adjustment mutation, and the one-time
 * recompute script replays the same way.
 */
export function computeLedgerBeforeAfter(
  rowsInOrder: ReadonlyArray<LedgerReplayRow>,
  startingStock: string | number,
): Array<{ id: string; before: string; after: string }> {
  let running = Number(startingStock)
  if (!Number.isFinite(running)) running = 0
  const out: Array<{ id: string; before: string; after: string }> = []
  for (const row of rowsInOrder) {
    const before = running
    const after = before - signedDelta(row)
    out.push({ id: row.id, before: before.toFixed(2), after: after.toFixed(2) })
    running = after
  }
  return out
}

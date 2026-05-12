import { CutLogDomainError } from "../errors.js"

/**
 * Allocator for `FlooringCutLog.finalCutSequence` — the per-inventory 1-based
 * ordinal of finalized cuts. The finalize worker calls this AFTER its locked
 * `SELECT MAX("finalCutSequence") FROM flooring_cut_log WHERE "inventoryId" = $1 FOR UPDATE`
 * query, inside the same transaction that flips `status → FINAL` and sets
 * `isFinal → true`. The per-inventory `FOR UPDATE` lock on the parent
 * inventory row serializes finalize jobs, so the read-then-allocate pattern
 * is race-safe.
 *
 * Returns 1 if `currentMax === null` (no previous finalized cuts on this
 * inventory). Otherwise returns `currentMax + 1`.
 *
 * Throws `CutLogDomainError("CUT_LOG_FINAL_SEQUENCE_INVALID", { currentMax })`
 * on:
 *   - non-finite input (NaN / Infinity)
 *   - negative input
 *   - non-integer input
 *
 * The DB-side `@@unique([inventoryId, finalCutSequence])` constraint catches
 * any accidental duplicate allocation; this helper enforces the well-formed
 * input on the application side.
 */
export function nextFinalCutSequence(currentMax: number | null): number {
  if (currentMax === null) return 1
  if (!Number.isFinite(currentMax) || currentMax < 0 || !Number.isInteger(currentMax)) {
    throw new CutLogDomainError("CUT_LOG_FINAL_SEQUENCE_INVALID", { currentMax })
  }
  return currentMax + 1
}

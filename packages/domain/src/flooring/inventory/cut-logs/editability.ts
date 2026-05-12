import type { CutLogRow, FlooringCutLogStatus } from "./types.js"

/**
 * Lifecycle predicates and the finalizability blocker for cut logs.
 *
 * Cut-log lifecycle:
 *   PENDING → QUEUED → FINAL   (finalize worker path)
 *   PENDING → QUEUED → VOID    (void worker on a pending row)
 *   FINAL   → QUEUED → VOID    (void worker on a finalized row)
 *
 * `QUEUED` is a generic in-flight marker — a worker job is currently
 * mutating the row; UI must treat it as read-only. The kind of job is
 * encoded in the outbox topic, not in `status`.
 */

// ---------------------------------------------------------------------------
// Lifecycle predicates
// ---------------------------------------------------------------------------

/**
 * True iff the row is freely editable by users (creates, updates, deletes
 * via the pending-save diff). PENDING + not finalized + not voided + not
 * mid-flight in a worker job.
 */
export function isCutLogPendingEditable(
  row: Pick<CutLogRow, "status" | "isFinal" | "void">,
): boolean {
  return row.status === "PENDING" && !row.isFinal && !row.void
}

/**
 * True while a worker job (pending-save / finalize / void) is in flight on
 * this row. UI must treat it as read-only and the diff-save / link-edit
 * paths must reject patches.
 */
export function isCutLogQueued(row: Pick<CutLogRow, "status">): boolean {
  return row.status === "QUEUED"
}

/**
 * True once the finalize worker has stamped this row. Terminal-but-voidable
 * — a finalized cut log can still transition to VOID via the void worker.
 */
export function isCutLogFinalized(row: Pick<CutLogRow, "isFinal">): boolean {
  return row.isFinal === true
}

/**
 * True once the void worker has erased this row's value columns. Fully
 * terminal.
 */
export function isCutLogVoided(row: Pick<CutLogRow, "void">): boolean {
  return row.void === true
}

/**
 * Delete is only allowed while the row is pending-editable. Pending cut
 * logs can be deleted in any order (no most-recent-first constraint —
 * dropped in sweep 2). Finalized rows can never be deleted (only voided).
 */
export function canDeleteCutLog(
  row: Pick<CutLogRow, "status" | "isFinal" | "void">,
): boolean {
  return isCutLogPendingEditable(row)
}

/**
 * Void is allowed on PENDING-editable rows or on finalized rows, but never
 * while a worker job is in flight, and never twice. Voids are always
 * single-row (one at a time), enforced by the void payload schema.
 */
export function canVoidCutLog(
  row: Pick<CutLogRow, "status" | "isFinal" | "void">,
): boolean {
  if (row.void) return false
  if (row.status === "QUEUED") return false
  return row.isFinal || row.status === "PENDING"
}

// ---------------------------------------------------------------------------
// Status formatting
// ---------------------------------------------------------------------------

/**
 * Human-readable copy for a `CUT_LOG_VOID_NOT_ALLOWED` /
 * `CUT_LOG_BATCH_INELIGIBLE` rejection. Co-located with the predicates that
 * produce the conditions.
 */
export function buildCutLogNotPendingMessage(
  row: Pick<CutLogRow, "status" | "isFinal" | "void">,
): string {
  if (row.void) return "Cut log has been voided and is no longer editable."
  if (row.isFinal) return "Cut log has been finalized and is no longer editable as a draft."
  if (row.status === "QUEUED")
    return "Cut log has a worker job in flight; try again once it settles."
  return "Cut log is editable."
}

// ---------------------------------------------------------------------------
// Finalizability blocker (mirrors staged-inv `getStagedRowImportabilityBlocker`)
// ---------------------------------------------------------------------------

/**
 * Reasons a cut log can't be queued for finalization. Returned by
 * `getCutLogFinalizabilityBlocker` so callers can surface a precise error
 * (or filter rows in the batch finalize selection UI).
 */
export type CutLogFinalizabilityReason =
  | "NOT_PENDING_STATUS"
  | "ALREADY_QUEUED"
  | "ALREADY_FINAL"
  | "ALREADY_VOID"
  | "ZERO_OR_NEGATIVE_CUT"

/**
 * Returns null if the row is finalizable; otherwise returns a single reason
 * code identifying the first failed readiness rule.
 *
 * Readiness rules (priority order):
 *  - status === "QUEUED" → ALREADY_QUEUED (worker already owns this row)
 *  - row has been voided (void === true) → ALREADY_VOID
 *  - row has been finalized (isFinal === true) → ALREADY_FINAL
 *  - status !== "PENDING" → NOT_PENDING_STATUS
 *  - cut parses to a positive number (zero / negative cuts can't be finalized)
 */
export function getCutLogFinalizabilityBlocker(
  row: Pick<CutLogRow, "status" | "isFinal" | "void" | "cut">,
): CutLogFinalizabilityReason | null {
  if (row.status === "QUEUED") return "ALREADY_QUEUED"
  if (row.void) return "ALREADY_VOID"
  if (row.isFinal) return "ALREADY_FINAL"
  if (row.status !== "PENDING") return "NOT_PENDING_STATUS"
  const parsed = Number((row.cut ?? "").toString())
  if (!Number.isFinite(parsed) || parsed <= 0) return "ZERO_OR_NEGATIVE_CUT"
  return null
}

/**
 * True only when the row has zero blockers AND status is PENDING + not
 * finalized + not voided.
 */
export function canFinalizeCutLog(
  row: Pick<CutLogRow, "status" | "isFinal" | "void" | "cut">,
): boolean {
  return getCutLogFinalizabilityBlocker(row) === null
}

// Status type re-exported here for predicate-call-site convenience.
export type { FlooringCutLogStatus }

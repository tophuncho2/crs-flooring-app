import type { CutLogRow, FlooringCutLogStatus } from "./types.js"

/**
 * Canonical split of cut-log columns by who's allowed to change them, plus
 * lifecycle predicates and the finalizability blocker. Mirrors the staged-inv
 * `editability.ts` shape (`isStagedRowEditable` / `isStagedRowQueued` /
 * `isStagedRowMaterialized` / `getStagedRowImportabilityBlocker`).
 *
 * Cut-log lifecycle (post sweep-1):
 *   PENDING → QUEUED → FINAL   (finalize worker path)
 *   PENDING → QUEUED → VOID    (void worker on a pending row)
 *   FINAL   → QUEUED → VOID    (void worker on a finalized row)
 *
 * `QUEUED` is a generic in-flight marker — a worker job (pending-save,
 * finalize, or void) is currently mutating the row; UI must treat it as
 * read-only. The kind of job is encoded in the outbox topic, not in `status`.
 */

// ---------------------------------------------------------------------------
// Field partition
// ---------------------------------------------------------------------------

// User-editable on the pending-save (diff-mode) path. Writing these triggers
// a worker job that recomputes coverageCut and updates inventory.totalCutSum
// inside the per-inventory FOR UPDATE lock.
export const CUT_LOG_PENDING_USER_EDITABLE_FIELDS = [
  "cut",
  "cost",
  "freight",
  "isWaste",
  "notes",
] as const

// Recomputed inside the same transaction as a PENDING save (cut × inventory's
// coveragePerUnit, gated on inventory.categorySlug). Recomputed by the worker
// on every cut change. Never accepted from user input.
export const CUT_LOG_TRANSACTIONAL_FIELDS = ["coverageCut"] as const

// Worker-only — written by the finalize / void / pending-save workers. Never
// accepted from user input. `before` / `after` and `finalCutSequence` are
// stamped at finalize time; `status` and `isFinal` move at every worker
// transition; `void` is set by the void worker.
export const CUT_LOG_WORKER_FIELDS = [
  "before",
  "after",
  "status",
  "isFinal",
  "finalCutSequence",
  "void",
] as const

// Link fields — editable for the LIFE of the cut log (PENDING, FINAL, VOID),
// blocked only while a worker job is in flight (`status === "QUEUED"`).
// Updates flow through their own sync use case (no worker), per the intent
// doc. Both fields move together (assertCutLogLinkageSymmetry).
export const CUT_LOG_LINK_FIELDS = ["workOrderId", "workOrderItemId"] as const

// Auto-managed by Prisma / database. `cutLogNumber` is sequence-backed
// (`flooring_cut_log_number_seq`, format CUT-0000001).
export const CUT_LOG_AUTO_FIELDS = [
  "id",
  "cutLogNumber",
  "inventoryId",
  "createdAt",
  "updatedAt",
] as const

export type CutLogPendingUserEditableField =
  (typeof CUT_LOG_PENDING_USER_EDITABLE_FIELDS)[number]
export type CutLogTransactionalField = (typeof CUT_LOG_TRANSACTIONAL_FIELDS)[number]
export type CutLogWorkerField = (typeof CUT_LOG_WORKER_FIELDS)[number]
export type CutLogLinkField = (typeof CUT_LOG_LINK_FIELDS)[number]
export type CutLogAutoField = (typeof CUT_LOG_AUTO_FIELDS)[number]

export function isCutLogPendingUserEditableField(
  field: string,
): field is CutLogPendingUserEditableField {
  return (CUT_LOG_PENDING_USER_EDITABLE_FIELDS as readonly string[]).includes(field)
}

export function isCutLogWorkerField(field: string): field is CutLogWorkerField {
  return (CUT_LOG_WORKER_FIELDS as readonly string[]).includes(field)
}

export function isCutLogLinkField(field: string): field is CutLogLinkField {
  return (CUT_LOG_LINK_FIELDS as readonly string[]).includes(field)
}

export function isCutLogAutoField(field: string): field is CutLogAutoField {
  return (CUT_LOG_AUTO_FIELDS as readonly string[]).includes(field)
}

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

/**
 * Link fields (`workOrderId` / `workOrderItemId`) are editable for the life
 * of the cut log — PENDING, FINAL, VOID. The only block is an in-flight
 * worker job (the row's status is QUEUED).
 */
export function canEditCutLogLinks(row: Pick<CutLogRow, "status">): boolean {
  return row.status !== "QUEUED"
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

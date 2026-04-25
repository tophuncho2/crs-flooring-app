/**
 * Canonical split of cut-log columns by who's allowed to change them.
 * Mirrors the precedent set by `inventory/editability.ts`.
 *
 * The cut-log lifecycle is: PENDING → FINAL → VOIDED. Users can only edit a
 * narrow slice of fields, and only on certain transitions. Workers (the FINAL
 * transition handler) and same-transaction recomputations own the rest.
 */

// User-editable on PENDING save. Writing these triggers a transaction that
// also recomputes coverageCut and updates inventory.totalCutSum.
export const CUT_LOG_PENDING_USER_EDITABLE_FIELDS = ["cut", "notes"] as const

// User-toggleable independently of status (PENDING→VOIDED, FINAL→VOIDED).
// The transaction that flips this also runs buildVoidedCutLogPatch() to clear
// every other field except `notes`.
export const CUT_LOG_VOID_TOGGLE_FIELD = "void" as const

// Computed inside the same transaction as a PENDING save (cut × inventory's
// coveragePerUnit, gated on inventory.categorySlug). Recomputed by the worker
// on FINAL transition. Never accepted from user input.
export const CUT_LOG_TRANSACTIONAL_FIELDS = ["coverageCut"] as const

// Worker-only — written when the FINAL transition runs. Never accepted from
// user input on the create or pending-save paths.
export const CUT_LOG_WORKER_FIELDS = [
  "before",
  "after",
  "cost",
  "freight",
  "status",
] as const

// Linkage. Not in either editable list because both must move together
// (assertCutLogLinkageSymmetry).
export const CUT_LOG_LINKAGE_FIELDS = ["workOrderId", "workOrderItemId"] as const

// Auto-managed by Prisma / database.
export const CUT_LOG_AUTO_FIELDS = [
  "id",
  "inventoryId",
  "createdAt",
  "updatedAt",
] as const

export type CutLogPendingUserEditableField =
  (typeof CUT_LOG_PENDING_USER_EDITABLE_FIELDS)[number]
export type CutLogTransactionalField = (typeof CUT_LOG_TRANSACTIONAL_FIELDS)[number]
export type CutLogWorkerField = (typeof CUT_LOG_WORKER_FIELDS)[number]
export type CutLogLinkageField = (typeof CUT_LOG_LINKAGE_FIELDS)[number]
export type CutLogAutoField = (typeof CUT_LOG_AUTO_FIELDS)[number]

export function isCutLogPendingUserEditableField(
  field: string,
): field is CutLogPendingUserEditableField {
  return (CUT_LOG_PENDING_USER_EDITABLE_FIELDS as readonly string[]).includes(field)
}

export function isCutLogWorkerField(field: string): field is CutLogWorkerField {
  return (CUT_LOG_WORKER_FIELDS as readonly string[]).includes(field)
}

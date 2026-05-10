import type { FlooringStagedRowStatus, StagedInventoryRow } from "./types.js"

/**
 * Staged rows are immutable once the worker has copied them into a live
 * inventory row (`isImported = true`). The UI greys out such rows; the diff
 * validator + per-row-update use case reject any edit or delete that targets
 * a locked row.
 *
 * Note: this predicate predates the `status` enum and is ambiguous now — a
 * QUEUED row is also user-locked but not yet materialized. The status-aware
 * predicates below (`isStagedRowEditable` / `isStagedRowQueued` /
 * `isStagedRowMaterialized` / `canDeleteStagedRow`) supersede it. Kept for
 * back-compat until the use-case sweep retires the callers.
 */
export function isStagedRowLocked(row: { isImported: boolean }): boolean {
  return row.isImported === true
}

/**
 * Status-aware editability predicate. A staged row is user-editable only while
 * it sits in DRAFT and the legacy `isImported` latch is still false. Once a
 * row is QUEUED (worker about to materialize) or IMPORTED (materialization
 * done), the form is read-only and the diff-save path must reject patches.
 */
export function isStagedRowEditable(
  row: { status: FlooringStagedRowStatus; isImported: boolean },
): boolean {
  return row.status === "DRAFT" && row.isImported === false
}

/**
 * True while the row is awaiting materialization in the worker queue. The UI
 * greys these rows out; nothing user-driven should target them.
 */
export function isStagedRowQueued(
  row: { status: FlooringStagedRowStatus; isImported: boolean },
): boolean {
  return row.status === "QUEUED"
}

/**
 * True once the worker has materialized the staged row into a live inventory
 * row. Terminal state.
 */
export function isStagedRowMaterialized(
  row: { status: FlooringStagedRowStatus },
): boolean {
  return row.status === "IMPORTED"
}

/**
 * Delete is only allowed while the row is editable — same condition as
 * `isStagedRowEditable`. QUEUED rows can't be user-deleted (worker owns the
 * lifecycle); IMPORTED rows can't be deleted at all (the linked inventory
 * row depends on them via the import-entry FK chain).
 */
export function canDeleteStagedRow(
  row: { status: FlooringStagedRowStatus; isImported: boolean },
): boolean {
  return isStagedRowEditable(row)
}

/**
 * Human-readable copy for a `STAGED_ROW_NOT_DRAFT` rejection. Keeps the
 * message colocated with the predicate that produces the condition, per
 * convention.
 */
export function buildStagedRowNotDraftMessage(
  row: { status: FlooringStagedRowStatus },
): string {
  switch (row.status) {
    case "QUEUED":
      return "Staged row is queued for import and can no longer be edited."
    case "IMPORTED":
      return "Staged row has already been imported and is read-only."
    case "DRAFT":
      return "Staged row is editable."
  }
}

/**
 * Reasons a staged row can't be imported. Returned by
 * `getStagedRowImportabilityBlocker` so callers can surface a precise error
 * (or filter rows in a batch UI).
 *
 * Status-aware codes (`NOT_DRAFT_STATUS`, `ALREADY_QUEUED`) take precedence
 * over the legacy `ALREADY_IMPORTED` latch check — the worker now drives the
 * status enum and the `isImported` latch in lockstep.
 */
export type StagedImportabilityReason =
  | "NOT_DRAFT_STATUS"
  | "ALREADY_QUEUED"
  | "ALREADY_IMPORTED"
  | "MISSING_PRODUCT"
  | "MISSING_WAREHOUSE"
  | "ZERO_STARTING_STOCK"

/**
 * Returns null if the row is importable; otherwise returns a single reason
 * code identifying the first failed readiness rule.
 *
 * Readiness rules (priority order, post sweep-1):
 *  - status === "QUEUED" → ALREADY_QUEUED (worker already owns this row)
 *  - status === "IMPORTED" → NOT_DRAFT_STATUS (terminal)
 *  - row hasn't already been imported (latch hasn't flipped) — legacy backstop
 *  - productId is set
 *  - warehouseId is set (it always should be — schema requires it — but we
 *    re-check defensively in case domain consumers receive a partial row)
 *  - startingStock parses to a positive number
 */
export function getStagedRowImportabilityBlocker(
  row: Pick<
    StagedInventoryRow,
    "status" | "isImported" | "productId" | "warehouseId" | "startingStock"
  >,
): StagedImportabilityReason | null {
  if (row.status === "QUEUED") return "ALREADY_QUEUED"
  if (row.status === "IMPORTED") return "NOT_DRAFT_STATUS"
  if (row.isImported) return "ALREADY_IMPORTED"
  if (!row.productId || row.productId.trim() === "") return "MISSING_PRODUCT"
  if (!row.warehouseId || row.warehouseId.trim() === "") return "MISSING_WAREHOUSE"
  const parsed = Number((row.startingStock ?? "").toString())
  if (!Number.isFinite(parsed) || parsed <= 0) return "ZERO_STARTING_STOCK"
  return null
}

/**
 * True only when the row has zero blockers AND status is DRAFT — a defensive
 * second check against any callers that might pass a row with the legacy
 * latch checks satisfied but the status moved on.
 */
export function canImportStagedRow(
  row: Pick<
    StagedInventoryRow,
    "status" | "isImported" | "productId" | "warehouseId" | "startingStock"
  >,
): boolean {
  return row.status === "DRAFT" && getStagedRowImportabilityBlocker(row) === null
}

// Field-editability split. Mirrors the convention from
// `inventory/editability.ts` and `imports/editability.ts`.

// User-editable on the staged-rows section's diff-save path.
export const STAGED_USER_EDITABLE_FIELDS = [
  "productId",
  "rollNumber",
  "dyeLot",
  "location",
  "startingStock",
  "note",
] as const

// Owned by the parent import row — `warehouseId` is copied from the import's
// warehouse on create and never accepted from staged-row updates.
export const STAGED_PARENT_OWNED_FIELDS = ["warehouseId"] as const

// Latch — flips false → true exactly once (worker-driven, gated by the
// import-batch flow). Never accepted on the regular update path.
export const STAGED_LATCH_FIELDS = ["isImported"] as const

// Auto-managed by Prisma / database.
export const STAGED_AUTO_FIELDS = [
  "id",
  "importEntryId",
  "createdAt",
  "updatedAt",
] as const

export type StagedUserEditableField = (typeof STAGED_USER_EDITABLE_FIELDS)[number]
export type StagedParentOwnedField = (typeof STAGED_PARENT_OWNED_FIELDS)[number]
export type StagedLatchField = (typeof STAGED_LATCH_FIELDS)[number]
export type StagedAutoField = (typeof STAGED_AUTO_FIELDS)[number]

export function isStagedUserEditableField(field: string): field is StagedUserEditableField {
  return (STAGED_USER_EDITABLE_FIELDS as readonly string[]).includes(field)
}

export function isStagedLatchField(field: string): field is StagedLatchField {
  return (STAGED_LATCH_FIELDS as readonly string[]).includes(field)
}

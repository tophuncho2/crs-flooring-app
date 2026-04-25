import type { StagedInventoryRow } from "./types.js"

/**
 * Staged rows are immutable once the worker has copied them into a live
 * inventory row (`isImported = true`). The UI greys out such rows; the diff
 * validator + per-row-update use case reject any edit or delete that targets
 * a locked row.
 */
export function isStagedRowLocked(row: { isImported: boolean }): boolean {
  return row.isImported === true
}

/**
 * Reasons a staged row can't be imported. Returned by
 * `getStagedRowImportabilityBlocker` so callers can surface a precise error
 * (or filter rows in a batch UI).
 */
export type StagedImportabilityReason =
  | "ALREADY_IMPORTED"
  | "MISSING_PRODUCT"
  | "MISSING_WAREHOUSE"
  | "ZERO_STARTING_STOCK"

/**
 * Returns null if the row is importable; otherwise returns a single reason
 * code identifying the first failed readiness rule.
 *
 * Readiness rules (per the alteration spec):
 *  - row hasn't already been imported (latch hasn't flipped)
 *  - productId is set
 *  - warehouseId is set (it always should be — schema requires it — but we
 *    re-check defensively in case domain consumers receive a partial row)
 *  - startingStock parses to a positive number
 */
export function getStagedRowImportabilityBlocker(
  row: Pick<
    StagedInventoryRow,
    "isImported" | "productId" | "warehouseId" | "startingStock"
  >,
): StagedImportabilityReason | null {
  if (row.isImported) return "ALREADY_IMPORTED"
  if (!row.productId || row.productId.trim() === "") return "MISSING_PRODUCT"
  if (!row.warehouseId || row.warehouseId.trim() === "") return "MISSING_WAREHOUSE"
  const parsed = Number((row.startingStock ?? "").toString())
  if (!Number.isFinite(parsed) || parsed <= 0) return "ZERO_STARTING_STOCK"
  return null
}

/**
 * Inverse of `isStagedRowLocked` — kept as a thin wrapper around
 * `getStagedRowImportabilityBlocker` so legacy callers keep working.
 */
export function canImportStagedRow(
  row: Pick<
    StagedInventoryRow,
    "isImported" | "productId" | "warehouseId" | "startingStock"
  >,
): boolean {
  return getStagedRowImportabilityBlocker(row) === null
}

// Field-editability split. Mirrors the convention from
// `inventory/editability.ts` and `imports/editability.ts`.

// User-editable on the staged-rows section's diff-save path.
export const STAGED_USER_EDITABLE_FIELDS = [
  "productId",
  "itemNumber",
  "dyeLot",
  "locationId",
  "startingStock",
  "cost",
  "freight",
  "notes",
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

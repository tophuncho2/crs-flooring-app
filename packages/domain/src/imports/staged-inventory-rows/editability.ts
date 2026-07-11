import type { FlooringStagedRowStatus, StagedInventoryRow } from "./types.js"

// A staged row is editable/deletable in any state except QUEUED (its rows are
// locked mid-import). IMPORTED rows are editable again — a materialized staged
// row is now pure history (the inventory->staged FK was severed), so touching it
// no longer risks the inventory row it produced.
export function isStagedRowEditable(
  row: { status: FlooringStagedRowStatus },
): boolean {
  return row.status !== "QUEUED"
}

export function isStagedRowQueued(
  row: { status: FlooringStagedRowStatus },
): boolean {
  return row.status === "QUEUED"
}

export function isStagedRowMaterialized(
  row: { status: FlooringStagedRowStatus },
): boolean {
  return row.status === "IMPORTED"
}

export function canDeleteStagedRow(
  row: { status: FlooringStagedRowStatus },
): boolean {
  return isStagedRowEditable(row)
}

export type StagedImportabilityReason =
  | "NOT_DRAFT_STATUS"
  | "ALREADY_QUEUED"
  | "MISSING_PRODUCT"
  | "MISSING_UNIT"
  | "ZERO_STARTING_STOCK"

export function getStagedRowImportabilityBlocker(
  row: Pick<StagedInventoryRow, "status" | "productId" | "unitId" | "startingStock">,
): StagedImportabilityReason | null {
  if (row.status === "QUEUED") return "ALREADY_QUEUED"
  if (row.status === "IMPORTED") return "NOT_DRAFT_STATUS"
  if (!row.productId || row.productId.trim() === "") return "MISSING_PRODUCT"
  // A staged row must carry a unit before it can queue — the worker materializes
  // it forward into inventory's NOT-NULL unit column (UoM epic 2B).
  if (!row.unitId || row.unitId.trim() === "") return "MISSING_UNIT"
  const parsed = Number((row.startingStock ?? "").toString())
  if (!Number.isFinite(parsed) || parsed <= 0) return "ZERO_STARTING_STOCK"
  return null
}

export function canImportStagedRow(
  row: Pick<StagedInventoryRow, "status" | "productId" | "unitId" | "startingStock">,
): boolean {
  return row.status === "DRAFT" && getStagedRowImportabilityBlocker(row) === null
}

export const STAGED_USER_EDITABLE_FIELDS = [
  "unitId",
  "rollNumber",
  "dyeLot",
  "location",
  "startingStock",
  "note",
] as const

export const STAGED_PARENT_OWNED_FIELDS = [
  // `warehouseId` is derived from the parent import entry (no longer a stored
  // staged-row column) — still parent-owned, hence not user-editable.
  "warehouseId",
  "productId",
  "unitName",
  "unitAbbrev",
  "rollPrefix",
] as const

export type StagedUserEditableField = (typeof STAGED_USER_EDITABLE_FIELDS)[number]

export function isStagedUserEditableField(field: string): field is StagedUserEditableField {
  return (STAGED_USER_EDITABLE_FIELDS as readonly string[]).includes(field)
}

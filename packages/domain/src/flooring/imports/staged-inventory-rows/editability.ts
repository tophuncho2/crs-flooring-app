import type { FlooringStagedRowStatus, StagedInventoryRow } from "./types.js"

export function isStagedRowLocked(row: { isImported: boolean }): boolean {
  return row.isImported === true
}

export function isStagedRowEditable(
  row: { status: FlooringStagedRowStatus; isImported: boolean },
): boolean {
  return row.status === "DRAFT" && row.isImported === false
}

export function isStagedRowQueued(
  row: { status: FlooringStagedRowStatus; isImported: boolean },
): boolean {
  return row.status === "QUEUED"
}

export function isStagedRowMaterialized(
  row: { status: FlooringStagedRowStatus },
): boolean {
  return row.status === "IMPORTED"
}

export function canDeleteStagedRow(
  row: { status: FlooringStagedRowStatus; isImported: boolean },
): boolean {
  return isStagedRowEditable(row)
}

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

export type StagedImportabilityReason =
  | "NOT_DRAFT_STATUS"
  | "ALREADY_QUEUED"
  | "ALREADY_IMPORTED"
  | "MISSING_PRODUCT"
  | "MISSING_WAREHOUSE"
  | "ZERO_STARTING_STOCK"

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

export function canImportStagedRow(
  row: Pick<
    StagedInventoryRow,
    "status" | "isImported" | "productId" | "warehouseId" | "startingStock"
  >,
): boolean {
  return row.status === "DRAFT" && getStagedRowImportabilityBlocker(row) === null
}

export const STAGED_USER_EDITABLE_FIELDS = [
  "rollNumber",
  "dyeLot",
  "location",
  "startingStock",
  "note",
] as const

export const STAGED_PARENT_OWNED_FIELDS = [
  "warehouseId",
  "productId",
  "stockUnitName",
  "stockUnitAbbrev",
  "rollPrefix",
] as const

export const STAGED_LATCH_FIELDS = ["isImported"] as const

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

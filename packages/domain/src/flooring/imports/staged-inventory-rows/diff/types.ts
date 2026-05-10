// Diff-save shapes for the staged-inventory-rows section. Mirrors the
// inventory diff-save pattern: draft rows get a tempId the caller assigns
// (see ./identity.ts), modified rows carry an optimistic-lock `expectedUpdatedAt`,
// deleted rows carry only id + expectedUpdatedAt.

export type StagedInventoryRowDraft = {
  tempId: string
  productId: string
  rollNumber: string
  dyeLot: string | null
  warehouseId: string
  location: string | null
  startingStock: string
  note: string | null
}

export type StagedInventoryRowUpdatePatch = {
  productId?: string
  rollNumber?: string
  dyeLot?: string | null
  warehouseId?: string
  location?: string | null
  startingStock?: string
  note?: string | null
}

export type StagedInventoryRowUpdate = {
  id: string
  expectedUpdatedAt: string
  patch: StagedInventoryRowUpdatePatch
}

export type StagedInventoryRowDelete = {
  id: string
  expectedUpdatedAt: string
}

export type StagedInventoryRowsDiff = {
  added: StagedInventoryRowDraft[]
  modified: StagedInventoryRowUpdate[]
  deleted: StagedInventoryRowDelete[]
}

/**
 * Staged rows always belong to an import, and the row's warehouse must match
 * the parent import's warehouse. The diff validator enforces that invariant.
 */
export type StagedInventoryParentContext = {
  importEntryId: string
  warehouseId: string
}

export type DiffExistingStagedInventoryRow = {
  id: string
  productId: string
  rollNumber: string
  warehouseId: string
  isImported: boolean
}

export type StagedInventoryDiffValidationIssue =
  | {
      code: "STAGED_IMPORT_WAREHOUSE_MISMATCH"
      expectedWarehouseId: string
      rowWarehouseId: string
      rowId: string | null
      rowTempId: string | null
    }
  | {
      code: "STAGED_UNKNOWN_PRODUCT"
      productId: string
      rowId: string | null
      rowTempId: string | null
    }
  | {
      code: "STAGED_ROW_LOCKED_POST_IMPORT"
      rowId: string
      attemptedAction: "modify" | "delete"
    }

export function describeStagedInventoryDiffIssue(issue: StagedInventoryDiffValidationIssue): string {
  switch (issue.code) {
    case "STAGED_IMPORT_WAREHOUSE_MISMATCH":
      return "Staged inventory rows must stay within the import's warehouse."
    case "STAGED_UNKNOWN_PRODUCT":
      return `Referenced product ${issue.productId} does not exist.`
    case "STAGED_ROW_LOCKED_POST_IMPORT":
      return `Staged row is already imported and cannot be ${issue.attemptedAction === "delete" ? "deleted" : "edited"}.`
  }
}

export function describeStagedInventoryDiffIssues(
  issues: StagedInventoryDiffValidationIssue[],
): string {
  return issues.map(describeStagedInventoryDiffIssue).join(" ")
}

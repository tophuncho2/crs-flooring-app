// Diff-save shapes for the inventory rows section. `isImported` fields removed —
// real inventory has no such column now; staged rows carry that flag, and the
// staged domain has its own diff types.

export type InventoryRowDraft = {
  tempId: string
  productId: string
  rollNumber: string
  dyeLot: string | null
  warehouseId: string
  location: string | null
  note: string | null
  internalNotes: string | null
  isArchived?: boolean
}

export type InventoryRowUpdatePatch = {
  rollNumber?: string
  dyeLot?: string | null
  warehouseId?: string
  location?: string | null
  note?: string | null
  internalNotes?: string | null
  isArchived?: boolean
}

export type InventoryRowUpdate = {
  id: string
  expectedUpdatedAt: string
  patch: InventoryRowUpdatePatch
}

export type InventoryRowDelete = {
  id: string
  expectedUpdatedAt: string
}

export type InventoryRowsDiff = {
  added: InventoryRowDraft[]
  modified: InventoryRowUpdate[]
  deleted: InventoryRowDelete[]
}

export type InventoryParentContext =
  | { kind: "import"; importEntryId: string; warehouseId: string | null }
  | { kind: "standalone" }

export type DiffExistingInventoryRow = {
  id: string
  productId: string
  rollNumber: string
  warehouseId: string
  cutLogsCount: number
}

export type InventoryDiffValidationIssue =
  | {
      code: "IMPORT_WAREHOUSE_MISMATCH"
      expectedWarehouseId: string | null
      rowWarehouseId: string | null
      rowId: string | null
      rowTempId: string | null
    }
  | {
      code: "UNKNOWN_PRODUCT"
      productId: string
      rowId: string | null
      rowTempId: string | null
    }
  | {
      code: "DELETE_BLOCKED_BY_CUT_LOGS"
      rowId: string
      cutLogsCount: number
    }

export function describeInventoryDiffIssue(issue: InventoryDiffValidationIssue): string {
  switch (issue.code) {
    case "IMPORT_WAREHOUSE_MISMATCH":
      return `Inventory rows must stay within the import's warehouse.`
    case "UNKNOWN_PRODUCT":
      return `Referenced product ${issue.productId} does not exist.`
    case "DELETE_BLOCKED_BY_CUT_LOGS":
      return `Cannot delete inventory row with ${issue.cutLogsCount} cut log${issue.cutLogsCount === 1 ? "" : "s"} attached.`
  }
}

export function describeInventoryDiffIssues(issues: InventoryDiffValidationIssue[]): string {
  return issues.map(describeInventoryDiffIssue).join(" ")
}

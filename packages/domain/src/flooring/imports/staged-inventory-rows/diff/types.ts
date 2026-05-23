// Diff-save shapes for the staged-inventory-rows slice of the imports
// record-view section. Mirrors the filter-rows diff shape — added carries
// tempId + parent filterRowId + form, modified carries id + form, deleted
// carries id. Staged-row drafts always reference an already-saved filter
// row (the UI's unsaved-parent rule); no cross-slice tempId resolution.
// Section-level conflict detection rides on the parent import's
// revisionKey alongside the filter-rows diff.

import type { FlooringStagedRowStatus } from "../types.js"
import type { StagedInventoryForm } from "../types.js"
import type { StagedInventoryFiltersDiff } from "../../staged-inventory-filter-rows/diff/types.js"

export type StagedInventoryRowDraft = {
  tempId: string
  filterRowId: string
  form: StagedInventoryForm
}

export type StagedInventoryRowUpdate = {
  id: string
  form: StagedInventoryForm
}

export type StagedInventoryRowDelete = {
  id: string
}

export type StagedInventoryRowsDiff = {
  added: StagedInventoryRowDraft[]
  modified: StagedInventoryRowUpdate[]
  deleted: StagedInventoryRowDelete[]
}

export type DiffExistingStagedInventoryRow = {
  id: string
  filterRowId: string
  status: FlooringStagedRowStatus
  isImported: boolean
}

export type StagedInventoryRowDiffValidationIssue =
  | {
      code: "STAGED_ROW_NOT_FOUND"
      rowId: string
    }
  | {
      code: "STAGED_ROW_NOT_EDITABLE"
      rowId: string
      status: FlooringStagedRowStatus
    }
  | {
      code: "STAGED_ROW_DELETE_BLOCKED_NOT_DRAFT"
      rowId: string
      status: FlooringStagedRowStatus
    }
  | {
      code: "STAGED_ROW_PARENT_NOT_FOUND"
      filterRowId: string
      rowTempId: string | null
      rowId: string | null
    }
  | {
      code: "STAGED_ROW_PARENT_BEING_DELETED"
      filterRowId: string
      rowTempId: string | null
      rowId: string | null
    }

export function describeStagedInventoryRowDiffIssue(
  issue: StagedInventoryRowDiffValidationIssue,
): string {
  switch (issue.code) {
    case "STAGED_ROW_NOT_FOUND":
      return `Staged row ${issue.rowId} no longer exists.`
    case "STAGED_ROW_NOT_EDITABLE":
      return `Staged row ${issue.rowId} is ${issue.status.toLowerCase()} and can't be edited.`
    case "STAGED_ROW_DELETE_BLOCKED_NOT_DRAFT":
      return `Staged row ${issue.rowId} is ${issue.status.toLowerCase()} and can't be deleted.`
    case "STAGED_ROW_PARENT_NOT_FOUND":
      return `Staged row references filter row ${issue.filterRowId}, which does not exist.`
    case "STAGED_ROW_PARENT_BEING_DELETED":
      return `Staged row's parent filter row ${issue.filterRowId} is being deleted; delete the staged row too.`
  }
}

export function describeStagedInventoryRowDiffIssues(
  issues: StagedInventoryRowDiffValidationIssue[],
): string {
  return issues.map(describeStagedInventoryRowDiffIssue).join(" ")
}

// Re-export of the cross-slice diff type the rules validator needs as
// context. Keeps the rules file from importing across slice boundaries
// itself.
export type StagedInventoryRowsDiffContextFilterDiff = StagedInventoryFiltersDiff

import type { FlooringStagedRowStatus } from "../types.js"
import type { StagedInventoryForm } from "../types.js"

export type StagedInventoryRowDraft = {
  tempId: string
  productId: string
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
  }
}

export function describeStagedInventoryRowDiffIssues(
  issues: StagedInventoryRowDiffValidationIssue[],
): string {
  return issues.map(describeStagedInventoryRowDiffIssue).join(" ")
}

import type { StagedInventoryFilterForm } from "../types.js"

export type StagedInventoryFilterRowDraft = {
  tempId: string
  form: StagedInventoryFilterForm
}

export type StagedInventoryFilterRowUpdate = {
  id: string
  form: StagedInventoryFilterForm
}

export type StagedInventoryFilterRowDelete = {
  id: string
}

export type StagedInventoryFiltersDiff = {
  added: StagedInventoryFilterRowDraft[]
  modified: StagedInventoryFilterRowUpdate[]
  deleted: StagedInventoryFilterRowDelete[]
}


export type DiffExistingStagedInventoryFilterRow = {
  id: string
  productId: string
  categoryFilterId: string | null
}

export type StagedInventoryFilterDiffValidationIssue =
  | {
      code: "FILTER_CATEGORY_FILTER_LOCKED_AFTER_CREATE"
      rowId: string
    }
  | {
      code: "FILTER_UNKNOWN_PRODUCT"
      productId: string
      rowId: string | null
      rowTempId: string | null
    }

export function describeStagedInventoryFilterDiffIssue(
  issue: StagedInventoryFilterDiffValidationIssue,
): string {
  switch (issue.code) {
    case "FILTER_CATEGORY_FILTER_LOCKED_AFTER_CREATE":
      return `Filter row ${issue.rowId} category filter is immutable after the row is saved.`
    case "FILTER_UNKNOWN_PRODUCT":
      return `Referenced product ${issue.productId} does not exist.`
  }
}

export function describeStagedInventoryFilterDiffIssues(
  issues: StagedInventoryFilterDiffValidationIssue[],
): string {
  return issues.map(describeStagedInventoryFilterDiffIssue).join(" ")
}

// Diff-save shapes for the filter-rows section. Mirrors the WOMI
// material-items diff pattern: added carries tempId + form, modified
// carries id + form, deleted carries id. No expectedUpdatedAt
// optimistic-lock token — section-level conflict detection rides on
// the parent import's revisionKey, identical to WOMI.

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
  hasChildren: boolean
}

export type StagedInventoryFilterDiffValidationIssue =
  | {
      code: "FILTER_DUPLICATE_PRODUCT"
      productId: string
      rowId: string | null
      rowTempId: string | null
    }
  | {
      code: "FILTER_PRODUCT_LOCKED_WITH_CHILDREN"
      rowId: string
    }
  | {
      code: "FILTER_CATEGORY_FILTER_LOCKED_AFTER_CREATE"
      rowId: string
    }
  | {
      code: "FILTER_DELETE_BLOCKED_BY_CHILDREN"
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
    case "FILTER_DUPLICATE_PRODUCT":
      return `Product ${issue.productId} already has a filter row in this import.`
    case "FILTER_PRODUCT_LOCKED_WITH_CHILDREN":
      return `Filter row ${issue.rowId} has staged inventory rows; its product can't change.`
    case "FILTER_CATEGORY_FILTER_LOCKED_AFTER_CREATE":
      return `Filter row ${issue.rowId} category filter is immutable after the row is saved.`
    case "FILTER_DELETE_BLOCKED_BY_CHILDREN":
      return `Filter row ${issue.rowId} has staged inventory rows; delete those first.`
    case "FILTER_UNKNOWN_PRODUCT":
      return `Referenced product ${issue.productId} does not exist.`
  }
}

export function describeStagedInventoryFilterDiffIssues(
  issues: StagedInventoryFilterDiffValidationIssue[],
): string {
  return issues.map(describeStagedInventoryFilterDiffIssue).join(" ")
}

import type { SectionDiff } from "../../../../shared/section-diff.js"
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

export type StagedInventoryFiltersDiff = SectionDiff<StagedInventoryFilterForm>


export type DiffExistingStagedInventoryFilterRow = {
  id: string
  productId: string
}

export type StagedInventoryFilterDiffValidationIssue = {
  code: "FILTER_UNKNOWN_PRODUCT"
  productId: string
  rowId: string | null
  rowTempId: string | null
}

export function describeStagedInventoryFilterDiffIssue(
  issue: StagedInventoryFilterDiffValidationIssue,
): string {
  switch (issue.code) {
    case "FILTER_UNKNOWN_PRODUCT":
      return `Referenced product ${issue.productId} does not exist.`
  }
}

export function describeStagedInventoryFilterDiffIssues(
  issues: StagedInventoryFilterDiffValidationIssue[],
): string {
  return issues.map(describeStagedInventoryFilterDiffIssue).join(" ")
}

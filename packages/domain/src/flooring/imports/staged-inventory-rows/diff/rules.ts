import { isStagedRowEditable, canDeleteStagedRow } from "../editability.js"
import type {
  DiffExistingStagedInventoryRow,
  StagedInventoryRowDiffValidationIssue,
  StagedInventoryRowsDiff,
} from "./types.js"
import type { StagedInventoryFiltersDiff } from "../../staged-inventory-filter-rows/diff/types.js"

export type StagedInventoryRowsDiffResolution = {
  existing: DiffExistingStagedInventoryRow[]
  filterDiff: StagedInventoryFiltersDiff
  existingFilterRowIds: string[]
}

export function validateStagedInventoryRowsDiff(
  diff: StagedInventoryRowsDiff,
  resolution: StagedInventoryRowsDiffResolution,
): StagedInventoryRowDiffValidationIssue[] {
  const issues: StagedInventoryRowDiffValidationIssue[] = []
  const existingById = new Map(resolution.existing.map((row) => [row.id, row]))
  const existingFilterRowIds = new Set(resolution.existingFilterRowIds)
  const filterDeletedIds = new Set(
    resolution.filterDiff.deleted.map((entry) => entry.id),
  )

  for (const draft of diff.added) {
    if (!existingFilterRowIds.has(draft.filterRowId)) {
      issues.push({
        code: "STAGED_ROW_PARENT_NOT_FOUND",
        filterRowId: draft.filterRowId,
        rowTempId: draft.tempId,
        rowId: null,
      })
      continue
    }
    if (filterDeletedIds.has(draft.filterRowId)) {
      issues.push({
        code: "STAGED_ROW_PARENT_BEING_DELETED",
        filterRowId: draft.filterRowId,
        rowTempId: draft.tempId,
        rowId: null,
      })
    }
  }

  for (const update of diff.modified) {
    const existing = existingById.get(update.id)
    if (!existing) {
      issues.push({ code: "STAGED_ROW_NOT_FOUND", rowId: update.id })
      continue
    }
    if (!isStagedRowEditable(existing)) {
      issues.push({
        code: "STAGED_ROW_NOT_EDITABLE",
        rowId: update.id,
        status: existing.status,
      })
      continue
    }
    if (filterDeletedIds.has(existing.filterRowId)) {
      issues.push({
        code: "STAGED_ROW_PARENT_BEING_DELETED",
        filterRowId: existing.filterRowId,
        rowTempId: null,
        rowId: update.id,
      })
    }
  }

  for (const entry of diff.deleted) {
    const existing = existingById.get(entry.id)
    if (!existing) {
      issues.push({ code: "STAGED_ROW_NOT_FOUND", rowId: entry.id })
      continue
    }
    if (!canDeleteStagedRow(existing)) {
      issues.push({
        code: "STAGED_ROW_DELETE_BLOCKED_NOT_DRAFT",
        rowId: entry.id,
        status: existing.status,
      })
    }
  }

  return issues
}

import { isStagedRowEditable, canDeleteStagedRow } from "../editability.js"
import type {
  DiffExistingStagedInventoryRow,
  StagedInventoryRowDiffValidationIssue,
  StagedInventoryRowsDiff,
} from "./types.js"

export type StagedInventoryRowsDiffResolution = {
  existing: DiffExistingStagedInventoryRow[]
}

export function validateStagedInventoryRowsDiff(
  diff: StagedInventoryRowsDiff,
  resolution: StagedInventoryRowsDiffResolution,
): StagedInventoryRowDiffValidationIssue[] {
  const issues: StagedInventoryRowDiffValidationIssue[] = []
  const existingById = new Map(resolution.existing.map((row) => [row.id, row]))

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

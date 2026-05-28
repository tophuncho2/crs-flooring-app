import {
  getStagedRowImportabilityBlocker,
  type StagedImportabilityReason,
} from "./editability.js"
import type { StagedInventoryRow } from "./types.js"

export type StagedImportBatchValidationIssue = {
  rowId: string
  reason: StagedImportabilityReason
}

export function validateStagedImportBatch(
  rows: ReadonlyArray<
    Pick<
      StagedInventoryRow,
      "id" | "status" | "isImported" | "productId" | "warehouseId" | "startingStock"
    >
  >,
): StagedImportBatchValidationIssue[] {
  const issues: StagedImportBatchValidationIssue[] = []
  for (const row of rows) {
    const reason = getStagedRowImportabilityBlocker(row)
    if (reason !== null) {
      issues.push({ rowId: row.id, reason })
    }
  }
  return issues
}

export function buildStagedImportBatchIneligibleMessage(
  issues: ReadonlyArray<StagedImportBatchValidationIssue>,
): string {
  if (issues.length === 0) {
    return "All staged rows are ready for import."
  }
  const count = issues.length
  return `Cannot import: ${count} row${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} not ready (see per-row reasons).`
}

export const MAX_MARK_FOR_IMPORT_ROWS = 1000

export type MarkForImportSelectionIssue =
  | { code: "SELECTION_EMPTY" }
  | { code: "SELECTION_TOO_LARGE"; max: number; actual: number }
  | { code: "SELECTION_BLANK_ID"; index: number }

export function validateMarkForImportSelection(
  stagedRowIds: ReadonlyArray<string>,
): MarkForImportSelectionIssue[] {
  if (stagedRowIds.length === 0) {
    return [{ code: "SELECTION_EMPTY" }]
  }
  const issues: MarkForImportSelectionIssue[] = []
  if (stagedRowIds.length > MAX_MARK_FOR_IMPORT_ROWS) {
    issues.push({
      code: "SELECTION_TOO_LARGE",
      max: MAX_MARK_FOR_IMPORT_ROWS,
      actual: stagedRowIds.length,
    })
  }
  stagedRowIds.forEach((id, index) => {
    if (id.trim() === "") {
      issues.push({ code: "SELECTION_BLANK_ID", index })
    }
  })
  return issues
}

export function buildMarkForImportSelectionMessage(
  issues: ReadonlyArray<MarkForImportSelectionIssue>,
): string {
  if (issues.some((issue) => issue.code === "SELECTION_EMPTY")) {
    return "Select at least one staged row to mark for import."
  }
  const tooLarge = issues.find(
    (issue): issue is Extract<MarkForImportSelectionIssue, { code: "SELECTION_TOO_LARGE" }> =>
      issue.code === "SELECTION_TOO_LARGE",
  )
  if (tooLarge) {
    return `Too many rows selected (${tooLarge.actual}). A single import is limited to ${tooLarge.max} rows — split the selection into smaller batches.`
  }
  if (issues.some((issue) => issue.code === "SELECTION_BLANK_ID")) {
    return "Staged row selection contains an invalid (blank) id."
  }
  return "Staged row selection is valid."
}

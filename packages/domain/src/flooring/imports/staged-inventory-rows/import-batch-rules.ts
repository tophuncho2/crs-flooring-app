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
      "id" | "status" | "isImported" | "productId" | "unitId" | "warehouseId" | "startingStock"
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

// Human-readable descriptor per blocker, phrased to read after "N row / N rows"
// (e.g. "1 row with no unit of measure", "2 rows already imported"). Per-row
// notices aren't surfaced anywhere, so the batch message names the blocker(s).
const STAGED_IMPORTABILITY_REASON_LABEL: Record<StagedImportabilityReason, string> = {
  MISSING_UNIT: "with no unit of measure",
  MISSING_PRODUCT: "with no product",
  MISSING_WAREHOUSE: "with no warehouse",
  ZERO_STARTING_STOCK: "with no starting stock",
  ALREADY_QUEUED: "already queued for import",
  ALREADY_IMPORTED: "already imported",
  NOT_DRAFT_STATUS: "already imported",
}

export function buildStagedImportBatchIneligibleMessage(
  issues: ReadonlyArray<StagedImportBatchValidationIssue>,
): string {
  if (issues.length === 0) {
    return "All staged rows are ready for import."
  }
  // Tally by resolved label (first-seen order) so reasons that share a label
  // — e.g. the two "already imported" reasons — collapse into one clause.
  const countByLabel = new Map<string, number>()
  for (const issue of issues) {
    const label = STAGED_IMPORTABILITY_REASON_LABEL[issue.reason]
    countByLabel.set(label, (countByLabel.get(label) ?? 0) + 1)
  }
  const parts = Array.from(countByLabel, ([label, count]) =>
    `${count} ${count === 1 ? "row" : "rows"} ${label}`,
  )
  return `Cannot import: ${parts.join(", ")}.`
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

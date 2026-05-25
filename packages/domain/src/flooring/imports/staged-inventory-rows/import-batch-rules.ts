import {
  getStagedRowImportabilityBlocker,
  type StagedImportabilityReason,
} from "./editability.js"
import type { StagedInventoryRow } from "./types.js"

/**
 * Per-row issue returned by `validateStagedImportBatch`. The application
 * layer uses these to either surface a precise per-row error or to abort the
 * whole batch — the rule itself is just "every row must pass readiness."
 */
export type StagedImportBatchValidationIssue = {
  rowId: string
  reason: StagedImportabilityReason
}

/**
 * Validates a batch of staged rows for import. The application use case
 * calls this BEFORE transitioning any rows to QUEUED and BEFORE writing the
 * outbox event — if the returned array is non-empty, no side effects fire.
 *
 * Pure: takes only the slice of each row needed to evaluate readiness; no
 * I/O.
 */
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

/**
 * Human-readable summary for a batch where at least one row failed readiness.
 * Co-located with the validator that produces the issue list, matching the
 * `build*Message` convention used by `delete-rules.ts` / `warehouse-rules.ts`.
 */
export function buildStagedImportBatchIneligibleMessage(
  issues: ReadonlyArray<StagedImportBatchValidationIssue>,
): string {
  if (issues.length === 0) {
    return "All staged rows are ready for import."
  }
  const count = issues.length
  return `Cannot import: ${count} row${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} not ready (see per-row reasons).`
}

/**
 * Selection-level precondition for a mark-for-import request: the caller must
 * name at least one staged row, and every id must be a non-blank string. The
 * API validator only guarantees the request is an array of strings; this rule
 * (≥1 row, no blank ids) is the domain's, evaluated by the use case before any
 * lock or side effect.
 */
export type MarkForImportSelectionIssue =
  | { code: "SELECTION_EMPTY" }
  | { code: "SELECTION_BLANK_ID"; index: number }

export function validateMarkForImportSelection(
  stagedRowIds: ReadonlyArray<string>,
): MarkForImportSelectionIssue[] {
  if (stagedRowIds.length === 0) {
    return [{ code: "SELECTION_EMPTY" }]
  }
  const issues: MarkForImportSelectionIssue[] = []
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
  if (issues.some((issue) => issue.code === "SELECTION_BLANK_ID")) {
    return "Staged row selection contains an invalid (blank) id."
  }
  return "Staged row selection is valid."
}

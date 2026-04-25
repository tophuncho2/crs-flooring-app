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
 * calls this BEFORE flipping any `isImported` latches and BEFORE writing the
 * outbox event — if the returned array is non-empty, no side effects fire.
 *
 * Pure: takes only the slice of each row needed to evaluate readiness; no
 * I/O.
 */
export function validateStagedImportBatch(
  rows: ReadonlyArray<
    Pick<
      StagedInventoryRow,
      "id" | "isImported" | "productId" | "warehouseId" | "startingStock"
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

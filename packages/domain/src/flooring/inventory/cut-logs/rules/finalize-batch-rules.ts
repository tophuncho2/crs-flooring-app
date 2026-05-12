import {
  type CutLogFinalizabilityReason,
  getCutLogFinalizabilityBlocker,
} from "./editability.js"
import type { CutLogRow } from "./types.js"

/**
 * Per-row issue returned by `validateCutLogFinalizeBatch`. The application
 * use case (sweep 4) uses these to surface a precise per-row error or to
 * abort the whole batch — the rule itself is just "every row must pass
 * finalize readiness."
 *
 * Mirrors `StagedImportBatchValidationIssue` in the staged-inv pattern.
 */
export type CutLogFinalizeBatchIssue = {
  cutLogId: string
  reason: CutLogFinalizabilityReason
}

/**
 * Validates a batch of cut logs for finalization. The application use case
 * calls this BEFORE transitioning any rows to QUEUED and BEFORE writing the
 * outbox event — if the returned array is non-empty, no side effects fire.
 *
 * Pure: takes only the slice of each row needed for the readiness check; no
 * I/O.
 */
export function validateCutLogFinalizeBatch(
  rows: ReadonlyArray<
    Pick<CutLogRow, "id" | "status" | "isFinal" | "void" | "cut">
  >,
): CutLogFinalizeBatchIssue[] {
  const issues: CutLogFinalizeBatchIssue[] = []
  for (const row of rows) {
    const reason = getCutLogFinalizabilityBlocker(row)
    if (reason !== null) {
      issues.push({ cutLogId: row.id, reason })
    }
  }
  return issues
}

/**
 * Human-readable summary for a batch where at least one row failed
 * readiness. Co-located with the validator that produces the issue list,
 * matching the `build*Message` convention used by staged-inv's
 * `import-batch-rules.ts`.
 */
export function buildCutLogFinalizeBatchIneligibleMessage(
  issues: ReadonlyArray<CutLogFinalizeBatchIssue>,
): string {
  if (issues.length === 0) {
    return "All selected cut logs are ready to finalize."
  }
  const count = issues.length
  return `Cannot finalize: ${count} cut log${count === 1 ? "" : "s"} ${
    count === 1 ? "is" : "are"
  } not ready (see per-row reasons).`
}

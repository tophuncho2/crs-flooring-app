import {
  computeTotalCutSum,
  isCutSumWithinStartingStock,
} from "../cut-sum-math.js"
import { isCutLogPendingEditable } from "../editability.js"
import {
  type CutLogPendingFormIssue,
  validateCutLogPendingForm,
} from "../form-rules.js"
import type { CutLogPendingForm } from "../types.js"
import type {
  CutLogDelete,
  CutLogDiffResolution,
  CutLogDiffValidationIssue,
  CutLogDraft,
  CutLogParentContext,
  CutLogPatch,
  CutLogsDiff,
  CutLogUpdate,
  DiffExistingCutLogRow,
} from "./types.js"

/**
 * Diff-level validator for the pending-save flow. Mirrors the staged-inv
 * `diff/rules.ts` shape (`validateStagedInventoryRowsDiff`).
 *
 * Validation order:
 *   1. Form-validate every `added` row.
 *   2. For each `modified`: form-validate the projected post-patch form;
 *      assert existing row is `isCutLogPendingEditable`; assert
 *      `expectedUpdatedAt` matches.
 *   3. For each `deleted`: row must exist; row must be pending-editable;
 *      `expectedUpdatedAt` must match.
 *   4. Cross-row: project the post-diff cut state (existing pending
 *      non-void cuts + added cuts + modified cuts − deleted cuts), call
 *      `isCutSumWithinStartingStock`. Wrap any violation as a
 *      `CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK` issue.
 *
 * Pure: no I/O. Caller provides the in-tx snapshot via `resolution`.
 */
export function validateCutLogsDiff(
  diff: CutLogsDiff,
  resolution: CutLogDiffResolution,
  parent: CutLogParentContext,
): CutLogDiffValidationIssue[] {
  const issues: CutLogDiffValidationIssue[] = []
  const existingById = new Map(resolution.existing.map((row) => [row.id, row]))

  // (1) added rows — pure form validation.
  for (const draft of diff.added) {
    const formIssues = validateCutLogPendingForm(draftToForm(draft))
    if (formIssues.length > 0) {
      issues.push(buildFormIssue({ rowId: null, rowTempId: draft.tempId, formIssues }))
    }
  }

  // (2) modified rows — project the post-patch form, validate it, then
  // check editability + optimistic-lock.
  for (const update of diff.modified) {
    const existing = existingById.get(update.id)
    if (!existing) {
      issues.push({
        code: "CUT_LOG_UNKNOWN_ROW",
        rowId: update.id,
        attemptedAction: "modify",
      })
      continue
    }
    const projected = projectFormFromPatch(existing, update.patch)
    const formIssues = validateCutLogPendingForm(projected)
    if (formIssues.length > 0) {
      issues.push(buildFormIssue({ rowId: update.id, rowTempId: null, formIssues }))
    }
    if (!isCutLogPendingEditable(existing)) {
      issues.push({
        code: "CUT_LOG_ROW_NOT_PENDING_EDITABLE",
        rowId: update.id,
        attemptedAction: "modify",
      })
    }
    if (existing.updatedAt !== update.expectedUpdatedAt) {
      issues.push({
        code: "CUT_LOG_EXPECTED_UPDATED_AT_MISMATCH",
        rowId: update.id,
        expected: update.expectedUpdatedAt,
        actual: existing.updatedAt,
        attemptedAction: "modify",
      })
    }
  }

  // (3) deleted rows — row must exist + be pending-editable + match lock.
  for (const entry of diff.deleted) {
    const existing = existingById.get(entry.id)
    if (!existing) {
      issues.push({
        code: "CUT_LOG_UNKNOWN_ROW",
        rowId: entry.id,
        attemptedAction: "delete",
      })
      continue
    }
    if (!isCutLogPendingEditable(existing)) {
      issues.push({
        code: "CUT_LOG_ROW_NOT_PENDING_EDITABLE",
        rowId: entry.id,
        attemptedAction: "delete",
      })
    }
    if (existing.updatedAt !== entry.expectedUpdatedAt) {
      issues.push({
        code: "CUT_LOG_EXPECTED_UPDATED_AT_MISMATCH",
        rowId: entry.id,
        expected: entry.expectedUpdatedAt,
        actual: existing.updatedAt,
        attemptedAction: "delete",
      })
    }
  }

  // (4) cross-row totalCutSum invariant. Project the post-diff state, sum
  // the non-void cuts, compare to startingStock.
  const projected = projectPostDiffCutSum(diff, resolution.existing)
  if (
    !isCutSumWithinStartingStock({
      totalCutSum: projected,
      startingStock: parent.startingStock,
    })
  ) {
    issues.push({
      code: "CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK",
      projectedSum: projected,
      startingStock: parent.startingStock,
    })
  }

  return issues
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function draftToForm(draft: CutLogDraft): CutLogPendingForm {
  return {
    cut: draft.cut,
    cost: draft.cost,
    freight: draft.freight,
    isWaste: draft.isWaste,
    notes: draft.notes,
  }
}

function projectFormFromPatch(
  existing: DiffExistingCutLogRow,
  patch: CutLogPatch,
): CutLogPendingForm {
  return {
    cut: patch.cut ?? existing.cut,
    cost: patch.cost ?? null,
    freight: patch.freight ?? null,
    isWaste: patch.isWaste ?? false,
    notes: patch.notes ?? "",
  }
}

function buildFormIssue(input: {
  rowId: string | null
  rowTempId: string | null
  formIssues: CutLogPendingFormIssue[]
}): CutLogDiffValidationIssue {
  return {
    code: "CUT_LOG_FORM_INVALID",
    rowId: input.rowId,
    rowTempId: input.rowTempId,
    issues: input.formIssues,
  }
}

/**
 * Project the post-diff `cut` state per row, then sum non-void cuts via
 * `computeTotalCutSum`. Existing rows that are voided are excluded from
 * the sum (they don't contribute to totalCutSum); deleted rows are removed;
 * modified rows use the patched cut (or existing if patch doesn't touch
 * cut); added rows contribute their draft cut.
 *
 * Note: pending-save validation only runs against pending-editable rows
 * (status === "PENDING" && !isFinal && !void), but we sum across ALL
 * non-void existing rows so the projected total reflects the inventory's
 * full cut state — finalized rows still contribute to totalCutSum.
 */
function projectPostDiffCutSum(
  diff: CutLogsDiff,
  existing: ReadonlyArray<DiffExistingCutLogRow>,
): string {
  const deletedIds = new Set(diff.deleted.map((d) => d.id))
  const modifiedById = new Map(diff.modified.map((m) => [m.id, m]))

  const projected: Array<{ cut: string; void: boolean }> = []

  for (const row of existing) {
    if (deletedIds.has(row.id)) continue
    const mod = modifiedById.get(row.id)
    if (mod) {
      projected.push({ cut: mod.patch.cut ?? row.cut, void: row.void })
    } else {
      projected.push({ cut: row.cut, void: row.void })
    }
  }

  for (const draft of diff.added) {
    projected.push({ cut: draft.cut, void: false })
  }

  return computeTotalCutSum(projected)
}

// Re-exported for convenience at the diff-folder boundary; consumers that
// only want to construct a `CutLogDelete` don't need to import the union.
export type { CutLogDelete, CutLogDraft, CutLogUpdate }

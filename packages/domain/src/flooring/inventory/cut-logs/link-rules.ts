import { canEditCutLogLinks } from "./editability.js"
import type { CutLogLinkUpdate, CutLogRow } from "./types.js"

/**
 * Validator for the separate sync link-edit use case (work-order /
 * material-item-link management). Per intent doc, link edits do NOT flow
 * through the pending-save / finalize / void worker pipeline — they're a
 * sync flow that bypasses the per-inventory FOR UPDATE lock since they
 * don't touch `cut` / `coverageCut` / `cost` / `freight` / `totalCutSum`.
 *
 * Two checks:
 *   1. The row's status permits link edits (always true except when a
 *      worker job is in flight on this row, i.e. status === "QUEUED").
 *   2. The proposed update is symmetric (both null OR both set, per
 *      `assertCutLogLinkageSymmetry` in `cut-log-rules.ts`).
 *
 * Pure: returns issue array (empty = pass).
 */

export type CutLogLinkValidationIssue =
  | { code: "CUT_LOG_LINK_UPDATE_BLOCKED"; status: string }
  | {
      code: "CUT_LOG_LINK_ASYMMETRY"
      workOrderId: string | null
      workOrderItemId: string | null
    }

export function validateCutLogLinkUpdate(
  row: Pick<CutLogRow, "status">,
  update: CutLogLinkUpdate,
): CutLogLinkValidationIssue[] {
  const issues: CutLogLinkValidationIssue[] = []
  if (!canEditCutLogLinks(row)) {
    issues.push({ code: "CUT_LOG_LINK_UPDATE_BLOCKED", status: row.status })
  }
  const orderSet = update.workOrderId !== null && update.workOrderId !== ""
  const itemSet = update.workOrderItemId !== null && update.workOrderItemId !== ""
  if (orderSet !== itemSet) {
    issues.push({
      code: "CUT_LOG_LINK_ASYMMETRY",
      workOrderId: update.workOrderId,
      workOrderItemId: update.workOrderItemId,
    })
  }
  return issues
}

export function describeCutLogLinkValidationIssue(issue: CutLogLinkValidationIssue): string {
  switch (issue.code) {
    case "CUT_LOG_LINK_UPDATE_BLOCKED":
      return "Cannot edit links while a worker job is in flight on this cut log."
    case "CUT_LOG_LINK_ASYMMETRY":
      return "Work order and work-order item must be set together (or both cleared)."
  }
}

export function describeCutLogLinkValidationIssues(
  issues: CutLogLinkValidationIssue[],
): string {
  return issues.map(describeCutLogLinkValidationIssue).join(" ")
}

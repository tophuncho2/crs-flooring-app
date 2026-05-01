import type { CutLogPendingFormIssue } from "../form-rules.js"

/**
 * Diff-save shapes for the cut-logs section. Mirrors the staged-inv
 * `diff/types.ts` pattern: draft rows get a `tempId` the caller assigns
 * (see ./identity.ts), modified rows carry an optimistic-lock
 * `expectedUpdatedAt`, deleted rows carry only id + expectedUpdatedAt.
 *
 * Link fields (`workOrderId` / `workOrderItemId`) are NOT part of the diff
 * — they flow through the separate sync link-edit use case (see
 * `../link-rules.ts`). Worker fields (`before` / `after` / `status` /
 * `isFinal` / `finalCutSequence` / `void`) are also excluded — those are
 * worker-stamped only.
 */

export type CutLogDraft = {
  tempId: string
  cut: string
  cost: string | null
  freight: string | null
  isWaste: boolean
  notes: string
}

export type CutLogPatch = {
  cut?: string
  cost?: string | null
  freight?: string | null
  isWaste?: boolean
  notes?: string
}

export type CutLogUpdate = {
  id: string
  expectedUpdatedAt: string
  patch: CutLogPatch
}

export type CutLogDelete = {
  id: string
  expectedUpdatedAt: string
}

export type CutLogsDiff = {
  added: CutLogDraft[]
  modified: CutLogUpdate[]
  deleted: CutLogDelete[]
}

/**
 * Cut logs always belong to one inventory. The diff validator enforces the
 * `totalCutSum ≤ startingStock` invariant, so it needs the parent's
 * starting stock and current cut sum (which the data layer reads under the
 * per-inventory FOR UPDATE lock and hands to the validator).
 *
 * `coveragePerUnit` and `categorySlug` are also surfaced so the worker
 * (consumer use case) can recompute `coverageCut` per row via
 * `computeCutCoverage` whenever a `cut` value is being written. Storing
 * the recomputed `coverageCut` snapshot ensures historical correctness:
 * if the parent inventory's `coveragePerUnit` ever changes later, each
 * cut log keeps its own snapshot from the moment of its last cut edit.
 *
 * The four unit-snapshot fields are exposed so the WO-side sync create
 * use case can stamp the cut log's frozen unit labels at insert time
 * (the cut log's own unit columns are never mutated after create). They
 * are nullable because not every inventory has every unit category set.
 */
export type CutLogParentContext = {
  inventoryId: string
  startingStock: string
  currentTotalCutSum: string
  coveragePerUnit: string | null
  categorySlug: string
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  itemCoverageUnitName: string | null
  itemCoverageUnitAbbrev: string | null
}

/**
 * In-tx snapshot of existing cut-log rows the diff is operating on. The
 * data layer reads this inside the per-inventory FOR UPDATE lock and hands
 * it to the validator. Only the fields the diff validator actually needs.
 */
export type DiffExistingCutLogRow = {
  id: string
  cut: string
  status: "PENDING" | "QUEUED" | "FINAL" | "VOID"
  isFinal: boolean
  void: boolean
  updatedAt: string
}

export type CutLogDiffResolution = {
  existing: DiffExistingCutLogRow[]
}

export type CutLogDiffValidationIssue =
  | {
      code: "CUT_LOG_FORM_INVALID"
      rowId: string | null
      rowTempId: string | null
      issues: CutLogPendingFormIssue[]
    }
  | {
      code: "CUT_LOG_ROW_NOT_PENDING_EDITABLE"
      rowId: string
      attemptedAction: "modify" | "delete"
    }
  | {
      code: "CUT_LOG_UNKNOWN_ROW"
      rowId: string
      attemptedAction: "modify" | "delete"
    }
  | {
      code: "CUT_LOG_EXPECTED_UPDATED_AT_MISMATCH"
      rowId: string
      expected: string
      actual: string
      attemptedAction: "modify" | "delete"
    }
  | {
      code: "CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK"
      projectedSum: string
      startingStock: string
    }

export function describeCutLogDiffIssue(issue: CutLogDiffValidationIssue): string {
  switch (issue.code) {
    case "CUT_LOG_FORM_INVALID":
      return `Cut log form invalid (${issue.issues.length} issue${issue.issues.length === 1 ? "" : "s"}).`
    case "CUT_LOG_ROW_NOT_PENDING_EDITABLE":
      return `Cut log ${issue.rowId} is not pending-editable; cannot ${issue.attemptedAction === "delete" ? "delete" : "modify"}.`
    case "CUT_LOG_UNKNOWN_ROW":
      return `Cut log ${issue.rowId} does not exist on this inventory; cannot ${issue.attemptedAction === "delete" ? "delete" : "modify"}.`
    case "CUT_LOG_EXPECTED_UPDATED_AT_MISMATCH":
      return `Cut log ${issue.rowId} was updated by someone else; refresh and try again.`
    case "CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK":
      return `Saving these changes would exceed the inventory's starting stock (projected sum ${issue.projectedSum} > ${issue.startingStock}).`
  }
}

export function describeCutLogDiffIssues(issues: CutLogDiffValidationIssue[]): string {
  return issues.map(describeCutLogDiffIssue).join(" ")
}

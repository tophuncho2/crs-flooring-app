import type { CutLogRecord } from "@builders/db"

/**
 * Discriminated scope carried on every scope-aware cut-log mutation
 * (update / delete / finalize). The route handler stamps it from
 * the URL — `params.id` becomes either `workOrderId` (WO routes) or
 * `inventoryId` (inv routes). The use case asserts the cut log row
 * actually belongs to the stamped scope before any side effects (see
 * `./scope.ts`).
 *
 * Create stays WO-only — cut logs are always created under a WOMI in
 * the UI — so it does not carry this discriminator.
 */
export type CutLogMutationScope =
  | { kind: "work-order"; workOrderId: string }
  | { kind: "inventory"; inventoryId: string }

/**
 * Create input — WO-only. Both WO and WOMI ids are required; the use
 * case verifies WOMI ownership before locking the parent inventory and
 * inserting the row.
 */
export type CreatePendingCutLogInput = {
  workOrderId: string
  workOrderItemId: string
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
}

/**
 * Patch shape consumed by the application's update-pending use case. The
 * grouped `link` field re-uses the domain's both-or-neither contract via
 * `assertCutLogLinkageSymmetry`:
 *   - absent → leave both link columns untouched
 *   - `{ workOrderId: null, workOrderItemId: null }` → unlink
 *   - symmetric non-null pair → re-link (use case re-verifies WOMI
 *     ownership before applying)
 */
export type UpdatePendingCutLogPatch = {
  cut?: string
  isWaste?: boolean
  notes?: string
  link?: { workOrderId: string | null; workOrderItemId: string | null }
}

export type UpdatePendingCutLogInput = {
  scope: CutLogMutationScope
  cutLogId: string
  expectedUpdatedAt: string
  patch: UpdatePendingCutLogPatch
}

export type DeletePendingCutLogInput = {
  scope: CutLogMutationScope
  cutLogId: string
  expectedUpdatedAt: string
}

export type FinalizeCutLogInput = {
  scope: CutLogMutationScope
  cutLogId: string
}

/**
 * Shared response envelope for the mutation use cases that adjust the
 * inventory's `totalCutSum` (create / update). Delete returns
 * the same fields with `deletedId` carried alongside in
 * `DeleteCutLogResult`. Finalize does NOT mutate `totalCutSum` (it only
 * flips PENDING → FINAL and stamps `before` / `after`) and uses
 * `FinalizeCutLogResult`.
 */
export type CutLogMutationResult = {
  cutLog: CutLogRecord
  inventoryId: string
  totalCutSum: string
}

export type DeleteCutLogResult = {
  deletedId: string
  inventoryId: string
  totalCutSum: string
}

export type FinalizeCutLogResult = {
  cutLog: CutLogRecord
}

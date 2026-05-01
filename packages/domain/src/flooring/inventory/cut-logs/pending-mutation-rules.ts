import { WorkOrderDomainError } from "../../work-orders/errors.js"
import type { WorkOrderItemStatus } from "../../work-orders/material-items/types.js"
import { assertCutLogDeleteAllowed } from "./cut-log-rules.js"
import { CutLogDomainError } from "./errors.js"
import type { CutLogRow } from "./types.js"

/**
 * Predicates for the synchronous per-row pending-cut-log mutations
 * (create / update / delete). These replace the diff-batch worker
 * predicates: each sync use case asserts these inside its TX before
 * touching the parent inventory.
 */

/**
 * Pending cut log mutations are blocked while the WOMI is in any
 * non-IDLE state (FINALIZING, FAILED). Producer/SAVING_CUTS no longer
 * exists — cut log mutations now hold the inventory row lock for the
 * duration of the request, so there is no in-flight WOMI state.
 */
export function assertWorkOrderItemReadyForCutLogMutation(input: {
  status: WorkOrderItemStatus
}): void {
  if (input.status !== "IDLE") {
    throw new WorkOrderDomainError("WORK_ORDER_ITEM_NOT_IDLE", {
      status: input.status,
    })
  }
}

/**
 * Update / delete are only allowed against PENDING rows. Final cut logs
 * cannot be deleted (only voided, separate flow), and queued / voided
 * rows are not editable. Identical semantics to `assertCutLogDeleteAllowed`,
 * surfaced under a name that matches the broader update-or-delete intent.
 */
export function assertCutLogPendingMutationAllowed(
  row: Pick<CutLogRow, "status" | "isFinal" | "void">,
): void {
  assertCutLogDeleteAllowed(row)
}

/**
 * Optimistic-concurrency check on update / delete. The client sends the
 * `updatedAt` it last observed on the row; the use case reads the row
 * inside its TX and compares. A mismatch means another writer landed
 * between the user's read and the user's write — reject with a 409 from
 * the application layer's mapping.
 *
 * Both values are ISO timestamp strings (the data layer normalizes
 * Prisma's `Date` to `toISOString()` before passing it here, and the
 * client echoes the exact string the row read returned).
 */
export function assertCutLogExpectedUpdatedAtMatches(input: {
  rowUpdatedAt: string
  expected: string
}): void {
  if (input.rowUpdatedAt !== input.expected) {
    throw new CutLogDomainError("CUT_LOG_STALE_UPDATED_AT", {
      expected: input.expected,
      actual: input.rowUpdatedAt,
    })
  }
}

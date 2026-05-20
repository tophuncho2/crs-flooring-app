import { canRelinkCutLog } from "../editability.js"
import { assertCutLogDeleteAllowed } from "./cut-log-rules.js"
import { CutLogDomainError } from "../errors.js"
import type { CutLogRow } from "../types.js"

/**
 * Predicates for the synchronous per-row pending-cut-log mutations
 * (create / update / delete). These run inside each sync use case's TX
 * before touching the parent inventory.
 *
 * Note: WOMI status is no longer consulted by cut-log mutations. The
 * parent inventory's row lock is the sole correctness mechanism;
 * coupling cut-log CRUD to a WOMI-level mutex was preventing legitimate
 * fast iteration (back-to-back finalizes, edit-while-finalize-queued)
 * with no concurrency benefit the inventory lock didn't already provide.
 */

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
 * Link-only mutation gate. Patches that only change `workOrderId` /
 * `workOrderItemId` are allowed on PENDING or FINAL rows — voided or
 * queued rows reject. Pairs with `canRelinkCutLog` for the predicate form.
 */
export function assertCutLogLinkMutationAllowed(
  row: Pick<CutLogRow, "status" | "void">,
): void {
  if (!canRelinkCutLog(row)) {
    throw new CutLogDomainError("CUT_LOG_LINK_NOT_ALLOWED", {
      status: row.status,
      void: row.void,
    })
  }
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

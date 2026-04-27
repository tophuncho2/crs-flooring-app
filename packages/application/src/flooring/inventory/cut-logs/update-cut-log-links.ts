import {
  Prisma,
  getCutLogById,
  updateCutLogLinks,
  withDatabaseTransaction,
} from "@builders/db"
import {
  describeCutLogLinkValidationIssues,
  validateCutLogLinkUpdate,
} from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"
import type {
  UpdateCutLogLinksInput,
  UpdateCutLogLinksResult,
} from "./types.js"

/**
 * Sync use case for the work-order / work-order-item link flow.
 *
 * Per intent doc, link edits do NOT route through the worker pipeline
 * — they don't touch `cut`, `coverageCut`, `cost`, `freight`, or
 * `totalCutSum`, so there's no `single-writer` rule to coordinate with
 * and no per-inventory `FOR UPDATE` lock needed. The flow is sync.
 *
 * What this does:
 *  1. Inside a tx (for atomic read+write on the same row), reads the
 *     current cut log.
 *  2. Validates via `validateCutLogLinkUpdate` — checks
 *     `canEditCutLogLinks` (status != QUEUED) and linkage symmetry
 *     (both ids set, or both null).
 *  3. Calls `updateCutLogLinks` (data primitive does the
 *     connect/disconnect for both sides).
 *  4. Returns the updated record.
 *
 * Race note: link updates and worker jobs (pending-save / finalize /
 * void) write disjoint columns on `flooring_cut_log` — links never
 * collide with cut math fields. The optimistic `canEditCutLogLinks`
 * check in step 2 is a UX guard ("don't edit while a job is in
 * flight"), not a correctness guard.
 */
export async function updateCutLogLinksUseCase(
  input: UpdateCutLogLinksInput,
  client?: Prisma.TransactionClient,
): Promise<UpdateCutLogLinksResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const row = await getCutLogById(input.cutLogId, c)
    if (!row) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Cut log not found.",
        status: 404,
      })
    }

    const issues = validateCutLogLinkUpdate(row, {
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
    })
    if (issues.length > 0) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_LINK_VALIDATION_FAILED",
        message: describeCutLogLinkValidationIssues(issues),
        status: 400,
        payload: { issues },
      })
    }

    const updated = await updateCutLogLinks(c, input.cutLogId, {
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
    })

    return { row: updated }
  })
}

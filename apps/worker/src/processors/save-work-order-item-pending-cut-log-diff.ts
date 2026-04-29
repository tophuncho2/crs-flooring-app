import {
  WorkOrderCutLogExecutionError,
  applyWorkOrderItemPendingCutLogDiffUseCase,
  markWorkOrderItemFailedFromCutLogDiff,
} from "@builders/application"
import {
  parseSaveWorkOrderItemPendingCutLogDiffPayload,
  type SaveWorkOrderItemPendingCutLogDiffPayload,
} from "@builders/domain"
import { UnrecoverableError } from "bullmq"

/**
 * BullMQ handler for the `flooring.work-order-item.pending-cut-log.save`
 * topic.
 *
 * Parses the job payload, calls the apply-pending-diff use case, and
 * classifies thrown errors:
 *  - `WorkOrderCutLogExecutionError` → first marks the WOMI FAILED in a
 *    fresh transaction (so the FAILED state survives the apply TX
 *    rollback), then throws `UnrecoverableError` for BullMQ.
 *  - Anything else (Prisma transport blip, Redis hiccup) → also marks
 *    the WOMI FAILED in a fresh TX, then re-throws so BullMQ retries
 *    per its job options.
 *
 * The use case is naturally idempotent: the producer pre-stamps every
 * draft's `id` (UUID) into the payload, so a retried `createMany` is a
 * no-op against the unique pk.
 */

export type SaveWorkOrderItemPendingCutLogDiffResult = Awaited<
  ReturnType<typeof applyWorkOrderItemPendingCutLogDiffUseCase>
>

export type SaveWorkOrderItemPendingCutLogDiffHandlerDependencies = {
  applyPendingCutLogDiff: typeof applyWorkOrderItemPendingCutLogDiffUseCase
  markFailed: typeof markWorkOrderItemFailedFromCutLogDiff
  parsePayload: typeof parseSaveWorkOrderItemPendingCutLogDiffPayload
}

const defaultDependencies: SaveWorkOrderItemPendingCutLogDiffHandlerDependencies = {
  applyPendingCutLogDiff: applyWorkOrderItemPendingCutLogDiffUseCase,
  markFailed: markWorkOrderItemFailedFromCutLogDiff,
  parsePayload: parseSaveWorkOrderItemPendingCutLogDiffPayload,
}

export function createSaveWorkOrderItemPendingCutLogDiffHandler(
  dependencies: SaveWorkOrderItemPendingCutLogDiffHandlerDependencies = defaultDependencies,
) {
  return async function processSaveWorkOrderItemPendingCutLogDiffJob(
    job: { data: unknown },
  ): Promise<SaveWorkOrderItemPendingCutLogDiffResult> {
    const payload: SaveWorkOrderItemPendingCutLogDiffPayload = dependencies.parsePayload(job.data)
    try {
      return await dependencies.applyPendingCutLogDiff(payload)
    } catch (error) {
      await dependencies.markFailed(payload.workOrderItemId)
      if (error instanceof WorkOrderCutLogExecutionError) {
        throw new UnrecoverableError(error.message)
      }
      throw error
    }
  }
}

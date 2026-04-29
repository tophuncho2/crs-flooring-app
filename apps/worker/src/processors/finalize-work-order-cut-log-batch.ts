import {
  WorkOrderCutLogExecutionError,
  applyFinalizeWorkOrderCutLogBatchUseCase,
  markWorkOrderItemsFailedFromFinalizeBatch,
} from "@builders/application"
import {
  parseFinalizeWorkOrderCutLogBatchPayload,
  type FinalizeWorkOrderCutLogBatchPayload,
} from "@builders/domain"
import { UnrecoverableError } from "bullmq"

/**
 * BullMQ handler for the `flooring.work-order.cut-log.finalize` topic.
 *
 * Parses the job payload, calls the apply-finalize-batch use case, and
 * classifies thrown errors:
 *  - `WorkOrderCutLogExecutionError` → first marks every touched WOMI
 *    FAILED in a fresh transaction (so FAILED state survives the apply
 *    TX rollback), then throws `UnrecoverableError` for BullMQ.
 *  - Anything else → also marks WOMIs FAILED in a fresh TX, then
 *    re-throws so BullMQ retries per its job options.
 *
 * `markWorkOrderItemsFailedFromFinalizeBatch` derives the touched WOMI
 * set from the payload's cut-log IDs internally — the worker has only
 * the cut-log IDs at catch time.
 */

export type FinalizeWorkOrderCutLogBatchResult = Awaited<
  ReturnType<typeof applyFinalizeWorkOrderCutLogBatchUseCase>
>

export type FinalizeWorkOrderCutLogBatchHandlerDependencies = {
  applyFinalizeBatch: typeof applyFinalizeWorkOrderCutLogBatchUseCase
  markFailed: typeof markWorkOrderItemsFailedFromFinalizeBatch
  parsePayload: typeof parseFinalizeWorkOrderCutLogBatchPayload
}

const defaultDependencies: FinalizeWorkOrderCutLogBatchHandlerDependencies = {
  applyFinalizeBatch: applyFinalizeWorkOrderCutLogBatchUseCase,
  markFailed: markWorkOrderItemsFailedFromFinalizeBatch,
  parsePayload: parseFinalizeWorkOrderCutLogBatchPayload,
}

export function createFinalizeWorkOrderCutLogBatchHandler(
  dependencies: FinalizeWorkOrderCutLogBatchHandlerDependencies = defaultDependencies,
) {
  return async function processFinalizeWorkOrderCutLogBatchJob(
    job: { data: unknown },
  ): Promise<FinalizeWorkOrderCutLogBatchResult> {
    const payload: FinalizeWorkOrderCutLogBatchPayload = dependencies.parsePayload(job.data)
    try {
      return await dependencies.applyFinalizeBatch(payload)
    } catch (error) {
      await dependencies.markFailed(payload.cutLogIds)
      if (error instanceof WorkOrderCutLogExecutionError) {
        throw new UnrecoverableError(error.message)
      }
      throw error
    }
  }
}
